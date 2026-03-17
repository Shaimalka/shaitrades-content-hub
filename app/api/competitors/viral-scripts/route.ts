import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()

    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    // Sort by engagement score and take top 10
    const scored = [...posts].map((p: any) => ({
      ...p,
      score: (p.likesCount || 0) + (p.commentsCount || 0) * 2 + (p.videoViewCount || 0) * 0.1,
    }))
    scored.sort((a, b) => b.score - a.score)
    const top10 = scored.slice(0, 10)

    const avgScore = scored.reduce((s: number, p: any) => s + p.score, 0) / Math.max(scored.length, 1)

    // Build detailed context for each post
    const postsContext = top10.map((p: any, i: number) => {
      const multiplier = avgScore > 0 ? (p.score / avgScore).toFixed(1) : '1.0'
      const captionFull = (p.caption || '(no caption)').slice(0, 600)
      const dateFmt = p.timestamp ? new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'unknown date'
      const lines = [
        'POST #' + (i + 1) + ' [' + multiplier + 'x avg engagement]',
        'Type: ' + (p.type || 'Image'),
        'Likes: ' + (p.likesCount || 0) + ' | Comments: ' + (p.commentsCount || 0) + (p.videoViewCount ? ' | Views: ' + p.videoViewCount : ''),
        'Posted: ' + dateFmt,
        'Hashtags: ' + ((p.hashtags || []).length > 0 ? (p.hashtags || []).slice(0, 5).join(', ') : 'none'),
        'Caption/Script: ' + captionFull,
        'Post URL: ' + (p.url || 'n/a'),
      ]
      return lines.join('\n')
    }).join('\n\n---\n\n')

    const prompt = `You are a viral content strategist for Shai — a raw, honest day trader who trades US stocks from Thailand.

WHO SHAI IS:
- Self-taught trader, built from scratch, no finance background
- Brand: honest, raw, vulnerable — shows losses AND wins
- Trades US markets from Southeast Asia (late nights due to time zones)
- Voice: short punchy sentences, personal storytelling, real numbers, no hype
- Audience: beginner-intermediate traders who want real talk, not guru content

YOUR TASK:
You have analyzed the top 10 most viral posts from @${competitor.username} (${(competitor.followersCount || 0).toLocaleString()} followers).
For each of these 10 posts, you must:
1. Extract/reconstruct the post's script (what was likely said or shown, based on the caption)
2. Identify WHY it went viral (hook type, emotional trigger, format)
3. Remake it as Shai's own version — same viral structure, but Shai's voice, his trading journey, his story

TOP 10 VIRAL POSTS FROM @${competitor.username}:
${postsContext}

For EACH of the 10 posts, output this JSON structure:

{
  "postNumber": 1,
  "originalPost": {
    "url": "post url",
    "type": "Reel/Carousel/Image",
    "likesCount": 0,
    "commentsCount": 0,
    "videoViewCount": 0,
    "engagementMultiplier": "Xx avg",
    "reconstructedScript": "What the post likely said/showed based on the caption — write this as if transcribing the audio or reading the carousel. 2-4 sentences.",
    "whyViral": "One sentence: the core reason this post outperformed"
  },
  "shaiRemake": {
    "contentType": "Reel/Carousel/Single Image",
    "hook": "The exact first line — punchy, scroll-stopping, personal. Shai's voice. A real moment, a real number, or a vulnerable admission.",
    "script": "Full word-for-word script in Shai's voice. For a Reel, this is the spoken voiceover. For a Carousel, write each slide separated by [SLIDE X:]. Must be complete, minimum 120 words, personal, honest, and ready to film.",
    "cta": "Exact CTA line — natural, not salesy, in Shai's voice",
    "viralStructure": "One sentence describing the viral structure being used (e.g., 'confession + lesson + resolution')"
  }
}

Return a JSON array of exactly 10 objects following that structure. Return ONLY the JSON array, nothing else.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array in viral scripts response:', rawText.slice(0, 300))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    let viralScripts: any[]
    try {
      viralScripts = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('JSON parse error:', e)
      return NextResponse.json({ error: 'Failed to parse viral scripts' }, { status: 500 })
    }

    // Attach post metadata
    viralScripts = viralScripts.map((item: any, i: number) => {
      const original = top10[i] || {}
      return {
        ...item,
        originalPost: {
          ...item.originalPost,
          url: original.url || item.originalPost?.url || '',
          displayUrl: original.displayUrl || null,
          likesCount: original.likesCount || 0,
          commentsCount: original.commentsCount || 0,
          videoViewCount: original.videoViewCount || 0,
          type: original.type || 'Image',
        },
        competitorUsername: competitor.username,
        generatedAt: new Date().toISOString(),
        status: 'pending', // pending | approved | scheduled
      }
    })

    return NextResponse.json({ viralScripts, competitorUsername: competitor.username })
  } catch (error: any) {
    console.error('Viral scripts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate viral scripts' }, { status: 500 })
  }
}
