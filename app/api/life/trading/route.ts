import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:trading:logs'

export async function GET() {
  try {
    const logs = await redis.get('life:trading:logs') || []
    return NextResponse.json({ logs })
  } catch (e) {
    return NextResponse.json({ logs: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body
    const logs: any[] = (await redis.get('life:trading:logs') as any[]) || []

    if (action === 'delete' && entry?.id) {
      const updated = logs.filter((l: any) => l.id !== entry.id)
      await redis.set(KEY, updated)
      return NextResponse.json({ success: true, logs: updated })
    }

    // Calculate P&L
    const pnl = entry.direction === 'Long'
      ? (entry.exitPrice - entry.entryPrice) * entry.contracts
      : (entry.entryPrice - entry.exitPrice) * entry.contracts
