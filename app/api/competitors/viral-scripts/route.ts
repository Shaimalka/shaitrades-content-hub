import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SHAI_PROFILE = {
  age: 23,
  from: 'Las Vegas',
  started: 'at 18 during COVID',
  salesIncome: '$250K+/year sales job',
  loss: '$230K last year (bad business + investments)',
  rebuilt: '$20-30K/month, paid off debts while trading futures',
  move: '1 month ago quit 6-figure job, moved to Thailand to trade full time',
  arc: 'from -$230K to full-time futures trader at 23',
}

function calcViralScore(post: any, avgScore: number): number {
  const engMultiplier = avgScore > 0 ? post.score / avgScore : 1
  const engScore = Math.min(40, Math.round(engMultiplier * 15))

  const caption = (post.caption || '').toLowerCase()
  const emotionalKeywords = ['lost','quit','broke','$','profit','fail','honest','real','cry','fear','anxiety','nervous','scared','fired','debt','wrong','mistake','regret','hustle','grind','journey','truth']
  const emotionalHits = emotionalKeywords.filter(k => caption.includes(k)).length
  const hookScore = Math.min(30, emotionalHits * 5)

  const brandKeywords = ['trade','trading','trader','market','futures','stocks','chart','profit','loss','income','money','freedom','lifestyle','travel','thailand','abroad','expat','young','23','journey','real','authentic']
  const brandHits = brandKeywords.filter(k => caption.includes(k)).length
  const brandScore = Math.min(30, brandHits * 4)

  return Math.min(100, engScore + hookScore + brandScore)
}

