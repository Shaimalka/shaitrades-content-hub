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

function requireUserId(session: any): string | null {
    const userId = session?.user?.email
    if (!userId) return null
    return userId
}

function healthKey(userId: string) { return `health:${userId}` }
function healthSettingsKey(userId: string) { return `health:${userId}:settings` }

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const logs = await redis.get(healthKey(userId)) || []
              const settings = await redis.get(healthSettingsKey(userId)) || {}
                    return NextResponse.json({ logs, settings })
  } catch (e) {
        return NextResponse.json({ logs: [], settings: {} })
  }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const body = await req.json()
        const { action, entry } = body
        const logs: any[] = (await redis.get(healthKey(userId)) as any[]) || []

              if (action === 'delete' && entry?.id) {
                      const updated = logs.filter((l: any) => l.id !== entry.id)
                      await redis.set(healthKey(userId), updated)
                      const settings = await redis.get(healthSettingsKey(userId)) || {}
                              return NextResponse.json({ success: true, logs: updated, settings })
              }

      if (action === 'update' && entry?.id) {
              const updated = logs.map((l: any) =>
                        l.id === entry.id
                                                 ? { ...l, ...entry, updatedAt: new Date().toISOString() }
                          : l
                                             )
              await redis.set(healthKey(userId), updated)
              const settings = await redis.get(healthSettingsKey(userId)) || {}
                      return NextResponse.json({ success: true, logs: updated, settings })
      }

      if (action === 'settings') {
              await redis.set(healthSettingsKey(userId), entry)
              return NextResponse.json({ success: true, settings: entry, logs })
      }

      const newLog = {
              ...entry,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
      }
        const updated = [...logs, newLog]
        await redis.set(healthKey(userId), updated)
        const settings = await redis.get(healthSettingsKey(userId)) || {}
              return NextResponse.json({ success: true, logs: updated, settings })
  } catch (e) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
