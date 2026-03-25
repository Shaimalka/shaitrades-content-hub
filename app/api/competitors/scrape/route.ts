import { NextResponse } from 'next/server'

export async function POST(request: Request) {

  try {

    const { handles } = await request.json()
    if (!handles || handles.length === 0) {

      return NextResponse.json({ error: 'No handles provided' }, { status: 400 })

    }

    const apifyToken = process.env.APIFY_API_KEY
    console.log('APIFY_API_KEY present:', !!apifyToken, 'length:', apifyToken?.length)

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

      // Step 1: Get profile data (followers, bio, etc.) using profile scraper

      const profileRes = await fetch(

        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${apifyToken}`,

        {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            usernames: chunk,

            resultsLimit: 1,

          }),

        }

      )

      if (!profileRes.ok) {

        const err = await profileRes.text()

        return NextResponse.json({ error: `Failed to start profile scraper: ${err}` }, { status: 500 })

      }

      const profileRunData = await profileRes.json()

      const profileRunId = profileRunData.data?.id

      if (!profileRunId) {

        return NextResponse.json({ error: 'No run ID returned from profile scraper' }, { status: 500 })

      }

      // Poll profile scraper

      let profileStatus = 'RUNNING'

      let profileAttempts = 0

      while (profileAttempts < 40 && (profileStatus === 'RUNNING' || profileStatus === 'READY' || profileStatus === 'ABORTING')) {

        await new Promise(r => setTimeout(r, 5000))

        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${profileRunId}?token=${apifyToken}`)

        const statusData = await statusRes.json()

        profileStatus = statusData.data?.status || 'FAILED'

        profileAttempts++

        if (profileStatus === 'SUCCEEDED' || profileStatus === 'FAILED' || profileStatus === 'ABORTED' || profileStatus === 'TIMED-OUT') break

      }

      if (profileStatus !== 'SUCCEEDED') {

        return NextResponse.json({ error: `Profile scraper ended with status: ${profileStatus}` }, { status: 500 })

      }

      const profileRunDetailsRes = await fetch(`https://api.apify.com/v2/actor-runs/${profileRunId}?token=${apifyToken}`)

      const profileRunDetails = await profileRunDetailsRes.json()

      const profileDatasetId = profileRunDetails.data?.defaultDatasetId

      const profileItemsUrl = profileDatasetId

        ? `https://api.apify.com/v2/datasets/${profileDatasetId}/items?token=${apifyToken}&limit=100`

        : `https://api.apify.com/v2/actor-runs/${profileRunId}/dataset/items?token=${apifyToken}&limit=100`

      const profileDataRes = await fetch(profileItemsUrl)

      const profileRawData = await profileDataRes.json()

      const profileItems: any[] = Array.isArray(profileRawData) ? profileRawData : (profileRawData?.items || [])

      // Step 2: Get posts using post scraper for each username in the chunk
      const postItems: any[] = []

      for (const username of chunk) {

        const postRes = await fetch(

          `https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs?token=${apifyToken}`,

          {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

              username: username,

              resultsLimit: 100,

            }),

          }

        )

        if (!postRes.ok) {

          const err = await postRes.text()

          return NextResponse.json({ error: `Failed to start post scraper: ${err}` }, { status: 500 })

        }

        const postRunData = await postRes.json()

        const postRunId = postRunData.data?.id

        if (!postRunId) {

          return NextResponse.json({ error: 'No run ID returned from post scraper' }, { status: 500 })

        }

        // Poll post scraper

        let postStatus = 'RUNNING'

        let postAttempts = 0

        while (postAttempts < 60 && (postStatus === 'RUNNING' || postStatus === 'READY' || postStatus === 'ABORTING')) {

          await new Promise(r => setTimeout(r, 5000))

          const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${postRunId}?token=${apifyToken}`)

          const statusData = await statusRes.json()

          postStatus = statusData.data?.status || 'FAILED'

          postAttempts++

          if (postStatus === 'SUCCEEDED' || postStatus === 'FAILED' || postStatus === 'ABORTED' || postStatus === 'TIMED-OUT') break

        }

        if (postStatus !== 'SUCCEEDED') {

          return NextResponse.json({ error: `Post scraper ended with status: ${postStatus}` }, { status: 500 })

        }

        const postRunDetailsRes = await fetch(`https://api.apify.com/v2/actor-runs/${postRunId}?token=${apifyToken}`)

        const postRunDetails = await postRunDetailsRes.json()

        const postDatasetId = postRunDetails.data?.defaultDatasetId

        const postItemsUrl = postDatasetId

          ? `https://api.apify.com/v2/datasets/${postDatasetId}/items?token=${apifyToken}&limit=200`

          : `https://api.apify.com/v2/actor-runs/${postRunId}/dataset/items?token=${apifyToken}&limit=200`

        const postDataRes = await fetch(postItemsUrl)

        const postRawData = await postDataRes.json()

        const userPostItems: any[] = Array.isArray(postRawData) ? postRawData : (postRawData?.items || [])

        postItems.push(...userPostItems)

      }

      console.log('Post scraper items count:', postItems.length)

      // Step 3: Map profile + posts together

      const chunkCompetitors = chunk.map(username => {

        const profile = profileItems.find((p: any) =>

          (p.username || '').toLowerCase() === username.toLowerCase()

        ) || {}

        const userPosts = postItems

          .filter((p: any) => (p.ownerUsername || p.username || '').toLowerCase() === username.toLowerCase())

          .map((p: any) => ({

            id: p.id || p.shortCode || '',

            shortCode: p.shortCode || '',

            url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,

            type: p.type || (p.isVideo ? 'Video' : p.productType === 'clips' ? 'Reel' : 'Image'),

            displayUrl: p.displayUrl || p.thumbnailUrl || null,

            thumbnailUrl: p.thumbnailUrl || p.displayUrl || null,

            caption: p.caption || p.alt || '',

            likesCount: p.likesCount || p.likes || 0,

            commentsCount: p.commentsCount || p.comments || 0,

            videoViewCount: p.videoViewCount || p.videoPlayCount || p.views || 0,

            timestamp: p.timestamp || p.takenAt || null,

            hashtags: p.hashtags || [],

          }))

        const sortedPosts = [...userPosts].sort(

          (a, b) => (b.likesCount + b.commentsCount * 2) - (a.likesCount + a.commentsCount * 2)

        )

        return {

          username: profile.username || username,

          fullName: profile.fullName || profile.full_name || '',

          profilePicUrl: profile.profilePicUrl || profile.profilePicUrlHD || null,

          followersCount: profile.followersCount || 0,

          followingCount: profile.followingCount || 0,

          postsCount: profile.postsCount || profile.mediaCount || 0,

          biography: profile.biography || profile.bio || '',

          isVerified: profile.verified || profile.isVerified || false,

          topPosts: sortedPosts.slice(0, 6),

          allPosts: sortedPosts,

        }

      })

      competitors.push(...chunkCompetitors)

    }

    console.log('Competitors built:', competitors.length, competitors.map(c => ({

      u: c.username,

      followers: c.followersCount,

      posts: c.allPosts.length

    })))

    return NextResponse.json({ competitors })

  } catch (error: any) {

    console.error('Scrape error:', error)

    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })

  }

}
