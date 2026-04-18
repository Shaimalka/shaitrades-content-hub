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

export type Goal = {
    id: string
    userId: string
    type: 'trading' | 'life'
    metric: string
    target: number
    current: number
    unit: string
    timeHorizon: 'weekly' | 'monthly' | 'quarterly'
    startDate: string
    endDate: string
    title: string
    note?: string
    status: 'active' | 'completed' | 'missed'
    reflection?: string
    createdAt: string
    updatedAt: string
}

function calcEndDate(startDate: string, horizon: Goal['timeHorizon']): string {
    const start = new Date(startDate)
    const days = horizon === 'weekly' ? 7 : horizon === 'monthly' ? 30 : 90
    start.setDate(start.getDate() + days)
    return start.toISOString()
}

function redisKey(userId: string) {
    return `goals:${userId}`
}

// -- GET -----------------------------------------------------------------------
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
        const userId = session.user?.email ?? session.user?.name ?? 'unknown'
        const goals = ((await redis.get(redisKey(userId))) as Goal[]) || []
        return NextResponse.json({ goals })
    } catch {
        return NextResponse.json({ goals: [] })
    }
}

// -- POST ----------------------------------------------------------------------
// Body: full Goal minus id/createdAt/updatedAt/current/status
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
        const body = await req.json()
        const { type, metric, target, unit, timeHorizon, startDate, title, note } = body
        if (!type || !metric || target === undefined || !unit || !timeHorizon || !startDate || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const userId = session.user?.email ?? session.user?.name ?? 'unknown'
        const now = new Date().toISOString()
        const newGoal: Goal = {
            id: crypto.randomUUID(),
            userId,
            type,
            metric,
            target,
            current: 0,
            unit,
            timeHorizon,
            startDate,
            endDate: calcEndDate(startDate, timeHorizon),
            title,
            note,
            status: 'active',
            createdAt: now,
            updatedAt: now,
        }
        const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
        const updated = [...goals, newGoal]
        await redis.set(redisKey(userId), updated)
        return NextResponse.json({ success: true, goal: newGoal })
    } catch {
        return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
    }
}

// -- PATCH ---------------------------------------------------------------------
// Body: { id, updates: Partial<Goal> }
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
        const userId = session.user?.email ?? session.user?.name ?? 'unknown'
        const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
        const idx = goals.findIndex((g: Goal) => g.id === id)
        if (idx === -1) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
        }
        const updated = goals.map((g: Goal) =>
            g.id === id
                ? {
                    ...g,
                    ...updates,
                    id: g.id,
                    createdAt: g.createdAt,
                    userId: g.userId,
                    updatedAt: new Date().toISOString(),
                }
                : g
        )
        await redis.set(redisKey(userId), updated)
        const saved = updated.find((g: Goal) => g.id === id) as Goal
        return NextResponse.json({ success: true, goal: saved })
    } catch {
        return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }
}

// -- DELETE --------------------------------------------------------------------
// Body: { id }
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
        const body = await req.json()
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const userId = session.user?.email ?? session.user?.name ?? 'unknown'
        const goals: Goal[] = ((await redis.get(redisKey(userId))) as Goal[]) || []
        const updated = goals.filter((g: Goal) => g.id !== id)
        await redis.set(redisKey(userId), updated)
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
    }
}
