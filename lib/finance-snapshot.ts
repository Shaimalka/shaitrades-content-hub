// Compute a NetWorthSnapshot from current Redis state and (optionally)
// idempotently append today's auto snapshot for a given user.
//
// Source of truth matches /api/finance/net-worth GET so the snapshot value
// equals what the user sees on the Net Worth tab at capture time.

import { Redis } from '@upstash/redis'
import { financeKeys, SNAPSHOTS_MAX, NetWorthSnapshot } from './finance-keys'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

function parseOrEmpty<T = any>(raw: unknown): T[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T[] } catch { return [] }
  }
  return raw as T[]
}

function sumNumeric(items: any[], key: string): number {
  return items.reduce((sum, item) => {
    const v = Number(item?.[key])
    return Number.isFinite(v) ? sum + v : sum
  }, 0)
}

function newId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function computeSnapshot(
  userId: string,
  opts?: { date?: string; source?: 'auto' | 'manual' }
): Promise<NetWorthSnapshot> {
  const [rawAssets, rawLiabilities, rawDebts] = await Promise.all([
    redis.get(financeKeys.assets(userId)),
    redis.get(financeKeys.liabilities(userId)),
    redis.get(financeKeys.debts(userId)),
  ])
  const assetsArr = parseOrEmpty(rawAssets)
  const liabilitiesArr = parseOrEmpty(rawLiabilities)
  const debtsArr = parseOrEmpty(rawDebts)
  const assets = sumNumeric(assetsArr, 'value')
  const liabilities = sumNumeric(liabilitiesArr, 'value')
  const debts = sumNumeric(debtsArr, 'balance')
  const now = new Date()
  const date = opts?.date || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  return {
    id: newId(),
    date,
    source: opts?.source || 'manual',
    assets,
    liabilities,
    debts,
    netWorth: assets - liabilities - debts,
    createdAt: now.toISOString(),
  }
}

// Idempotent on (source='auto', date=localToday). Returns { created, snapshot? }.
export async function ensureAutoSnapshotForToday(
  userId: string,
  localToday: string
): Promise<{ created: boolean; snapshot?: NetWorthSnapshot }> {
  const key = financeKeys.snapshots(userId)
  const raw = await redis.get(key)
  const snapshots = parseOrEmpty<NetWorthSnapshot>(raw)
  if (snapshots.some(s => s.source === 'auto' && s.date === localToday)) {
    return { created: false }
  }
  const snap = await computeSnapshot(userId, { date: localToday, source: 'auto' })
  const next = [...snapshots, snap].slice(-SNAPSHOTS_MAX)
  await redis.set(key, JSON.stringify(next))
  return { created: true, snapshot: snap }
}
