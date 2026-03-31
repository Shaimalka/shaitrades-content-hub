import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const TRADOVATE_LIVE = 'https://live.tradovateapi.com/v1'

// POST /api/tradovate/auth — authenticate with username + password
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const res = await fetch(`${TRADOVATE_LIVE}/auth/accessTokenRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: username,
        password,
        appId: 'ShaiHub',
        appVersion: '1.0',
        cid: 0,
        sec: '',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Tradovate error: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    const { accessToken, userId, expirationTime } = data

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token returned from Tradovate' }, { status: 400 })
    }

    // Store token (never store the password)
    await redis.set('tradovate:token', accessToken)
    await redis.set('tradovate:userId', userId)
    await redis.set('tradovate:token:expiry', expirationTime || new Date(Date.now() + 80 * 60 * 1000).toISOString())
    await redis.set('tradovate:connected', 'true')

    return NextResponse.json({ success: true, userId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Auth failed' }, { status: 500 })
  }
}

// DELETE /api/tradovate/auth — disconnect
export async function DELETE() {
  try {
    await redis.del('tradovate:token')
    await redis.del('tradovate:userId')
    await redis.del('tradovate:token:expiry')
    await redis.set('tradovate:connected', 'false')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/tradovate/auth — check connection status (proxied via /api/tradovate/status)
export async function GET() {
  try {
    const connected = await redis.get('tradovate:connected')
    const lastSync = await redis.get('tradovate:lastSync')
    return NextResponse.json({
      connected: connected === 'true',
      lastSync: lastSync || null,
    })
  } catch {
    return NextResponse.json({ connected: false, lastSync: null })
  }
}
