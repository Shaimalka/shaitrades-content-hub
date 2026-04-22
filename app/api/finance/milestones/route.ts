// /api/finance/milestones
//   GET    — auto-seeds the default milestone set on first read.
//   POST   { item }            — append a new milestone.
//   PUT    { item }            — replace milestone with matching id.
//   DELETE { id }              — remove a milestone by id.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { financeKeys, DEFAULT_MILESTONES, Milestone } from '@/lib/finance-keys'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  return userId || null
}

function parseOrEmpty<T = any>(raw: unknown): T[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T[] } catch { return [] }
  }
  return raw as T[]
}

function newId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function seededDefaults(): Milestone[] {
  const now = new Date().toISOString()
  return DEFAULT_MILESTONES.map(m => ({ ...m, id: newId(), createdAt: now }))
}

async function readOrSeed(userId: string): Promise<Milestone[]> {
  const key = financeKeys.milestones(userId)
  const raw = await redis.get(key)
  if (raw === null || raw === undefined) {
    const seeded = seededDefaults()
    await redis.set(key, JSON.stringify(seeded))
    return seeded
  }
  return parseOrEmpty<Milestone>(raw)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const milestones = await readOrSeed(userId)
    return NextResponse.json({ milestones })
  } catch (err: any) {
    return NextResponse.json({ milestones: [], error: err?.message || 'Failed' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const item = body?.item
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: 'Missing item' }, { status: 400 })
    }
    const existing = await readOrSeed(userId)
    const milestone: Milestone = {
      id: item.id || newId(),
      label: String(item.label || 'Untitled'),
      type: item.type || 'net_worth',
      target: Number(item.target) || 0,
      months: item.months,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    const next = [...existing, milestone]
    await redis.set(financeKeys.milestones(userId), JSON.stringify(next))
    return NextResponse.json({ milestones: next })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const item = body?.item
    if (!item?.id) return NextResponse.json({ error: 'Missing item.id' }, { status: 400 })
    const existing = await readOrSeed(userId)
    const next = existing.map(m => (m.id === item.id ? { ...m, ...item } : m))
    await redis.set(financeKeys.milestones(userId), JSON.stringify(next))
    return NextResponse.json({ milestones: next })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const id: string | undefined = body?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const existing = await readOrSeed(userId)
    const next = existing.filter(m => m.id !== id)
    await redis.set(financeKeys.milestones(userId), JSON.stringify(next))
    return NextResponse.json({ milestones: next })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete' }, { status: 500 })
  }
}
