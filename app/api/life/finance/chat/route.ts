import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

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
