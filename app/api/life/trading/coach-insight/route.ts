import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are Coach Shai — a raw, direct, no-BS trading coach. The trader just logged a trade. Give them a 1-3 sentence insight based on the trade data. Be specific to the numbers. No fluff. No corporate speak. Max 60 words. If they lost, be honest but push them forward. If they won, acknowledge it but keep them sharp.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { trade } = await req.json()
    if (!trade) return NextResponse.json({ error: 'No trade data provided' }, { status: 400 })

    const { symbol, direction, pnl, notes, entryPrice, exitPrice, contracts } = trade

    const userMessage = `Trade just logged:
- Symbol: ${symbol || 'Unknown'}
- Direction: ${direction}
- Entry: ${entryPrice}
- Exit: ${exitPrice}
- Contracts: ${contracts}
- P&L: $${typeof pnl === 'number' ? pnl.toFixed(2) : pnl}
${notes ? `- Notes: ${notes}` : ''}

Give me your insight.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const insight = (message.content[0] as any).text
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('Coach Shai insight error:', e)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
