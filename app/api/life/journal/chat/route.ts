import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const { messages } = await req.json()
          const data = await redis.get('life:journal') || []
                const total = (data as any[]).length
          const recent = (data as any[]).slice(-5)
          const systemPrompt = `You are Coach Shai — a journal coach. Keep responses under 80 words. Reference actual data.\n\nRECENT JOURNAL ENTRIES: ${JSON.stringify(recent)}\nTotal entries: ${total}`
          const response = await anthropic.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 1024,
                  system: systemPrompt,
                  messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          })
          return NextResponse.json({ content: response.content[0].type === 'text' ? response.content[0].text : '' })
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
