import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const KEY = 'life:journal'

export async function POST(req: NextRequest) {
    try {
          const { messages } = await req.json()
          const entries = await redis.get(KEY) || []
                const entryArr = entries as any[]

      // KEY STATS
      const totalEntries = entryArr.length
          const recentEntry = entryArr.length > 0 ? entryArr[entryArr.length - 1] : null
          const recentDate = recentEntry ? recentEntry.createdAt?.split('T')[0] : 'N/A'
          const moodEntries = entryArr.filter((e: any) => e.mood)
          const uniqueMoods = [...new Set(moodEntries.map((e: any) => e.mood))]
          const daysActive = new Set(entryArr.map((e: any) => e.createdAt?.split('T')[0])).size

      const systemPrompt = `You are a personal journal AI embedded in the user's Life Hub dashboard. You help the user reflect on their thoughts, process emotions, and identify growth patterns.

      JOURNAL ENTRIES (last 30):
      ${JSON.stringify(entryArr.slice(-30), null, 2)}

      KEY STATS:
      - Total Entries: ${totalEntries}
      - Days Journaled: ${daysActive}
      - Most Recent Entry: ${recentDate}
      - Moods Logged: ${uniqueMoods.length > 0 ? uniqueMoods.join(', ') : 'None yet'}
      - Morning Focus Entries: ${entryArr.filter((e: any) => e.morningFocus).length}
      - Evening Lesson Entries: ${entryArr.filter((e: any) => e.eveningLesson).length}

      Be empathetic, insightful, and ask thoughtful questions to deepen self-reflection. Help the user identify patterns, celebrate growth, and process their experiences. If no entries exist yet, encourage the user to log their first journal entry.`

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
