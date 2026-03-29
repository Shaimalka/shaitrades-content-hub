import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  try {
    const goals = await redis.get('life:goals') || []
    const checkins = await redis.get('life:goals:checkins') || []
    return NextResponse.json({ goals, checkins })
  } catch (e) {
    return NextResponse.json({ goals: [], checkins: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body

    if (action === 'checkin') {
      const checkins: any[] = (await redis.get('life:goals:checkins') as any[]) || []
      const newCheckin = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        text: entry.text,
        createdAt: new Date().toISOString(),
      }
      checkins.push(newCheckin)
      await redis.set('life:goals:checkins', checkins)
      const goals = await redis.get('life:goals') || []
      return NextResponse.json({ goals, checkins })
    }

    if (action === 'delete') {
      const goals: any[] = (await redis.get('life:goals') as any[]) || []
      const updated = goals.filter((g: any) => g.id !== entry.id)
      await redis.set('life:goals', updated)
      const checkins = await redis.get('life:goals:checkins') || []
      return NextResponse.json({ goals: updated, checkins })
    }

    if (action === 'update') {
      const goals: any[] = (await redis.get('life:goals') as any[]) || []
      const updated = goals.map((g: any) => g.id === entry.id ? { ...g, ...entry } : g)
      await redis.set('life:goals', updated)
      const checkins = await redis.get('life:goals:checkins') || []
      return NextResponse.json({ goals: updated, checkins })
    }

    const goals: any[] = (await redis.get('life:goals') as any[]) || []
    const newGoal = {
      id: Date.now().toString(),
      title: entry.title,
      category: entry.category,
      target: parseFloat(entry.target),
      current: parseFloat(entry.current || 0),
      deadline: entry.deadline,
      notes: entry.notes || '',
      createdAt: new Date().toISOString(),
    }
    goals.push(newGoal)
    await redis.set('life:goals', goals)
    const checkins = await redis.get('life:goals:checkins') || []
    return NextResponse.json({ goals, checkins })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save goal' }, { status: 500 })
  }
}
