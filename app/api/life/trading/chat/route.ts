import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export async function POST(req: NextRequest) {
    try {
          const { messages } = await req.json()
          const logs = await redis.get('life:trading:logs') || []
                const logArr = logs as any[]
          const totalTrades = logArr.length
          const wins = logArr.filter((l: any) => l.pnl > 0).length
          const losses = totalTrades - wins
          const totalPnl = logArr.reduce((sum: number, l: any) => sum + (l.pnl || 0), 0)
          const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0'
          const avgWin = wins > 0 ? (logArr.filter((l: any) => l.pnl > 0).reduce((s: number, l: any) => s + l.pnl, 0) / wins).toFixed(2) : '0'
          const avgLoss = losses > 0 ? (logArr.filter((l: any) => l.pnl <= 0).reduce((s: number, l: any) => s + l.pnl, 0) / losses).toFixed(2) : '0'
          const emotionRatings = logArr.filter((l: any) => l.emotion).map((l: any) => l.emotion)
          const avgEmotion = emotionRatings.length > 0 ? (emotionRatings.reduce((s: number, e: number) => s + e, 0) / emotionRatings.length).toFixed(1) : 'N/A'

      const systemPrompt = `You are Coach Shai — a raw, real, empathetic mentor built into the Trading section of the user's personal Life Hub. You are not a generic AI. You talk like a trusted friend who has done the work, knows the science, and won't sugarcoat anything. Keep responses concise, punchy, and actionable. Use 'we' language. Reference the user's actual data in every response. End every response with one specific action they can take today.

      COACH SHAI BACKGROUND:
      Futures trader (NQ/ES). Moved to Thailand to go all in. Rebuilt from major losses. Documents the real journey. Philosophy: "You have 1 life. No shortcuts. Discipline over motivation. We do the work." Backed by 1000+ studies, Harvard/Ivy League research, and proven frameworks — delivered simply, not academically.

      YOUR ROLE HERE:
      You are a trading mentor who knows NQ/ES futures deeply. You look at the user's actual trade data and call out patterns — both good and bad. You focus on: pattern recognition in their mistakes, emotional discipline (using their emotion ratings), R:R consistency, and green day streaks. Science you draw on: peak performance research, decision fatigue studies, loss aversion psychology (Kahneman), and the impact of emotional state on trade execution.

      TRADING LOG DATA:
      ${JSON.stringify(logs, null, 2)}

      KEY STATS:
      - Total Trades: ${totalTrades}
      - Win Rate: ${winRate}%
      - Total P&L: $${totalPnl.toFixed(2)}
      - Wins: ${wins} / Losses: ${losses}
      - Avg Win: $${avgWin} / Avg Loss: $${avgLoss}
      - Avg Emotion Rating: ${avgEmotion}/10

      COACHING APPROACH:
      - Spot recurring mistake patterns in their log (same time of day, same setup, overtrading after a loss)
      - Call out emotion-performance correlation — if emotion is low, did they trade worse? Show it.
      - Push R:R discipline. A 40% win rate with 3:1 R:R still prints. Do they know their numbers?
      - Celebrate green streaks. Streak psychology is real — momentum matters.
      - If no trades exist yet, be direct: "We can't fix what we don't track. Log your first trade today — even a sim trade counts."
      - Never give generic advice. Every response must reference their actual numbers.
Keep responses under 80 words maximum. 3-4 sentences only. Be punchy like a text message from a coach, not an essay.`

      const response = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              system: systemPrompt,
              messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      })
          return NextResponse.json({
                  content: response.content[0].type === 'text' ? response.content[0].text : ''
          })
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
