import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function formatPost(p: any, i: number): string {
  const viewsPart = p.videoViewCount ? ' | Views: ' + p.videoViewCount : ''
  const captionTrunc = (p.caption || '').slice(0, 300)
  const captionEllipsis = (p.caption || '').length > 300 ? '...' : ''
  const dateStr = p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'unknown'
  return 'Post #' + (i + 1) + ' (' + (p.type || 'image') + '):\n' +
    '- Likes: ' + p.likesCount + ' | Comments: ' + p.commentsCount + viewsPart + '\n' +
    '- Caption: ' + captionTrunc + captionEllipsis + '\n' +
    '- Posted: ' + dateStr
}

function formatPostDetail(post: any, multiplier: string, avgEngagement: number): string {
  const viewsPart = post.videoViewCount ? ' | Views: ' + post.videoViewCount : ''
  const dateStr = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'unknown'
  const hashtagCount = (post.hashtags || []).length
  const captionText = (post.caption || '(no caption)').slice(0, 500)
  const postEng = Math.round(post.likesCount + post.commentsCount * 2 + (post.videoViewCount || 0) * 0.1)
  return [
    'POST DETAILS:',
    '- Type: ' + (post.type || 'Image'),
    '- Likes: ' + post.likesCount + ' | Comments: ' + post.commentsCount + viewsPart,
    '- Engagement score: ' + postEng + ' (' + multiplier + 'x average)',
    '- Caption: ' + captionText,
    '- Posted: ' + dateStr,
    '- Hashtag count: ' + hashtagCount,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()

    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    const topPosts = posts.slice(0, 20)

    const avgEngagement = topPosts.reduce((acc: number, p: any) => {
      return acc + p.likesCount + p.commentsCount * 2 + (p.videoViewCount || 0) * 0.1
    }, 0) / topPosts.length

    const outperformers = topPosts.filter((p: any) => {
      const eng = p.likesCount + p.commentsCount * 2 + (p.videoViewCount || 0) * 0.1
      return eng > avgEngagement * 1.5
    }).slice(0, 5)

    const postsText = topPosts.slice(0, 10).map(formatPost).join('\n\n')

    const followersStr = competitor.followersCount?.toLocaleString() || '0'
    const bioStr = competitor.biography || 'N/A'

    const overallPrompt = [
      'You are an elite Instagram growth strategist analyzing a competitor in the trading/finance space.',
      '',
      'Competitor: @' + competitor.username + ' (' + followersStr + ' followers)',
      'Bio: ' + bioStr,
      '',
      'Their top posts by engagement:',
      postsText,
      '',
      'Provide a sharp, tactical analysis covering:',
      '',
      '**Content Strategy**',
      '- What types of content get the most engagement',
      '- Posting patterns and formats',
      '',
      '**What\'s Working**',
      '- Top 3 content themes driving results',
      '- Specific tactics they use',
      '',
      '**Gaps & Opportunities**',
      '- Where they\'re weak',
      '- What you could do better',
      '',
      '**Action Items**',
      '- 3 specific things to implement immediately',
      '',
      'Be direct and tactical. No fluff.',
    ].join('\n')

    const overallMessage = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: overallPrompt }],
    })

    const analysis = overallMessage.content[0].type === 'text' ? overallMessage.content[0].text : ''

    const postAnalyses: any[] = []

    for (const post of outperformers) {
      const postEng = post.likesCount + post.commentsCount * 2 + (post.videoViewCount || 0) * 0.1
      const multiplier = (postEng / avgEngagement).toFixed(1)

      const postDetail = formatPostDetail(post, multiplier, avgEngagement)

      const postPrompt = [
        'Analyze why this Instagram post outperformed the account average by ' + multiplier + 'x.',
        '',
        'Account: @' + competitor.username + ' (' + followersStr + ' followers)',
        'Account avg engagement score: ' + Math.round(avgEngagement),
        '',
        postDetail,
        '',
        'Analyze exactly WHY this post outperformed. Respond in this exact JSON format:',
        '{',
        '  "hookStyle": "one sentence describing the opening hook or visual hook",',
        '  "captionLength": "short/medium/long with word count estimate",',
        '  "hashtagUsage": "none/minimal/moderate/heavy - brief note",',
        '  "postingTime": "observation about timing if known, else unknown",',
        '  "format": "Image/Video/Carousel - what made the format effective",',
        '  "engagementRate": "' + multiplier + 'x above average",',
        '  "whyItWorked": ["bullet 1", "bullet 2", "bullet 3"]',
        '}',
        '',
        'Return ONLY valid JSON, nothing else.',
      ].join('\n')

      try {
        const postMessage = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 512,
          messages: [{ role: 'user', content: postPrompt }],
        })

        const rawText = postMessage.content[0].type === 'text' ? postMessage.content[0].text : '{}'
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
      }
    }

    return NextResponse.json({ analysis, postAnalyses })
  } catch (error: any) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
