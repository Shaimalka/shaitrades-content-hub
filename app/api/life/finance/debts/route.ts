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
  originalBalance: number
  interestRate: number
  minimumPayment: number
  dueDayOfMonth?: number
  payoffDate?: string
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

// Normalize a stored debt: unconditionally strip legacy `dueDate` key and
// coalesce it into dueDayOfMonth if dueDayOfMonth is missing.
function normalizeDebt(d: any): Debt {
  if (!d || typeof d !== 'object') return d as Debt
  const { dueDate, ...rest } = d
  if (rest.dueDayOfMonth == null && dueDate != null) {
    rest.dueDayOfMonth = dueDate
  }
  return rest as Debt
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
    const raw = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    // Unconditional normalize: always strip legacy dueDate, coalesce into dueDayOfMonth
    const debts = raw.map((d: any) => normalizeDebt(d))
    return NextResponse.json({ debts })
  } catch {
    return NextResponse.json({ debts: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { name, type, balance, interestRate, minimumPayment, originalBalance?, dueDayOfMonth?, payoffDate? }
// Accepts legacy `dueDate` as an alias for dueDayOfMonth for backward compat.
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
    const { name, type, balance, interestRate, minimumPayment, originalBalance, dueDayOfMonth, payoffDate } = body
    // Backward-compat: accept legacy `dueDate` if dueDayOfMonth is not provided
    const dueDayRaw = dueDayOfMonth !== undefined && dueDayOfMonth !== null && dueDayOfMonth !== ''
      ? dueDayOfMonth
      : (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '' ? body.dueDate : undefined)

    if (!name || !type || balance === undefined || interestRate === undefined || minimumPayment === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate amount-class fields (dollar amounts: finite, non-negative, < $1T)
    const balN = Number(balance)
    if (!Number.isFinite(balN) || balN < 0 || balN >= 1e12) return NextResponse.json({ error: 'Invalid balance' }, { status: 400 })
    const minN = Number(minimumPayment)
    if (!Number.isFinite(minN) || minN < 0 || minN >= 1e12) return NextResponse.json({ error: 'Invalid minimumPayment' }, { status: 400 })
    const origN = Number(originalBalance ?? balance)
    if (!Number.isFinite(origN) || origN < 0 || origN >= 1e12) return NextResponse.json({ error: 'Invalid originalBalance' }, { status: 400 })
    let dueN: number | undefined = undefined
    if (dueDayRaw !== undefined) {
      dueN = Number(dueDayRaw)
      if (!Number.isInteger(dueN) || dueN < 1 || dueN > 31) {
        return NextResponse.json({ error: 'Invalid dueDayOfMonth' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const newDebt: Debt = {
      id: crypto.randomUUID(),
      userId,
      name,
      type,
      balance: balN,
      interestRate: Number(interestRate) || 0,
      minimumPayment: minN,
      originalBalance: origN,
      dueDayOfMonth: dueN,
      payoffDate: typeof payoffDate === 'string' && payoffDate.trim() !== '' ? payoffDate : undefined,
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
// Accepts legacy `dueDate` inside updates as an alias for dueDayOfMonth.
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

    // Backward-compat: translate legacy `dueDate` key in updates to dueDayOfMonth
    const normalizedUpdates: any = { ...updates }
    if (normalizedUpdates.dueDate !== undefined && normalizedUpdates.dueDayOfMonth === undefined) {
      normalizedUpdates.dueDayOfMonth = normalizedUpdates.dueDate
    }
    delete normalizedUpdates.dueDate

    // Validate amount-class fields if present in updates
    if (normalizedUpdates.balance !== undefined) {
      const n = Number(normalizedUpdates.balance)
      if (!Number.isFinite(n) || n < 0 || n >= 1e12) return NextResponse.json({ error: 'Invalid balance' }, { status: 400 })
      normalizedUpdates.balance = n
    }
    if (normalizedUpdates.minimumPayment !== undefined) {
      const n = Number(normalizedUpdates.minimumPayment)
      if (!Number.isFinite(n) || n < 0 || n >= 1e12) return NextResponse.json({ error: 'Invalid minimumPayment' }, { status: 400 })
      normalizedUpdates.minimumPayment = n
    }
    if (normalizedUpdates.originalBalance !== undefined) {
      const n = Number(normalizedUpdates.originalBalance)
      if (!Number.isFinite(n) || n < 0 || n >= 1e12) return NextResponse.json({ error: 'Invalid originalBalance' }, { status: 400 })
      normalizedUpdates.originalBalance = n
    }
    if (normalizedUpdates.dueDayOfMonth !== undefined) {
      const n = Number(normalizedUpdates.dueDayOfMonth)
      if (!Number.isInteger(n) || n < 1 || n > 31) return NextResponse.json({ error: 'Invalid dueDayOfMonth' }, { status: 400 })
      normalizedUpdates.dueDayOfMonth = n
    }

    const debts: Debt[] = ((await redis.get(debtsKey(userId))) as Debt[]) || []
    const idx = debts.findIndex((d: Debt) => d.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const updated = debts.map((d: Debt) => {
      if (d.id !== id) return d
      // Strip legacy dueDate key from stored debt before merging updates,
      // so a stale legacy key cannot shadow the new dueDayOfMonth.
      const { dueDate: _legacyDueDate, ...base } = d as any
      return {
        ...base,
        ...normalizedUpdates,
        id: d.id,
        userId: d.userId,
        createdAt: d.createdAt,
        updatedAt: new Date().toISOString(),
      } as Debt
    })
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
