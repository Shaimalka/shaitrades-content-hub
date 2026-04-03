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

type Playbook = {
    id: string
    name: string
    description: string
    createdAt: string
  }

function getKey(userId: string) {
    return `playbooks:${userId}`
  }

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const key = getKey(session.user.email)
          const playbooks = (await redis.get(key) as Playbook[]) || []
          return NextResponse.json({ playbooks })
        } catch {
          return NextResponse.json({ playbooks: [] })
        }
  }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const body = await req.json()
          const { name, description } = body
          if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
          const key = getKey(session.user.email)
          const playbooks = (await redis.get(key) as Playbook[]) || []
          const newPlaybook: Playbook = {
                  id: `pb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  name: name.trim(),
                  description: (description || '').trim(),
                  createdAt: new Date().toISOString(),
                }
          const updated = [...playbooks, newPlaybook]
          await redis.set(key, updated)
          return NextResponse.json({ success: true, playbook: newPlaybook, playbooks: updated })
        } catch {
          return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
        }
  }

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
          const { id } = await req.json()
          if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
          const key = getKey(session.user.email)
          const playbooks = (await redis.get(key) as Playbook[]) || []
          const updated = playbooks.filter((p) => p.id !== id)
          await redis.set(key, updated)
          return NextResponse.json({ success: true, playbooks: updated })
        } catch {
          return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
        }
  }
