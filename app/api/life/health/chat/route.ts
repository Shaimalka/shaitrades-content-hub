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
    const logs = await redis.get('life:health') || []
    const settings = await redis.get('life:health:settings') || {}

    const systemPrompt = `You are a personal health coach AI embedded in the user's Life Hub dashboard. You have access to their health logs and goals.

HEALTH SETTINGS/GOALS:
${JSON.stringify(settings, null, 2)}

RECENT HEALTH LOGS (last 14 entries):
${JSON.stringify((logs as any[]).slice(-14), null, 2)}

Analyze trends in weight, sleep, mood, energy, and gym attendance. Provide actionable health advice, celebrate improvements, and help the user reach their health goals. Be supportive and data-driven.`

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
