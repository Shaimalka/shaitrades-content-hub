import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const KEY = 'life:goals'

export async function GET() {
  try {
    const goals = await redis.get<any[]>(KEY) || []
    return NextResponse.json({ goals })
  } catch (e) {
    return NextResponse.json({ goals: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body

    const goals = await redis.get<any[]>(KEY) || []

    if (action === 'delete' && entry?.id) {
      const updated = goals.filter((g: any) => g.id !== entry.id)
      await redis.set(KEY, updated)
      return NextResponse.json({ success: true, goals: updated })
    }

    const newEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    const updated = [...goals, newEntry]
    await redis.set(KEY, updated)

    return NextResponse.json({ success: true, goals: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
