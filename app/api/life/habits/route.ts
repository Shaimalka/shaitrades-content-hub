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
// Completions shape: Record<date, Record<habitId, boolean>>
// e.g. { "2026-04-07": { "1712345678": true } }
const COMPLETIONS_KEY = 'life:habits:completions'

// -- GET ----------------------------------------------------------------------
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const habits = (await redis.get(KEY)) || []
                const completions = (await redis.get(COMPLETIONS_KEY)) || {}
                      return NextResponse.json({ habits, completions })
    } catch {
          return NextResponse.json({ habits: [], completions: {} })
    }
}

// -- POST ---------------------------------------------------------------------
// Handles two actions:
// { action: 'toggle', habitId, date } -- toggle completion
// { entry: { name, stack, challengeLength, ... } } -- add a new habit
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const body = await req.json()
          const { action, habitId, date, entry } = body
          const habits: any[] = ((await redis.get(KEY)) as any[]) || []

                // -- Toggle completion ----------------------------------------------------
                if (action === 'toggle') {
                        if (!habitId || !date) {
                                  return NextResponse.json({ error: 'habitId and date required' }, { status: 400 })
                        }
                        const completions: Record<string, Record<string, boolean>> =
                                  ((await redis.get(COMPLETIONS_KEY)) as Record<string, Record<string, boolean>>) || {}
                                if (!completions[date]) completions[date] = {}
                                        if (completions[date][habitId]) {
                                                  delete completions[date][habitId]
                                        } else {
                                                  completions[date][habitId] = true
                                        }
                        await redis.set(COMPLETIONS_KEY, completions)
                        return NextResponse.json({ success: true, habits, completions })
                }

      // -- Add new habit --------------------------------------------------------
      if (entry) {
              const newHabit = {
                        ...entry,
                        // Accept challengeLength; default to 66 for backward-compat
                        challengeLength:
                          typeof entry.challengeLength === 'number' && entry.challengeLength >= 1
                            ? entry.challengeLength
                                      : 66,
                        id: Date.now().toString(),
                        createdAt: new Date().toISOString(),
              }
              const updated = [...habits, newHabit]
              await redis.set(KEY, updated)
              const completions = (await redis.get(COMPLETIONS_KEY)) || {}
                      return NextResponse.json({ success: true, habits: updated, completions })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}

// -- PATCH --------------------------------------------------------------------
// Update an existing habit's fields
// Body: { id: string, updates: Partial<Habit> }
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const body = await req.json()
          const { id, updates } = body
          if (!id || !updates) {
                  return NextResponse.json({ error: 'id and updates required' }, { status: 400 })
          }
          const habits: any[] = ((await redis.get(KEY)) as any[]) || []
                const idx = habits.findIndex((h: any) => h.id === id)
          if (idx === -1) {
                  return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
          }
          const updated = habits.map((h: any) =>
                  h.id === id
                                             ? {
                                                           ...h,
                                                           ...updates,
                                                           id: h.id,
                                                           createdAt: h.createdAt,
                                                           challengeLength:
                                                                           typeof updates.challengeLength === 'number' && updates.challengeLength >= 1
                                                               ? updates.challengeLength
                                                                             : h.challengeLength ?? 66,
                                             }
                    : h
                                         )
          await redis.set(KEY, updated)
          const completions = (await redis.get(COMPLETIONS_KEY)) || {}
                return NextResponse.json({ success: true, habits: updated, completions })
    } catch {
          return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// -- DELETE -------------------------------------------------------------------
// Called as: DELETE /api/life/habits?id=<habitId>
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const { searchParams } = new URL(req.url)
          const id = searchParams.get('id')
          if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
          const habits: any[] = ((await redis.get(KEY)) as any[]) || []
                const updated = habits.filter((h: any) => h.id !== id)
          await redis.set(KEY, updated)
          const completions = (await redis.get(COMPLETIONS_KEY)) || {}
                return NextResponse.json({ success: true, habits: updated, completions })
    } catch {
          return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
