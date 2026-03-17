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

      const prompt = `You are writing content for Shai — a real, raw, and honest day trader based in Thailand who trades US stocks from Southeast Asia. Here is everything you need to know about Shai to write in his voice:

      WHO SHAI IS:
      - Name: Shai
      - Location: Trading from Thailand / Southeast Asia
      - Trades US stocks, which means staying up late to catch market hours (US market opens at night Thai time)
      - Built this from scratch with zero background in finance — self-taught, figured it out the hard way
      - Brand pillars: honest, raw, vulnerable, real — he shows LOSSES just as much as wins
      - No hype, no "get rich quick" talk, no fake lifestyle flexing
      - Content style: personal storytelling mixed with trading education
      - Audience: beginner-to-intermediate traders who want real talk, not polished guru content
      - Themes that resonate with his audience: trade recaps (wins AND losses), lessons learned from bad trades, trading while traveling / living in Southeast Asia, discipline and mental game, risk management, the reality of the long road to profitability, the unglamorous daily grind of trading

      SHAI'S VOICE:
      - Speaks like a real person, not a finance influencer
      - Short punchy sentences. Direct. Sometimes vulnerable.
      - Will say things like "I lost $800 today and here's what I learned" not "Here are 5 tips to maximize returns"
      - Relatable to beginners — avoids jargon, explains things simply
      - Honest about the struggle, the slow progress, the emotional side of trading
      - Occasionally references the Southeast Asia / Thailand context (time zone, lifestyle, trading from abroad)

      Now, you've analyzed a competitor account to understand what content formats and hooks perform well. Use that as structural inspiration — but make every idea sound like SHAI, not a generic trading influencer.

      COMPETITOR INTELLIGENCE:
      Account: @${competitorUsername} (${(followersCount || 0).toLocaleString()} followers)
      ${analysis ? `\nCOMPETITOR ANALYSIS SUMMARY:\n${analysis.slice(0, 800)}\n` : ''}
      TOP PERFORMING POSTS (structural inspiration only):
      ${topPostsSummary}

      Based on what performs best for this competitor, generate ${numIdeas} ORIGINAL content ideas written in Shai's voice. For EACH idea, provide exactly this JSON structure (array of ${numIdeas} objects):

      [
        {
            "ideaNumber": 1,
                "contentType": "Reel/Carousel/Single Image",
                    "inspiredBy": "brief note on which competitor post inspired the format/structure",
                        "hook": "The exact first line/visual hook to stop the scroll — make it punchy and specific. Should sound like Shai — personal, real, not a listicle teaser.",
                            "script": "Full word-for-word post script written in Shai's voice. For a reel this is the voiceover. For a carousel, write out each slide. For a single post, write the full caption including line breaks. Make it complete and ready to use — minimum 100 words. Must feel personal, honest, and real — not like a generic finance post.",
                                "cta": "The exact call-to-action line to end with — specific, compelling, and in Shai's voice (not corporate-sounding)"
                                  }
                                  ]

                                  RULES:
                                  - Every piece of content must sound like SHAI — personal, honest, raw
                                  - Do NOT write generic trading tips content — write Shai's actual lived experience
                                  - Hook must be scroll-stopping — use a real moment, a real number, or a vulnerable admission
                                  - Script must be COMPLETE and WORD-FOR-WORD ready to use (at least 100 words)
                                  - Show the human behind the trades — the emotions, the late nights, the grind
                                  - CTA must feel natural coming from Shai, not salesy
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
