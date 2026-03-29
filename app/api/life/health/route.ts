import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  try {
    const logs = await redis.get('life:health') || []
    const settings = await redis.get('life:health:settings') || {}
    return NextResponse.json({ logs, settings })
  } catch (e) {
    return NextResponse.json({ logs: [], settings: {} })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entry } = body

    if (action === 'settings') {
      await redis.set('life:health:settings', entry)
      const logs = await redis.get('life:health') || []
      return NextResponse.json({ logs, settings: entry })
    }

    if (action === 'delete') {
      const logs: any[] = (await redis.get('life:health') as any[]) || []
      const updated = logs.filter((l: any) => l.id !== entry.id)
      await redis.set('life:health', updated)
      const settings = await redis.get('life:health:settings') || {}
      return NextResponse.json({ logs: updated, settings })
    }

    // Create new health log
    const logs: any[] = (await redis.get('life:health') as any[]) || []
    const newLog = {
      id: Date.now().toString(),
      date: entry.date || new Date().toISOString().split('T')[0],
      weight: parseFloat(entry.weight) || 0,
      sleep: parseFloat(entry.sleep) || 0,
      gym: entry.gym || false,
      mood: parseInt(entry.mood) || 5,
      energy: parseInt(entry.energy) || 5,
      notes: entry.notes || '',
      createdAt: new Date().toISOString(),
    }
    logs.push(newLog)
    await redis.set('life:health', logs)
    const settings = await redis.get('life:health:settings') || {}
    return NextResponse.json({ logs, settings })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save health log' }, { status: 500 })
  }
}
