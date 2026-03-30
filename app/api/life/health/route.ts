import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:health'
const SETTINGS_KEY = 'life:health:settings'

export async function GET() {
    try {
          const logs = await redis.get(KEY) || []
                const settings = await redis.get(SETTINGS_KEY) || {}
                      return NextResponse.json({ logs, settings })
    } catch (e) {
          return NextResponse.json({ logs: [], settings: {} })
    }
}

export async function POST(req: NextRequest) {
    try {
          const body = await req.json()
          const { action, entry } = body
          const logs: any[] = (await redis.get(KEY) as any[]) || []

                if (action === 'delete' && entry?.id) {
                        const updated = logs.filter((l: any) => l.id !== entry.id)
                        await redis.set(KEY, updated)
                        const settings = await redis.get(SETTINGS_KEY) || {}
                                return NextResponse.json({ success: true, logs: updated, settings })
                }

      if (action === 'settings') {
              await redis.set(SETTINGS_KEY, entry)
