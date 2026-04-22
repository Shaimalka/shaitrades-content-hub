// /api/finance/snapshots
//   GET    ?range=30d|90d|1y|all   — returns snapshots filtered by range,
//                                     lazy-fills today's auto snapshot first.
//   POST   { date?, note? }        — appends a manual snapshot for the given
//                                     local date (defaults to local-today).
//   DELETE { id }                  — removes a snapshot by id.
//
// Inline Upstash client per repo convention. user:email = userId.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { financeKeys, SNAPSHOTS_MAX, NetWorthSnapshot, FinancePreferences } from '@/lib/finance-keys'
import { computeSnapshot, ensureAutoSnapshotForToday } from '@/lib/finance-snapshot'

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

function parsePrefs(raw: unknown): FinancePreferences {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as FinancePreferences } catch { return {} }
  }
  return raw as FinancePreferences
}

function localTodayInTz(tz: string | undefined): string {
  const safeTz = tz || 'UTC'
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(new Date())
  } catch {
    const d = new Date()
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
}

function rangeCutoffISO(range: string | null): string | null {
  if (!range || range === 'all') return null
  const now = new Date()
  const days = range === '30d' ? 30 : range === '90d' ? 90 : range === '1y' ? 365 : null
  if (!days) return null
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoff.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  redis.sadd(financeKeys.userIndex, userId).catch(() => {})

  try {
    const prefs = parsePrefs(await redis.get(financeKeys.preferences(userId)))
    const localToday = localTodayInTz(prefs.timezone)
    await ensureAutoSnapshotForToday(userId, localToday).catch(() => {})

    const raw = await redis.get(financeKeys.snapshots(userId))
    const all = parseOrEmpty<NetWorthSnapshot>(raw)
    const range = req.nextUrl.searchParams.get('range')
    const cutoff = rangeCutoffISO(range)
    const filtered = cutoff
      ? all.filter(s => s.date >= cutoff)
      : all
    filtered.sort((a, b) => a.date.localeCompare(b.date))
    return NextResponse.json({ snapshots: filtered })
  } catch (err: any) {
    return NextResponse.json({ snapshots: [], error: err?.message || 'Failed' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  redis.sadd(financeKeys.userIndex, userId).catch(() => {})

  try {
    const body = await req.json().catch(() => ({}))
    const date: string | undefined = body?.date
    const prefs = parsePrefs(await redis.get(financeKeys.preferences(userId)))
    const finalDate = date || localTodayInTz(prefs.timezone)

    const snap = await computeSnapshot(userId, { date: finalDate, source: 'manual' })
    const key = financeKeys.snapshots(userId)
    const raw = await redis.get(key)
    const existing = parseOrEmpty<NetWorthSnapshot>(raw)
    const next = [...existing, snap].slice(-SNAPSHOTS_MAX)
    await redis.set(key, JSON.stringify(next))
    return NextResponse.json({ snapshot: snap })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save snapshot' }, { status: 500 })
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

    const key = financeKeys.snapshots(userId)
    const raw = await redis.get(key)
    const snapshots = parseOrEmpty<NetWorthSnapshot>(raw)
    const next = snapshots.filter(s => s.id !== id)
    await redis.set(key, JSON.stringify(next))
    return NextResponse.json({ snapshots: next })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete' }, { status: 500 })
  }
}
