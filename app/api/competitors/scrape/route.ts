import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

    const APIFY_KEY = process.env.APIFY_API_KEY
    if (!APIFY_KEY) return NextResponse.json({ error: 'Apify API key not configured' }, { status: 500 })

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${APIFY_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsType: 'posts',
          resultsLimit: 20,
        }),
      }
    )

    if (!runRes.ok) {
      const err = await runRes.text()
      return NextResponse.json({ error: `Apify error: ${err}` }, { status: 500 })
    }

    const runData = await runRes.json()
    const runId = runData.data?.id
    if (!runId) return NextResponse.json({ error: 'Failed to start scrape job' }, { status: 500 })

    let attempts = 0
    let items: any[] = []
    while (attempts < 40) {
      await new Promise(r => setTimeout(r, 3000))
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`)
      const statusData = await statusRes.json()
      const status = statusData.data?.status

      if (status === 'SUCCEEDED') {
        const datasetId = statusData.data?.defaultDatasetId
        const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}&limit=50`)
        items = await itemsRes.json()
        break
      } else if (status === 'FAILED' || status === 'ABORTED') {
        return NextResponse.json({ error: 'Scrape job failed' }, { status: 500 })
      }
      attempts++
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No data returned' }, { status: 404 })
    }

    const first = items[0]
    const ownerUsername = first?.ownerUsername || first?.username || username

    const posts = items.map((post: any) => ({
      id: post.id || post.shortCode,
      shortCode: post.shortCode,
      type: post.type || 'Image',
      likesCount: post.likesCount || post.likes || 0,
      commentsCount: post.commentsCount || post.comments || 0,
      videoViewCount: post.videoViewCount || post.videoPlayCount || 0,
      timestamp: post.timestamp || post.takenAt,
      caption: post.caption || post.text || '',
      url: post.url || `https://www.instagram.com/p/${post.shortCode}/`,
      thumbnailUrl: post.displayUrl || post.thumbnailUrl || post.imageUrl || '',
    }))

    const sorted = posts.sort((a: any, b: any) => {
      const engA = a.likesCount + a.commentsCount * 2 + (a.videoViewCount || 0) * 0.1
      const engB =
