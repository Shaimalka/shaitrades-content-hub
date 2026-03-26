import { NextResponse } from 'next/server'

// Helper: safe JSON parse with content-type guard
async function safeJson(res: Response, label: string): Promise<any> {
        const contentType = res.headers.get('content-type') || ''
        if (!res.ok || !contentType.includes('application/json')) {
                  const raw = await res.text()
                  console.error(`[scrape] ${label} returned non-JSON (status ${res.status}):`, raw.substring(0, 500))
                  throw new Error(`${label} returned unexpected response (status ${res.status}). Check server logs for details.`)
        }
        return res.json()
}

// Helper: run an Apify actor and return its dataset items
async function runApifyActor(
        actorId: string,
        input: Record<string, unknown>,
        apifyToken: string
      ): Promise<any[]> {
        // 60-second timeout for the actor start call
  const startController = new AbortController()
        const startTimeout = setTimeout(() => startController.abort(), 60_000)

  let startRes: Response
        try {
                  startRes = await fetch(
                              `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
                        {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(input),
                                      signal: startController.signal,
                        }
                            )
        } catch (err: any) {
                  if (err.name === 'AbortError') {
                              throw new Error(`Timed out starting Apify actor ${actorId} after 60 seconds`)
                  }
                  throw err
        } finally {
                  clearTimeout(startTimeout)
        }

  if (!startRes.ok) {
            const err = await startRes.text()
            throw new Error(`Failed to start ${actorId}: ${err}`)
  }

  const startData = await safeJson(startRes, `start ${actorId}`)
        const runId = startData.data?.id
        if (!runId) throw new Error(`No run ID returned from ${actorId}`)

  let attempts = 0
        let status = 'RUNNING'
        while (attempts < 40 && (status === 'RUNNING' || status === 'READY' || status === 'ABORTING')) {
                  await new Promise(r => setTimeout(r, 5000))
                  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
                  const statusData = await safeJson(statusRes, `status check for run ${runId}`)
                  status = statusData.data?.status || 'FAILED'
                  attempts++
                  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') break
        }

  if (status !== 'SUCCEEDED') {
            // Fetch the run details to surface the Apify error message
          try {
                      const errorRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
                      const errorData = await safeJson(errorRes, `error details for run ${runId}`)
                      const apifyMsg = errorData.data?.statusMessage || errorData.data?.meta?.statusMessage
                      if (apifyMsg) throw new Error(`${actorId} run ended with status: ${status} — ${apifyMsg}`)
          } catch (innerErr: any) {
                      // If we can't fetch details, fall through to the generic message
              if (innerErr.message.includes(actorId)) throw innerErr
          }
            throw new Error(`${actorId} run ended with status: ${status}`)
  }

  const runDetailsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
        const runDetails = await safeJson(runDetailsRes, `run details for ${runId}`)
        const datasetId = runDetails.data?.defaultDatasetId

  const itemsUrl = datasetId
          ? `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=500`
            : `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=500`

  // 60-second timeout for the dataset fetch
  const dataController = new AbortController()
        const dataTimeout = setTimeout(() => dataController.abort(), 60_000)

  let dataRes: Response
        try {
                  dataRes = await fetch(itemsUrl, { signal: dataController.signal })
        } catch (err: any) {
                  if (err.name === 'AbortError') {
                              throw new Error(`Timed out fetching dataset items for run ${runId} after 60 seconds`)
                  }
                  throw err
        } finally {
                  clearTimeout(dataTimeout)
        }

  const rawData = await safeJson(dataRes, `dataset items for run ${runId}`)
        return Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data?.items || [])
}

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

          const usernames = handles.map((h: string) => h.replace('@', '').trim().toLowerCase())

          // ── Step 1: Run instagram-profile-scraper to get follower count, bio, profile pic ──
          console.log('[scrape] Starting profile scraper for:', usernames)
                  const profileItems = await runApifyActor(
                              'apify~instagram-profile-scraper',
                        {
                                      usernames,
                        },
                              apifyToken
                            )

          // Log total count and full first item for debugging
          console.log('[scrape] Profile scraper returned', profileItems.length, 'items')
                  if (profileItems.length > 0) {
                              console.log('[scrape] First raw profile item:', JSON.stringify(profileItems[0], null, 2))
                  }

          // Build a map keyed by lowercase username
          const profileMap: Record<string, { followersCount: number; biography: string; profilePicUrl: string | null }> = {}
                    for (const p of profileItems) {
                                const uname = (p.username || p.ownerUsername || '').toLowerCase()
                                if (!uname) continue
                                profileMap[uname] = {
                                              followersCount: p.followersCount ?? p.followersCount ?? p.edge_followed_by?.count ?? 0,
                                              biography: p.biography || p.bio || '',
                                              profilePicUrl: p.profilePicUrl || p.profilePicUrlHD || p.profile_pic_url_hd || p.profile_pic_url || null,
                                }
                    }
                  console.log('[scrape] Profile map keys:', Object.keys(profileMap))

          // ── Step 2: Chunk usernames and run instagram-scraper for posts ──
          const chunkSize = 3
                  const chunks: string[][] = []
                            for (let i = 0; i < usernames.length; i += chunkSize) {
                                        chunks.push(usernames.slice(i, i + chunkSize))
                            }

          const competitors: any[] = []

                    for (const chunk of chunks) {
                                console.log('[scrape] Starting post scraper for chunk:', chunk)
                                const items = await runApifyActor(
                                              'apify~instagram-scraper',
                                      {
                                                      directUrls: chunk.map((u: string) => `https://www.instagram.com/${u}/`),
                                                      resultsType: 'posts',
                                                      resultsLimit: 50,
                                      },
                                              apifyToken
                                            )

                    // Log first item keys for debugging
                    if (items.length > 0) {
                                  const firstItem = items[0]
                                  console.log('[scrape] First post item keys:', Object.keys(firstItem))
                                  console.log('[scrape] First post owner fields:', {
                                                  ownerUsername: firstItem.ownerUsername,
                                                  ownerFollowersCount: firstItem.ownerFollowersCount,
                                                  ownerFullName: firstItem.ownerFullName,
                                                  ownerProfilePicUrl: firstItem.ownerProfilePicUrl,
                                                  owner: firstItem.owner,
                                  })
                    }

                    // Group posts by ownerUsername — filter to only requested usernames
                    const requestedSet = new Set(chunk.map((u: string) => u.toLowerCase()))
                                const byOwner: Record<string, any[]> = {}
                                            for (const item of items) {
                                                          const ownerRaw = item.ownerUsername || item.owner?.username
                                                          if (!ownerRaw) continue
                                                          const ownerNorm = ownerRaw.toLowerCase()
                                                          if (!requestedSet.has(ownerNorm)) {
                                                                          console.log(`[scrape] Skipping post from ${ownerRaw} — not in requested chunk: ${chunk.join(', ')}`)
                                                                          continue
                                                          }
                                                          if (!byOwner[ownerNorm]) byOwner[ownerNorm] = []
                                                                        byOwner[ownerNorm].push(item)
                                            }

                    const chunkCompetitors = Object.entries(byOwner).map(([ownerUsername, posts]) => {
                                  const first = posts[0]

                                                                                 // Pull profile data from the profile map (from instagram-profile-scraper)
                                                                                 const profile = profileMap[ownerUsername]
                                  const followersCount = profile?.followersCount ?? 0
                                  const biography = profile?.biography ?? ''
                                  const profilePicUrl = profile?.profilePicUrl ?? null
                                  console.log(`[scrape] ${ownerUsername} — followersCount: ${followersCount}, hasBio: ${!!biography}, hasPic: ${!!profilePicUrl}`)

                                                                                 const followingCount = first.ownerFollowingCount ?? first.owner?.followingCount ?? first.owner?.following_count ?? first.owner?.following ?? 0

                                                                                 const mappedPosts = posts.map((p: any) => ({
                                                                                                 id: p.id || p.shortCode || '',
                                                                                                 shortCode: p.shortCode || '',
                                                                                                 url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : ''),
                                                                                                 type: p.type || (p.isVideo ? 'Video' : 'Image'),
                                                                                                 displayUrl: p.displayUrl || p.thumbnailUrl || null,
                                                                                                 thumbnailUrl: p.thumbnailUrl || p.displayUrl || null,
                                                                                                 caption: p.caption || p.alt || '',
                                                                                                 likesCount: p.likesCount || p.likes || 0,
                                                                                                 commentsCount: p.commentsCount || p.comments || 0,
                                                                                                 videoViewCount: p.videoViewCount || p.videoPlayCount || p.views || 0,
                                                                                                 timestamp: p.timestamp || p.takenAt || null,
                                                                                                 hashtags: p.hashtags || [],
                                                                                 }))

                                                                                 const sortedPosts = [...mappedPosts].sort(
                                                                                                 (a, b) => (b.likesCount + b.commentsCount * 2) - (a.likesCount + a.commentsCount * 2)
                                                                                               )

                                                                                 return {
                                                                                                 username: ownerUsername,
                                                                                                 fullName: first.ownerFullName || first.owner?.fullName || '',
                                                                                                 profilePicUrl,
                                                                                                 followersCount,
                                                                                                 followingCount,
                                                                                                 postsCount: first.ownerPostsCount || first.owner?.postsCount || posts.length,
                                                                                                 biography,
                                                                                                 isVerified: first.ownerIsVerified || first.owner?.isVerified || false,
                                                                                                 topPosts: sortedPosts.slice(0, 6),
                                                                                                 allPosts: sortedPosts,
                                                                                 }
                    })

                    competitors.push(...chunkCompetitors)
                    }

          return NextResponse.json({ competitors })
        } catch (error: any) {
                  console.error('Scrape error:', error)
                  return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
        }
}
