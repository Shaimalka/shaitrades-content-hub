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

    // Use apify~instagram-profile-scraper to get follower counts + posts in one run
    const usernames = handles.map((h: string) => h.replace('@', '').trim().toLowerCase())

    const chunkSize = 3
    const chunks: string[][] = []
    for (let i = 0; i < usernames.length; i += chunkSize) {
      chunks.push(usernames.slice(i, i + chunkSize))
    }

    const competitors: any[] = []

    for (const chunk of chunks) {
      const startRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernames: chunk,
            resultsLimit: 10,
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

      // Poll for completion
      let attempts = 0
      let status = 'RUNNING'
      while (attempts < 40 && (status === 'RUNNING' || status === 'READY' || status === 'ABORTING')) {
        await new Promise(r => setTimeout(r, 5000))
        const statusRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
        )
        const statusData = await statusRes.json()
        status = statusData.data?.status || 'FAILED'
        attempts++
        if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') break
      }

      if (status !== 'SUCCEEDED') {
        return NextResponse.json({ error: `Apify run ended with status: ${status}` }, { status: 500 })
      }

      // Get default dataset ID from run details
      const runDetailsRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
      )
      const runDetails = await runDetailsRes.json()
      const datasetId = runDetails.data?.defaultDatasetId
      console.log('Profile scraper dataset ID:', datasetId)

      const itemsUrl = datasetId
        ? `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=100`
        : `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=100`

      const dataRes = await fetch(itemsUrl)
      const rawData = await dataRes.json()
      console.log('Profile scraper raw type:', typeof rawData, 'isArray:', Array.isArray(rawData))

      const items: any[] = Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data?.items || [])
      console.log('Profile items count:', items.length)
      if (items[0]) console.log('First item keys:', Object.keys(items[0]).slice(0, 10))

      // Map profile scraper output to our CompetitorData shape
      const chunkCompetitors = items
        .filter((item: any) => !item.error && (item.username || item.id))
        .map((item: any) => {
          // The profile scraper returns latestPosts or topPosts array
          const rawPosts: any[] = item.latestPosts || item.topPosts || item.posts || []
          const posts = rawPosts.map((p: any) => ({
            id: p.id || p.shortCode || '',
            shortCode: p.shortCode || '',
            url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,
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

          const sortedPosts = [...posts].sort(
            (a, b) => (b.likesCount + b.commentsCount * 2) - (a.likesCount + a.commentsCount * 2)
          )

          return {
            username: item.username || item.id,
            fullName: item.fullName || item.full_name || '',
            profilePicUrl: item.profilePicUrl || item.profilePicUrlHD || null,
            followersCount: item.followersCount || item.followersCount || 0,
            followingCount: item.followingCount || 0,
            postsCount: item.postsCount || item.mediaCount || 0,
            biography: item.biography || item.bio || '',
            isVerified: item.verified || item.isVerified || false,
            topPosts: sortedPosts.slice(0, 6),
            allPosts: sortedPosts,
          }
        })

      competitors.push(...chunkCompetitors)
    }

    console.log('Competitors built:', competitors.length, competitors.map(c => ({ u: c.username, followers: c.followersCount, posts: c.allPosts.length })))

    return NextResponse.json({ competitors })
  } catch (error: any) {
    console.error('Scrape error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}