import { NextResponse } from 'next/server'

export async function POST(request: Request) {

  try {

      const { handles } = await request.json()



      if (!handles || handles.length === 0) {

          return NextResponse.json({ error: 'No handles provided' }, { status: 400 })

      }

      const apifyToken = process.env.APIFY_API_KEY

      if (!apifyToken) {

          return NextResponse.json({ error: 'Apify API key not configured' }, { status: 500 })

      }

      const directUrls = handles.map((h: string) => {

                                           const clean = h.replace('@', '').trim()

                                           return `https://www.instagram.com/${clean}/`

      })

      const startRes = await fetch(

              `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`,

        {

                method: 'POST',

                  headers: { 'Content-Type': 'application/json' },

                  body: JSON.stringify({

                                                 directUrls,

                              resultsType: 'posts',

                              resultsLimit: 12,

                              addParentData: true,

                  }),

        }

            )

      if (!startRes.ok) {

          const err = await startRes.text()

          return NextResponse.json({ error: `Failed to start Apify run: ${err}` }, { status: 500 })

      }

      const startData = await startRes.json()

      const runId = startData.data?.id

      if (!runId) {

          return NextResponse.json({ error: 'No run ID returned from Apify' }, { status: 500 })

      }

      let attempts = 0

      let status = 'RUNNING'

      while (attempts < 40 && (status === 'RUNNING' || status === 'READY' || status === 'ABORTING')) {

          await new Promise(r => setTimeout(r, 5000))

          const statusRes = await fetch(

                    `https://api.apify.com/v2/acts/apify~instagram-scraper/runs/${runId}?token=${apifyToken}`

                  )

          const statusData = await statusRes.json()

          status = statusData.data?.status || 'FAILED'

          attempts++

          if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') break

      }

      if (status !== 'SUCCEEDED') {

          return NextResponse.json({ error: `Apify run ended with status: ${status}` }, { status: 500 })

      }

      const dataRes = await fetch(

              `https://api.apify.com/v2/acts/apify~instagram-scraper/runs/${runId}/dataset/items?token=${apifyToken}&limit=200`

            )

      const items: any[] = await dataRes.json()

      const profileMap: Record<string, any> = {}

            for (const item of items) {

          if (item.error) continue

          const username = item.ownerUsername || item.username

          if (!username) continue

          if (!profileMap[username]) {

                      profileMap[username] = {

                                  username,

                                  fullName: item.ownerFullName || username,

                                  profilePicUrl: null,

                                  followersCount: 0,

                                  postsCount: 0,

                                  posts: [],

                                  totalLikes: 0,

                                  totalComments: 0,

                      }

          }

          const profile = profileMap[username]

          profile.postsCount++

          const post = {

                    id: item.id || item.shortCode,

                    shortCode: item.shortCode,

                    url: item.url,

                    type: item.type || 'Image',

                    displayUrl: item.displayUrl || null,

                    caption: item.caption || '',

                    likesCount: item.likesCount || 0,

                    commentsCount: item.commentsCount || 0,

                    videoViewCount: item.videoViewCount || item.videoPlayCount || 0,

                    timestamp: item.timestamp || null,

                    hashtags: item.hashtags || [],

          }

          profile.totalLikes += post.likesCount

          profile.totalComments += post.commentsCount

          profile.posts.push(post)

            }

      const competitors = Object.values(profileMap).map((p: any) => {

                                                              const postCount = p.posts.length

                                                              const avgLikes = postCount > 0 ? Math.round(p.totalLikes / postCount) : 0

                                                              const avgComments = postCount > 0 ? Math.round(p.totalComments / postCount) : 0

                                                              const sortedPosts = [...p.posts].sort(

                                                                        (a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount)

                                                                      )

                                                              return {

                                                                        username: p.username,

                                                                        fullName: p.fullName,

                                                                        profilePicUrl: p.profilePicUrl,

                                                                        followersCount: p.followersCount,

                                                                        postsCount: p.postsCount,

                                                                        avgLikes,

                                                                        avgComments,

                                                                        engagementRate: 0,

                                                                        topPosts: sortedPosts.slice(0, 6),

                                                                        allPosts: sortedPosts,

                                                              }

      })

      return NextResponse.json({ competitors })

  } catch (error: any) {

      console.error('Scrape error:', error)

      return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })

  }

}
