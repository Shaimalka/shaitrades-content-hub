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

export type IncomeEntry = {
  id: string
  userId: string
  amount: number
  source: 'trading_payout' | 'content' | 'salary' | 'freelance' | 'other'
  sourceLabel?: string
  date: string
  note?: string
  createdAt: string
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

// Matches existing finance route key namespace (finance:${userId}:income)
function incomeKey(userId: string) {
  return `finance:${userId}:income`
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
    const income = ((await redis.get(incomeKey(userId))) as IncomeEntry[]) || []
    return NextResponse.json({ income })
  } catch {
    return NextResponse.json({ income: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { amount, source, sourceLabel?, date, note? }
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
    const { amount, source, sourceLabel, date, note } = body

    if (amount === undefined || !source || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newEntry: IncomeEntry = {
      id: crypto.randomUUID(),
      userId,
      amount: Number(amount) || 0,
      source,
      ...(sourceLabel !== undefined && { sourceLabel }),
      date,
      ...(note !== undefined && { note }),
      createdAt: now,
    }

    const income: IncomeEntry[] = ((await redis.get(incomeKey(userId))) as IncomeEntry[]) || []
    const updated = [...income, newEntry]
    await redis.set(incomeKey(userId), updated)
    return NextResponse.json({ success: true, entry: newEntry })
  } catch {
    return NextResponse.json({ error: 'Failed to create income entry' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<IncomeEntry> }
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

    const income: IncomeEntry[] = ((await redis.get(incomeKey(userId))) as IncomeEntry[]) || []
    const idx = income.findIndex((e: IncomeEntry) => e.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Income entry not found' }, { status: 404 })
    }

    const updated = income.map((e: IncomeEntry) =>
      e.id === id
        ? {
            ...e,
            ...updates,
            id: e.id,
            userId: e.userId,
            createdAt: e.createdAt,
          }
        : e
    )
    await redis.set(incomeKey(userId), updated)
    const saved = updated.find((e: IncomeEntry) => e.id === id) as IncomeEntry
    return NextResponse.json({ success: true, entry: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update income entry' }, { status: 500 })
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

    const income: IncomeEntry[] = ((await redis.get(incomeKey(userId))) as IncomeEntry[]) || []
    const updated = income.filter((e: IncomeEntry) => e.id !== id)
    await redis.set(incomeKey(userId), updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete income entry' }, { status: 500 })
  }
}
