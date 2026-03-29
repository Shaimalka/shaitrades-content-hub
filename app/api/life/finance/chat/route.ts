import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const income = await redis.get<any[]>('life:finance:income') || []
    const expenses = await redis.get<any[]>('life:finance:expenses') || []

    const totalIncome = income.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const netProfit = totalIncome - totalExpenses
    const taxEstimate = netProfit > 0 ? netProfit * 0.25 : 0

    const systemPrompt = `You are a personal finance AI for the user's life hub.
You have access to all their income and expense entries.

INCOME ENTRIES:
${JSON.stringify(income, null, 2)}

EXPENSE ENTRIES:
${JSON.stringify(expenses, null, 2)}

KEY METRICS:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}
- Tax Estimate (25%): $${taxEstimate.toFixed(2)}

Analyze income sources, expense categories, trends, and provide financial guidance.
Be practical and specific about taxes, savings, and optimization.
If no data, encourage the user to log their first transaction.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })

    const message = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
