import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    if (!url) return new NextResponse('Missing url', { status: 400 })
    try {
          const res = await fetch(url, {
                  headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://www.instagram.com/',
                  },
          })
          const buffer = await res.arrayBuffer()
          return new NextResponse(buffer, {
                  headers: {
                            'Content-Type': res.headers.get('content-type') || 'image/jpeg',
                            'Cache-Control': 'public, max-age=3600',
                  },
          })
    } catch {
          return new NextResponse('Failed', { status: 500 })
    }
}
