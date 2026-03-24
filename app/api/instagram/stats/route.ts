import { NextResponse } from 'next/server'
import { getInstagramUserInfo, getInstagramMedia } from '@/lib/composio'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [userInfo, media] = await Promise.allSettled([
      getInstagramUserInfo(),
      getInstagramMedia(50),
    ])

    // Composio returns { data: { successfull: false, data: { message: '...' } } } on error
    // We need to check if the response is actually valid profile data
    const rawProfile = userInfo.status === 'fulfilled' ? userInfo.value?.data : null
    const profile = rawProfile && rawProfile.username ? rawProfile : null

    const rawPosts = media.status === 'fulfilled' ? media.value?.data : null
    const posts = Array.isArray(rawPosts?.data) ? rawPosts.data : []

    // Log errors for debugging
    if (!profile && userInfo.status === 'fulfilled') {
      console.error('Instagram user info returned no valid profile:', JSON.stringify(userInfo.value)?.slice(0, 300))
    }
    if (userInfo.status === 'rejected') {
      console.error('Instagram user info fetch rejected:', userInfo.reason)
    }

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }

    return NextResponse.json({ profile, posts, error: null }, { headers })
  } catch (error) {
    console.error('Instagram stats error:', error)
    return NextResponse.json({
      profile: null,
      posts: [],
      error: 'Failed to fetch Instagram data'
    }, { status: 500 })
  }
}
