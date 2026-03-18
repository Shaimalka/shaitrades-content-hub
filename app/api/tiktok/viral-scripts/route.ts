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
  const brandKeywords = ['trade','trading','trader','market','futures','stocks','chart','profit','loss','income','money','freedom','lifestyle','travel','thailand','abroad','expat','young','23','journey','real','authentic','tiktok','viral']
  const brandHits = brandKeywords.filter(k => caption.includes(k)).length
  const brandScore = Math.min(30, brandHits * 4)
  return Math.min(100, engScore + hookScore + brandScore)
}

function generateCaption(shaiRemake: any, _competitorUsername: string): string {
  const hook = shaiRemake.hook || ''
  const cta = shaiRemake.cta || ''
  const hashtags = [
    '#daytrader', '#tradingjourney', '#futurestrading', '#stockmarket',
    '#tradinglifestyle', '#thailand', '#digitalnomad', '#financialfreedom',
    '#tradingmindset', '#howtotrade', '#tradertok', '#shaitrades',
    '#rawtrader', '#lostmoney', '#tradingfromabroad', '#youngtrader',
  ].slice(0, 12).join(' ')
  return hook + ' ' + cta + ' ' + hashtags
}

export async function POST(req: NextRequest) {
  try {
    const { competitor, posts } = await req.json()
    if (!competitor || !posts?.length) {
      return NextResponse.json({ error: 'Competitor and posts required' }, { status: 400 })
    }

    const scored = [...posts].map((p: any) => ({
      ...p,
      score: (p.likesCount || 0) + (p.commentsCount || 0) * 2 + (p.videoViewCount || 0) * 0.1,
    }))
    scored.sort((a, b) => b.score - a.score)
    const top10 = scored.slice(0, 10)
    const avgScore = scored.reduce((s: number, p: any) => s + p.score, 0) / Math.max(scored.length, 1)

    const postsContext = top10.map((p: any, i: number) => {
      const multiplier = avgScore > 0 ? (p.score / avgScore).toFixed(1) : '1.0'
      const captionFull = (p.caption || '(no caption)').slice(0, 600)
      const dateFmt = p.timestamp
        ? new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : 'unknown date'
      return [
        'POST #' + (i + 1) + ' [' + multiplier + 'x avg engagement]',
        'Views: ' + (p.videoViewCount || 0) + ' | Likes: ' + (p.likesCount || 0) + ' | Comments: ' + (p.commentsCount || 0),
        'Posted: ' + dateFmt,
        'Caption/Script: ' + captionFull,
        'Post URL: ' + (p.url || 'n/a'),
      ].join('\n')
    }).join('\n\n---\n\n')

    const prompt = 'You are a viral content strategist for Shai Malka (@shaitrades) on TikTok.\n\n' +
      'WHO SHAI IS:\n' +
      '- 23 years old from Las Vegas\n' +
      '- Started trading at 18 during COVID\n' +
      '- Lost $230K last year, rebuilt from -$230K to full-time futures trader at 23\n' +
      '- Moved to Thailand 1 month ago to trade full-time\n' +
      '- Brand: honest, raw, vulnerable — shows losses AND wins\n' +
      '- Voice: short punchy sentences, personal storytelling, real numbers, no hype\n' +
      '- Audience: 18-30 year old beginner-intermediate traders\n\n' +
      'TASK: Analyze top 10 most viral TikToks from @' + competitor.username + ' (' + (competitor.followersCount || 0).toLocaleString() + ' followers).\n' +
      'For each: reconstruct script, explain why viral, remake as Shai version.\n\n' +
      'TOP 10 VIRAL TIKTOKS FROM @' + competitor.username + ':\n' + postsContext + '\n\n' +
      'For EACH of the 10 videos, output this JSON:\n' +
      '{\n' +
      '  "postNumber": 1,\n' +
      '  "originalPost": {\n' +
      '    "url": "video url", "type": "TikTok Video",\n' +
      '    "likesCount": 0, "commentsCount": 0, "videoViewCount": 0,\n' +
      '    "engagementMultiplier": "Xx avg",\n' +
      '    "reconstructedScript": "What the video likely said/showed.",\n' +
      '    "whyViral": "One sentence: core reason this TikTok outperformed"\n' +
      '  },\n' +
      '  "shaiRemake": {\n' +
      '    "contentType": "TikTok Video",\n' +
      '    "hook": "Punchy first line in Shai voice. Must grab in 2 seconds.",\n' +
      '    "script": "Full spoken script in Shai voice. Min 120 words. Personal and honest.",\n' +
      '    "cta": "Natural CTA in Shai voice",\n' +
      '    "viralStructure": "One sentence describing viral structure"\n' +
      '  }\n' +
      '}\n\n' +
      'Return a JSON array of exactly 10 objects. Return ONLY the JSON array.'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
          type: 'TikTok Video',
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
    console.error('TikTok viral scripts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate viral scripts' }, { status: 500 })
  }
}
