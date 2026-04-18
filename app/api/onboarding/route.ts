import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const key = `onboarding:${userId}`
        const value = await redis.get(key)
        return NextResponse.json({ complete: value === true || value === 'true' })
  } catch (e) {
        return NextResponse.json({ complete: false })
  }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const key = `onboarding:${userId}`
        await redis.set(key, true)
        return NextResponse.json({ success: true })
  } catch (e) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
