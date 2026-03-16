import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      analysis: null,
      error: 'ANTHROPIC_API_KEY is not set. Add it to your Vercel environment variables.',
    }, { status: 500 })
  }

  try {
    const { post, avgLikes, avgComments, avgEngagement, followers } = await req.json()

    const engRate = followers ? ((post.like_count + post.comments_count) / followers * 100) : 0

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an Instagram content strategist analyzing a post from @shaitrades (trading/finance creator, ${followers} followers).

POST DATA:
- Type: ${post.media_type}
- Posted: ${post.timestamp}
- Likes: ${post.like_count}
- Comments: ${post.comments_count}
- Engagement Rate: ${engRate.toFixed(2)}%
- Caption: ${post.caption || '(no caption)'}

ACCOUNT AVERAGES:
- Avg Likes: ${avgLikes?.toFixed(0) || 0}
- Avg Comments: ${avgComments?.toFixed(0) || 0}
- Avg Engagement Rate: ${avgEngagement?.toFixed(2) || 0}%

Analyze this post and return a JSON object (no markdown, just pure JSON) with these fields:
{
  "hook_text": "the opening line/hook extracted from the caption",
  "hook_rating": 7,
  "hook_explanation": "why this hook works or doesn't work",
  "caption_key_points": ["point 1", "point 2"],
  "caption_cta": "the call to action used",
  "caption_hashtags": ["hashtag1", "hashtag2"],
  "vs_average": "outperformed" or "underperformed" or "average",
  "vs_explanation": "why it performed this way relative to account average",
  "content_intelligence": "2-3 sentence plain English analysis of exactly why this post performed the way it did — what worked, what didn't, what to replicate",
  "replicate_tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}`
        }]
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Anthropic API error:', response.status, errBody)
      return NextResponse.json({
        analysis: null,
        error: `Anthropic API error ${response.status}: ${errBody.substring(0, 300)}`,
      }, { status: 500 })
    }

    const msg = await response.json()
    const text = msg.content?.[0]?.type === 'text' ? msg.content[0].text : ''
    const hookLine = (post.caption || '').split('\n')[0].substring(0, 100)

    try {
      const match = text.match(/\{[\s\S]*\}/)
      const analysis = match ? JSON.parse(match[0]) : null
      if (!analysis) {
        return NextResponse.json({ analysis: null, error: `Could not parse AI response: ${text.substring(0, 200)}`, hookLine })
      }
      return NextResponse.json({ analysis, hookLine })
    } catch {
      return NextResponse.json({ analysis: null, error: `JSON parse error. Raw response: ${text.substring(0, 300)}`, hookLine })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Analysis error:', message)
    return NextResponse.json({ analysis: null, error: `Server error: ${message}` }, { status: 500 })
  }
}
