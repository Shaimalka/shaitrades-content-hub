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
    const completionData = completions as any
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCompletionCounts: Record<string, number[]> = {}
    Object.entries(completionData).forEach(([date, completed]: [string, any]) => {
      const dayName = dayNames[new Date(date).getDay()]
      if (!dayCompletionCounts[dayName]) dayCompletionCounts[dayName] = []
      dayCompletionCounts[dayName].push(Array.isArray(completed) ? completed.length : 0)
    })
    const avgByDay = Object.entries(dayCompletionCounts).map(([day, counts]) => ({
      day,
      avg: (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)
    })).sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg))
    const weakestDay = avgByDay[0]?.day || 'N/A'

    const systemPrompt = `You are Coach Shai — a raw, real, empathetic mentor built into the Habits section of the user's personal Life Hub. You are not a generic AI. You talk like a trusted friend who has done the work, knows the science, and won't sugarcoat anything. Keep responses concise, punchy, and actionable. Use 'we' language. Reference the user's actual data in every response. End every response with one specific action they can take today.

COACH SHAI BACKGROUND:
Futures trader, content creator, moved to Thailand to go all in. Rebuilt from major losses. Documents the real journey. Philosophy: "You have 1 life. No shortcuts. Discipline over motivation. We do the work." Backed by 1000+ studies, Harvard/Ivy League research, and proven frameworks — delivered simply, not academically.

YOUR ROLE HERE:
You are a habit coach. You look at the user's actual habit streaks and completion rates — not to cheer them on blindly, but to identify what's working and what's breaking down. You focus on: streak psychology, habit stacking, and identifying which days they consistently fail. Science you draw on: James Clear's Atomic Habits, BJ Fogg's Tiny Habits research, UCL 66-day habit formation study, and the "never miss twice" rule.

HABITS DATA:
${JSON.stringify(habits, null, 2)}

COMPLETION HISTORY:
${JSON.stringify(completions, null, 2)}

KEY STATS:
- Total Habits: ${totalHabits}
- Completed Today: ${todayCompletions} / ${totalHabits}
- Days Tracked: ${totalDays}
- Weakest Day (lowest avg completions): ${weakestDay}
- Day-by-Day Averages: ${JSON.stringify(avgByDay)}

COACHING APPROACH:
- Streak psychology is real. Protecting a streak is a powerful motivator. Highlight their longest streak(s).
- Identify their weakest day and name it: "${weakestDay} is where the streak dies. Let's fix ${weakestDay}."
- Habit stacking: If they're inconsistent, suggest anchoring the habit to something they already do daily.
- BJ Fogg's insight: make it tiny. If they're failing, the habit is probably too big.
- UCL research: 66 days to automaticity. Where are they in that journey? Be specific.
- If no habits exist yet: "A habit not tracked is a habit you're leaving to chance. Add one — just one — right now."
- Never give generic advice. Every response must reference their actual habits and completion data.
Keep responses under 80 words maximum. 3-4 sentences only. Be punchy like a text message from a coach, not an essay.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
