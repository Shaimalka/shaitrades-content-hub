import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

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
