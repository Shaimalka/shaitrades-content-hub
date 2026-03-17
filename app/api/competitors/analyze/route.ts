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
    const postsText = topPosts.map((p: any, i: number) => `Post #${i + 1} (${p.type || 'image'}):
- Likes: ${p.likesCount} | Comments: ${p.commentsCount}${p.videoViewCount ? ` | Views: ${p.videoViewCount}` : ''}
- Caption: ${(p.caption || '').slice(0, 300)}${(p.caption || '').length > 300 ? '...' : ''}
- Posted: ${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'unknown'}
`).join('\n')

    const prompt = `You are an elite Instagram growth strategist analyzing a competitor in the trading/finance space.

Competitor: @${competitor.username} (${competitor.followersCount?.toLocaleString()} followers)
Bio: ${competitor.biography || 'N/A'}

Their top posts by engagement:
${postsText}

Provide a sharp, tactical analysis covering:

**Content Strategy**
- What types of content get the most engagement
- Posting patterns and formats

**What's Working**
- Top 3 content themes driving results
- Specific tactics they use

**Gaps & Opportunities**
- Where they're weak
- What you could do better

**Action Items**
- 3 specific things to implement immediately

Be direct and tactical. No fluff.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
