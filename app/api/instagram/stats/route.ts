import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const APIFY_API_BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'apify~instagram-profile-scraper'

export async function GET() {
        const apiKey = process.env.APIFY_API_KEY

  if (!apiKey) {
            console.error('[IG Stats] APIFY_API_KEY is not set')
            return NextResponse.json(
                  { profile: null, posts: [], error: 'Missing APIFY_API_KEY' },
                  { status: 500 }
                      )
  }

  try {
            console.log('[IG Stats] Starting Apify actor run for @shaitrading')

          // Start the actor run synchronously (waits for completion, returns dataset)
          const runRes = await fetch(
                      `${APIFY_API_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apiKey}&timeout=60&memory=256`,
                {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                              usernames: ['shaitrading'],
                                              resultsLimit: 50,
                              }),
                              cache: 'no-store',
                }
                    )

          if (!runRes.ok) {
                      const errText = await runRes.text()
                      console.error('[IG Stats] Apify actor run failed:', runRes.status, errText.slice(0, 500))
                      return NextResponse.json(
                            { profile: null, posts: [], error: `Apify run failed: ${runRes.status}` },
                            { status: 500 }
                                  )
          }

          const items: Record<string, unknown>[] = await runRes.json()
            console.log('[IG Stats] Apify returned items count:', items.length)

          if (!items || items.length === 0) {
                      return NextResponse.json(
                            { profile: null, posts: [], error: 'No data returned from Apify' },
                            { status: 500 }
                                  )
          }

          // The first item contains the profile and its posts
          const data = items[0] as Record<string, unknown>

          const profile = {
                      username: (data.username as string) ?? null,
                      followers_count: (data.followersCount as number) ?? 0,
                      follows_count: (data.followsCount as number) ?? 0,
                      media_count: (data.postsCount as number) ?? 0,
                      biography: (data.biography as string) ?? null,
                      profile_picture_url: (data.profilePicUrl as string) ?? null,
          }

          console.log('[IG Stats] Profile parsed OK:', {
                      username: profile.username,
                      followers: profile.followers_count,
                      media_count: profile.media_count,
          })

          // Posts are nested under latestPosts array in the profile item
          const rawPosts = Array.isArray(data.latestPosts) ? (data.latestPosts as Record<string, unknown>[]) : []
                    console.log('[IG Stats] Raw posts count:', rawPosts.length)

          const posts = rawPosts.map((post: Record<string, unknown>) => ({
                      id: (post.id as string) ?? (post.shortCode as string) ?? null,
                      caption: (post.caption as string) ?? null,
                      media_type: (post.type as string)?.toUpperCase() ?? null,
                      media_url: (post.displayUrl as string) ?? (post.videoUrl as string) ?? null,
                      permalink: post.url
                        ? (post.url as string)
                                    : post.shortCode
                        ? `https://www.instagram.com/p/${post.shortCode}/`
                                    : null,
                      timestamp: (post.timestamp as string) ?? null,
                      like_count: (post.likesCount as number) ?? 0,
                      comments_count: (post.commentsCount as number) ?? 0,
                      thumbnail_url: (post.displayUrl as string) ?? null,
          }))

          const headers = {
                      'Cache-Control': 'no-store, no-cache, must-revalidate',
                      Pragma: 'no-cache',
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
