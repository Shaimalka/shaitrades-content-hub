import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// -- Types -------------------------------------------------------------------

type Debt = {
  id: string
  userId: string
  name: string
  type: string
  balance: number
  originalBalance: number
  interestRate: number
  minimumPayment: number
  dueDayOfMonth?: number
  payoffDate?: string
  createdAt: string
  updatedAt: string
}

type IncomeEntry = { id: string; amount: number; date: string }
type ExpenseEntry = { id: string; amount: number; date: string }

type StrategyId = 'avalanche' | 'snowball' | 'hybrid' | 'emergency_first' | 'consolidation'

type MonthlyPlanItem = {
  debtId: string
  debtName: string
  amount: number
  note: string
}

type TimelineItem = {
  date: string
  milestone: string
}

type Analysis = {
  strategy: StrategyId
  strategyLabel: string
  why: string
  monthlyPlan: MonthlyPlanItem[]
  timeline: TimelineItem[]
  debtFreeDate: string
  interestSaved: number
  sustainabilityNote: string | null
  analyzedAt: string
}

// -- Helpers -----------------------------------------------------------------

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

function debtsKey(userId: string) { return `debts:${userId}` }
function incomeKey(userId: string) { return `finance:${userId}:income` }
function expensesKey(userId: string) { return `finance:${userId}:expenses` }
function analysisKey(userId: string) { return `debt-analysis:${userId}` }

function withinLastDays(iso: string, days: number): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  return t >= Date.now() - days * 24 * 60 * 60 * 1000
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return sum(arr) / arr.length
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = mean(arr.map((x) => (x - m) ** 2))
  return Math.sqrt(variance)
}

function monthKey(iso: string): string {
  return (iso || '').substring(0, 7)
}

function bucketByMonth(entries: { amount: number; date: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of entries) {
    const k = monthKey(e.date)
    if (!k) continue
    out[k] = (out[k] || 0) + (Number(e.amount) || 0)
  }
  return out
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Replicates client-side estimateMonthsToPayoff
function monthsToPayoff(balance: number, apr: number, payment: number): number {
  if (balance <= 0) return 0
  const monthlyRate = (apr || 0) / 100 / 12
  if (payment <= 0) return Infinity
  const monthlyInterest = balance * monthlyRate
  if (payment <= monthlyInterest) return Infinity
  if (monthlyRate === 0) return Math.ceil(balance / payment)
  const n = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate)
  return Math.ceil(n)
}

// Simulate paying only minimums forever to get baseline total interest.
function simulateMinimumsOnly(debts: Debt[]): { totalInterest: number; months: number } {
  let totalInterest = 0
  let maxMonths = 0
  for (const d of debts) {
    const months = monthsToPayoff(d.balance, d.interestRate, d.minimumPayment)
    if (!Number.isFinite(months)) {
      // Never pays off at minimum — cap at 600 months for interest estimation, still meaningful
      const cap = 600
      let bal = d.balance
      const rate = (d.interestRate || 0) / 100 / 12
      let interest = 0
      for (let i = 0; i < cap && bal > 0.01; i++) {
        const ix = bal * rate
        const principal = Math.max(0, d.minimumPayment - ix)
        interest += ix
        bal -= principal
        if (principal <= 0) { interest = Infinity; break }
      }
      totalInterest += Number.isFinite(interest) ? interest : d.balance * 3
      maxMonths = Math.max(maxMonths, cap)
      continue
    }
    let bal = d.balance
    const rate = (d.interestRate || 0) / 100 / 12
    for (let i = 0; i < months && bal > 0.01; i++) {
      const ix = bal * rate
      const principal = Math.max(0, d.minimumPayment - ix)
      totalInterest += ix
      bal -= principal
    }
    maxMonths = Math.max(maxMonths, months)
  }
  return { totalInterest, months: maxMonths }
}

type SimResult = {
  months: number
  totalInterest: number
  monthlyPlan: MonthlyPlanItem[]
  timeline: TimelineItem[]
  debtFreeDate: string
}

