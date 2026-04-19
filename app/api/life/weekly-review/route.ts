import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

// ── Types ─────────────────────────────────────────────────────────────────────
type TradeLog = {
  id?: string
  pnl?: number
  createdAt?: string
  [key: string]: unknown
}

type Habit = {
  id: string
  title?: string
  createdAt?: string
  [key: string]: unknown
}

// completions shape: { [habitId]: { [YYYY-MM-DD]: boolean } }
type Completions = Record<string, Record<string, boolean>>

type Goal = {
  id: string
  type: 'trading' | 'life'
  metric: string
  target: number
  current: number
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'missed'
  [key: string]: unknown
}

type JournalEntry = {
  id?: string
  createdAt?: string
  [key: string]: unknown
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcTradingMetric(metric: string, trades: TradeLog[]): number {
  if (trades.length === 0) return 0
  switch (metric) {
    case 'pnl':
    case 'payout':
      return trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    case 'winRate': {
      const wins = trades.filter((t) => (t.pnl ?? 0) > 0).length
      return trades.length > 0 ? (wins / trades.length) * 100 : 0
    }
    case 'profitFactor': {
      const totalWins = trades.reduce((s, t) => s + Math.max(0, t.pnl ?? 0), 0)
      const totalLosses = trades.reduce((s, t) => s + Math.max(0, -(t.pnl ?? 0)), 0)
      return totalLosses > 0 ? totalWins / totalLosses : 0
    }
    case 'maxDrawdown': {
      let equity = 0
      let peak = 0
      let maxDD = 0
      for (const t of trades) {
        equity += t.pnl ?? 0
        if (equity > peak) peak = equity
        const dd = peak - equity
        if (dd > maxDD) maxDD = dd
      }
      return maxDD
    }
    case 'tradeCount':
      return trades.length
    default:
      return 0
  }
}

function calcPaceStatus(goal: Goal, allTrades: TradeLog[]): 'ahead' | 'on_track' | 'behind' {
  const now = new Date()
  const start = new Date(goal.startDate)
  const end = new Date(goal.endDate)

  let current = goal.current
  if (goal.type === 'trading') {
    const windowTrades = allTrades.filter((t) => {
      const d = new Date(t.createdAt ?? 0)
      return d >= start && d <= end
    })
    current = calcTradingMetric(goal.metric, windowTrades)
  }

  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const rawElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = Math.min(Math.max(0, rawElapsed), totalDays)
  const expectedProgress = goal.target * (daysElapsed / totalDays)
  const paceRatio = expectedProgress === 0 ? 1 : current / expectedProgress

  if (paceRatio > 1.1) return 'ahead'
  if (paceRatio < 0.9) return 'behind'
  return 'on_track'
}

// ── GET /api/life/weekly-review ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user?.email
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const now = new Date()
    const weekEnd = now.toISOString()
    const weekStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekStart = weekStartDate.toISOString()

    // 1. Trades
    const allTrades = ((await redis.get(`trading:${userId}:logs`)) as TradeLog[]) || []
    const weekTrades = allTrades.filter((t) => {
      if (!t.createdAt) return false
      const d = new Date(t.createdAt)
      return d >= weekStartDate && d <= now
    })
    const tradeCount = weekTrades.length
    const wins = weekTrades.filter((t) => (t.pnl ?? 0) > 0).length
    const losses = weekTrades.filter((t) => (t.pnl ?? 0) < 0).length
    const winRate = tradeCount > 0 ? parseFloat(((wins / tradeCount) * 100).toFixed(1)) : 0
    const netPnl = parseFloat(
      weekTrades.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2)
    )
    const pnls = weekTrades.map((t) => t.pnl ?? 0)
    const bestTrade = pnls.length > 0 ? parseFloat(Math.max(...pnls).toFixed(2)) : 0
    const worstTrade = pnls.length > 0 ? parseFloat(Math.min(...pnls).toFixed(2)) : 0

    // 2. Habits + completions
    const habits = ((await redis.get(`habits:${userId}`)) as Habit[]) || []
    const completions =
      ((await redis.get(`habits:${userId}:completions`)) as Completions) || {}

    const dateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dateKeys.push(d.toISOString().slice(0, 10))
    }

    const totalHabits = habits.length
    const possible = totalHabits * 7
    let completed = 0
    for (const habit of habits) {
      const habitCompletions = completions[habit.id] || {}
      for (const dk of dateKeys) {
        if (habitCompletions[dk]) completed += 1
      }
    }
    const completionRate = possible > 0 ? `${completed}/${possible}` : '0/0'

    // 3. Goals
    const allGoals = ((await redis.get(`goals:${userId}`)) as Goal[]) || []
    const activeGoals = allGoals.filter((g) => g.status === 'active')
    let ahead = 0
    let onTrack = 0
    let behind = 0
    for (const g of activeGoals) {
      const pace = calcPaceStatus(g, allTrades)
      if (pace === 'ahead') ahead += 1
      else if (pace === 'on_track') onTrack += 1
      else behind += 1
    }

    // 4. Journal
    const journalEntries =
      ((await redis.get(`journal:${userId}`)) as JournalEntry[]) || []
    const journalThisWeek = journalEntries.filter((e) => {
      if (!e.createdAt) return false
      const d = new Date(e.createdAt)
      return d >= weekStartDate && d <= now
    }).length

    const stats = {
      trades: {
        count: tradeCount,
        wins,
        losses,
        winRate,
        netPnl,
        bestTrade,
        worstTrade,
      },
      habits: {
        totalHabits,
        completed,
        possible,
        completionRate,
      },
      goals: {
        active: activeGoals.length,
        ahead,
        onTrack,
        behind,
      },
      journal: {
        entries: journalThisWeek,
      },
    }

    // ── Coach Shai review ──
    const systemPrompt = `You are Coach Shai — an honest mirror for a futures trader and content creator. Write a weekly review in 4-6 sentences. Tone: direct, honest, no fluff, no excessive praise. Treat the user like a serious operator.

Structure:
1. Lead with the strongest win or most important callout (1 sentence)
2. Call out one thing that's behind or slipping (1-2 sentences)
3. Give one concrete action for the upcoming week (1-2 sentences)
4. End with one-line push — not motivational fluff, just direct

If the data is mostly empty (new week, no trades, no habits tracked), acknowledge it's a reset week and suggest one specific thing to start tracking. Do not fabricate stats. Reference actual numbers from the data provided.`

    const userMessage = `Weekly stats (${weekStart.slice(0, 10)} → ${weekEnd.slice(0, 10)}):

TRADES: ${tradeCount} total, ${wins}W / ${losses}L, win rate ${winRate}%, net PnL $${netPnl}, best $${bestTrade}, worst $${worstTrade}
HABITS: ${completionRate} slots completed across ${totalHabits} habits
GOALS: ${activeGoals.length} active — ${ahead} ahead, ${onTrack} on track, ${behind} behind
JOURNAL: ${journalThisWeek} entries this week`

    let review = ''
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
      review =
        response.content[0]?.type === 'text' ? response.content[0].text : ''
    } catch (e: any) {
      review = ''
    }

    return NextResponse.json({
      weekStart,
      weekEnd,
      stats,
      review,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
