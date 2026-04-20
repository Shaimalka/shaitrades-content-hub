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

export type FinanceSettings = {
  userId: string
  monthlyIncomeEstimate?: number
  monthlyExpenseEstimate?: number
  taxReservePercent: number
  riskTolerance: 'conservative' | 'balanced' | 'aggressive'
  emergencyFundTargetMonths: number
  updatedAt: string
}

const DEFAULT_SETTINGS: Omit<FinanceSettings, 'userId' | 'updatedAt'> = {
  taxReservePercent: 0.25,
  riskTolerance: 'balanced',
  emergencyFundTargetMonths: 6,
}

function requireUserId(session: any): string | null {
  const userId = session?.user?.email
  if (!userId) return null
  return userId
}

function financeSettingsKey(userId: string) {
  return `financeSettings:${userId}`
}

// Legacy tax-rate key used by app/api/finance/tax-rate (stored as 1-99 number, not decimal).
function legacyTaxKey(userId: string) {
  return `user:${userId}:taxReservePercent`
}

async function readLegacyTaxPercent(userId: string): Promise<number | null> {
  try {
    const raw = await redis.get(legacyTaxKey(userId))
    if (raw === null || raw === undefined) return null
    const n = Number(raw)
    if (isNaN(n)) return null
    // Legacy stores 1-99 (percent). Convert to decimal to match FinanceSettings shape.
    return n > 1 ? n / 100 : n
  } catch {
    return null
  }
}

// Mirror taxReservePercent back to legacy key as 1-99 integer-ish for compatibility.
async function mirrorLegacyTaxPercent(userId: string, taxReservePercent: number): Promise<void> {
  try {
    const legacyValue = taxReservePercent > 1 ? taxReservePercent : Math.round(taxReservePercent * 100)
    await redis.set(legacyTaxKey(userId), legacyValue)
  } catch {
    // best-effort mirror — do not fail the primary write
  }
}

// -- GET ----------------------------------------------------------------------
// Returns the FinanceSettings object, seeding defaults (and hydrating
// taxReservePercent from the legacy key if present) on first read.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = requireUserId(session)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const existing = (await redis.get(financeSettingsKey(userId))) as FinanceSettings | null
    if (existing) {
      return NextResponse.json({ settings: existing })
    }

    const legacyTax = await readLegacyTaxPercent(userId)
    const settings: FinanceSettings = {
      userId,
      ...DEFAULT_SETTINGS,
      ...(legacyTax !== null && { taxReservePercent: legacyTax }),
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json({ settings })
  } catch {
    const settings: FinanceSettings = {
      userId,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json({ settings })
  }
}

// -- POST (upsert) ------------------------------------------------------------
// Body: Partial<FinanceSettings> (userId and updatedAt are server-controlled)
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
    const {
      monthlyIncomeEstimate,
      monthlyExpenseEstimate,
      taxReservePercent,
      riskTolerance,
      emergencyFundTargetMonths,
    } = body

    const existing = ((await redis.get(financeSettingsKey(userId))) as FinanceSettings | null) || null
    const legacyTax = existing ? null : await readLegacyTaxPercent(userId)

    const merged: FinanceSettings = {
      userId,
      taxReservePercent:
        taxReservePercent !== undefined
          ? Number(taxReservePercent)
          : existing?.taxReservePercent ??
            (legacyTax !== null ? legacyTax : DEFAULT_SETTINGS.taxReservePercent),
      riskTolerance:
        riskTolerance !== undefined
          ? riskTolerance
          : existing?.riskTolerance ?? DEFAULT_SETTINGS.riskTolerance,
      emergencyFundTargetMonths:
        emergencyFundTargetMonths !== undefined
          ? Number(emergencyFundTargetMonths)
          : existing?.emergencyFundTargetMonths ?? DEFAULT_SETTINGS.emergencyFundTargetMonths,
      ...(monthlyIncomeEstimate !== undefined
        ? { monthlyIncomeEstimate: Number(monthlyIncomeEstimate) }
        : existing?.monthlyIncomeEstimate !== undefined
        ? { monthlyIncomeEstimate: existing.monthlyIncomeEstimate }
        : {}),
      ...(monthlyExpenseEstimate !== undefined
        ? { monthlyExpenseEstimate: Number(monthlyExpenseEstimate) }
        : existing?.monthlyExpenseEstimate !== undefined
        ? { monthlyExpenseEstimate: existing.monthlyExpenseEstimate }
        : {}),
      updatedAt: new Date().toISOString(),
    }

    await redis.set(financeSettingsKey(userId), merged)
    // Mirror to legacy key so app/api/finance/tax-rate stays consistent.
    await mirrorLegacyTaxPercent(userId, merged.taxReservePercent)

    return NextResponse.json({ success: true, settings: merged })
  } catch {
    return NextResponse.json({ error: 'Failed to save finance settings' }, { status: 500 })
  }
}
