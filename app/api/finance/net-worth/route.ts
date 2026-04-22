import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

function requireUserId(session: any): string | null {
    const userId = session?.user?.email
    if (!userId) return null
    return userId
}

// Tolerant parser: Redis values may be stringified JSON or native objects/arrays.
function parseOrEmpty<T = any>(raw: unknown): T[] {
    if (!raw) return []
        if (typeof raw === 'string') {
              try { return JSON.parse(raw) as T[] } catch { return [] }
        }
    return raw as T[]
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        // Phase A: also return debts so net worth can be computed as
      //   assets − (liabilities + debts.balance).
      // The Debts tab still fetches /api/life/finance/debts on its own — this
      // key is included here as a single-call convenience for the Net Worth tab.
      const [rawAssets, rawLiabilities, rawDebts] = await Promise.all([
              redis.get(`user:${userId}:assets`),
              redis.get(`user:${userId}:liabilities`),
              redis.get(`user:${userId}:debts`),
            ])
        const assets = parseOrEmpty(rawAssets)
        const liabilities = parseOrEmpty(rawLiabilities)
        const debts = parseOrEmpty(rawDebts)
        return NextResponse.json({ assets, liabilities, debts })
  } catch {
        return NextResponse.json({ assets: [], liabilities: [], debts: [] })
  }
}

// POST accepts asset items with an optional `liquidity: 'liquid' | 'illiquid'`
// field (pass-through — stored as-is, read back by the client helper
// getAssetLiquidity which falls back to a category-based default for legacy rows).
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const body = await req.json()
        const { action, type, item } = body

      if (type === 'asset') {
              const key = `user:${userId}:assets`
              const raw = await redis.get(key)
              let assets: any[] = parseOrEmpty(raw)
              if (action === 'add') assets = [...assets, item]
              else if (action === 'delete') assets = assets.filter((a) => a.id !== item.id)
              await redis.set(key, JSON.stringify(assets))
              return NextResponse.json({ assets })
      }

      if (type === 'liability') {
              const key = `user:${userId}:liabilities`
              const raw = await redis.get(key)
              let liabilities: any[] = parseOrEmpty(raw)
              if (action === 'add') liabilities = [...liabilities, item]
              else if (action === 'delete') liabilities = liabilities.filter((l) => l.id !== item.id)
              await redis.set(key, JSON.stringify(liabilities))
              return NextResponse.json({ liabilities })
      }

      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
