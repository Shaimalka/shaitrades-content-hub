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

function requireUserId(session: any): string | null {
    const userId = session?.user?.email
    if (!userId) return null
    return userId
}

function incomeKey(userId: string) { return `finance:${userId}:income` }
function expensesKey(userId: string) { return `finance:${userId}:expenses` }
function streamsKey(userId: string) { return `finance:${userId}:streams` }

// ─── Default streams ──────────────────────────────────────────────────────────
const DEFAULT_STREAMS = [
  { id: 'trading', name: 'Trading', color: '#00c48c', emoji: '📈' },
  { id: 'content', name: 'Content', color: '#2563eb', emoji: '🎬' },
  ]

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const [income, expenses, streamsRaw] = await Promise.all([
                redis.get(incomeKey(userId)),
                redis.get(expensesKey(userId)),
                redis.get(streamsKey(userId)),
              ])
        const streams = (streamsRaw as any[]) || DEFAULT_STREAMS
        // Seed defaults if not set
      if (!streamsRaw) {
              await redis.set(streamsKey(userId), DEFAULT_STREAMS)
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

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const body = await req.json()
        const { action, entry, type } = body

      const income: any[] = ((await redis.get(incomeKey(userId))) as any[]) || []
            const expenses: any[] = ((await redis.get(expensesKey(userId))) as any[]) || []
                  const streamsRaw = await redis.get(streamsKey(userId))
        const streams: any[] = (streamsRaw as any[]) || DEFAULT_STREAMS

      // ── Manage streams ────────────────────────────────────────────────────────
      if (action === 'add_stream' && body.stream) {
              const newStream = {
                        id: Date.now().toString(),
                        name: body.stream.name,
                        color: body.stream.color || '#00ff88',
                        emoji: body.stream.emoji || '💰',
              }
              const updated = [...streams, newStream]
              await redis.set(streamsKey(userId), updated)
              return NextResponse.json({ success: true, streams: updated, income, expenses })
      }

      if (action === 'delete_stream' && body.streamId) {
              const updated = streams.filter((s: any) => s.id !== body.streamId)
              await redis.set(streamsKey(userId), updated)
              return NextResponse.json({ success: true, streams: updated, income, expenses })
      }

      // ── Edit income entry ─────────────────────────────────────────────────────
      if (action === 'edit_income' && typeof body.entryId === 'string' && body.patch && typeof body.patch === 'object') {
              const idx = income.findIndex((item: any) => item.id === body.entryId)
              if (idx === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
              const patch: Record<string, any> = {}
              if (typeof body.patch.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.patch.date)) patch.date = body.patch.date
              if (body.patch.amount !== undefined) {
                        const n = parseFloat(body.patch.amount)
                        if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
                        patch.amount = n
              }
              if (typeof body.patch.account === 'string') patch.account = body.patch.account.slice(0, 200)
              if (typeof body.patch.notes === 'string') patch.notes = body.patch.notes.slice(0, 500)
              const updated = [...income]
              updated[idx] = { ...updated[idx], ...patch, updatedAt: new Date().toISOString() }
              await redis.set(incomeKey(userId), updated)
              return NextResponse.json({ success: true, income: updated, expenses, streams, entry: updated[idx] })
      }

      // ── Edit expense entry ────────────────────────────────────────────────────
      if (action === 'edit_expense' && typeof body.entryId === 'string' && body.patch && typeof body.patch === 'object') {
              const idx = expenses.findIndex((item: any) => item.id === body.entryId)
              if (idx === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
              const patch: Record<string, any> = {}
              if (typeof body.patch.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.patch.date)) patch.date = body.patch.date
              if (body.patch.amount !== undefined) {
                        const n = parseFloat(body.patch.amount)
                        if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
                        patch.amount = n
              }
              if (typeof body.patch.category === 'string') patch.category = body.patch.category.slice(0, 100)
              if (typeof body.patch.vendor === 'string') patch.vendor = body.patch.vendor.slice(0, 200)
              if (typeof body.patch.notes === 'string') patch.notes = body.patch.notes.slice(0, 500)
              const updated = [...expenses]
              updated[idx] = { ...updated[idx], ...patch, updatedAt: new Date().toISOString() }
              await redis.set(expensesKey(userId), updated)
              return NextResponse.json({ success: true, income, expenses: updated, streams, entry: updated[idx] })
      }

      // ── Delete entry ──────────────────────────────────────────────────────────
      if (action === 'delete' && entry?.id) {
              if (type === 'income') {
                        const updated = income.filter((item: any) => item.id !== entry.id)
                        await redis.set(incomeKey(userId), updated)
                        return NextResponse.json({ success: true, income: updated, expenses, streams })
              } else {
                        const updated = expenses.filter((item: any) => item.id !== entry.id)
                        await redis.set(expensesKey(userId), updated)
                        return NextResponse.json({ success: true, income, expenses: updated, streams })
              }
      }

      // ── Add income ────────────────────────────────────────────────────────────
      if (type === 'income') {
              const amt = parseFloat(entry?.amount)
              if (!Number.isFinite(amt) || amt < 0 || amt >= 1e12) {
                        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
              }
              const newIncome = {
                        ...entry,
                        id: Date.now().toString(),
                        amount: amt,
                        createdAt: new Date().toISOString(),
              }
              const updated = [...income, newIncome]
              await redis.set(incomeKey(userId), updated)
              return NextResponse.json({ success: true, income: updated, expenses, streams })
      }

      // ── Add expense ───────────────────────────────────────────────────────────
      if (type === 'expense') {
              const amt = parseFloat(entry?.amount)
              if (!Number.isFinite(amt) || amt < 0 || amt >= 1e12) {
                        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
              }
              const newExpense = {
                        ...entry,
                        id: Date.now().toString(),
                        amount: amt,
                        vendor: typeof entry?.vendor === 'string' ? entry.vendor.slice(0, 200) : undefined,
                        createdAt: new Date().toISOString(),
              }
              const updated = [...expenses, newExpense]
              await redis.set(expensesKey(userId), updated)
              return NextResponse.json({ success: true, income, expenses: updated, streams })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
