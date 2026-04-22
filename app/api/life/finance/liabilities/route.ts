// ORPHANED — do not call from UI, see FinanceClient.
// Orphaned pending cleanup PR; see Net Worth overhaul Phase A.
// UI reads/writes liabilities via /api/finance/net-worth (single key: user:${userId}:liabilities).
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

export type Liability = {
  id: string
  userId: string
  name: string
  type: 'loan' | 'credit_card' | 'mortgage' | 'other'
  value: number
  createdAt: string
  updatedAt: string
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

// Reuses existing key used by app/api/finance/net-worth
function liabilitiesKey(userId: string) {
  return `user:${userId}:liabilities`
}

async function readLiabilities(userId: string): Promise<Liability[]> {
  const raw = await redis.get(liabilitiesKey(userId))
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Liability[]
    } catch {
      return []
    }
  }
  return raw as Liability[]
}

async function writeLiabilities(userId: string, liabilities: Liability[]): Promise<void> {
  await redis.set(liabilitiesKey(userId), JSON.stringify(liabilities))
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
    const liabilities = await readLiabilities(userId)
    return NextResponse.json({ liabilities })
  } catch {
    return NextResponse.json({ liabilities: [] })
  }
}

// -- POST ---------------------------------------------------------------------
// Body: { name, type, value }
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
    const { name, type, value } = body

    if (!name || !type || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newLiability: Liability = {
      id: crypto.randomUUID(),
      userId,
      name,
      type,
      value: Number(value) || 0,
      createdAt: now,
      updatedAt: now,
    }

    const liabilities = await readLiabilities(userId)
    const updated = [...liabilities, newLiability]
    await writeLiabilities(userId, updated)
    return NextResponse.json({ success: true, liability: newLiability })
  } catch {
    return NextResponse.json({ error: 'Failed to create liability' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<Liability> }
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

    const liabilities = await readLiabilities(userId)
    const idx = liabilities.findIndex((l: Liability) => l.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Liability not found' }, { status: 404 })
    }

    const updated = liabilities.map((l: Liability) =>
      l.id === id
        ? {
            ...l,
            ...updates,
            id: l.id,
            userId: l.userId,
            createdAt: l.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : l
    )
    await writeLiabilities(userId, updated)
    const saved = updated.find((l: Liability) => l.id === id) as Liability
    return NextResponse.json({ success: true, liability: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update liability' }, { status: 500 })
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

    const liabilities = await readLiabilities(userId)
    const updated = liabilities.filter((l: Liability) => l.id !== id)
    await writeLiabilities(userId, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete liability' }, { status: 500 })
  }
}
