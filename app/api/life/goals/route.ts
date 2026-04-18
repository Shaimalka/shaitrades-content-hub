import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export type Goal = {
  id: string
  userId: string
  type: 'trading' | 'life'
  metric: string
  target: number
  current: number
  unit: string
  timeHorizon: 'weekly' | 'monthly' | 'quarterly'
  startDate: string
  endDate: string
  title: string
  note?: string
  status: 'active' | 'completed' | 'missed'
  reflection?: string
  createdAt: string
  updatedAt: string
  // Computed on GET, not persisted
  pace?: 'ahead' | 'on_track' | 'behind'
  paceRatio?: number
  projectedFinal?: number
  daysElapsed?: number
  daysRemaining?: number
}

// Trade shape from life:trading:logs
type TradeLog = {
  id: string
  pnl?: number
  direction?: string
  entryPrice?: number
  exitPrice?: number
  contracts?: number
  createdAt?: string
  [key: string]: unknown
}

function calcEndDate(startDate: string, horizon: Goal['timeHorizon']): string {
  const start = new Date(startDate)
  const days = horizon === 'weekly' ? 7 : horizon === 'monthly' ? 30 : 90
  start.setDate(start.getDate() + days)
  return start.toISOString()
}

function redisKey(userId: string) {
  return `goals:${userId}`
}

const TRADES_KEY = 'life:trading:logs'

// ── Trading metric calculation ────────────────────────────────────────────────
function calcTradingMetric(metric: string, trades: TradeLog[]): number {
  if (trades.length === 0) return 0

  switch (metric) {
    case 'pnl':
    case 'payout': {
      return trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    }
    case 'winRate': {
      const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
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
    case 'tradeCount': {
      return trades.length
    }
    default:
      return 0
  }
}

// ── Pace + projection ─────────────────────────────────────────────────────────
function calcPace(goal: Goal & { current: number }) {
  const now = new Date()
  const start = new Date(goal.startDate)
  const end = new Date(goal.endDate)

  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const rawElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = Math.min(Math.max(0, rawElapsed), totalDays)
  const daysRemaining = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const expectedProgress = goal.target * (daysElapsed / totalDays)
  const paceRatio = expectedProgress === 0 ? 1 : goal.current / expectedProgress

  let pace: 'ahead' | 'on_track' | 'behind'
  if (paceRatio > 1.10) pace = 'ahead'
  else if (paceRatio < 0.90) pace = 'behind'
  else pace = 'on_track'

  let projectedFinal = 0
  if (daysElapsed >= 1) {
    const raw = (goal.current / daysElapsed) * totalDays
    projectedFinal = Math.min(raw, goal.target * 10)
  }

  return {
    pace,
    paceRatio: parseFloat(paceRatio.toFixed(4)),
    projectedFinal: parseFloat(projectedFinal.toFixed(2)),
    daysElapsed: parseFloat(daysElapsed.toFixed(1)),
    daysRemaining: parseFloat(daysRemaining.toFixed(1)),
  }
}

// -- GET -----------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const userId = session.user?.email ?? session.user?.name ?? 'unknown'
    const goals = ((await redis.get(redisKey(userId))) as Goal[]) || []

    // Load trades once for trading goal calc
    const allTrades = ((await redis.get(TRADES_KEY)) as TradeLog[]) || []

    const enriched = goals.map((goal) => {
      let current = goal.current

      if (goal.type === 'trading' && goal.status === 'active') {
        const start = new Date(goal.startDate)
        const end = new Date(goal.endDate)
        const windowTrades = allTrades.filter((t) => {
          const d = new Date(t.createdAt ?? 0)
          return d >= start && d <= end
        })
        current = calcTradingMetric(goal.metric, windowTrades)
      }

      const goalWithCurrent = { ...goal, current }
      const paceFields = calcPace(goalWithCurrent)

      return {
        ...goalWithCurrent,
        ...paceFields,
      }
    })

    return NextResponse.json({ goals: enriched })
  } catch {
    return NextResponse.json({ goals: [] })
  }
}

// -- POST ----------------------------------------------------------------------
// Body: full Goal minus id/createdAt/updatedAt/current/status
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const body = await req.json()
    const { type, metric, target, unit, timeHorizon, startDate, title, note } = body
    if (!type || !metric || target === undefined || !unit || !timeHorizon || !startDate || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const userId = session.user?.email ?? session.user?.name ?? 'unknown'
    const now = new Date().toISOString()
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      userId,
      type,
      metric,
      target,
      current: 0,
      unit,
      timeHorizon,
      startDate,
      endDate: calcEndDate(startDate, timeHorizon),
      title,
      note,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
    const updated = [...goals, newGoal]
    await redis.set(redisKey(userId), updated)
    return NextResponse.json({ success: true, goal: newGoal })
  } catch {
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

// -- PATCH ---------------------------------------------------------------------
// Body: { id, updates: Partial<Goal> }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const body = await req.json()
    const { id, updates } = body
    if (!id || !updates) {
      return NextResponse.json({ error: 'id and updates required' }, { status: 400 })
    }
    const userId = session.user?.email ?? session.user?.name ?? 'unknown'
    const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
    const idx = goals.findIndex((g: Goal) => g.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }
    const updated = goals.map((g: Goal) =>
      g.id === id
        ? {
            ...g,
            ...updates,
            id: g.id,
            createdAt: g.createdAt,
            userId: g.userId,
            updatedAt: new Date().toISOString(),
          }
        : g
    )
    await redis.set(redisKey(userId), updated)
    const saved = updated.find((g: Goal) => g.id === id) as Goal
    return NextResponse.json({ success: true, goal: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

// -- DELETE --------------------------------------------------------------------
// Body: { id }
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = session.user?.email ?? session.user?.name ?? 'unknown'
    const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
    const updated = goals.filter((g: Goal) => g.id !== id)
    await redis.set(redisKey(userId), updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