// Simulate a strategy with a given total monthly budget (>= sum of minimums).
// strategy: 'avalanche' (highest APR first) or 'snowball' (lowest balance first).
function simulateStrategy(
  debtsIn: Debt[],
  totalBudget: number,
  strategy: 'avalanche' | 'snowball',
): SimResult {
  const debts = debtsIn.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    rate: (d.interestRate || 0) / 100 / 12,
    minPayment: d.minimumPayment,
  }))
  const minTotal = sum(debts.map((d) => d.minPayment))
  const budget = Math.max(totalBudget, minTotal)
  const extraBudgetStart = Math.max(0, budget - minTotal)

  // Compute monthly plan (first month's allocation snapshot)
  const order = [...debts]
  if (strategy === 'avalanche') order.sort((a, b) => b.rate - a.rate)
  else order.sort((a, b) => a.balance - b.balance)

  const monthlyPlan: MonthlyPlanItem[] = order.map((d, idx) => {
    const extra = idx === 0 ? extraBudgetStart : 0
    const amount = d.minPayment + extra
    const note = extra > 0
      ? `min + $${Math.round(extra).toLocaleString()} extra`
      : 'minimum only'
    return { debtId: d.id, debtName: d.name, amount: Math.round(amount), note }
  })

  // Full month-by-month simulation for timeline + interest
  const active = debts.map((d) => ({ ...d }))
  const timeline: TimelineItem[] = []
  let totalInterest = 0
  let month = 0
  const maxMonths = 600
  const startDate = new Date()

  while (active.some((d) => d.balance > 0.01) && month < maxMonths) {
    // Accrue interest
    for (const d of active) {
      if (d.balance > 0) {
        const ix = d.balance * d.rate
        d.balance += ix
        totalInterest += ix
      }
    }

    // Pay minimums and track actual paid (handles both paid-off debts skipped
    // above and final-month overpayment where balance < minPayment).
    let totalMinPaid = 0
    for (const d of active) {
      if (d.balance <= 0) continue
      const pay = Math.min(d.minPayment, d.balance)
      d.balance -= pay
      totalMinPaid += pay
    }

    // Extra = full budget minus what we actually spent on minimums this month.
    // Captures snowball rollover from paid-off debts AND any unused budget
    // from oversized minimums on shrinking balances.
    let extra = Math.max(0, budget - totalMinPaid)

    // Apply extra to target in strategy order
    const ordered = active.filter((d) => d.balance > 0)
    if (strategy === 'avalanche') ordered.sort((a, b) => b.rate - a.rate)
    else ordered.sort((a, b) => a.balance - b.balance)

    for (const target of ordered) {
      if (extra <= 0) break
      if (target.balance <= 0) continue
      const pay = Math.min(extra, target.balance)
      target.balance -= pay
      extra -= pay
    }

    month += 1

    // Detect debts newly paid off this month
    for (const d of active) {
      if (d.balance > 0 || (d as any)._paidLogged) continue
      const payoffDate = addMonths(startDate, month)
      timeline.push({ date: formatMonthYear(payoffDate), milestone: `${d.name} paid off` })
      ;(d as any)._paidLogged = true
    }
  }

  const debtFreeDate = formatMonthYear(addMonths(startDate, month))
  timeline.push({ date: debtFreeDate, milestone: 'DEBT-FREE' })

  return {
    months: month,
    totalInterest,
    monthlyPlan,
    timeline,
    debtFreeDate,
  }
}

function strategyLabelFor(id: StrategyId): string {
  switch (id) {
    case 'avalanche': return 'Avalanche (highest APR first)'
    case 'snowball': return 'Snowball (smallest balance first)'
    case 'hybrid': return 'Hybrid (balance of math and momentum)'
    case 'emergency_first': return 'Emergency fund first'
    case 'consolidation': return 'Consolidation / refinance first'
  }
}

function coerceStrategy(v: any): StrategyId {
  const allowed: StrategyId[] = ['avalanche', 'snowball', 'hybrid', 'emergency_first', 'consolidation']
  return allowed.includes(v) ? v : 'avalanche'
}

function stripJsonFences(s: string): string {
  let t = (s || '').trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  return t.trim()
}

// -- GET ---------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const saved = (await redis.get(analysisKey(userId))) as Analysis | null
    return NextResponse.json({ analysis: saved || null })
  } catch {
    return NextResponse.json({ analysis: null })
  }
}

