import { NextResponse } from 'next/server'
import { getInstagramUserInfo, getInstagramMedia } from '@/lib/composio'

export async function GET() {
  try {
    const [userInfo, media] = await Promise.allSettled([
      getInstagramUserInfo(),
      getInstagramMedia(12),
    ])

    const profile = userInfo.status === 'fulfilled' ? userInfo.value?.response?.data || userInfo.value?.data : null
    const posts = media.status === 'fulfilled'
      ? (media.value?.response?.data?.data || media.value?.data?.data || [])
      : []

    return NextResponse.json({ profile, posts, error: null })
  } catch (error) {
    console.error('Instagram stats error:', error)
    // Return mock data for dev/demo
    return NextResponse.json({
      profile: {
        username: 'shaitrades',
        followers_count: 4696,
        follows_count: 41,
        media_count: 1,
        biography: '📈 Helping traders ACTUALLY become profitable',
        website: 'https://stan.store/Shaitrades',
        profile_picture_url: '',
      },
      posts: [],
      error: null
    })
  }
}
