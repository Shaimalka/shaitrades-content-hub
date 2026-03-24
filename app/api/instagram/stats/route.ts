import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Instagram Graph API base (for IG Business Account calls)
const IG_API_BASE = 'https://graph.instagram.com/v21.0'
// Facebook Graph API base (for FB Page -> IG Business Account ID lookup)
const FB_API_BASE = 'https://graph.facebook.com/v21.0'

export async function GET() {
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
      const userId = process.env.INSTAGRAM_USER_ID       // This should be the IG Business Account ID
  const pageId = process.env.FACEBOOK_PAGE_ID         // Optional: FB Page ID for lookup

  console.log('[IG Stats] ENV check:', {
          hasAccessToken: !!accessToken,
          accessTokenPrefix: accessToken ? accessToken.slice(0, 12) + '...' : 'MISSING',
          userId: userId ?? 'MISSING',
          pageId: pageId ?? 'not set',
  })

  if (!accessToken) {
          console.error('[IG Stats] INSTAGRAM_ACCESS_TOKEN is not set')
          return NextResponse.json(
              { profile: null, posts: [], error: 'Missing INSTAGRAM_ACCESS_TOKEN' },
              { status: 500 }
                  )
  }

  try {
          // Step 1: If we have a Facebook Page ID but no direct IG User ID,
        // look up the IG Business Account ID from the FB Page first.
        let igAccountId = userId

        if (pageId && !userId) {
                  console.log('[IG Stats] Step 1: Looking up IG Business Account from FB Page ID:', pageId)
                  const pageRes = await fetch(
                              `${FB_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`,
                      { cache: 'no-store' }
                            )
                  const pageRaw = await pageRes.text()
                  console.log('[IG Stats] FB Page response status:', pageRes.status)
                  console.log('[IG Stats] FB Page raw response:', pageRaw.slice(0, 500))

            if (!pageRes.ok) {
                        return NextResponse.json(
                            { profile: null, posts: [], error: `FB Page lookup failed: ${pageRes.status} ${pageRaw.slice(0, 200)}` },
                            { status: 500 }
                                    )
            }

            const pageData = JSON.parse(pageRaw)
                  igAccountId = pageData?.instagram_business_account?.id ?? null
                  console.log('[IG Stats] Resolved IG Business Account ID:', igAccountId)

            if (!igAccountId) {
                        return NextResponse.json(
                            { profile: null, posts: [], error: 'Could not resolve IG Business Account from FB Page. Check the page is linked to an IG Business/Creator account.' },
                            { status: 500 }
                                    )
            }
        }

        if (!igAccountId) {
                  console.error('[IG Stats] No IG Account ID available (set INSTAGRAM_USER_ID or FACEBOOK_PAGE_ID)')
                  return NextResponse.json(
                      { profile: null, posts: [], error: 'Missing Instagram User ID. Set INSTAGRAM_USER_ID or FACEBOOK_PAGE_ID env var.' },
                      { status: 500 }
                            )
        }

        // Step 2: Fetch profile and media in parallel
        const profileFields = 'username,followers_count,follows_count,media_count,biography,website,profile_picture_url'
          const mediaFields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,thumbnail_url'

        console.log('[IG Stats] Step 2: Fetching profile & media for IG Account ID:', igAccountId)

        const [profileRes, mediaRes] = await Promise.all([
                  fetch(
                              `${IG_API_BASE}/${igAccountId}?fields=${profileFields}&access_token=${accessToken}`,
                      { cache: 'no-store' }
                            ),
                  fetch(
                              `${IG_API_BASE}/${igAccountId}/media?fields=${mediaFields}&limit=50&access_token=${accessToken}`,
                      { cache: 'no-store' }
                            ),
                ])

        // Debug: log raw responses
        const profileRaw = await profileRes.text()
          const mediaRaw = await mediaRes.text()

        console.log('[IG Stats] Profile response status:', profileRes.status)
          console.log('[IG Stats] Profile raw response:', profileRaw.slice(0, 500))
          console.log('[IG Stats] Media response status:', mediaRes.status)
          console.log('[IG Stats] Media raw response:', mediaRaw.slice(0, 500))

        // Parse profile
        let profile = null
          if (profileRes.ok) {
                    const profileData = JSON.parse(profileRaw)
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
                                console.log('[IG Stats] Profile parsed OK:', { username: profile.username, followers: profile.followers_count, media_count: profile.media_count })
                    } else {
                                console.error('[IG Stats] Profile response missing username field. Full response:', profileRaw.slice(0, 500))
                    }
          } else {
                    console.error('[IG Stats] Profile fetch failed:', profileRes.status, profileRaw.slice(0, 500))
          }

        // Parse posts
        let posts: unknown[] = []
                if (mediaRes.ok) {
                          const mediaData = JSON.parse(mediaRaw)
                          const rawPosts = Array.isArray(mediaData?.data) ? mediaData.data : []
                                    console.log('[IG Stats] Raw posts count:', rawPosts.length)
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
                          console.error('[IG Stats] Media fetch failed:', mediaRes.status, mediaRaw.slice(0, 500))
                }

        const headers = {
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                  'Pragma': 'no-cache',
        }

        console.log('[IG Stats] Returning:', { hasProfile: !!profile, postCount: posts.length })
          return NextResponse.json({ profile, posts, error: null }, { headers })
  } catch (error) {
          console.error('[IG Stats] Unexpected error:', error)
          return NextResponse.json(
              { profile: null, posts: [], error: 'Failed to fetch Instagram data' },
              { status: 500 }
                  )
  }
}
