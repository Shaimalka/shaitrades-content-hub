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

    const usernames = handles.map((h: string) => h.replace('@', '').trim().toLowerCase())

    const startRes = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: usernames,
          resultsPerPage: 20,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
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
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
      const statusData = await statusRes.json()
      status = statusData.data?.status || 'FAILED'
      attempts++
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') break
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ error: `Apify run ended with status: ${status}` }, { status: 500 })
    }

    const runDetailsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
    const runDetails = await runDetailsRes.json()
    const datasetId = runDetails.data?.defaultDatasetId

    console.log('TikTok scraper dataset ID:', datasetId)

    const itemsUrl = datasetId
      ? `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=500`
      : `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=500`

    const dataRes = await fetch(itemsUrl)
    const rawData = await dataRes.json()
    const items: any[] = Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data?.items || [])

    console.log('TikTok items count:', items.length)
    if (items[0]) console.log('First item keys:', Object.keys(items[0]).slice(0, 15))

    const competitors = usernames.map((username: string) => {
      const userItems = items.filter((it: any) => {
        const u = (
          it.authorMeta?.name ||
          it.author?.uniqueId ||
          it.author?.name ||
          it.uniqueId ||
          it.userName ||
          ''
        ).toLowerCase().trim()
        return u === username
      })

      if (!userItems.length) return null

      const first = userItems[0]
      const authorMeta = first.authorMeta || first.author || {}
      const followersCount =
        authorMeta.fans || authorMeta.followers || authorMeta.followersCount || first.followerCount || 0

      const posts = userItems
        .filter((it: any) => it.id || it.videoId || it.webVideoUrl || it.videoUrl)
        .slice(0, 20)
        .map((it: any) => {
          const videoId = it.id || it.videoId || ''
          const url =
            it.webVideoUrl ||
            it.videoUrl ||
            (videoId ? `https://www.tiktok.com/@${username}/video/${videoId}` : '')
          return {
            id: String(videoId),
            url,
            likesCount: it.diggCount || it.stats?.diggCount || it.likeCount || it.likes || 0,
            commentsCount: it.commentCount || it.stats?.commentCount || it.comments || 0,
            videoViewCount: it.playCount || it.stats?.playCount || it.viewCount || it.views || 0,
            caption: it.text || it.desc || it.description || '',
            timestamp: it.createTime
              ? new Date(it.createTime * 1000).toISOString()
              : (it.createTimeISO || it.createdAt || null),
            displayUrl: it.videoMeta?.coverUrl || it.covers?.default || it.cover || it.thumbnail || null,
          }
        })

      const sortedPosts = [...posts].sort(
        (a, b) =>
          (b.likesCount + b.commentsCount * 2 + b.videoViewCount * 0.01) -
          (a.likesCount + a.commentsCount * 2 + a.videoViewCount * 0.01)
      )

      return {
        username,
        followersCount,
        fullName: authorMeta.nickName || authorMeta.nickname || authorMeta.name || username,
        profilePicUrl: authorMeta.avatar || authorMeta.avatarThumb || null,
        biography: authorMeta.signature || authorMeta.bio || '',
        isVerified: authorMeta.verified || false,
        postsCount: authorMeta.video || authorMeta.videoCount || 0,
        posts: sortedPosts,
        allPosts: sortedPosts,
        topPosts: sortedPosts.slice(0, 6),
        scrapedAt: new Date().toISOString(),
      }
    }).filter(Boolean)

    console.log('TikTok competitors built:', competitors.length)
    return NextResponse.json({ competitors })
  } catch (error: any) {
    console.error('TikTok scrape error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
