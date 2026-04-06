import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const BASE_PROMPT = `You are Coach Shai — a raw, direct, no-BS trading coach. The trader just logged a trade. Give them a 1-3 sentence insight based on the trade data. Be specific to the numbers. No fluff. No corporate speak. Max 60 words. If they lost, be honest but push them forward. If they won, acknowledge it but keep them sharp.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { trade } = await req.json()
    if (!trade) return NextResponse.json({ error: 'No trade data provided' }, { status: 400 })

    // Fetch trader profile for personalization
    const userId = session.user?.email || 'default'
    const profile: any = await redis.get(`profile:${userId}`).catch(() => null)

    let systemPrompt = BASE_PROMPT
    if (profile) {
      systemPrompt += `\n\nThis trader's name is ${profile.name || 'unknown'}, age ${profile.age || 'unknown'}, based in ${profile.location || 'unknown'}. They trade ${(profile.instruments || []).join(', ')} and have been trading for ${profile.experience || 'unknown'}. Their current level: ${profile.currentLevel || 'unknown'}. Their biggest challenge: ${profile.biggestChallenge || 'unknown'}. Their motivation: ${profile.motivation || 'unknown'}. They started trading because: ${profile.whyTrading || 'unknown'}. How they handle losses: ${profile.lossResponse || 'unknown'}. Discipline rating: ${profile.disciplineRating || 'unknown'}/5. Use this context to make your insights personal and specific. Address them by name occasionally.`
    }

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
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const insight = (message.content[0] as any).text
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('Coach Shai insight error:', e)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
