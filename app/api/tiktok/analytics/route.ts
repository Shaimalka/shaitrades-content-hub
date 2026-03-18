export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
          const { username } = await request.json()
          if (!username) {
                  return NextResponse.json({ error: 'Username required' }, { status: 400 })
          }

      const apifyToken = process.env.APIFY_API_KEY
          if (!apifyToken) {
                  return NextResponse.json({ error: 'Apify API key not configured' }, { status: 500 })
          }

      const cleanUsername = username.replace('@', '').trim().toLowerCase()

      const startRes = await fetch(
              'https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=' + apifyToken,
        {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                              profiles: [cleanUsername],
                              resultsPerPage: 20,
                              shouldDownloadVideos: false,
                              shouldDownloadCovers: false,
                  }),
        }
            )

      if (!startRes.ok) {
              const err = await startRes.text()
              return NextResponse.json({ error: 'Failed to start Apify run: ' + err }, { status: 500 })
      }

      const startData = await startRes.json()
          const runId = startData.data?.id
          if (!runId) {
                  return NextResponse.json({ error: 'No run ID returned from Apify' }, { status: 500 })
          }

      let attempts = 0
          let status = 'RUNNING'
          while (attempts < 42 && (status === 'RUNNING' || status === 'READY' || status === 'ABORTING')) {
                  await new Promise(r => setTimeout(r, 5000))
                  const statusRes = await fetch('https://api.apify.com/v2/actor-runs/' + runId + '?token=' + apifyToken)
                  const statusData = await statusRes.json()
                  status = statusData.data?.status || 'FAILED'
                  attempts++
                  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') break
          }

      if (status !== 'SUCCEEDED') {
              return NextResponse.json({ error: 'Apify run ended with status: ' + status }, { status: 500 })
      }

      const runDetailsRes = await fetch('https://api.apify.com/v2/actor-runs/' + runId + '?token=' + apifyToken)
          const runDetails = await runDetailsRes.json()
          const datasetId = runDetails.data?.defaultDatasetId

      const itemsUrl = datasetId
            ? 'https://api.apify.com/v2/datasets/' + datasetId + '/items?token=' + apifyToken + '&limit=100'
              : 'https://api.apify.com/v2/actor-runs/' + runId + '/dataset/items?token=' + apifyToken + '&limit=100'

      const dataRes = await fetch(itemsUrl)
          const rawData = await dataRes.json()
          const items: any[] = Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data?.items || [])

      if (!items.length) {
              return NextResponse.json({ error: 'No data returned. Account may be private or not found.' }, { status: 404 })
      }

      const first = items[0]
          const authorMeta = first.authorMeta || first.author || {}

                const followersCount = authorMeta.fans || authorMeta.followers || authorMeta.followersCount || first.followerCount || 0
          const likesCount = authorMeta.heart || authorMeta.heartCount || authorMeta.diggCount || authorMeta.likeCount || 0
          const videoCount = authorMeta.video || authorMeta.videoCount || items.length || 0

      const videoItems = items.filter((it: any) => it.id || it.videoId || it.webVideoUrl || it.videoUrl)

      const posts = videoItems.slice(0, 20).map((it: any) => {
              const videoId = it.id || it.videoId || ''
              const url = it.webVideoUrl || it.videoUrl || (videoId ? 'https://www.tiktok.com/@' + cleanUsername + '/video/' + videoId : '')
              return {
                        id: String(videoId),
                        url,
                        caption: it.text || it.desc || it.description || '',
                        likesCount: it.diggCount || it.stats?.diggCount || it.likeCount || it.likes || 0,
                        commentsCount: it.commentCount || it.stats?.commentCount || it.comments || 0,
                        videoViewCount: it.playCount || it.stats?.playCount || it.viewCount || it.views || 0,
                        shareCount: it.shareCount || it.stats?.shareCount || 0,
                        timestamp: it.createTime
                          ? new Date(it.createTime * 1000).toISOString()
                                    : (it.createTimeISO || it.createdAt || null),
                        displayUrl: it.videoMeta?.coverUrl || it.covers?.default || it.cover || it.thumbnail || null,
              }
      })

      return NextResponse.json({ username: cleanUsername, followersCount, likesCount, videoCount, posts })
    } catch (error: any) {
          console.error('TikTok analytics error:', error)
          return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
