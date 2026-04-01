import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const { messages } = await req.json()
          const income = await redis.get(INCOME_KEY) || []
                const expenses = await redis.get(EXPENSES_KEY) || []
                      const incomeArr = income as any[]
          const expensesArr = expenses as any[]
          const totalIncome = incomeArr.reduce((s: number, e: any) => s + (e.amount || 0), 0)
          const totalExpenses = expensesArr.reduce((s: number, e: any) => s + (e.amount || 0), 0)
          const netProfit = totalIncome - totalExpenses
          const taxEstimate = netProfit > 0 ? netProfit * 0.25 : 0
          const savingsRate = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0'
          const incomeCount = incomeArr.length
          const expenseCount = expensesArr.length
          const topExpenseCategory = expensesArr.length > 0
            ? Object.entries(expensesArr.reduce((acc: any, e: any) => {
                        acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + (e.amount || 0)
                        return acc
            }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'
                  : 'N/A'
          const incomeByMonth: Record<string, number> = {}
                incomeArr.forEach((e: any) => {
                        if (e.date) {
                                  const month = e.date.substring(0, 7)
                                  incomeByMonth[month] = (incomeByMonth[month] || 0) + (e.amount || 0)
                        }
                })
          const monthlyIncomes = Object.entries(incomeByMonth).sort((a, b) => a[0].localeCompare(b[0]))
          const systemPrompt = `You are Coach Shai — a raw, real, empathetic mentor built into the Finance section of the user's personal Life Hub. Keep responses under 80 words maximum. 3-4 sentences only. Be punchy like a text message from a coach, not an essay. Reference the user's actual data in every response. End every response with one specific action they can take today.\n\nKEY STATS:\n- Total Income: $${totalIncome.toFixed(2)}\n- Total Expenses: $${totalExpenses.toFixed(2)}\n- Net Profit: $${netProfit.toFixed(2)}\n- Savings Rate: ${savingsRate}%\n- Tax Estimate (25%): $${taxEstimate.toFixed(2)}\n- Income Entries: ${incomeCount}\n- Expense Entries: ${expenseCount}\n- Top Expense Category: ${topExpenseCategory}\n- Monthly Income Trend: ${JSON.stringify(monthlyIncomes)}`
          const response = await anthropic.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 1024,
                  system: systemPrompt,
                  messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          })
          return NextResponse.json({ content: response.content[0].type === 'text' ? response.content[0].text : '' })
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
