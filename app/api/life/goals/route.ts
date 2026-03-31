import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:goals'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const goals = await redis.get('life:goals') || []
                return NextResponse.json({ goals })
    } catch (e) {
          return NextResponse.json({ goals: [] })
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
