import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:goals'

export async function GET() {
  try {
    const goals = await redis.get('life:goals') || []
    return NextResponse.json({ goals })
  } catch (e) {
    return NextResponse.json({ goals: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body
    const goals: any[] = (await redis.get('life:goals') as any[]) || []

    if (action === 'delete' && entry?.id) {
      const updated = goals.filter((g: any) => g.id !== entry.id)
      await redis.set(KEY, updated)
      return NextResponse.json({ success: true, goals: updated })
    }

    if (action === 'update' && entry?.id) {
      const updated = goals.map((g: any) => g.id === entry.id ? { ...g, ...entry } : g)
      await redis.set(KEY, updated)
      return NextResponse.json({ success: true, goals: updated })
    }

    const newGoal = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      completed: false,
    }
    const updated = [...goals, newGoal]
    await redis.set(KEY, updated)
    return NextResponse.json({ success: true, goals: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