function generateCaption(shaiRemake: any, competitorUsername: string): string {
  const hook = shaiRemake.hook || ''
  const script = shaiRemake.script || ''
  const cta = shaiRemake.cta || ''
  const hashtags = [
    '#daytrader', '#tradingjourney', '#futurestrading', '#stockmarket',
    '#tradinglifestyle', '#thailand', '#digitalnomad', '#financialfreedom',
    '#tradingmindset', '#howtotrade', '#tradertok', '#shaitrades',
    '#rawtrader', '#lostmoney', '#tradingfromabroad', '#youngtrader',
  ].slice(0, 12).join(' ')
  return `${hook}\n\n${script}\n\n${cta}\n\n${hashtags}`
}

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()
    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    const followerCount = competitor.followersCount || 0

    // ── Filter to Reels and Carousels only ────────────────────────────────────
    const reelsAndCarousels = posts.filter((p: any) => {
      const type = (p.type || '').toLowerCase()
      return type === 'reel' || type === 'video' || type === 'carousel' || type === 'sidecar'
    })

    if (!reelsAndCarousels.length) {
      return NextResponse.json({ error: 'No Reels or Carousel posts found for this competitor' }, { status: 400 })
    }

    // ── Filter to 5%+ engagement rate only ───────────────────────────────────
    const filtered = reelsAndCarousels.filter((p: any) => {
      if (!followerCount) return true // if no follower count, don't filter out
      const engagementRate = ((p.likesCount || 0) + (p.commentsCount || 0)) / followerCount * 100
      return engagementRate >= 5
    })

    if (!filtered.length) {
      return NextResponse.json({ 
        error: 'No posts met the 5% engagement rate threshold. This competitor may have low engagement or follower count is missing.' 
      }, { status: 400 })
    }

    const scored = [...filtered].map((p: any) => ({
      ...p,
      score: (p.likesCount || 0) + (p.commentsCount || 0) * 2 + (p.videoViewCount || 0) * 0.1,
    }))
    scored.sort((a, b) => b.score - a.score)
    const top10 = scored.slice(0, 10)
    const avgScore = scored.reduce((s: number, p: any) => s + p.score, 0) / Math.max(scored.length, 1)

    const postsContext = top10.map((p: any, i: number) => {
      const multiplier = avgScore > 0 ? (p.score / avgScore).toFixed(1) : '1.0'
      const engRate = followerCount ? (((p.likesCount || 0) + (p.commentsCount || 0)) / followerCount * 100).toFixed(1) : 'N/A'
      const captionFull = (p.caption || '(no caption)').slice(0, 600)
      const dateFmt = p.timestamp
        ? new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : 'unknown date'
      return [
        'POST #' + (i + 1) + ' [' + multiplier + 'x avg | ' + engRate + '% engagement rate]',
        'Type: ' + (p.type || 'Reel'),
        'Likes: ' + (p.likesCount || 0) + ' | Comments: ' + (p.commentsCount || 0) + (p.videoViewCount ? ' | Views: ' + p.videoViewCount : ''),
        'Posted: ' + dateFmt,
        'Hashtags: ' + ((p.hashtags || []).length > 0 ? (p.hashtags || []).slice(0, 5).join(', ') : 'none'),
        'Caption/Script: ' + captionFull,
        'Post URL: ' + (p.url || 'n/a'),
      ].join('\n')
    }).join('\n\n---\n\n')

    const prompt = `You are a viral content strategist for Shai Malka (@shaitrades) — a raw, honest futures trader.

WHO SHAI IS:
- 23 years old from Las Vegas
- Started trading at 18 during COVID
- Got a high-paying sales job ($250K+/year) and got distracted from trading
- Lost $230K last year through a bad business and investments
- Went back to sales, made $20-30K/month, paid off all debts while trading futures
- 1 month ago quit his 6-figure job, left the USA, moved to Thailand to trade full-time
- Journey: from -$230K to full-time trader at 23
- Trades US futures markets from Thailand (2-3 AM local time)
- Brand: honest, raw, vulnerable — shows losses AND wins
- Voice: short punchy sentences, personal storytelling, real numbers, no hype
- Audience: 18-30 year old beginner-intermediate traders who want real talk, not guru content

IMPORTANT: You are ONLY analyzing Reels and Carousel posts that achieved 5%+ engagement rate — these are genuinely viral posts.
- For Reels: focus on spoken hook, voiceover script, and pacing
- For Carousels: focus on slide-by-slide structure, first slide hook, and swipe momentum

YOUR TASK: Analyze the top ${top10.length} most viral Reels and Carousel posts from @${competitor.username} (${followerCount.toLocaleString()} followers). For each post:
1. Extract/reconstruct the post's script or slide structure
2. Identify WHY it went viral
3. Remake it as Shai's own version — same viral structure, Shai's real story

TOP ${top10.length} VIRAL REELS & CAROUSELS FROM @${competitor.username}:
${postsContext}

For EACH post, output this JSON structure:
{
  "postNumber": 1,
  "originalPost": {
    "url": "post url",
    "type": "Reel/Carousel",
    "likesCount": 0,
    "commentsCount": 0,
    "videoViewCount": 0,
    "engagementMultiplier": "Xx avg",
    "reconstructedScript": "For Reels: what was likely said. For Carousels: what each slide likely showed. 2-4 sentences.",
    "whyViral": "One sentence: core reason this post outperformed"
  },
  "shaiRemake": {
    "contentType": "Reel or Carousel",
    "hook": "Exact first line — punchy, scroll-stopping, personal. A real moment, real number, or vulnerable admission in Shai's voice.",
    "script": "For Reel: full word-for-word voiceover script in Shai's voice, minimum 120 words. For Carousel: each slide separated by [SLIDE X:], minimum 6 slides. Personal, honest, ready to film or post.",
    "cta": "Exact CTA line — natural, not salesy, in Shai's voice",
    "viralStructure": "One sentence describing the viral structure used (e.g., 'confession + lesson + resolution')"
  }
}

Return a JSON array of exactly ${top10.length} objects. Return ONLY the JSON array, nothing else.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    let viralScripts: any[]
    try {
      viralScripts = JSON.parse(jsonMatch[0])
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse viral scripts' }, { status: 500 })
    }

    viralScripts = viralScripts.map((item: any, i: number) => {
      const original = top10[i] || {}
      const viralProbabilityScore = calcViralScore(original, avgScore)
      const captionWithHashtags = generateCaption(item.shaiRemake, competitor.username)

      return {
        ...item,
        originalPost: {
          ...item.originalPost,
          url: original.url || item.originalPost?.url || '',
          displayUrl: original.displayUrl || null,
          likesCount: original.likesCount || 0,
          commentsCount: original.commentsCount || 0,
          videoViewCount: original.videoViewCount || 0,
          type: original.type || 'Reel',
        },
        shaiRemake: {
          ...item.shaiRemake,
          viralProbabilityScore,
          captionWithHashtags,
        },
        competitorUsername: competitor.username,
        generatedAt: new Date().toISOString(),
        status: 'pending',
      }
    })

    return NextResponse.json({ viralScripts, competitorUsername: competitor.username })
  } catch (error: any) {
    console.error('Viral scripts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate viral scripts' }, { status: 500 })
  }
}
