// FIRM_PRESETS — for use in the UI account creation dropdown
// These are the supported firm options when creating an account.
export const FIRM_PRESETS = [
  'Apex Trader Funding',
  'Topstep',
  'Take Profit Trader',
  'Earn2Trade',
  'My Funded Futures',
  'Uprofit',
  'Bulenox',
  'FundedNext Futures',
  'IBKR',
  'Tradovate Direct',
  'NinjaTrader Brokerage',
  'Other',
]

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

// Redis key pattern: accounts:{userId} — JSON array of Account objects
function redisKey(userId: string) {
  return `accounts:${userId}`
}

export type Account = {
  id: string                 // uuid
  userId: string             // from auth session
  name: string               // user-entered, e.g. "Apex 50k Eval" or "IBKR Live"
  firm: string               // free text or preset from FIRM_PRESETS
  type: 'prop_eval' | 'prop_funded' | 'live'
  startingBalance: number    // initial balance (prop: account size; live: starting capital)
  currentBalance?: number    // optional, user-updated, for live accounts mostly
  drawdownLimit?: number     // prop only — max drawdown in dollars
  status: 'active' | 'passed' | 'failed' | 'closed'
  createdAt: string
  updatedAt: string
}

// -- GET -----------------------------------------------------------------------
// Returns { accounts: Account[] } for the authenticated user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const accounts = ((await redis.get(redisKey(userId))) as Account[]) || []
    return NextResponse.json({ accounts })
  } catch {
    return NextResponse.json({ accounts: [] })
  }
}

// -- POST ----------------------------------------------------------------------
// Body: { name, firm, type, startingBalance, drawdownLimit? }
// Server generates id, timestamps, sets status='active'
// currentBalance defaults to startingBalance
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { name, firm, type, startingBalance, drawdownLimit } = body

    if (!name || !firm || !type || startingBalance === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const now = new Date().toISOString()

    const newAccount: Account = {
      id: crypto.randomUUID(),
      userId,
      name,
      firm,
      type,
      startingBalance,
      currentBalance: startingBalance,
      ...(drawdownLimit !== undefined && { drawdownLimit }),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const accounts: Account[] = ((await redis.get(redisKey(userId))) as Account[]) || []
    const updated = [...accounts, newAccount]
    await redis.set(redisKey(userId), updated)

    return NextResponse.json({ success: true, account: newAccount })
  } catch {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

// -- PATCH ---------------------------------------------------------------------
// Body: { id, updates: Partial<Account> }
// Merges updates, preserves id/createdAt/userId, updates updatedAt
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json({ error: 'id and updates required' }, { status: 400 })
    }

    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const accounts: Account[] = ((await redis.get(redisKey(userId))) as Account[]) || []

    const idx = accounts.findIndex((a: Account) => a.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const updated = accounts.map((a: Account) =>
      a.id === id
        ? {
            ...a,
            ...updates,
            id: a.id,
            createdAt: a.createdAt,
            userId: a.userId,
            updatedAt: new Date().toISOString(),
          }
        : a
    )

    await redis.set(redisKey(userId), updated)
    const saved = updated.find((a: Account) => a.id === id) as Account
    return NextResponse.json({ success: true, account: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

// -- DELETE --------------------------------------------------------------------
// Body: { id }
// Removes account from array.
// NOTE: Does NOT cascade-delete trades. Trades keep their accountId reference
// even if the account is deleted — they will show as "unassigned."
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const accounts: Account[] = ((await redis.get(redisKey(userId))) as Account[]) || []
    const updated = accounts.filter((a: Account) => a.id !== id)
    await redis.set(redisKey(userId), updated)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
