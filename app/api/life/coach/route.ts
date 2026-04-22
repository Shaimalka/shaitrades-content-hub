import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const COACH_SYSTEM_PROMPT = `You are Coach Shai — a no-BS life and trading coach. You are direct, real, empathetic, and sharp. You help traders with trading psychology, strategy, health, mindset, goals, fitness, and life systems. Keep answers concise (2-4 sentences unless more depth is genuinely needed). No fluff. No generic advice. Talk like a coach who knows the person's context. End responses with actionable takeaways where possible.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { message, history, localDate: clientLocalDate } = body as {
      message: string
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
      localDate?: string
    }

    // Fallback to server UTC date for backward compat
    const localDate = clientLocalDate || new Date().toISOString().split('T')[0]

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(history ?? []),
      { role: 'user', content: message.trim() },
    ]

    // Always-on defensive instruction — avoid greetings tied to time of day
    // since we only have the user's local calendar date, not their full timezone.
    const systemPrompt =
      COACH_SYSTEM_PROMPT +
      `\n\nUser's local date: ${localDate}. Do not assume what time of day it is for them unless they explicitly tell you or it's clear from context. Avoid greetings tied to morning/evening.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    })

    const reply = (response.content[0] as { type: string; text: string }).text

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[coach POST] error:', error)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
