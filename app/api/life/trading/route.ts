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

      // Use pnl directly from the form (already parsed as a number in submitTrade).
      // Only fall back to price-based calculation when pnl is not provided
      // (e.g. Tradovate sync imports that send entryPrice / exitPrice instead).
      let pnl: number
        if (typeof entry.pnl === 'number' && !isNaN(entry.pnl)) {
                pnl = entry.pnl
        } else if (entry.exitPrice != null && entry.entryPrice != null) {
                const raw =
                          entry.direction === 'Long'
                    ? (entry.exitPrice - entry.entryPrice) * entry.contracts
                            : (entry.entryPrice - entry.exitPrice) * entry.contracts
                pnl = parseFloat(raw.toFixed(2))
        } else {
                pnl = 0
        }

      const newLog = {
              ...entry,
              id: Date.now().toString(),
              pnl,
              createdAt: new Date().toISOString(),
      }

      const updated = [...logs, newLog]
        await redis.set(KEY, updated)
        return NextResponse.json({ success: true, logs: updated })
  } catch (e) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const body = await req.json()
        const { id, ...updatedFields } = body

      if (!id) return NextResponse.json({ error: 'Missing trade id' }, { status: 400 })

      const logs: any[] = (await redis.get(KEY) as any[]) || []
            const idx = logs.findIndex((l: any) => l.id === id)
        if (idx === -1) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

      const existing = logs[idx]

      // Use pnl directly from the update payload when provided (manual form edits).
      // Only recalculate from prices when pnl is absent (Tradovate-style updates).
      let pnl: number
        if (typeof updatedFields.pnl === 'number' && !isNaN(updatedFields.pnl)) {
                pnl = updatedFields.pnl
        } else if (
                (updatedFields.exitPrice ?? existing.exitPrice) != null &&
                (updatedFields.entryPrice ?? existing.entryPrice) != null
              ) {
                const direction = updatedFields.direction ?? existing.direction
                const exitPrice = updatedFields.exitPrice ?? existing.exitPrice
                const entryPrice = updatedFields.entryPrice ?? existing.entryPrice
                const contracts = updatedFields.contracts ?? existing.contracts
                const raw =
                          direction === 'Long'
                    ? (exitPrice - entryPrice) * contracts
                            : (entryPrice - exitPrice) * contracts
                pnl = parseFloat(raw.toFixed(2))
        } else {
                pnl = existing.pnl ?? 0
        }

      const updatedTrade = {
              ...existing,
              ...updatedFields,
              pnl,
              updatedAt: new Date().toISOString(),
      }

      const updatedLogs = [...logs]
        updatedLogs[idx] = updatedTrade
        await redis.set(KEY, updatedLogs)
        return NextResponse.json({ success: true, trade: updatedTrade, logs: updatedLogs })
  } catch (e) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
