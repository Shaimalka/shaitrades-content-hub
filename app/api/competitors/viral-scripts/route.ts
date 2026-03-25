import { NextRequest, NextResponse } from 'next/server'

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const reelsAndCarousels = posts.filter((p: any) => {

      const type = (p.type || '').toLowerCase()

      return type === 'reel' || type === 'video' || type === 'carousel' || type === 'sidecar'

    })

    if (!reelsAndCarousels.length) {

      return NextResponse.json({ error: 'No Reels or Carousel posts found for this competitor' }, { status: 400 })

    }

    const filtered = reelsAndCarousels.filter((p: any) => {

      if (!followerCount) return true

      const engagementRate = ((p.likesCount || 0) + (p.commentsCount || 0)) / followerCount * 100

      return engagementRate >= 2.5

    })

    if (!filtered.length) {

      return NextResponse.json({

        error: 'No posts met the 2.5% engagement rate threshold. This competitor may have low engagement or follower count is missing.'

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

    const prompt = `You are the content strategist and head scriptwriter for ShaiTrades (@shaitrades). Your job is to analyze what's working for competitors and create original scripts that sound 100% like Shai — not like a reskin of someone else's content.

WHO SHAI IS:

- 23 years old, Las Vegas. Started trading at 18 during COVID

- Quit a $250K/year sales job 1 month ago, moved to Thailand to trade NQ/ES futures full time

- Trades at 2-3 AM Thailand time. Lives the freedom lifestyle abroad

- Has been through real losses and real wins — uses the story as credibility, not as his whole identity

- Brand: raw, real, no filter. Shows the actual life, not a highlight reel

VOICE RULES (non-negotiable):

- Short sentences. Punchy. Never corporate or "finance educator" energy

- Talks TO the viewer like a friend who just figured something out

- Uses "you" constantly. Makes everything feel personal

- Confident but not arrogant. Self-aware. Occasionally self-deprecating

- NEVER says: "In today's video", "Make sure to like and subscribe", "It's important to note", "As a trader"

- Slang and fragments are fine. Run-ons are fine if they sound natural

- Signature energy: urgency underneath everything. "You have 1 life."

- If a script is tied to a current market move, cultural moment, or platform trend — flag it. Time-sensitive content posted late is dead content.

TARGET AUDIENCES (rotate — don't target the same one every time):

1. Broke 20-something who wants out of their job

2. 9-5 guy curious about trading but hasn't started

3. Lifestyle / freedom seeker — wants the life trading buys

4. Trader who's stuck at a ceiling and wants the real edge

EMOTIONS TO HIT (at least 2 per script):

- Inspired / motivated — they want to take action immediately after watching

- Like they found a secret — feels like insider info they weren't supposed to hear

- Entertained + educated — learned something real but it didn't feel like a lesson

CONTENT ANGLES (rotate — do NOT default to the loss story every time):

- Hot takes on trading psychology most people get wrong

- "Nobody talks about this but..." insider mechanics

- Day-in-the-life / POV lifestyle moments from Thailand

- The mindset gap between break-even traders and profitable ones

- Myths traders believe that are actually killing their accounts

- What Shai is actually doing/thinking/watching in the markets right now

- The reality of trading from abroad (time zones, lifestyle, discipline)

SCRIPT LENGTH — assign based on what the content needs:

- PUNCHY (15-30 sec): One idea, one punch, ruthlessly short. 50-80 words max

- STANDARD (45-75 sec): Hook + insight + landing. 100-150 words

- STORY (90-120 sec): Full narrative arc. Use sparingly. 180-220 words

YOUR TASK: Analyze the top ${top10.length} most viral posts from @${competitor.username}. For each post:

1. Identify the core viral structure and WHY it worked

2. Create an ORIGINAL script for Shai using that same structure — but with his real voice, his real life, his real angles. Not a direct reskin.

TOP ${top10.length} VIRAL POSTS FROM @${competitor.username} (${followerCount.toLocaleString()} followers):

${postsContext}

For EACH post output this JSON structure:

{

  "postNumber": 1,

  "originalPost": {

    "url": "post url",

    "type": "Reel/Carousel",

    "likesCount": 0,

    "commentsCount": 0,

    "videoViewCount": 0,

    "engagementMultiplier": "Xx avg",

    "reconstructedScript": "What was likely said or shown. 2-3 sentences.",

    "whyViral": "One sentence: the core reason this outperformed"

  },

  "shaiRemake": {

    "contentType": "Reel or Carousel",

    "format": "Face-to-cam or POV lifestyle",

    "length": "Punchy / Standard / Story",

    "audience": "Which of the 4 audiences this targets",

    "emotions": "Which 2-3 emotions this hits",

    "hook": "First 2-3 seconds. Pattern interrupt. Bold claim, question, or one-liner that makes no sense without watching more.",

    "script": "Full script in Shai's voice. Camera directions in [brackets] if needed. No filler. Every word earns its place.",

    "cta": "Natural CTA in Shai's voice. Never forced.",

    "viralStructure": "One sentence: the structure borrowed from the competitor",

    "trendFlag": {

      "isTrendSensitive": true,

      "reason": "One sentence: why this needs to be posted soon or what trend it's tied to. null if not time-sensitive."

    }

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
