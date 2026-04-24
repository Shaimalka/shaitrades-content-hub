// Recurring income rules — Sprint 1C.
//
// Stored at `recurring_income:{userId}` as an array of RecurringIncomeRule.
// Rules drive the daily cron at /api/cron/generate-recurring-income which
// appends new entries to `finance:{userId}:income` on the scheduled day.
//
// This route is user-facing (NextAuth) — the cron runs separately.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

export type RecurringIncomeRule = {
  id: string
  streamId: string
  amount: number
  account: string
  notes: string
  frequency: 'monthly'
  dayOfMonth: number
  startDate: string
  endDate: string | null
  status: 'active' | 'paused' | 'ended'
  createdAt: string
  lastGeneratedAt: string | null
}

function rulesKey(userId: string) { return `recurring_income:${userId}` }
function incomeKey(userId: string) { return `finance:${userId}:income` }
function streamsKey(userId: string) { return `finance:${userId}:streams` }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function todayUtcDate(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

async function getRules(userId: string): Promise<RecurringIncomeRule[]> {
  const raw = await redis.get(rulesKey(userId))
  if (!raw) return []
  if (Array.isArray(raw)) return raw as RecurringIncomeRule[]
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as RecurringIncomeRule[] } catch { return [] }
  }
  return []
}

async function requireAuth(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session?.user?.email
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  return { userId }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const rules = await getRules(auth.userId)
    return NextResponse.json({ rules })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { streamId, amount, account, notes, dayOfMonth, startDate, endDate, generateFirstNow } = body || {}

    if (typeof streamId !== 'string' || !streamId) return NextResponse.json({ error: 'streamId required' }, { status: 400 })
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })
    const dom = Number(dayOfMonth)
    if (!Number.isInteger(dom) || dom < 1 || dom > 31) return NextResponse.json({ error: 'dayOfMonth must be 1-31' }, { status: 400 })
    if (typeof startDate !== 'string' || !DATE_RE.test(startDate)) return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 })
    if (endDate !== undefined && endDate !== null && endDate !== '' && (typeof endDate !== 'string' || !DATE_RE.test(endDate))) {
      return NextResponse.json({ error: 'endDate must be YYYY-MM-DD or null' }, { status: 400 })
    }

    // Validate streamId exists in user's streams.
    const streamsRaw = await redis.get(streamsKey(auth.userId))
    const streams: Array<{ id: string }> = Array.isArray(streamsRaw) ? (streamsRaw as any[]) : []
    if (streams.length > 0 && !streams.some(s => s.id === streamId)) {
      return NextResponse.json({ error: 'streamId not found for user' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const rule: RecurringIncomeRule = {
      id: randomUUID(),
      streamId,
      amount: amt,
      account: typeof account === 'string' ? account.slice(0, 200) : '',
      notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
      frequency: 'monthly',
      dayOfMonth: dom,
      startDate,
      endDate: endDate || null,
      status: 'active',
      createdAt: now,
      lastGeneratedAt: null,
    }

    const rules = await getRules(auth.userId)
    rules.push(rule)

    let createdEntry: any = null
    if (generateFirstNow === true) {
      const income: any[] = ((await redis.get(incomeKey(auth.userId))) as any[]) || []
      const entry = {
        id: randomUUID(),
        streamId: rule.streamId,
        date: todayUtcDate(),
        amount: rule.amount,
        account: rule.account,
        source: rule.account,
        notes: rule.notes,
        createdAt: now,
        recurringRuleId: rule.id,
      }
      income.push(entry)
      await redis.set(incomeKey(auth.userId), income)
      rule.lastGeneratedAt = now
      createdEntry = entry
    }

    await redis.set(rulesKey(auth.userId), rules)
    return NextResponse.json({ rule, entry: createdEntry })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create rule' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { ruleId, action, updates } = body || {}
    if (typeof ruleId !== 'string' || !ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })
    if (!['pause', 'resume', 'end', 'update'].includes(action)) return NextResponse.json({ error: 'invalid action' }, { status: 400 })

    const rules = await getRules(auth.userId)
    const idx = rules.findIndex(r => r.id === ruleId)
    if (idx === -1) return NextResponse.json({ error: 'rule not found' }, { status: 404 })
    const rule = { ...rules[idx] }

    if (action === 'pause') {
      if (rule.status === 'ended') return NextResponse.json({ error: 'cannot pause an ended rule' }, { status: 400 })
      rule.status = 'paused'
    } else if (action === 'resume') {
      if (rule.status !== 'paused') return NextResponse.json({ error: 'rule is not paused' }, { status: 400 })
      rule.status = 'active'
    } else if (action === 'end') {
      rule.status = 'ended'
      rule.endDate = todayUtcDate()
    } else if (action === 'update') {
      if (!updates || typeof updates !== 'object') return NextResponse.json({ error: 'updates required' }, { status: 400 })
      if (updates.amount !== undefined) {
        const n = Number(updates.amount)
        if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })
        rule.amount = n
      }
      if (updates.dayOfMonth !== undefined) {
        const d = Number(updates.dayOfMonth)
        if (!Number.isInteger(d) || d < 1 || d > 31) return NextResponse.json({ error: 'dayOfMonth must be 1-31' }, { status: 400 })
        rule.dayOfMonth = d
      }
      if (typeof updates.notes === 'string') rule.notes = updates.notes.slice(0, 500)
      if (typeof updates.account === 'string') rule.account = updates.account.slice(0, 200)
    }

    rules[idx] = rule
    await redis.set(rulesKey(auth.userId), rules)
    return NextResponse.json({ rule })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { ruleId } = body || {}
    if (typeof ruleId !== 'string' || !ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })
    const rules = await getRules(auth.userId)
    const updated = rules.filter(r => r.id !== ruleId)
    await redis.set(rulesKey(auth.userId), updated)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete rule' }, { status: 500 })
  }
}
