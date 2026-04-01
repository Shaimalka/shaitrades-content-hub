import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:habits'
const COMPLETIONS_KEY = 'life:habits:completions'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const habits = await redis.get(KEY) || []
                const completions = await redis.get(COMPLETIONS_KEY) || {}
                      return NextResponse.json({ habits, completions })
    } catch (e) {
          return NextResponse.json({ habits: [], completions: {} })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const body = await req.json()
          const { action, entry } = body
          const habits: any[] = (await redis.get(KEY) as any[]) || []
                if (action === 'delete' && entry?.id) {
                        const updated = habits.filter((h: any) => h.id !== entry.id)
                        await redis.set(KEY, updated)
                        const completions = await redis.get(COMPLETIONS_KEY) || {}
                                return NextResponse.json({ success: true, habits: updated, completions })
                }
          if (action === 'complete') {
                  const completions: Record<string, string[]> = (await redis.get(COMPLETIONS_KEY) as Record<string, string[]>) || {}
                          const today = new Date().toISOString().split('T')[0]
                  const todayCompletions = completions[today] || []
                          if (todayCompletions.includes(entry.id)) {
                                    completions[today] = todayCompletions.filter((id: string) => id !== entry.id)
                          } else {
                                    completions[today] = [...todayCompletions, entry.id]
                          }
                  await redis.set(COMPLETIONS_KEY, completions)
                  return NextResponse.json({ success: true, habits, completions })
          }
          const newHabit = {
                  ...entry,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
          }
          const updated = [...habits, newHabit]
          await redis.set(KEY, updated)
          const completions = await redis.get(COMPLETIONS_KEY) || {}
                return NextResponse.json({ success: true, habits: updated, completions })
    } catch (e) {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}
