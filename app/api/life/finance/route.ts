import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  try {
    const income = await redis.get('life:finance:income') || []
    const expenses = await redis.get('life:finance:expenses') || []
    return NextResponse.json({ income, expenses })
  } catch (e) {
    return NextResponse.json({ income: [], expenses: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry, type } = body

    if (action === 'delete') {
      if (type === 'income') {
        const income: any[] = (await redis.get('life:finance:income') as any[]) || []
        const updated = income.filter((i: any) => i.id !== entry.id)
        await redis.set('life:finance:income', updated)
        const expenses = await redis.get('life:finance:expenses') || []
        return NextResponse.json({ income: updated, expenses })
      } else {
        const expenses: any[] = (await redis.get('life:finance:expenses') as any[]) || []
        const updated = expenses.filter((e: any) => e.id !== entry.id)
        await redis.set('life:finance:expenses', updated)
        const income = await redis.get('life:finance:income') || []
        return NextResponse.json({ income, expenses: updated })
      }
    }

    if (type === 'income') {
      const income: any[] = (await redis.get('life:finance:income') as any[]) || []
      const newIncome = {
        id: Date.now().toString(),
        date: entry.date || new Date().toISOString().split('T')[0],
        source: entry.source || 'Other',
        amount: parseFloat(entry.amount) || 0,
        notes: entry.notes || '',
        createdAt: new Date().toISOString(),
      }
      income.push(newIncome)
      await redis.set('life:finance:income', income)
      const expenses = await redis.get('life:finance:expenses') || []
      return NextResponse.json({ income, expenses })
    } else {
      const expenses: any[] = (await redis.get('life:finance:expenses') as any[]) || []
      const newExpense = {
        id: Date.now().toString(),
        date: entry.date || new Date().toISOString().split('T')[0],
        category: entry.category || 'Other',
        amount: parseFloat(entry.amount) || 0,
        notes: entry.notes || '',
        createdAt: new Date().toISOString(),
      }
      expenses.push(newExpense)
      await redis.set('life:finance:expenses', expenses)
      const income = await redis.get('life:finance:income') || []
      return NextResponse.json({ income, expenses })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save finance entry' }, { status: 500 })
  }
}
