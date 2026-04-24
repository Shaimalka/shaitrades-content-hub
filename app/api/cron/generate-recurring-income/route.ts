// Recurring income cron — Sprint 1C.
//
// Fires daily at 14:15 UTC (vercel.json). For every `recurring_income:*` key,
// checks each active rule against today's UTC date and appends a new income
// entry to `finance:{userId}:income` when the scheduled day arrives.
//
// Idempotency: `lastGeneratedAt` guards against double-firing within the same
// UTC month. Running twice on the same day (or any day that month) after the
// first generation will not produce duplicates.
//
// Auth: matches repo convention — `x-cron-secret` header must equal the
// CRON_SECRET env var. If CRON_SECRET is unset, returns 500 (never allow
// unauthenticated cron access).

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import type { RecurringIncomeRule } from '@/app/api/life/finance/recurring-income/route'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

const RULES_PREFIX = 'recurring_income:'

function todayUtcDate(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function yearMonthUtc(iso: string): string {
  // Extracts YYYY-MM from an ISO timestamp in UTC.
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function parseRules(raw: unknown): RecurringIncomeRule[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as RecurringIncomeRule[]
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as RecurringIncomeRule[] } catch { return [] }
  }
  return []
}

async function scanAllRuleKeys(): Promise<string[]> {
  // Upstash SCAN returns [cursor, keys]. Loop until cursor is '0'.
  const keys: string[] = []
  let cursor: string = '0'
  do {
    const res = await redis.scan(cursor, { match: `${RULES_PREFIX}*`, count: 100 })
    // @upstash/redis returns [string | number, string[]]
    const [nextCursor, batch] = res as [string | number, string[]]
    cursor = String(nextCursor)
    if (Array.isArray(batch)) keys.push(...batch)
  } while (cursor !== '0')
  return keys
}

async function runJob() {
  const todayStr = todayUtcDate()
  const now = new Date()
  const todayDay = now.getUTCDate()
  const currentYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const nowIso = now.toISOString()

  const ruleKeys = await scanAllRuleKeys()
  let generatedTotal = 0
  const perUser: Record<string, { generated: number }> = {}

  for (const key of ruleKeys) {
    const userId = key.slice(RULES_PREFIX.length)
    if (!userId) continue

    const rules = parseRules(await redis.get(key))
    if (rules.length === 0) continue

    let mutated = false
    let generatedForUser = 0
    let incomeCache: any[] | null = null

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (!rule || rule.status !== 'active') continue

      // Day-of-month gate. If today's UTC day doesn't match, skip.
      // Edge case: a rule with dayOfMonth=30 or 31 will silently skip
      // months that don't contain that day (e.g., Feb). This matches spec —
      // we don't clamp to the last day of a short month.
      if (rule.dayOfMonth !== todayDay) continue

      // Start-date gate. startDate is YYYY-MM-DD in the user's intent.
      // Compared lexicographically vs todayStr (also YYYY-MM-DD) this works.
      if (rule.startDate > todayStr) continue

      // End-date gate. If endDate is set and today >= endDate, skip.
      if (rule.endDate && todayStr >= rule.endDate) continue

      // Idempotency guard — skip if we've already generated in this UTC month.
      if (rule.lastGeneratedAt && yearMonthUtc(rule.lastGeneratedAt) === currentYearMonth) continue

      // Load income lazily — only when we're about to append.
      if (incomeCache === null) {
        incomeCache = ((await redis.get(`finance:${userId}:income`)) as any[]) || []
      }

      const entry = {
        id: randomUUID(),
        streamId: rule.streamId,
        date: todayStr,
        amount: rule.amount,
        account: rule.account,
        source: rule.account,
        notes: rule.notes,
        createdAt: nowIso,
        recurringRuleId: rule.id,
      }
      incomeCache.push(entry)

      rules[i] = { ...rule, lastGeneratedAt: nowIso }
      mutated = true
      generatedForUser++
      generatedTotal++
    }

    if (mutated) {
      if (incomeCache) await redis.set(`finance:${userId}:income`, incomeCache)
      await redis.set(key, rules)
      perUser[userId] = { generated: generatedForUser }
    }
  }

  return {
    ranAt: nowIso,
    users: Object.keys(perUser).length,
    generated: generatedTotal,
    perUser,
  }
}

function checkAuth(req: NextRequest): NextResponse | null {
  // Refuse to run if CRON_SECRET is not configured — never allow unauthenticated access.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const fail = checkAuth(req)
  if (fail) return fail
  try {
    const result = await runJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('generate-recurring-income cron error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const fail = checkAuth(req)
  if (fail) return fail
  try {
    const result = await runJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('generate-recurring-income cron error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
