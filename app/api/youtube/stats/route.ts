import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CHANNEL_ID = 'UCTLmrF1xrojgShBXXJeOxxw'
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function fmt(n: number): string {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

export async function GET() {
    try {
          const apiKey = process.env.YOUTUBE_API_KEY
          if (!apiKey) {
                  return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
          }

      // 1. Fetch channel statistics
      const channelRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${apiKey}`
            )
          if (!channelRes.ok) {
                  const err = await channelRes.json()
                  return NextResponse.json({ error: err.error?.message || 'Channel fetch failed' }, { status: 500 })
          }
          const channelData = await channelRes.json()
          const channelStats = channelData.items?.[0]?.statistics || {}

                // 2. Fetch uploads playlist ID
                const channelDetailRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`
                      )
          const channelDetailData = await channelDetailRes.json()
          const uploadsPlaylistId = channelDetailData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

      if (!uploadsPlaylistId) {
              return NextResponse.json({ error: 'Could not find uploads playlist' }, { status: 500 })
      }

      // 3. Fetch last 10 videos from uploads playlist
      const playlistRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
            )
          const playlistData = await playlistRes.json()
          const playlistItems = playlistData.items || []

                // 4. Fetch video stats for all 10 videos
                const videoIds = playlistItems.map((item: any) => item.snippet.resourceId.videoId).join(',')
          const videoStatsRes = await fetch(
                  `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
                )
          const videoStatsData = await videoStatsRes.json()
          const videoItems = videoStatsData.items || []

                // 5. Build video list
                const videos = videoItems.map((video: any) => ({
                        videoId: video.id,
                        title: video.snippet.title,
                        publishedAt: video.snippet.publishedAt,
                        thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
                        viewCount: parseInt(video.statistics.viewCount || '0', 10),
                        likeCount: parseInt(video.statistics.likeCount || '0', 10),
                        commentCount: parseInt(video.statistics.commentCount || '0', 10),
                }))

      // 6. Derive best posting times from top videos by views
      const sortedByViews = [...videos].sort((a, b) => b.viewCount - a.viewCount)
          const topVideos = sortedByViews.slice(0, Math.min(10, sortedByViews.length))

      // Build day/hour frequency map weighted by views
      const timeMap: Record<string, { views: number; count: number }> = {}
            topVideos.forEach((v) => {
                    const d = new Date(v.publishedAt)
                    const day = DAYS[d.getDay()]
                    const hour = d.getHours()
                    const key = `${day} ${hour}`
                    if (!timeMap[key]) timeMap[key] = { views: 0, count: 0 }
                    timeMap[key].views += v.viewCount
                    timeMap[key].count += 1
            })

      const bestPostingTimes = Object.entries(timeMap)
            .sort((a, b) => b[1].views - a[1].views)
            .slice(0, 5)
            .map(([slot, data]) => {
                      const [day, hourStr] = slot.split(' ')
                      const hour = parseInt(hourStr)
                      const hourLabel = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
                      return {
                                  day,
                                  hour: hourLabel,
                                  totalViews: data.views,
                                  videoCount: data.count,
                      }
            })

      return NextResponse.json({
              channel: {
                        subscriberCount: parseInt(channelStats.subscriberCount || '0', 10),
                        viewCount: parseInt(channelStats.viewCount || '0', 10),
                        videoCount: parseInt(channelStats.videoCount || '0', 10),
              },
              videos,
              bestPostingTimes,
      })
    } catch (error: any) {
          console.error('YouTube stats error:', error)
          return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
