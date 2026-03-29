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

    const goals = await redis.get<any[]>('life:goals') || []

    // Compute stats
    const total = goals.length
    const completed = goals.filter((g: any) => g.completed).length
    const inProgress = goals.filter((g: any) => !g.completed).length

    const systemPrompt = `You are a life goals AI assistant for the user's personal life hub.
You have access to their complete goals data below. Analyze their goals, progress, and provide actionable insights.

GOALS DATA:
${JSON.stringify(goals, null, 2)}

KEY STATS:
- Total Goals: ${total}
- Completed: ${completed}
- In Progress: ${inProgress}

Answer questions concisely. Focus on patterns, improvement areas, and data-driven insights. Be direct and specific.
If no data is available, encourage the user to log their first goal.`

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
