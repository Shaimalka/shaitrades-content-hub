import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

    const newEntry = {
      ...entry,
      id: Date.now().toString(),
      pnl: Math.round(pnl * 100) / 100,
      createdAt: new Date().toISOString(),
    }
    const updated = [...logs, newEntry]
    await redis.set(KEY, updated)
    return NextResponse.json({ success: true, logs: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
