import { NextResponse } from 'next/server'
import { generateContentIdeas, analyzePostPerformance } from '@/lib/anthropic'

export async function POST(req: Request) {
  try {
    const { posts } = await req.json()

    const top10 = posts.slice(0, 10)
    const [analysis, ideas] = await Promise.all([
      analyzePostPerformance(top10),
      generateContentIdeas(top10),
    ])

    const report = {
      week_of: new Date().toISOString(),
      top_posts: top10.map((p: Record<string, unknown>, i: number) => ({
        ...p,
        rank: i + 1,
        analysis: analysis[i] || null,
      })),
      content_ideas: ideas,
      emerging_creators: extractEmergingCreators(posts),
      summary: `Weekly analysis of ${posts.length} posts across ${new Set(posts.map((p: Record<string, unknown>) => p.username)).size} trading/finance creators.`,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

function extractEmergingCreators(posts: Record<string, unknown>[]) {
  const creatorStats: Record<string, { posts: number; totalEngagement: number }> = {}
  posts.forEach((p) => {
    const u = p.username as string
    if (!creatorStats[u]) creatorStats[u] = { posts: 0, totalEngagement: 0 }
    creatorStats[u].posts++
    creatorStats[u].totalEngagement += (p.likes as number || 0) + (p.comments as number || 0)
  })
  return Object.entries(creatorStats)
    .sort(([, a], [, b]) => b.totalEngagement - a.totalEngagement)
    .slice(0, 5)
    .map(([username]) => username)
}
