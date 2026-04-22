// ORPHANED — do not call from UI, see FinanceClient.
// Orphaned pending cleanup PR; see Net Worth overhaul Phase A.
// UI reads/writes assets via /api/finance/net-worth (single key: user:${userId}:assets).
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

export type Asset = {
  id: string
  userId: string
  name: string
  type: 'cash' | 'trading_account' | 'investment' | 'crypto' | 'real_estate' | 'other'
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
function assetsKey(userId: string) {
  return `user:${userId}:assets`
}

// Parse tolerant: value may be stored as stringified JSON (net-worth route) or native array.
async function readAssets(userId: string): Promise<Asset[]> {
  const raw = await redis.get(assetsKey(userId))
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Asset[]
    } catch {
      return []
    }
  }
  return raw as Asset[]
}

// Write stringified JSON to stay compatible with the net-worth route reader.
async function writeAssets(userId: string, assets: Asset[]): Promise<void> {
  await redis.set(assetsKey(userId), JSON.stringify(assets))
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
    const assets = await readAssets(userId)
    return NextResponse.json({ assets })
  } catch {
    return NextResponse.json({ assets: [] })
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
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      userId,
      name,
      type,
      value: Number(value) || 0,
      createdAt: now,
      updatedAt: now,
    }

    const assets = await readAssets(userId)
    const updated = [...assets, newAsset]
    await writeAssets(userId, updated)
    return NextResponse.json({ success: true, asset: newAsset })
  } catch {
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}

// -- PATCH --------------------------------------------------------------------
// Body: { id, updates: Partial<Asset> }
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

    const assets = await readAssets(userId)
    const idx = assets.findIndex((a: Asset) => a.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const updated = assets.map((a: Asset) =>
      a.id === id
        ? {
            ...a,
            ...updates,
            id: a.id,
            userId: a.userId,
            createdAt: a.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : a
    )
    await writeAssets(userId, updated)
    const saved = updated.find((a: Asset) => a.id === id) as Asset
    return NextResponse.json({ success: true, asset: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
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

    const assets = await readAssets(userId)
    const updated = assets.filter((a: Asset) => a.id !== id)
    await writeAssets(userId, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
  }
}
