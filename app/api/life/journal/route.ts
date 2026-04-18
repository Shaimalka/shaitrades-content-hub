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

function journalKey(userId: string) { return `journal:${userId}` }

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = requireUserId(session)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const raw = await redis.get(journalKey(userId))
        console.log('[journal GET] Redis key:', journalKey(userId), '| raw type:', typeof raw, '| value:', JSON.stringify(raw)?.slice(0, 200))
        const data = Array.isArray(raw) ? raw : (raw ? raw : [])
        console.log('[journal GET] Returning', Array.isArray(data) ? data.length : 0, 'entries')
        return NextResponse.json({ data })
  } catch (e) {
        console.error('[journal GET] Error:', e)
        return NextResponse.json({ data: [] })
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
        console.log('[journal POST] action:', action, '| entry date:', entry?.date, '| entry id:', entry?.id)

      const raw = await redis.get(journalKey(userId))
        const data: any[] = Array.isArray(raw) ? raw : (raw ? (raw as any[]) : [])
        console.log('[journal POST] Existing entries count:', data.length)

      if (action === 'delete' && entry?.id) {
              const updated = data.filter((item: any) => item.id !== entry.id)
              await redis.set(journalKey(userId), updated)
              console.log('[journal POST] Deleted entry', entry.id, '| remaining:', updated.length)
              return NextResponse.json({ success: true, data: updated })
      }

      if (action === 'update' && entry?.id) {
              const updated = data.map((item: any) =>
                        item.id === entry.id
                                                 ? { ...item, ...entry, updatedAt: new Date().toISOString() }
                          : item
                                             )
              await redis.set(journalKey(userId), updated)
              console.log('[journal POST] Updated entry', entry.id, '| total:', updated.length)
              return NextResponse.json({ success: true, data: updated })
      }

      const newEntry = {
              ...entry,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
      }
        const updated = [...data, newEntry]
        await redis.set(journalKey(userId), updated)
        console.log('[journal POST] Saved new entry id:', newEntry.id, '| date:', newEntry.date, '| total:', updated.length)
        return NextResponse.json({ success: true, data: updated })
  } catch (e) {
        console.error('[journal POST] Error:', e)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
