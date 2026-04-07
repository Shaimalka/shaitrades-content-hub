import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
  })

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
          const userId = session.user?.email || 'default'
          const key = `userSettings:${userId}`
          const settings = await redis.get(key)
          return NextResponse.json({ settings: settings || null })
        } catch {
          return NextResponse.json({ settings: null })
        }
  }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
          const userId = session.user?.email || 'default'
          const key = `userSettings:${userId}`
          const body = await req.json()
          await redis.set(key, body)
          return NextResponse.json({ success: true })
        } catch {
          return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
        }
  }
