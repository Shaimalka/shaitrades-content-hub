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
    const logs = await redis.get('life:trading:logs') || []

    const wins = (logs as any[]).filter((t: any) => t.pnl > 0).length
    const totalTrades = (logs as any[]).length
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0'
    const totalPnl = (logs as any[]).reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

    const systemPrompt = `You are a trading journal AI analyst for the user's Life Hub. You have access to their complete trade log.

TRADE LOG DATA:
${JSON.stringify(logs, null, 2)}

KEY STATS:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Total P&L: $${totalPnl.toFixed(2)}
- Wins: ${wins} | Losses: ${totalTrades - wins}

Analyze trading patterns, identify areas for improvement, and provide actionable insights. Be direct and data-driven. If no data is available, encourage the user to log their first trade.`

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
