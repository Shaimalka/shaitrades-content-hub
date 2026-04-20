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

export type ExpenseEntry = {
  id: string
  userId: string
  amount: number
  category:
    | 'living'
    | 'trading_business'
    | 'subscriptions'
    | 'food'
    | 'transport'
    | 'health'
    | 'entertainment'
    | 'other'
  label?: string
  date: string
  recurring: boolean
  note?: string
  createdAt: string
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

// Matches existing finance route key namespace (finance:${userId}:expenses)
function expensesKey(userId: string) {
  return `finance:${userId}:expenses`
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
    const expenses = ((await redis.get(expensesKey(userId))) as ExpenseEntry[]) || []
    return NextResponse.json({ expenses })
  } catch {
    return NextResponse.json({ expenses: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { amount, category, label?, date, recurring, note? }
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
    const { amount, category, label, date, recurring, note } = body

    if (amount === undefined || !category || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newEntry: ExpenseEntry = {
      id: crypto.randomUUID(),
      userId,
      amount: Number(amount) || 0,
      category,
      ...(label !== undefined && { label }),
      date,
      recurring: Boolean(recurring),
      ...(note !== undefined && { note }),
      createdAt: now,
    }

    const expenses: ExpenseEntry[] = ((await redis.get(expensesKey(userId))) as ExpenseEntry[]) || []
    const updated = [...expenses, newEntry]
    await redis.set(expensesKey(userId), updated)
    return NextResponse.json({ success: true, entry: newEntry })
  } catch {
    return NextResponse.json({ error: 'Failed to create expense entry' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<ExpenseEntry> }
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

    const expenses: ExpenseEntry[] = ((await redis.get(expensesKey(userId))) as ExpenseEntry[]) || []
    const idx = expenses.findIndex((e: ExpenseEntry) => e.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 })
    }

    const updated = expenses.map((e: ExpenseEntry) =>
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
    await redis.set(expensesKey(userId), updated)
    const saved = updated.find((e: ExpenseEntry) => e.id === id) as ExpenseEntry
    return NextResponse.json({ success: true, entry: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update expense entry' }, { status: 500 })
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

    const expenses: ExpenseEntry[] = ((await redis.get(expensesKey(userId))) as ExpenseEntry[]) || []
    const updated = expenses.filter((e: ExpenseEntry) => e.id !== id)
    await redis.set(expensesKey(userId), updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete expense entry' }, { status: 500 })
  }
}
