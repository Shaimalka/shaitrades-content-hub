// Daily auto-snapshot cron — fires once at 14:00 UTC.
// Auth pattern mirrors /api/cron/daily-scrape: header `x-cron-secret`.
//
// For each indexed user, computes localToday in their stored tz (falling
// back to UTC) and idempotently appends one auto snapshot per local day.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { financeKeys, FinancePreferences } from '@/lib/finance-keys'
import { ensureAutoSnapshotForToday } from '@/lib/finance-snapshot'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

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
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    const d = new Date()
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
}

async function runSnapshotJob() {
  const userIds: string[] = (await redis.smembers(financeKeys.userIndex)) || []
  const results: Record<string, { created: boolean; error?: string }> = {}
  for (const userId of userIds) {
    try {
      const prefs = parsePrefs(await redis.get(financeKeys.preferences(userId)))
      const localToday = localTodayInTz(prefs.timezone)
      const r = await ensureAutoSnapshotForToday(userId, localToday)
      results[userId] = { created: r.created }
    } catch (err: any) {
      results[userId] = { created: false, error: err?.message || 'failed' }
    }
  }
  return { ranAt: new Date().toISOString(), userCount: userIds.length, results }
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSnapshotJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('finance-snapshot cron error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSnapshotJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('finance-snapshot cron error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
