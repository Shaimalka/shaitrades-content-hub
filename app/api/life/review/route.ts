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

function requireUserId(session: any): string | null {
    const userId = session?.user?.email
    if (!userId) return null
    return userId
}

function reviewsKey(userId: string) { return `reviews:${userId}` }

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const reviews = (await redis.get(reviewsKey(userId))) || []
              return NextResponse.json({ reviews })
  } catch (e) {
        return NextResponse.json({ reviews: [] })
  }
}
