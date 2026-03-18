export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const VIRAL_QUEUE_KEY = 'viralQueue'

// ── GET — return all scripts in the viral queue ───────────────────────────────
export async function GET() {
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

// ── PATCH — update status of a single script by index ────────────────────────
export async function PATCH(req: Request) {
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

// ── DELETE — clear all scripts from the queue ─────────────────────────────────
export async function DELETE() {
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
