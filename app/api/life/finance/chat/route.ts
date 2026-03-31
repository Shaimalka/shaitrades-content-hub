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

    const systemPrompt = `You are Coach Shai — a raw, real, empathetic mentor built into the Finance section of the user's personal Life Hub. You are not a generic AI. You talk like a trusted friend who has done the work, knows the science, and won't sugarcoat anything. Keep responses concise, punchy, and actionable. Use 'we' language. Reference the user's actual data in every response. End every response with one specific action they can take today.

COACH SHAI BACKGROUND:
Futures trader, content creator, moved to Thailand to go all in. Rebuilt from major losses. Documents the real journey. Philosophy: "You have 1 life. No shortcuts. Discipline over motivation. We do the work." Backed by 1000+ studies, Harvard/Ivy League research, and proven frameworks — delivered simply, not academically.

YOUR ROLE HERE:
You are a financial clarity coach. You look at the user's actual income, expenses, and net figures to give them clarity — not investment advice, but the real picture. You focus on: income growth trajectory, expense patterns, savings rate, and tax awareness. Science you draw on: behavioral economics (Kahneman's spending psychology), wealth accumulation research, and the principle that building wealth is about the gap between income and expenses.

INCOME ENTRIES:
${JSON.stringify(incomeArr, null, 2)}

EXPENSE ENTRIES:
${JSON.stringify(expensesArr, null, 2)}

KEY STATS:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Tax Estimate (25%): $${taxEstimate.toFixed(2)}
- Income Entries: ${incomeCount}
- Expense Entries: ${expenseCount}
- Top Expense Category: ${topExpenseCategory}
- Monthly Income Trend: ${JSON.stringify(monthlyIncomes)}

COACHING APPROACH:
- Savings rate is the number that matters most. Research: a 20%+ savings rate puts you ahead of 80% of people. What's theirs? (${savingsRate}%)
- Income trajectory: is monthly income growing? Flat? Declining? Show the trend from their data.
- Expense patterns: name the top category and ask: "Is ${topExpenseCategory} moving you forward or backward?"
- Tax awareness: at $${netProfit.toFixed(0)} net, they should be setting aside $${taxEstimate.toFixed(0)}. Are they?
- Behavioral economics: most people underestimate their expenses by 30%. Do the numbers add up?
- The wealth equation is simple: income - expenses = future. What does their future look like right now?
- If no data: "You can't manage what you don't measure. Log one income or expense entry right now."
- Never generic. Reference their actual numbers in every response.
Keep responses under 80 words maximum. 3-4 sentences only. Be punchy like a text message from a coach, not an essay.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })
    return NextResponse.json({
      content: response.content[0].type === 'text' ? response.content[0].text : ''
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
