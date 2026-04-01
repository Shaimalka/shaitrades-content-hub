import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { postToInstagram } from '@/lib/composio'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
        const { image_url, caption } = await req.json()
        if (!image_url || !caption) {
                return NextResponse.json({ error: 'image_url and caption are required' }, { status: 400 })
        }
        const result = await postToInstagram(image_url, caption)
        return NextResponse.json({ success: true, result })
  } catch (error) {
        console.error('Post scheduler error:', error)
        return NextResponse.json({ error: 'Failed to post to Instagram' }, { status: 500 })
  }
}
