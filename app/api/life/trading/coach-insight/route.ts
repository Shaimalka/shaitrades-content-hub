import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const BASE_PROMPT = `You are Coach Shai — a raw, direct, no-BS trading coach. The trader just logged a trade. Give them a 1-3 sentence insight based on the trade data. Be specific to the numbers. No fluff. No corporate speak. Max 60 words. If they lost, be honest but push them forward. If they won, acknowledge it but keep them sharp.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { trade } = await req.json()
    if (!trade) return NextResponse.json({ error: 'No trade data provided' }, { status: 400 })

    // Fetch trader profile and user settings for personalization + timezone
    const userId = session.user?.email || 'default'
    const [profile, userSettings] = await Promise.all([
      redis.get(`profile:${userId}`).catch(() => null),
      redis.get(`userSettings:${userId}`).catch(() => null),
    ])

    // --- Timezone context ---
    const settings = userSettings as any
    const userTimezone = settings?.timezone || 'UTC'
    const userSession = settings?.primarySession || 'New York'

    const now = new Date()
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(now)

    const localHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        hour12: false,
      }).format(now),
      10
    )

    const timeOfDay =
      localHour < 6
        ? 'late night'
        : localHour < 12
        ? 'morning'
        : localHour < 1
        ? 'afternoon'
        : localHour < 21
        ? 'evening'
        : 'night'

    const sessionTimes: Record<string, Record<string, string>> = {
      'New York': {
        'America/New_York': '9:30 AM - 4:00 PM',
        'Asia/Bangkok': '8:30 PM - 3:00 AM',
        'Europe/London': '2:30 PM - 9:00 PM',
        UTC: '2:30 PM - 9:00 PM',
      },
      London: {
        'Europe/London': '8:00 AM - 4:30 PM',
        'Asia/Bangkok': '2:00 PM - 10:30 PM',
        'America/New_York': '3:00 AM - 11:30 AM',
        UTC: '8:00 AM - 4:30 PM',
      },
    }

    const sessionTime =
      sessionTimes[userSession]?.[userTimezone] || 'check your local time'

    let systemPrompt = BASE_PROMPT

    // Inject timezone context
    systemPrompt += `\n\nUser's timezone: ${userTimezone}\nCurrent local time for user: ${localTime} (${timeOfDay})\nPrimary trading session: ${userSession} open (${sessionTime} in user's local time)\nUse this to make time-relevant comments. Never reference wrong times of day. Example: if it's 11pm for the user and they trade NY session, acknowledge the late night grind. Do NOT say "good morning" if it's evening for the user.`

    if (profile) {
      const p = profile as any
      systemPrompt += `\n\nThis trader's name is ${p.name || 'unknown'}, age ${p.age || 'unknown'}, based in ${p.location || 'unknown'}. They trade ${(p.instruments || []).join(', ')} and have been trading for ${p.experience || 'unknown'}. Their current level: ${p.currentLevel || 'unknown'}. Their biggest challenge: ${p.biggestChallenge || 'unknown'}. Their motivation: ${p.motivation || 'unknown'}. They started trading because: ${p.whyTrading || 'unknown'}. How they handle losses: ${p.lossResponse || 'unknown'}. Discipline rating: ${p.disciplineRating || 'unknown'}/5. Use this context to make your insights personal and specific. Address them by name occasionally.`
    }

    const { symbol, direction, pnl, notes, stopLoss, takeProfit, rr, emotion } = trade
    const userMessage = `Trade just logged:
- Symbol: ${symbol || 'Unknown'}
- Direction: ${direction}
- Stop Loss: $${stopLoss || 'N/A'}
- Take Profit: $${takeProfit || 'N/A'}
- Realized P&L: $${typeof pnl === 'number' ? pnl.toFixed(2) : pnl}
- R:R: ${rr || 'N/A'}
- Emotion: ${emotion || 'N/A'}
${notes ? `- Notes: ${notes}` : ''}

Give me your insight.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const insight = (message.content[0] as any).text
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('Coach Shai insight error:', e)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
