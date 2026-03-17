import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()
    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    const topPosts = posts.slice(0, 10)
    const postsText = topPosts.map((p: any, i: number) => `
Post #${i + 1} (${p.type || 'image'}):
- Likes: ${p.likesCount} | Comments: ${p.commentsCount}${p.videoViewCount ? ` | Views: ${p.videoViewCount}` : ''}
- Caption: ${(p.caption || '').slice(0, 300)}${(p.caption || '').length > 300 ? '...' : ''}
- Posted: ${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'unknown'}
`).join('\n')

    const prompt = `You are an elite Instagram growth strategist analyzing a competitor in the trading/finance niche.

Competitor: @${competitor.username} (${competitor.followersCount?.toLocaleString()} followers)
Bio: ${competitor.biography || 'N/A'}

Their top posts by engagement:
${postsText}

Provide a sharp, actionable competitive analysis with these sections:

1. **CONTENT FORMULA** — What pattern makes their top posts work? Hook style, format, topics.
2. **WHY IT WORKS** — The psychological triggers they use (FOMO, aspiration, education, controversy, etc.)
3. **POSTING PATTERNS** — Frequency, timing, content mix they seem to use.
4. **THEIR WEAKNESSES** — What gaps or mistakes you can exploit.
5. **STEAL THESE IDEAS** — 3 specific content ideas you can adapt (not copy) for @shaitrades.
6. **GROWTH VERDICT** — Are they growing fast, plateauing, or declining? Why?

Be direct, specific, and ruthless. No fluff.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ analysis })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
