import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const habits = await redis.get('life:habits') || []
    const completions = await redis.get('life:habits:completions') || {}

    const totalHabits = (habits as any[]).length
    const today = new Date().toISOString().split('T')[0]
    const todayCompletions = ((completions as any)[today] || []).length
    const totalDays = Object.keys(completions as any).length

    const systemPrompt = `You are a habit coach AI for the user's Life Hub. You have access to their habits and full completion history.

HABITS DATA:
${JSON.stringify(habits, null, 2)}

COMPLETION HISTORY:
${JSON.stringify(completions, null, 2)}

KEY STATS:
- Total Habits: ${totalHabits}
- Completed Today: ${todayCompletions} / ${totalHabits}
- Days Tracked: ${totalDays}

Help the user build consistent habits, analyze their streaks, suggest improvements, and keep them accountable. Be encouraging and specific. If no habits exist yet, encourage the user to add their first habit.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
