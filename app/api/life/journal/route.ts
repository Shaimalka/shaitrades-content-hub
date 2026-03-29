import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  try {
    const entries = await redis.get('life:journal') || []
    return NextResponse.json({ entries })
  } catch (e) {
    return NextResponse.json({ entries: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body

    if (action === 'delete') {
      const entries: any[] = (await redis.get('life:journal') as any[]) || []
      const updated = entries.filter((e: any) => e.id !== entry.id)
      await redis.set('life:journal', updated)
      return NextResponse.json({ entries: updated })
    }

    if (action === 'update') {
      const entries: any[] = (await redis.get('life:journal') as any[]) || []
      const updated = entries.map((e: any) => e.id === entry.id ? { ...e, ...entry } : e)
      await redis.set('life:journal', updated)
      return NextResponse.json({ entries: updated })
    }

    // Create new entry
    const entries: any[] = (await redis.get('life:journal') as any[]) || []
    const today = new Date().toISOString().split('T')[0]
    // Check if entry for today already exists
    const existingIdx = entries.findIndex((e: any) => e.date === today)
    const newEntry = {
      id: existingIdx >= 0 ? entries[existingIdx].id : Date.now().toString(),
      date: today,
      morningFocus: entry.morningFocus || '',
      eveningLesson: entry.eveningLesson || '',
      freeWrite: entry.freeWrite || '',
      mood: entry.mood || 'Focused',
      createdAt: existingIdx >= 0 ? entries[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (existingIdx >= 0) {
      entries[existingIdx] = newEntry
    } else {
      entries.push(newEntry)
    }
    await redis.set('life:journal', entries)
    return NextResponse.json({ entries })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
