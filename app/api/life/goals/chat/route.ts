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
    const goals = await redis.get('life:goals') || []
    const checkins = await redis.get('life:goals:checkins') || []

    const systemPrompt = `You are a personal goals coach AI embedded in the user's Life Hub dashboard. You have access to their current goals and daily check-ins.

GOALS DATA:
${JSON.stringify(goals, null, 2)}

RECENT CHECK-INS (last 10):
${JSON.stringify((checkins as any[]).slice(-10), null, 2)}

Help the user stay accountable, celebrate progress, break down big goals into actionable steps, and provide strategic advice. Be motivating but realistic.`

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
