import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const MILESTONES = [1, 3, 7, 14, 21, 30, 50, 66, 100]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  const { success } = await checkRateLimit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const { habitName, habitId, streak, userName, motivation, discipline } = await req.json()

    if (!habitName || streak === undefined) {
      return NextResponse.json({ error: 'habitName and streak required' }, { status: 400 })
    }

    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if this streak has crossed a new milestone threshold
    const milestoneKey = `habitMilestone:${userId}:${habitId}`
    const lastMilestone: number = ((await redis.get(milestoneKey)) as number) || 0

    // Find which milestone we're at
    const currentMilestone = MILESTONES.filter(m => m <= streak).pop() || 0

    if (currentMilestone <= lastMilestone || currentMilestone === 0) {
      return NextResponse.json({ message: null, alreadyShown: true })
    }

    // Fetch user profile for personalized context
    let name = userName || 'Trader'
    let userMotivation = motivation || ''
    let userDiscipline = discipline || 3

    try {
      const profile = await redis.get(`profile:${userId}`) as any
      if (profile) {
        name = profile.name || name
        userMotivation = profile.motivation || userMotivation
        userDiscipline = profile.discipline || userDiscipline
      }
    } catch {}

    const systemPrompt = `You are Coach Shai — raw, direct, no-BS habit coach. Generate a single motivational message (max 40 words) for a trader who is building a habit. Be specific to their habit name and streak. Reference their motivation if relevant. No fluff. Make it hit. End with energy. User context: name=${name}, motivation=${userMotivation}, discipline=${userDiscipline}/5`

    const userMessage = `Habit: ${habitName}. Current streak: ${streak} days. Days remaining to make it permanent: ${Math.max(0, 66 - streak)} days.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const message = response.content[0].type === 'text' ? response.content[0].text : ''

    // Store last milestone shown
    await redis.set(milestoneKey, currentMilestone)

    return NextResponse.json({ message, milestone: currentMilestone })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
