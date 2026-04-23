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

export type IncomeGoal = { amount: number; updatedAt: string }

const DEFAULT_AMOUNT = 10000
const MAX_AMOUNT = 10_000_000

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

function incomeGoalKey(userId: string, streamId: string) {
  return `income_goal:${userId}:${streamId}`
}

function sanitizeStreamId(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s || s.length > 64) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const streamId = sanitizeStreamId(req.nextUrl.searchParams.get('streamId'))
  if (!streamId) return NextResponse.json({ error: 'streamId required' }, { status: 400 })

  try {
    const stored = (await redis.get(incomeGoalKey(userId, streamId))) as IncomeGoal | null
    if (stored && typeof stored.amount === 'number') {
      return NextResponse.json({ amount: stored.amount, updatedAt: stored.updatedAt })
    }
    return NextResponse.json({ amount: DEFAULT_AMOUNT, updatedAt: null })
  } catch {
    return NextResponse.json({ amount: DEFAULT_AMOUNT, updatedAt: null })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const streamId = sanitizeStreamId(body?.streamId ?? null)
    if (!streamId) return NextResponse.json({ error: 'streamId required' }, { status: 400 })

    const raw = Number(body?.amount)
    if (!Number.isFinite(raw) || raw < 0 || raw > MAX_AMOUNT) {
      return NextResponse.json({ error: 'amount must be a number between 0 and 10,000,000' }, { status: 400 })
    }
    const amount = Math.round(raw)

    const goal: IncomeGoal = { amount, updatedAt: new Date().toISOString() }
    await redis.set(incomeGoalKey(userId, streamId), goal)
    return NextResponse.json(goal)
  } catch {
    return NextResponse.json({ error: 'Failed to save income goal' }, { status: 500 })
  }
}
