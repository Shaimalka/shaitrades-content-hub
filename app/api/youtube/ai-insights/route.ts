import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface YouTubeVideo {
    videoId: string
    title: string
    publishedAt: string
    thumbnailUrl: string
    viewCount: number
    likeCount: number
    commentCount: number
}

export async function POST(request: Request) {
    try {
          const { videos } = await request.json() as { videos: YouTubeVideo[] }

      if (!videos || !videos.length) {
              return NextResponse.json({ error: 'No videos provided' }, { status: 400 })
      }

      const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) {
                  return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
          }

      // Sort to identify top and bottom performers
      const sortedByViews = [...videos].sort((a, b) => b.viewCount - a.viewCount)
          const topPerformers = sortedByViews.slice(0, 3)
          const bottomPerformers = sortedByViews.slice(-3).reverse()

      const formatVideo = (v: YouTubeVideo, rank: number) => {
              const engagementRate = v.viewCount > 0
                ? ((v.likeCount + v.commentCount) / v.viewCount * 100).toFixed(2)
                        : '0'
              const publishDate = new Date(v.publishedAt)
              const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][publishDate.getDay()]
              const hour = publishDate.getHours()
              const hourLabel = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
              return `  ${rank}. "${v.title.slice(0, 60)}" — views: ${v.viewCount.toLocaleString()}, likes: ${v.likeCount.toLocaleString()}, comments: ${v.commentCount.toLocaleString()}, engagement: ${engagementRate}%, posted: ${dayOfWeek} at ${hourLabel}`
      }

      const topSummary = topPerformers.map((v, i) => formatVideo(v, i + 1)).join('\n')
          const bottomSummary = bottomPerformers.map((v, i) => formatVideo(v, i + 1)).join('\n')

      const overallStats = {
              totalViews: videos.reduce((s, v) => s + v.viewCount, 0),
              totalLikes: videos.reduce((s, v) => s + v.likeCount, 0),
              avgViews: Math.round(videos.reduce((s, v) => s + v.viewCount, 0) / videos.length),
              avgEngagement: (videos.reduce((s, v) => s + (v.viewCount > 0 ? (v.likeCount + v.commentCount) / v.viewCount * 100 : 0), 0) / videos.length).toFixed(2),
      }

      const client = new Anthropic({ apiKey })

      const message = await client.messages.create({
              model: 'claude-opus-4-5',
              max_tokens: 800,
              messages: [
                {
                            role: 'user',
                            content: `You are a YouTube growth strategist. Analyze this channel's recent video performance and provide actionable weekly insights.

                            OVERALL STATS (last ${videos.length} videos):
                            - Total views: ${overallStats.totalViews.toLocaleString()}
                            - Average views per video: ${overallStats.avgViews.toLocaleString()}
                            - Average engagement rate: ${overallStats.avgEngagement}%

                            TOP PERFORMING VIDEOS:
                            ${topSummary}

                            BOTTOM PERFORMING VIDEOS:
                            ${bottomSummary}

                            Provide exactly 4 bullet points:
                            1. What content is resonating most (patterns in top performers — topic, style, timing)
                            2. What's underperforming and why (patterns in bottom performers)
                            3. Specific content recommendation for this week (title idea, format, topic)
                            4. Best day/time to post based on when top videos were published

                            Respond with ONLY 4 bullet points, each starting with "• ". Be specific and data-driven. Keep each bullet under 35 words.`,
                },
                      ],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
          const bullets = text
            .split('\n')
            .filter((line: string) => line.trim().startsWith('•'))
            .map((line: string) => line.trim())
            .slice(0, 4)

      if (bullets.length === 0) {
              const lines = text.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 4)
              return NextResponse.json({ bullets: lines })
      }

      return NextResponse.json({ bullets })
    } catch (error: any) {
          console.error('YouTube AI insights error:', error)
          return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
