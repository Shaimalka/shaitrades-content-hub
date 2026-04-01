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

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const income = await redis.get(INCOME_KEY) || []
                const expenses = await redis.get(EXPENSES_KEY) || []
                      return NextResponse.json({ income, expenses })
    } catch (e) {
          return NextResponse.json({ income: [], expenses: [] })
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
          const income: any[] = (await redis.get(INCOME_KEY) as any[]) || []
                const expenses: any[] = (await redis.get(EXPENSES_KEY) as any[]) || []

                      if (action === 'delete' && entry?.id) {
                              if (type === 'income') {
                                        const updated = income.filter((item: any) => item.id !== entry.id)
                                        await redis.set(INCOME_KEY, updated)
                                        return NextResponse.json({ success: true, income: updated, expenses })
                              } else {
                                        const updated = expenses.filter((item: any) => item.id !== entry.id)
                                        await redis.set(EXPENSES_KEY, updated)
                                        return NextResponse.json({ success: true, income, expenses: updated })
                              }
                      }

      if (type === 'income') {
              const newIncome = {
                        ...entry,
                        id: Date.now().toString(),
                        amount: parseFloat(entry.amount) || 0,
                        createdAt: new Date().toISOString(),
              }
              const updated = [...income, newIncome]
              await redis.set(INCOME_KEY, updated)
              return NextResponse.json({ success: true, income: updated, expenses })
      } else {
              const newExpense = {
                        ...entry,
                        id: Date.now().toString(),
                        amount: parseFloat(entry.amount) || 0,
                        createdAt: new Date().toISOString(),
              }
              const updated = [...expenses, newExpense]
              await redis.set(EXPENSES_KEY, updated)
              return NextResponse.json({ success: true, income, expenses: updated })
      }
    } catch (e) {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}
