export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { Redis } from '@upstash/redis'

const VIRAL_QUEUE_KEY = 'viralQueue'

// ââ GET â return all scripts in the viral queue âââââââââââââââââââââââââââââ
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
    try {
          const queue: any[] = (await redis.get<any[]>(VIRAL_QUEUE_KEY)) ?? []
                return NextResponse.json({ scripts: queue, total: queue.length })
    } catch (error: any) {
          console.error('GET /api/viral-queue error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ââ PATCH â update status of a single script by index ââââââââââââââââââââââ
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
    try {
          const { index, status } = await req.json()
          const queue: any[] = (await redis.get<any[]>(VIRAL_QUEUE_KEY)) ?? []
                if (index >= 0 && index < queue.length) {
                        queue[index] = { ...queue[index], status }
                        await redis.set(VIRAL_QUEUE_KEY, queue)
                }
          return NextResponse.json({ success: true })
    } catch (error: any) {
          console.error('PATCH /api/viral-queue error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ââ DELETE â clear all scripts from the queue âââââââââââââââââââââââââââââââ
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
    try {
          await redis.set(VIRAL_QUEUE_KEY, [])
          return NextResponse.json({ success: true })
    } catch (error: any) {
          console.error('DELETE /api/viral-queue error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
