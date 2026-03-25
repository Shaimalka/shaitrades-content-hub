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

        const chunkSize = 3
        const chunks: string[][] = []
        for (let i = 0; i < usernames.length; i += chunkSize) {
            chunks.push(usernames.slice(i, i + chunkSize))
        }

        const competitors: any[] = []

        for (const chunk of chunks) {
            const startRes = await fetch(
                `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        directUrls: chunk.map((u: string) => `https://www.instagram.com/${u}/`),
                        resultsType: 'posts',
                        resultsLimit: 50,
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

            const runDetailsRes = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
            )
            const runDetails = await runDetailsRes.json()
            const datasetId = runDetails.data?.defaultDatasetId

            const itemsUrl = datasetId
                ? `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=500`
                : `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=500`

            const dataRes = await fetch(itemsUrl)
            const rawData = await dataRes.json()

            // Each item IS a post when resultsType === 'posts'
            const items: any[] = Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data?.items || [])

            // Group posts by ownerUsername
            const byOwner: Record<string, any[]> = {}
            for (const item of items) {
                const owner = item.ownerUsername || item.owner?.username
                if (!owner) continue
                if (!byOwner[owner]) byOwner[owner] = []
                byOwner[owner].push(item)
            }

            const chunkCompetitors = Object.entries(byOwner).map(([ownerUsername, posts]) => {
                // Take profile data from the first post's owner fields
                const first = posts[0]

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
                    profilePicUrl: first.ownerProfilePicUrl || first.owner?.profilePicUrl || null,
                    followersCount: first.ownerFollowersCount || first.owner?.followersCount || 0,
                    followingCount: first.ownerFollowingCount || first.owner?.followingCount || 0,
                    postsCount: first.ownerPostsCount || first.owner?.postsCount || posts.length,
                    biography: first.ownerBiography || first.owner?.biography || '',
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
