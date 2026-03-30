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
          const goals = await redis.get('life:goals') || []

                const total = (goals as any[]).length
          const completed = (goals as any[]).filter((g: any) => g.completed).length
          const inProgress = total - completed

      const systemPrompt = `You are a personal goals coach AI for the user's Life Hub. You have access to their complete goals list.

      GOALS DATA:
      ${JSON.stringify(goals, null, 2)}

      KEY STATS:
      - Total Goals: ${total}
      - Completed: ${completed}
      - In Progress: ${inProgress}

      Help the user stay accountable, celebrate progress, break down big goals into actionable steps, and provide strategic advice. Be motivating but realistic. If no goals exist yet, encourage the user to add their first goal.`

      const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1024,
              system: systemPrompt,
              messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
