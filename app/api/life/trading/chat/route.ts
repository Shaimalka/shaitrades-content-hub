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

    const logs = await redis.get<any[]>('life:trading:logs') || []

    // Compute stats
    const wins = logs.filter((t: any) => t.pnl > 0).length
    const totalTrades = logs.length
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0'
    const totalPnl = logs.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
feat: create app/api/life/trading/chat/route.ts — Claude AI chat with trade log context    const systemPrompt = `You are a trading journal AI assistant for the user's personal trading hub.
You have access to their complete trade log data below. Analyze their trading patterns, performance, and provide actionable insights.

TRADE LOG DATA:
${JSON.stringify(logs, null, 2)}

KEY STATS:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Total P&L: $${totalPnl.toFixed(2)}
- Wins: ${wins} | Losses: ${totalTrades - wins}

Answer questions concisely. Focus on patterns, improvement areas, and data-driven insights. Be direct and specific.
If no data is available, encourage the user to log their first trade.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })

    const message = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ message })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
