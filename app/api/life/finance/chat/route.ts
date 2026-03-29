import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const income = await redis.get('life:finance:income') || []
    const expenses = await redis.get('life:finance:expenses') || []

    const totalIncome = (income as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const totalExpenses = (expenses as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const netProfit = totalIncome - totalExpenses
    const taxEstimate = netProfit > 0 ? netProfit * 0.25 : 0

    const systemPrompt = `You are a personal finance AI embedded in the user's Life Hub. You have access to all their income and expense entries.

INCOME ENTRIES:
${JSON.stringify(income, null, 2)}

EXPENSE ENTRIES:
${JSON.stringify(expenses, null, 2)}

KEY METRICS:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}
- Tax Estimate (25%): $${taxEstimate.toFixed(2)}

Analyze income sources, expense categories, trends, and provide practical financial guidance. Be specific about taxes, savings, and optimization strategies.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })

    return NextResponse.json({ content: response.content[0].type === 'text' ? response.content[0].text : '' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
