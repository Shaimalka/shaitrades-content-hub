import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()

    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    const topPosts = posts.slice(0, 20)

    // Calculate average engagement
    const avgEngagement = topPosts.reduce((acc: number, p: any) => {
      return acc + p.likesCount + p.commentsCount * 2 + (p.videoViewCount || 0) * 0.1
    }, 0) / topPosts.length

    // Find outperforming posts (>1.5x average)
    const outperformers = topPosts.filter((p: any) => {
      const eng = p.likesCount + p.commentsCount * 2 + (p.videoViewCount || 0) * 0.1
      return eng > avgEngagement * 1.5
    }).slice(0, 5) // analyze top 5 outperformers

    const postsText = topPosts.slice(0, 10).map((p: any, i: number) => `Post #${i + 1} (${p.type || 'image'}):
- Likes: ${p.likesCount} | Comments: ${p.commentsCount}${p.videoViewCount ? ` | Views: ${p.videoViewCount}` : ''}
- Caption: ${(p.caption || '').slice(0, 300)}${(p.caption || '').length > 300 ? '...' : ''}
- Posted: ${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'unknown'}
`).join('
')

    // --- Overall analysis prompt ---
    const overallPrompt = `You are an elite Instagram growth strategist analyzing a competitor in the trading/finance space.

Competitor: @${competitor.username} (${competitor.followersCount?.toLocaleString() || 0} followers)
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

    const overallMessage = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: overallPrompt }],
    })

    const analysis = overallMessage.content[0].type === 'text' ? overallMessage.content[0].text : ''

    // --- Per-post deep analysis for outperformers ---
    const postAnalyses: any[] = []

    for (const post of outperformers) {
      const postEng = post.likesCount + post.commentsCount * 2 + (post.videoViewCount || 0) * 0.1
      const multiplier = (postEng / avgEngagement).toFixed(1)

      const postPrompt = `Analyze why this Instagram post outperformed the account average by ${multiplier}x.

Account: @${competitor.username} (${competitor.followersCount?.toLocaleString() || 0} followers)
Account avg engagement score: ${Math.round(avgEngagement)}

POST DETAILS:
- Type: ${post.type || 'Image'}
- Likes: ${post.likesCount} | Comments: ${post.commentsCount}${post.videoViewCount ? ` | Views: ${post.videoViewCount}` : ''}
- Engagement score: ${Math.round(postEng)} (${multiplier}x average)
- Caption: ${(post.caption || '(no caption)').slice(0, 500)}
- Posted: ${post.timestamp ? new Date(post.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'unknown'}
- Hashtag count: ${(post.hashtags || []).length}

Analyze exactly WHY this post outperformed. Respond in this exact JSON format:
{
  "hookStyle": "one sentence describing the opening hook or visual hook",
  "captionLength": "short/medium/long with word count estimate",
  "hashtagUsage": "none/minimal/moderate/heavy - brief note",
  "postingTime": "observation about timing if known, else 'unknown'",
  "format": "Image/Video/Carousel - what made the format effective",
  "engagementRate": "${multiplier}x above average",
  "whyItWorked": ["bullet 1", "bullet 2", "bullet 3"]
}

Return ONLY valid JSON, nothing else.`

      try {
        const postMessage = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 512,
          messages: [{ role: 'user', content: postPrompt }],
        })

        const rawText = postMessage.content[0].type === 'text' ? postMessage.content[0].text : '{}'
        // Extract JSON from response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

        postAnalyses.push({
          postId: post.id || post.shortCode || '',
          postUrl: post.url || '',
          postType: post.type || 'Image',
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          videoViewCount: post.videoViewCount || 0,
          captionPreview: (post.caption || '').slice(0, 100),
          engagementMultiplier: parseFloat(multiplier),
          ...parsed,
        })
      } catch (postErr) {
        console.error('Post analysis error:', postErr)
        // Continue with next post
      }
    }

    return NextResponse.json({ analysis, postAnalyses })
  } catch (error: any) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
