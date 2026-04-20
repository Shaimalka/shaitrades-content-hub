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

export type FinanceGoal = {
  id: string
  userId: string
  type: 'debt_payoff' | 'emergency_fund' | 'investment' | 'savings_target'
  title: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  createdAt: string
  updatedAt: string
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

function financeGoalsKey(userId: string) {
  return `financeGoals:${userId}`
}

// -- GET ----------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const goals = ((await redis.get(financeGoalsKey(userId))) as FinanceGoal[]) || []
    return NextResponse.json({ goals })
  } catch {
    return NextResponse.json({ goals: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { type, title, targetAmount, currentAmount?, targetDate? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { type, title, targetAmount, currentAmount, targetDate } = body

    if (!type || !title || targetAmount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newGoal: FinanceGoal = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      targetAmount: Number(targetAmount) || 0,
      currentAmount: Number(currentAmount) || 0,
      ...(targetDate !== undefined && { targetDate }),
      createdAt: now,
      updatedAt: now,
    }

    const goals: FinanceGoal[] = ((await redis.get(financeGoalsKey(userId))) as FinanceGoal[]) || []
    const updated = [...goals, newGoal]
    await redis.set(financeGoalsKey(userId), updated)
    return NextResponse.json({ success: true, goal: newGoal })
  } catch {
    return NextResponse.json({ error: 'Failed to create finance goal' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<FinanceGoal> }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { id, updates } = body
    if (!id || !updates) {
      return NextResponse.json({ error: 'id and updates required' }, { status: 400 })
    }

    const goals: FinanceGoal[] = ((await redis.get(financeGoalsKey(userId))) as FinanceGoal[]) || []
    const idx = goals.findIndex((g: FinanceGoal) => g.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Finance goal not found' }, { status: 404 })
    }

    const updated = goals.map((g: FinanceGoal) =>
      g.id === id
        ? {
            ...g,
            ...updates,
            id: g.id,
            userId: g.userId,
            createdAt: g.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : g
    )
    await redis.set(financeGoalsKey(userId), updated)
    const saved = updated.find((g: FinanceGoal) => g.id === id) as FinanceGoal
    return NextResponse.json({ success: true, goal: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update finance goal' }, { status: 500 })
  }
}

// -- DELETE -------------------------------------------------------------------
// Body: { id }
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const goals: FinanceGoal[] = ((await redis.get(financeGoalsKey(userId))) as FinanceGoal[]) || []
    const updated = goals.filter((g: FinanceGoal) => g.id !== id)
    await redis.set(financeGoalsKey(userId), updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete finance goal' }, { status: 500 })
  }
}
