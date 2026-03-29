import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  try {
    const habits = await redis.get('life:habits') || []
    const completions = await redis.get('life:habits:completions') || {}
    return NextResponse.json({ habits, completions })
  } catch (e) {
    return NextResponse.json({ habits: [], completions: {} })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body

    if (action === 'complete') {
      const completions: Record<string, string[]> = (await redis.get('life:habits:completions') as Record<string, string[]>) || {}
      const key = entry.date || new Date().toISOString().split('T')[0]
      if (!completions[key]) completions[key] = []
      if (completions[key].includes(entry.habitId)) {
        completions[key] = completions[key].filter((id: string) => id !== entry.habitId)
      } else {
        completions[key].push(entry.habitId)
      }
      await redis.set('life:habits:completions', completions)
      const habits = await redis.get('life:habits') || []
      return NextResponse.json({ habits, completions })
    }

    if (action === 'delete') {
      const habits: any[] = (await redis.get('life:habits') as any[]) || []
      const updated = habits.filter((h: any) => h.id !== entry.id)
      await redis.set('life:habits', updated)
      const completions = await redis.get('life:habits:completions') || {}
      return NextResponse.json({ habits: updated, completions })
    }

    // Create new habit
    const habits: any[] = (await redis.get('life:habits') as any[]) || []
    const newHabit = {
      id: Date.now().toString(),
      name: entry.name,
      emoji: entry.emoji || '✅',
      frequency: entry.frequency || 'daily',
      createdAt: new Date().toISOString(),
    }
    habits.push(newHabit)
    await redis.set('life:habits', habits)
    const completions = await redis.get('life:habits:completions') || {}
    return NextResponse.json({ habits, completions })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save habit' }, { status: 500 })
  }
}