// -- POST --------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const rawDebts = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    const debts: Debt[] = rawDebts.map((d: any) => {
      if (d && d.dueDayOfMonth == null && d.dueDate != null) {
        const { dueDate, ...rest } = d
        return { ...rest, dueDayOfMonth: dueDate } as Debt
      }
      return d as Debt
    }).filter((d) => d && d.balance > 0)

    if (debts.length === 0) {
      return NextResponse.json({ error: 'No debts to analyze' }, { status: 400 })
    }

    const incomeAll = ((await redis.get(incomeKey(userId))) as IncomeEntry[]) || []
    const expensesAll = ((await redis.get(expensesKey(userId))) as ExpenseEntry[]) || []
    const income = incomeAll.filter((e) => withinLastDays(e.date, 90))
    const expenses = expensesAll.filter((e) => withinLastDays(e.date, 90))

    const avgIncome = sum(income.map((e) => Number(e.amount) || 0)) / 3
    const avgExpenses = sum(expenses.map((e) => Number(e.amount) || 0)) / 3
    const totalMinPayments = sum(debts.map((d) => d.minimumPayment || 0))
    const disposable = avgIncome - avgExpenses - totalMinPayments

    const incomeByMonth = bucketByMonth(income)
    const monthlyIncomeValues = Object.values(incomeByMonth)
    const incomeStdDev = stdDev(monthlyIncomeValues)
    const volatility = avgIncome > 0 ? incomeStdDev / avgIncome : 0

    // Safety rules
    const VOLATILE_THRESHOLD = 0.35
    const isVolatile = volatility > VOLATILE_THRESHOLD
    const cap = isVolatile ? 0.6 : 0.7

    // Determine effective extra-payment budget under safety caps
    const allowedExtraFromDisposable = Math.max(0, disposable) * cap
    const emergencyMode = disposable < 100

    // Minimums-only baseline interest
    const baseline = simulateMinimumsOnly(debts)

    // Build financial summary for Claude
    const debtSummary = debts
      .map((d, i) => `${i + 1}. ${d.name} — balance $${d.balance.toFixed(2)}, APR ${d.interestRate}%, min $${d.minimumPayment.toFixed(2)}`)
      .join('\n')

    const finSummary = [
      `Avg monthly income (last 3mo): $${avgIncome.toFixed(2)}`,
      `Avg monthly expenses (last 3mo): $${avgExpenses.toFixed(2)}`,
      `Total minimum debt payments: $${totalMinPayments.toFixed(2)}`,
      `Disposable income: $${disposable.toFixed(2)}`,
      `Monthly income values (last 3mo): ${JSON.stringify(monthlyIncomeValues.map((v) => Math.round(v)))}`,
      `Income volatility (stdDev/mean): ${volatility.toFixed(3)} — ${isVolatile ? 'VOLATILE' : 'stable'}`,
      `Baseline interest if only minimums paid: $${baseline.totalInterest.toFixed(2)}`,
    ].join('\n')

    const systemPrompt = `You are Coach Shai — a raw, real, empathetic debt strategy analyst built into the user's Life Hub.

Your job: pick ONE strategy from this exact set and explain it in a short, concrete, math-grounded way:
- "avalanche" — pay highest APR first (mathematically optimal interest savings)
- "snowball" — pay smallest balance first (momentum / behavioral wins)
- "hybrid" — mix of avalanche + snowball when APRs are close
- "emergency_first" — do NOT accelerate debts; focus on building a cash buffer first
- "consolidation" — recommend exploring balance transfer or consolidation loan before paying down

HARD RULES (non-negotiable):
1. Never recommend using more than ${Math.round(cap * 100)}% of disposable income as EXTRA debt payments. Monthly extra beyond minimums must be <= $${Math.round(allowedExtraFromDisposable)}.
2. If disposable income < $100 or negative, you MUST pick "emergency_first". Do not recommend extra debt payments in that case.
3. If income is VOLATILE (flagged below), you MUST include a sustainabilityNote explaining the 60% cap and volatility reasoning.
4. Show the math in your "why" — mention specific APRs, balances, or dollar amounts from the user's actual debts. Don't speak in generalities.
5. Keep "why" under 500 characters. Punchy, mentor voice. End with one concrete action.

USER FINANCIAL SITUATION:
${finSummary}

USER DEBTS:
${debtSummary}

OUTPUT FORMAT — return ONLY a single JSON object, no prose, no code fences:
{
  "strategy": "avalanche" | "snowball" | "hybrid" | "emergency_first" | "consolidation",
  "why": "string (<=500 chars, must reference user's actual numbers)",
  "sustainabilityNote": "string or null"
}

Do not include monthly plan, timeline, dates, or interestSaved — those are computed server-side from your strategy choice.`

    // Determine server-authoritative extra budget for the simulator
    const extraBudget = emergencyMode ? 0 : allowedExtraFromDisposable
    const totalBudget = totalMinPayments + extraBudget

    let strategy: StrategyId = 'avalanche'
    let why = ''
    let sustainabilityNote: string | null = null

    try {
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: 'Return only the JSON object described in the system prompt. No other text.' },
        ],
      })
      const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
      const cleaned = stripJsonFences(text)
      const parsed = JSON.parse(cleaned)
      strategy = coerceStrategy(parsed.strategy)
      why = typeof parsed.why === 'string' ? parsed.why.trim().slice(0, 800) : ''
      sustainabilityNote = typeof parsed.sustainabilityNote === 'string' && parsed.sustainabilityNote.trim()
        ? parsed.sustainabilityNote.trim().slice(0, 400)
        : null
    } catch (err) {
      // Fallback: deterministic avalanche if Claude or parsing fails
      strategy = emergencyMode ? 'emergency_first' : 'avalanche'
      why = 'Coach Shai is briefly unavailable — using standard Avalanche math for now. This targets your highest-APR debt first, which minimizes total interest paid.'
      sustainabilityNote = isVolatile ? `Plan uses 60% of your disposable income to leave buffer for income volatility.` : null
    }

    // Server-authoritative safety enforcement
    if (emergencyMode && strategy !== 'emergency_first') {
      strategy = 'emergency_first'
      if (!why) why = 'Your disposable income is too thin right now. Build a $1,000 buffer before accelerating debts.'
    }
    if (isVolatile && !sustainabilityNote) {
      sustainabilityNote = 'Plan uses 60% of your disposable income to leave buffer for income volatility.'
    }

    // Server-authoritative plan + timeline + savings
    let monthlyPlan: MonthlyPlanItem[]
    let timeline: TimelineItem[]
    let debtFreeDate: string
    let interestSaved = 0

    if (strategy === 'emergency_first') {
      monthlyPlan = debts.map((d) => ({
        debtId: d.id,
        debtName: d.name,
        amount: Math.round(d.minimumPayment),
        note: 'minimum only — build emergency fund first',
      }))
      const base = simulateStrategy(debts, totalMinPayments, 'avalanche')
      timeline = base.timeline
      debtFreeDate = base.debtFreeDate
      interestSaved = 0
    } else if (strategy === 'consolidation' || strategy === 'hybrid' || strategy === 'snowball') {
      const simStrategy: 'avalanche' | 'snowball' = strategy === 'snowball' ? 'snowball' : 'avalanche'
      const sim = simulateStrategy(debts, totalBudget, simStrategy)
      monthlyPlan = sim.monthlyPlan
      timeline = sim.timeline
      debtFreeDate = sim.debtFreeDate
      interestSaved = Math.max(0, Math.round(baseline.totalInterest - sim.totalInterest))
    } else {
      const sim = simulateStrategy(debts, totalBudget, 'avalanche')
      monthlyPlan = sim.monthlyPlan
      timeline = sim.timeline
      debtFreeDate = sim.debtFreeDate
      interestSaved = Math.max(0, Math.round(baseline.totalInterest - sim.totalInterest))
    }

    const analysis: Analysis = {
      strategy,
      strategyLabel: strategyLabelFor(strategy),
      why: why || 'Recommended strategy based on your current debts and cash flow.',
      monthlyPlan,
      timeline,
      debtFreeDate,
      interestSaved,
      sustainabilityNote,
      analyzedAt: new Date().toISOString(),
    }

    try {
      await redis.set(analysisKey(userId), analysis)
    } catch {
      // non-fatal — still return the analysis
    }

    return NextResponse.json({ analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to analyze debts' }, { status: 500 })
  }
}
