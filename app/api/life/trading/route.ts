import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:trading:logs'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const logs = await redis.get(KEY) || []
                return NextResponse.json({ logs })
    } catch (e) {
          return NextResponse.json({ logs: [] })
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
          const { action, entry } = body
          const logs: any[] = (await redis.get(KEY) as any[]) || []
                if (action === 'delete' && entry?.id) {
                        const updated = logs.filter((l: any) => l.id !== entry.id)
                        await redis.set(KEY, updated)
                        return NextResponse.json({ success: true, logs: updated })
                }
          const pnl = entry.direction === 'Long'
            ? (entry.exitPrice - entry.entryPrice) * entry.contracts
                  : (entry.entryPrice - entry.exitPrice) * entry.contracts
          const newLog = {
                  ...entry,
                  id: Date.now().toString(),
                  pnl: parseFloat(pnl.toFixed(2)),
                  createdAt: new Date().toISOString(),
          }
          const updated = [...logs, newLog]
          await redis.set(KEY, updated)
          return NextResponse.json({ success: true, logs: updated })
    } catch (e) {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}
