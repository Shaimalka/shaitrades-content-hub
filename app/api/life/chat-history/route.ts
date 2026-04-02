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

const MAX_MESSAGES = 50

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  if (!section) return NextResponse.json({ error: 'Missing section' }, { status: 400 })

  try {
    const key = `life:chat:${section}`
    const raw = await redis.get(key)
    const messages = Array.isArray(raw) ? raw : []
    return NextResponse.json({ messages })
  } catch (e) {
    console.error('[chat-history GET] Error:', e)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const { section, messages } = body
    if (!section || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const key = `life:chat:${section}`
    const trimmed = messages.slice(-MAX_MESSAGES)
    await redis.set(key, trimmed)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[chat-history POST] Error:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
