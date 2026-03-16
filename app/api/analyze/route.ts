import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { post, avgLikes, avgComments, avgEngagement, followers } = await req.json()

    const engRate = followers ? ((post.like_count + post.comments_count) / followers * 100) : 0
    const hookLine = (post.caption || '').split('\n')[0].substring(0, 100)

    const msg = await client.messages.create({
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
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    try {
      const match = text.match(/\{[\s\S]*\}/)
      const analysis = match ? JSON.parse(match[0]) : null
      return NextResponse.json({ analysis, hookLine })
    } catch {
      return NextResponse.json({ analysis: null, raw: text, hookLine })
    }
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze post' }, { status: 500 })
  }
}
