import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

function getRedis() {
      return new Redis({
              url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
              token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
      })
}

const redis = getRedis()

const INCOME_KEY = 'life:finance:income'
const EXPENSES_KEY = 'life:finance:expenses'
const STREAMS_KEY = 'life:finance:streams'

// ─── Default streams ───────────────────────────────────────────────────────────
const DEFAULT_STREAMS = [
    { id: 'trading', name: 'Trading', color: '#00ff88', emoji: '📈' },
    { id: 'content', name: 'Content', color: '#00f2ff', emoji: '🎬' },
    ]

export async function GET(req: NextRequest) {
      const session = await getServerSession(authOptions)
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
      const { success } = await checkRateLimit(ip)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
          const [income, expenses, streamsRaw] = await Promise.all([
                    redis.get(INCOME_KEY),
                    redis.get(EXPENSES_KEY),
                    redis.get(STREAMS_KEY),
                  ])

        const streams = (streamsRaw as any[]) || DEFAULT_STREAMS
          // Seed defaults if not set
        if (!streamsRaw) {
                  await redis.set(STREAMS_KEY, DEFAULT_STREAMS)
        }

        return NextResponse.json({
                  income: income || [],
                  expenses: expenses || [],
                  streams,
        })
  } catch (e) {
          return NextResponse.json({ income: [], expenses: [], streams: DEFAULT_STREAMS })
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
          const { action, entry, type } = body

        const income: any[] = ((await redis.get(INCOME_KEY)) as any[]) || []
                const expenses: any[] = ((await redis.get(EXPENSES_KEY)) as any[]) || []
                        const streamsRaw = await redis.get(STREAMS_KEY)
          const streams: any[] = (streamsRaw as any[]) || DEFAULT_STREAMS

        // ── Manage streams ──────────────────────────────────────────────────────────
        if (action === 'add_stream' && body.stream) {
                  const newStream = {
                              id: Date.now().toString(),
                              name: body.stream.name,
                              color: body.stream.color || '#00ff88',
                              emoji: body.stream.emoji || '💰',
                  }
                  const updated = [...streams, newStream]
                  await redis.set(STREAMS_KEY, updated)
                  return NextResponse.json({ success: true, streams: updated, income, expenses })
        }

        if (action === 'delete_stream' && body.streamId) {
                  const updated = streams.filter((s: any) => s.id !== body.streamId)
                  await redis.set(STREAMS_KEY, updated)
                  return NextResponse.json({ success: true, streams: updated, income, expenses })
        }

        // ── Delete entry ────────────────────────────────────────────────────────────
        if (action === 'delete' && entry?.id) {
                  if (type === 'income') {
                              const updated = income.filter((item: any) => item.id !== entry.id)
                              await redis.set(INCOME_KEY, updated)
                              return NextResponse.json({ success: true, income: updated, expenses, streams })
                  } else {
                              const updated = expenses.filter((item: any) => item.id !== entry.id)
                              await redis.set(EXPENSES_KEY, updated)
                              return NextResponse.json({ success: true, income, expenses: updated, streams })
                  }
        }

        // ── Add income ──────────────────────────────────────────────────────────────
        if (type === 'income') {
                  const newIncome = {
                              ...entry,
                              id: Date.now().toString(),
                              amount: parseFloat(entry.amount) || 0,
                              createdAt: new Date().toISOString(),
                              // streamId is included in entry from the client
                  }
                  const updated = [...income, newIncome]
                  await redis.set(INCOME_KEY, updated)
                  return NextResponse.json({ success: true, income: updated, expenses, streams })
        }

        // ── Add expense ─────────────────────────────────────────────────────────────
        if (type === 'expense') {
                  const newExpense = {
                              ...entry,
                              id: Date.now().toString(),
                              amount: parseFloat(entry.amount) || 0,
                              createdAt: new Date().toISOString(),
                  }
                  const updated = [...expenses, newExpense]
                  await redis.set(EXPENSES_KEY, updated)
                  return NextResponse.json({ success: true, income, expenses: updated, streams })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
