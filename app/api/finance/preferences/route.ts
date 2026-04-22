// /api/finance/preferences
//   GET  — returns stored finance preferences (timezone, dismissedWarnings).
//   POST — merges incoming fields into stored prefs.
//          timezone is FIRST-WRITE-WINS — never overwritten once set.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { financeKeys, FinancePreferences } from '@/lib/finance-keys'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  return userId || null
}

function parsePrefs(raw: unknown): FinancePreferences {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as FinancePreferences } catch { return {} }
  }
  return raw as FinancePreferences
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const raw = await redis.get(financeKeys.preferences(userId))
    return NextResponse.json({ preferences: parsePrefs(raw) })
  } catch (err: any) {
    return NextResponse.json({ preferences: {}, error: err?.message || 'Failed' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const incoming: FinancePreferences = body?.preferences || {}

    const key = financeKeys.preferences(userId)
    const current = parsePrefs(await redis.get(key))

    const next: FinancePreferences = {
      ...current,
      timezone: current.timezone || incoming.timezone,
      dismissedWarnings: {
        ...(current.dismissedWarnings || {}),
        ...(incoming.dismissedWarnings || {}),
      },
    }

    await redis.set(key, JSON.stringify(next))
    return NextResponse.json({ preferences: next })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 })
  }
}
