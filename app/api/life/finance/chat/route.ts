import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
function getRedis() {
  return new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
  })
}
const redis = getRedis()

const INCOME_KEY = 'life:finance:income'
const EXPENSES_KEY = 'life:finance:expenses'

export async function POST(req: NextRequest) {
    try {
          const { messages } = await req.json()
          const income = await redis.get(INCOME_KEY) || []
                const expenses = await redis.get(EXPENSES_KEY) || []
                      const incomeArr = income as any[]
          const expensesArr = expenses as any[]

      // KEY STATS
      const totalIncome = incomeArr.reduce((s: number, e: any) => s + (e.amount || 0), 0)
          const totalExpenses = expensesArr.reduce((s: number, e: any) => s + (e.amount || 0), 0)
          const netProfit = totalIncome - totalExpenses
          const taxEstimate = netProfit > 0 ? netProfit * 0.25 : 0
          const incomeCount = incomeArr.length
          const expenseCount = expensesArr.length
          const topExpenseCategory = expensesArr.length > 0
            ? Object.entries(expensesArr.reduce((acc: any, e: any) => { acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + (e.amount || 0); return acc }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'
                  : 'N/A'

      const systemPrompt = `You are a personal finance AI embedded in the user's Life Hub. You have access to all their income and expense entries.

      INCOME ENTRIES:
      ${JSON.stringify(incomeArr, null, 2)}

      EXPENSE ENTRIES:
      ${JSON.stringify(expensesArr, null, 2)}

      KEY STATS:
      - Total Income: $${totalIncome.toFixed(2)}
      - Total Expenses: $${totalExpenses.toFixed(2)}
      - Net Profit: $${netProfit.toFixed(2)}
      - Tax Estimate (25%): $${taxEstimate.toFixed(2)}
      - Income Entries: ${incomeCount}
      - Expense Entries: ${expenseCount}
      - Top Expense Category: ${topExpenseCategory}

      Analyze income sources, expense categories, and trends. Provide practical financial guidance on budgeting, savings, and optimization strategies. If no data exists yet, encourage the user to log their first income or expense entry.`

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
