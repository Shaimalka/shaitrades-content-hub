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
      'You are the head content strategist for ShaiTrades (@shaitrades). Your job is to analyze competitors and extract specific, actionable intelligence that Shai can use to grow faster.',
      '',
      'WHO SHAI IS:',
      '- 23 years old, Las Vegas. Started trading at 18 during COVID',
      '- Quit a $250K/year sales job 1 month ago, moved to Thailand to trade NQ/ES futures full time',
      '- Trades at 2-3 AM Thailand time. Lives the freedom lifestyle abroad',
      '- Has a raw, real, no-filter brand — shows actual losses AND wins',
      '- Voice: short punchy sentences, personal storytelling, real numbers, zero hype',
      '- Goals: trading course, global speaking, massive personal brand',
      '- Audience: broke 20-somethings who want out, 9-5 guys curious about trading, lifestyle/freedom seekers, traders who want to level up',
      '',
      'COMPETITOR BEING ANALYZED:',
      '@' + competitor.username + ' (' + followersStr + ' followers)',
      'Bio: ' + bioStr,
      '',
      'Their top posts by engagement:',
      postsText,
      '',
      'Analyze this competitor THROUGH THE LENS OF SHAITRADES. Every insight should answer: "What does this mean for Shai specifically and how can he use it?"',
      '',
      'Cover these sections:',
      '',
      '**Content Strategy**',
      '- What types of content get the most engagement for this account',
      '- Posting patterns and formats that are working',
      '',
      '**What Shai Can Steal**',
      '- Top 3 specific content angles or tactics Shai should take and make his own',
      '- For each one: explain WHY it works AND how Shai\'s story/voice makes him better positioned to execute it',
      '',
      '**Where This Competitor Is Weak**',
      '- Gaps in their content that Shai can own',
      '- Angles they\'re missing that fit perfectly with Shai\'s brand',
      '',
      '**Shai\'s 3 Immediate Action Items**',
      '- 3 specific pieces of content Shai should make this week based on this analysis',
      '- Each one should be a concrete video/post idea, not generic advice',
      '',
      'Be direct, tactical, and always tie insights back to Shai specifically. No generic advice.',
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
        'You are the content strategist for ShaiTrades (@shaitrades). Analyze why this competitor post outperformed and translate it into a direct opportunity for Shai.',
        '',
        'WHO SHAI IS:',
        '- 23 years old, quit a $250K/year sales job, moved to Thailand to trade NQ/ES futures full time',
        '- Raw, real, no-filter brand. Short punchy voice. Real numbers. Zero hype.',
        '- Audience: broke 20-somethings, 9-5 guys, lifestyle seekers, traders leveling up',
        '',
        'COMPETITOR: @' + competitor.username + ' (' + followersStr + ' followers)',
        'This post outperformed their account average by ' + multiplier + 'x.',
        '',
        postDetail,
        '',
        'Analyze WHY this post outperformed AND what it means for Shai. Respond in this exact JSON format:',
        '{',
        '  "hookStyle": "one sentence describing the opening hook",',
        '  "captionLength": "short/medium/long with word count estimate",',
        '  "hashtagUsage": "none/minimal/moderate/heavy - brief note",',
        '  "postingTime": "observation about timing if known, else unknown",',
        '  "format": "Image/Video/Carousel - what made the format effective",',
        '  "engagementRate": "' + multiplier + 'x above average",',
        '  "whyItWorked": ["bullet 1", "bullet 2", "bullet 3"],',
        '  "shaiOpportunity": "One specific sentence: how Shai can use this exact insight with his own story and voice"',
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