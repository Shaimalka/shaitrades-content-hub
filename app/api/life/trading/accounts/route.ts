import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export type TradingAccount = {
    id: string
    name: string
    type: 'live' | 'propfirm' | 'paper'
    broker: string
    accountNumber: string
    startingBalance: number
    createdAt: string
    isActive?: boolean
}

function getKey(userId: string) {
    return `tradingAccounts:${userId}`
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
          const accounts = (await redis.get(getKey(session.user.email))) as TradingAccount[] | null
          return NextResponse.json({ accounts: accounts || [] })
    } catch {
          return NextResponse.json({ accounts: [] })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
          const body = await req.json()
          const { name, type, broker, accountNumber, startingBalance } = body
          if (!name || !type || !broker) {
                  return NextResponse.json({ error: 'name, type, and broker are required' }, { status: 400 })
          }
          const key = getKey(session.user.email)
          const existing = ((await redis.get(key)) as TradingAccount[] | null) || []
                const newAccount: TradingAccount = {
                        id: Date.now().toString(),
                        name: name.trim(),
                        type,
                        broker: broker.trim(),
                        accountNumber: (accountNumber || '').trim(),
                        startingBalance: parseFloat(startingBalance) || 0,
                        createdAt: new Date().toISOString(),
                        isActive: existing.length === 0,
                }
          const updated = [...existing, newAccount]
          await redis.set(key, updated)
          return NextResponse.json({ account: newAccount, accounts: updated })
    } catch {
          return NextResponse.json({ error: 'Failed to save account' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
          const { searchParams } = new URL(req.url)
          const id = searchParams.get('id')
          if (!id) {
                  return NextResponse.json({ error: 'id is required' }, { status: 400 })
          }
          const key = getKey(session.user.email)
          const existing = ((await redis.get(key)) as TradingAccount[] | null) || []
                const updated = existing.filter((a) => a.id !== id)
          // If deleted account was active, make first remaining active
      if (updated.length > 0 && !updated.some((a) => a.isActive)) {
              updated[0].isActive = true
      }
          await redis.set(key, updated)
          return NextResponse.json({ accounts: updated })
    } catch {
          return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
          const { id } = await req.json()
          if (!id) {
                  return NextResponse.json({ error: 'id is required' }, { status: 400 })
          }
          const key = getKey(session.user.email)
          const existing = ((await redis.get(key)) as TradingAccount[] | null) || []
                const updated = existing.map((a) => ({ ...a, isActive: a.id === id }))
          await redis.set(key, updated)
          return NextResponse.json({ accounts: updated })
    } catch {
          return NextResponse.json({ error: 'Failed to update active account' }, { status: 500 })
    }
}
