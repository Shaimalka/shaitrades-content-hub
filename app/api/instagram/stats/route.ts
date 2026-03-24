import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const IG_API_BASE = 'https://graph.instagram.com/v21.0'

export async function GET() {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
    const userId = process.env.INSTAGRAM_USER_ID

  if (!accessToken || !userId) {
        return NextResponse.json(
          { profile: null, posts: [], error: 'Missing Instagram credentials' },
          { status: 500 }
              )
  }

  try {
        // Fetch profile and posts in parallel
      const profileFields = 'username,followers_count,follows_count,media_count,biography,website,profile_picture_url'
        const mediaFields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,thumbnail_url'

      const [profileRes, mediaRes] = await Promise.all([
              fetch(
                        `${IG_API_BASE}/${userId}?fields=${profileFields}&access_token=${accessToken}`,
                { cache: 'no-store' }
                      ),
              fetch(
                        `${IG_API_BASE}/${userId}/media?fields=${mediaFields}&limit=50&access_token=${accessToken}`,
                { cache: 'no-store' }
                      ),
            ])

      // Parse profile
      let profile = null
        if (profileRes.ok) {
                const profileData = await profileRes.json()
                if (profileData.username) {
                          profile = {
                                      username: profileData.username ?? null,
                                      followers_count: profileData.followers_count ?? 0,
                                      follows_count: profileData.follows_count ?? 0,
                                      media_count: profileData.media_count ?? 0,
                                      biography: profileData.biography ?? null,
                                      website: profileData.website ?? null,
                                      profile_picture_url: profileData.profile_picture_url ?? null,
                          }
                } else {
                          console.error('Instagram profile response missing username:', JSON.stringify(profileData).slice(0, 300))
                }
        } else {
                const errText = await profileRes.text()
                console.error('Instagram profile fetch failed:', profileRes.status, errText.slice(0, 300))
        }

      // Parse posts — handle pagination cursor if present, use .data array
      let posts: unknown[] = []
            if (mediaRes.ok) {
                    const mediaData = await mediaRes.json()
                    const rawPosts = Array.isArray(mediaData?.data) ? mediaData.data : []
                            posts = rawPosts.map((post: Record<string, unknown>) => ({
                                      id: post.id ?? null,
                                      caption: post.caption ?? null,
                                      media_type: post.media_type ?? null,
                                      media_url: post.media_url ?? null,
                                      permalink: post.permalink ?? null,
                                      timestamp: post.timestamp ?? null,
                                      like_count: post.like_count ?? 0,
                                      comments_count: post.comments_count ?? 0,
                                      thumbnail_url: post.thumbnail_url ?? null,
                            }))
            } else {
                    const errText = await mediaRes.text()
                    console.error('Instagram media fetch failed:', mediaRes.status, errText.slice(0, 300))
            }

      const headers = {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
      }

      return NextResponse.json({ profile, posts, error: null }, { headers })
  } catch (error) {
        console.error('Instagram stats error:', error)
        return NextResponse.json(
          { profile: null, posts: [], error: 'Failed to fetch Instagram data' },
          { status: 500 }
              )
  }
}
