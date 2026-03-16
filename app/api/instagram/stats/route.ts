import { NextResponse } from 'next/server'
import { getInstagramUserInfo, getInstagramMedia } from '@/lib/composio'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [userInfo, media] = await Promise.allSettled([
      getInstagramUserInfo(),
      getInstagramMedia(12),
    ])

    const profile = userInfo.status === 'fulfilled' ? userInfo.value?.data : null
    const posts = media.status === 'fulfilled'
      ? (media.value?.data?.data || [])
      : []

    return NextResponse.json({ profile, posts, error: null })
  } catch (error) {
    console.error('Instagram stats error:', error)
    return NextResponse.json({
      profile: null,
      posts: [],
      error: 'Failed to fetch Instagram data'
    }, { status: 500 })
  }
}
