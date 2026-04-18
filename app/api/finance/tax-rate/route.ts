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
        const key = `user:${userId}:taxReservePercent`
        const value = await redis.get(key)
        const taxReservePercent = value !== null ? Number(value) : 30
        return NextResponse.json({ taxReservePercent })
  } catch {
        return NextResponse.json({ taxReservePercent: 30 })
  }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const body = await req.json()
        const { taxReservePercent } = body
        const parsed = Number(taxReservePercent)
        if (isNaN(parsed) || parsed < 1 || parsed > 99) {
                return NextResponse.json(
                  { error: 'taxReservePercent must be a number between 1 and 99' },
                  { status: 400 }
                        )
        }
        const key = `user:${userId}:taxReservePercent`
        await redis.set(key, parsed)
        return NextResponse.json({ success: true, taxReservePercent: parsed })
  } catch {
        return NextResponse.json({ error: 'Failed to save tax rate' }, { status: 500 })
  }
}
