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

const KEY = 'life:journal'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const data = await redis.get(KEY) || []
                return NextResponse.json({ data })
    } catch (e) {
          return NextResponse.json({ data: [] })
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
          const data: any[] = (await redis.get(KEY) as any[]) || []
                if (action === 'delete' && entry?.id) {
                        const updated = data.filter((item: any) => item.id !== entry.id)
                        await redis.set(KEY, updated)
                        return NextResponse.json({ success: true, data: updated })
                }
          if (action === 'update' && entry?.id) {
                  const updated = data.map((item: any) =>
                            item.id === entry.id ? { ...item, ...entry, updatedAt: new Date().toISOString() } : item
                                                 )
                  await redis.set(KEY, updated)
                  return NextResponse.json({ success: true, data: updated })
          }
          const newEntry = {
                  ...entry,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
          }
          const updated = [...data, newEntry]
          await redis.set(KEY, updated)
          return NextResponse.json({ success: true, data: updated })
    } catch (e) {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}
