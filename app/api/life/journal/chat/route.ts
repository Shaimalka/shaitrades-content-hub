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
    const entries = await redis.get('life:journal') || []
    const totalEntries = (entries as any[]).length
    const recentEntries = (entries as any[]).slice(-5)

    const systemPrompt = `You are a personal journal AI coach for the user's Life Hub. You have access to their recent journal entries.

JOURNAL DATA (recent 5 entries):
${JSON.stringify(recentEntries, null, 2)}

KEY STATS:
- Total Journal Entries: ${totalEntries}

Help the user reflect on their thoughts, identify patterns in their writing, provide emotional support, and encourage consistent journaling. Be empathetic and insightful. If no entries exist yet, encourage the user to write their first journal entry.`

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
