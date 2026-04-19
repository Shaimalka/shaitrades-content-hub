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

const TRADOVATE_LIVE = 'https://live.tradovateapi.com/v1'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const { username, password } = await req.json()
          if (!username || !password) {
                  return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
          }
          const res = await fetch(`${TRADOVATE_LIVE}/auth/accessTokenRequest`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: username, password, appId: 'ShaiHub', appVersion: '1.0', cid: 0, sec: '' }),
          })
          if (!res.ok) {
                  const err = await res.text()
                  return NextResponse.json({ error: `Tradovate error: ${err}` }, { status: res.status })
          }
          const data = await res.json()
          const { accessToken, userId: tradovateUserId, expirationTime } = data
          if (!accessToken) {
                  return NextResponse.json({ error: 'No access token returned from Tradovate' }, { status: 400 })
          }
          await redis.set(`tradovate:${userId}:token`, accessToken)
          await redis.set(`tradovate:${userId}:tradovateUserId`, tradovateUserId)
          await redis.set(`tradovate:${userId}:token:expiry`, expirationTime || new Date(Date.now() + 80 * 60 * 1000).toISOString())
          await redis.set(`tradovate:${userId}:connected`, 'true')
          return NextResponse.json({ success: true, userId: tradovateUserId })
    } catch (e: any) {
          return NextResponse.json({ error: e.message || 'Auth failed' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
          await redis.del(`tradovate:${userId}:token`)
          await redis.del(`tradovate:${userId}:tradovateUserId`)
          await redis.del(`tradovate:${userId}:token:expiry`)
          await redis.set(`tradovate:${userId}:connected`, 'false')
          return NextResponse.json({ success: true })
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const connected = await redis.get(`tradovate:${userId}:connected`)
          const lastSync = await redis.get('tradovate:lastSync')
          return NextResponse.json({ connected: connected === 'true', lastSync: lastSync || null })
    } catch {
          return NextResponse.json({ connected: false, lastSync: null })
    }
}
