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
    const habits = await redis.get('life:habits') || []
    const completions = await redis.get('life:habits:completions') || {}

    const systemPrompt = `You are a habit coach AI embedded in the user's Life Hub dashboard. You have access to their habits and completion history.

HABITS:
${JSON.stringify(habits, null, 2)}

RECENT COMPLETIONS (last 7 days keys):
${JSON.stringify(completions, null, 2)}

Help the user build consistent habits, analyze their streaks, suggest improvements, and keep them accountable. Be encouraging and specific.`

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
