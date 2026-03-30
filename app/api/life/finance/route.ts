import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const INCOME_KEY = 'life:finance:income'
const EXPENSES_KEY = 'life:finance:expenses'

export async function GET() {
    try {
          const income = await redis.get(INCOME_KEY) || []
                const expenses = await redis.get(EXPENSES_KEY) || []
                      return NextResponse.json({ income, expenses })
    } catch (e) {
          return NextResponse.json({ income: [], expenses: [] })
    }
}

export async function POST(req: NextRequest) {
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
