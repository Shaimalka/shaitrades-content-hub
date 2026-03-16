import { NextResponse } from 'next/server'
import { scrapeInstagramPosts } from '@/lib/apify'

const TRADING_COMPETITORS = [
  'investopedia',
  'tradingview',
  'thetraderwave',
  'rayner.teo',
  'humbledtrader',
  'umar.ashraf',
  'warrior.trading',
]

export async function POST(req: Request) {
  try {
    const { usernames } = await req.json().catch(() => ({ usernames: TRADING_COMPETITORS }))
    const targets = usernames || TRADING_COMPETITORS

    const data = await scrapeInstagramPosts(targets, 10)

    // Process and rank posts by engagement
    const processed = data
      .map((post: Record<string, unknown>) => ({
        username: post.ownerUsername || post.username,
        caption: (post.caption as string || '').substring(0, 300),
        likes: post.likesCount || post.like_count || 0,
        comments: post.commentsCount || post.comments_count || 0,
        views: post.videoViewCount || post.views || 0,
        permalink: post.url || post.permalink,
        posted_at: post.timestamp,
        media_type: post.type || post.media_type || 'IMAGE',
        engagement_rate: (((post.likesCount as number || 0) + (post.commentsCount as number || 0)) / 10000) * 100,
      }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.likes as number) - (a.likes as number))

    return NextResponse.json({ posts: processed, competitors: targets })
  } catch (error) {
    console.error('Competitor scrape error:', error)
    return NextResponse.json({ error: 'Failed to scrape competitors', posts: [] }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ competitors: TRADING_COMPETITORS })
}
