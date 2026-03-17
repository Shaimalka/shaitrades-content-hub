import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const prompt = `You are an Instagram growth intelligence analyst specializing in the trading and finance niche.

Identify 6 Instagram accounts in the trading/finance/investing niche that are currently experiencing rapid growth (under 500k followers but growing fast). For each account provide:

1. A realistic Instagram username (format: @username)
2. Estimated follower count (10k-500k range)
3. Their niche within trading (forex, crypto, stocks, options, etc.)
4. Why they're growing fast (their unique angle/strategy)
5. Their content formula (what type of content dominates their feed)
6. Growth rate estimate (slow/moderate/fast/explosive)
7. Their main weakness or gap

Respond ONLY with a valid JSON array. No markdown, no explanation:
[
  {
    "username": "example_trader",
    "estimatedFollowers": 45000,
    "niche": "Options Trading",
    "whyGrowing": "Posts real P&L screenshots with full breakdowns",
    "contentFormula": "Daily trade breakdowns + weekly portfolio updates",
    "growthRate": "fast",
    "weakness": "No consistent posting schedule"
  }
]`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const clean = raw.replace(/```json|```/g, '').trim()

    let accounts = []
    try {
      accounts = JSON.parse(clean)
    } catch {
      accounts = []
    }

    return NextResponse.json({ accounts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch rising accounts' }, { status: 500 })
  }
}
