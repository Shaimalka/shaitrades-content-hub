import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:journal'

export async function GET() {
    try {
          const data = await redis.get(KEY) || []
                return NextResponse.json({ data })
    } catch (e) {
          return NextResponse.json({ data: [] })
    }
}

export async function POST(req: NextRequest) {
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
              const updated = data.map((item: any) => item.id === entry.id ? { ...item, ...entry, updatedAt: new Date().toISOString() } : item)
              await redis.set(KEY, updated)
              return NextResponse.json({ success: true, data: updated })
      }
