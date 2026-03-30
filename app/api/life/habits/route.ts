import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const KEY = 'life:habits'
const COMPLETIONS_KEY = 'life:habits:completions'

export async function GET() {
    try {
          const habits = await redis.get(KEY) || []
                const completions = await redis.get(COMPLETIONS_KEY) || {}
                      return NextResponse.json({ habits, completions })
    } catch (e) {
          return NextResponse.json({ habits: [], completions: {} })
    }
}

export async function POST(req: NextRequest) {
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
