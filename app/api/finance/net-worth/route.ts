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

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const [rawAssets, rawLiabilities] = await Promise.all([
                redis.get(`user:${userId}:assets`),
                redis.get(`user:${userId}:liabilities`),
              ])
        const assets = rawAssets
          ? (typeof rawAssets === 'string' ? JSON.parse(rawAssets) : rawAssets)
                : []
              const liabilities = rawLiabilities
          ? (typeof rawLiabilities === 'string' ? JSON.parse(rawLiabilities) : rawLiabilities)
                      : []
                    return NextResponse.json({ assets, liabilities })
  } catch {
        return NextResponse.json({ assets: [], liabilities: [] })
  }
}

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
              let assets: any[] = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as any[]) : []
                      if (action === 'add') assets = [...assets, item]
              else if (action === 'delete') assets = assets.filter((a) => a.id !== item.id)
              await redis.set(key, JSON.stringify(assets))
              return NextResponse.json({ assets })
      }

      if (type === 'liability') {
              const key = `user:${userId}:liabilities`
              const raw = await redis.get(key)
              let liabilities: any[] = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as any[]) : []
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
