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

export type Debt = {
  id: string
  userId: string
  name: string
  type: 'credit_card' | 'student_loan' | 'personal_loan' | 'mortgage' | 'auto_loan' | 'other'
  balance: number
  interestRate: number
  minimumPayment: number
  createdAt: string
  updatedAt: string
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

function debtsKey(userId: string) {
  return `debts:${userId}`
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
    const debts = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    return NextResponse.json({ debts })
  } catch {
    return NextResponse.json({ debts: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { name, type, balance, interestRate, minimumPayment }
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
    const { name, type, balance, interestRate, minimumPayment } = body

    if (!name || !type || balance === undefined || interestRate === undefined || minimumPayment === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newDebt: Debt = {
      id: crypto.randomUUID(),
      userId,
      name,
      type,
      balance: Number(balance) || 0,
      interestRate: Number(interestRate) || 0,
      minimumPayment: Number(minimumPayment) || 0,
      createdAt: now,
      updatedAt: now,
    }

    const debts: Debt[] = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    const updated = [...debts, newDebt]
    await redis.set(debtsKey(userId), updated)
    return NextResponse.json({ success: true, debt: newDebt })
  } catch {
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<Debt> }
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

    const debts: Debt[] = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    const idx = debts.findIndex((d: Debt) => d.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const updated = debts.map((d: Debt) =>
      d.id === id
        ? {
            ...d,
            ...updates,
            id: d.id,
            userId: d.userId,
            createdAt: d.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : d
    )
    await redis.set(debtsKey(userId), updated)
    const saved = updated.find((d: Debt) => d.id === id) as Debt
    return NextResponse.json({ success: true, debt: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
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

    const debts: Debt[] = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    const updated = debts.filter((d: Debt) => d.id !== id)
    await redis.set(debtsKey(userId), updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
  }
}
