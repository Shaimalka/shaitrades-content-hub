import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface TikTokPost {
    id: string
    url: string
    caption: string
    likesCount: number
    commentsCount: number
    videoViewCount: number
    shareCount: number
    timestamp: string | null
  }

export async function POST(request: Request) {
    try {
          const { posts } = await request.json() as { posts: TikTokPost[] }

          if (!posts || !posts.length) {
                  return NextResponse.json({ error: 'No posts provided' }, { status: 400 })
                }

          // Filter to last 7 days
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const recentPosts = posts.filter(p => {
                  if (!p.timestamp) return false
                  return new Date(p.timestamp).getTime() >= sevenDaysAgo
                })

          const postsToAnalyze = recentPosts.length > 0 ? recentPosts : posts.slice(0, 10)

          const postSummaries = postsToAnalyze.map((p, i) => {
                  const engagementRate = p.videoViewCount > 0
                    ? ((p.likesCount + p.commentsCount) / p.videoViewCount * 100).toFixed(2)
                    : '0'
                  return `Post ${i + 1}: views=${p.videoViewCount}, likes=${p.likesCount}, comments=${p.commentsCount}, engagement=${engagementRate}%, caption="${(p.caption || '').slice(0, 80)}"`
                }).join('\n')

          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) {
                  return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
                }

          const client = new Anthropic({ apiKey })

          const message = await client.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 500,
                  messages: [
                            {
                                        role: 'user',
                                        content: `You are a TikTok growth strategist. Analyze these recent TikTok posts and provide exactly 3 bullet points:
                              1. What's working (highest engagement patterns)
2. What's not working (low engagement issues)
                              3. What to post next (specific actionable recommendation)

                              Post data:
                              ${postSummaries}

                              Respond with ONLY 3 bullet points, each starting with "• ". Be specific and actionable. Keep each bullet under 25 words.`,
                                      },
                          ],
                })

          const text = message.content[0].type === 'text' ? message.content[0].text : ''
          const bullets = text
            .split('\n')
            .filter((line: string) => line.trim().startsWith('•'))
            .map((line: string) => line.trim())
            .slice(0, 3)

          if (bullets.length === 0) {
                  const lines = text.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 3)
                  return NextResponse.json({ bullets: lines })
                }

          return NextResponse.json({ bullets })
        } catch (error: any) {
          console.error('TikTok insight error:', error)
          return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
        }
  }
