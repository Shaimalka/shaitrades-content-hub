import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { context, numIdeas = 5 } = await req.json()

    if (!context?.topPosts?.length) {
      return NextResponse.json({ error: 'No competitor context provided' }, { status: 400 })
    }

    const { competitorUsername, followersCount, topPosts, analysis } = context

    // Build a summary of the top posts to use as inspiration
    const topPostsSummary = topPosts.slice(0, 10).map((p: any, i: number) => {
      return `Post #${i + 1} (${p.type || 'Image'}) — ${p.likesCount} likes, ${p.commentsCount} comments${p.videoViewCount ? `, ${p.videoViewCount} views` : ''}
Caption: ${(p.caption || '(no caption)').slice(0, 200)}`
    }).join('\n\n')

    const prompt = `You are an elite Instagram content strategist for a trading/finance account. 
You've analyzed a competitor and need to create original content ideas inspired by what works.

COMPETITOR INTELLIGENCE:
Account: @${competitorUsername} (${(followersCount || 0).toLocaleString()} followers)
${analysis ? `\nCOMPETITOR ANALYSIS SUMMARY:\n${analysis.slice(0, 800)}\n` : ''}

TOP PERFORMING POSTS (your inspiration):
${topPostsSummary}

Based on what performs best for this competitor, generate ${numIdeas} ORIGINAL content ideas for a trading account.

For EACH idea, provide exactly this JSON structure (array of ${numIdeas} objects):
[
  {
    "ideaNumber": 1,
    "contentType": "Reel/Carousel/Single Image",
    "inspiredBy": "brief note on which competitor post inspired this",
    "hook": "The exact first line/visual hook to stop the scroll — make it punchy and specific",
    "script": "Full word-for-word post script. For a reel this is the voiceover. For a carousel, write out each slide. For a single post, write the full caption including line breaks. Make it complete and ready to use.",
    "cta": "The exact call-to-action line to end with — specific, compelling, actionable"
  }
]

RULES:
- Content must be original, not copied from competitor
- Focus on trading/finance/investing topics
- Hook must be scroll-stopping — use curiosity, controversy, or specific numbers
- Script must be COMPLETE and WORD-FOR-WORD ready to use (at least 100 words)
- CTA must drive a specific action (follow, comment, save, DM, link in bio)
- Vary the content types across ideas
- Make each idea distinct and actionable

Return ONLY the JSON array, nothing else.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]'

    // Extract JSON array from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in response:', rawText.slice(0, 200))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    let ideas: any[]
    try {
      ideas = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr)
      return NextResponse.json({ error: 'Failed to parse ideas JSON' }, { status: 500 })
    }

    return NextResponse.json({ ideas })
  } catch (error: any) {
    console.error('Content generate error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
