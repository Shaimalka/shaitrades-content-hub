import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
  })

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  })

interface BacktestTrade {
    direction: 'Long' | 'Short'
    entryPrice: number
    exitPrice: number
    contracts: number
    netPnl: number
    riskReward: number
    result: 'Win' | 'Loss' | 'BE'
    followedRules: boolean
  }

interface BacktestSession {
    id: string
    name: string
    instrument: string
    trades: BacktestTrade[]
    coachAnalysis?: string
  }

interface LiveTrade {
    pnl?: number
    result?: string
    followedRules?: boolean
    riskReward?: number
  }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
          return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
        }

    try {
          const { sessionId, sessionStats, trades } = await req.json()

          // Fetch live trading stats from Redis for comparison
          const liveTrades: LiveTrade[] = (await redis.get(`life:trading:logs`) as LiveTrade[]) || []

          let liveWinRate = 0
          let liveAvgRR = 0
          let liveRuleAdherence = 0
          let liveTotalPnl = 0

          if (liveTrades.length > 0) {
                  const liveWins = liveTrades.filter((t: LiveTrade) => t.result === 'Win' || (t.pnl !== undefined && t.pnl > 0)).length
                  liveWinRate = Math.round((liveWins / liveTrades.length) * 100)
                  const liveRRValues = liveTrades.filter((t: LiveTrade) => t.riskReward && t.riskReward > 0).map((t: LiveTrade) => t.riskReward || 0)
                  liveAvgRR = liveRRValues.length > 0 ? liveRRValues.reduce((a: number, b: number) => a + b, 0) / liveRRValues.length : 0
                  const liveFollowed = liveTrades.filter((t: LiveTrade) => t.followedRules === true).length
                  liveRuleAdherence = Math.round((liveFollowed / liveTrades.length) * 100)
                  liveTotalPnl = liveTrades.reduce((sum: number, t: LiveTrade) => sum + (t.pnl || 0), 0)
                }

          const prompt = `You are Coach Shai, an expert trading performance coach. Analyze this trader's backtest results vs their live trading.

BACKTEST RESULTS (${sessionStats.totalTrades} trades):
- Win Rate: ${sessionStats.winRate}%
- Average R:R: ${sessionStats.avgRR}
- Rule Adherence: ${sessionStats.ruleAdherence}%
- Total Net P&L: $${sessionStats.totalPnl}
- Profit Factor: ${sessionStats.profitFactor}

LIVE TRADING RESULTS (${liveTrades.length} trades):
- Win Rate: ${liveWinRate}%
- Average R:R: ${liveAvgRR.toFixed(2)}
- Rule Adherence: ${liveRuleAdherence}%
- Total Net P&L: $${liveTotalPnl.toFixed(0)}

${liveTrades.length === 0 ? 'Note: No live trading data available yet.' : ''}

Give exactly:
1. Three specific insights comparing backtest to live performance (or backtest performance alone if no live data)
2. One concrete action item the trader should implement immediately

Be direct, specific, and actionable. Keep it under 200 words. No markdown headers. Use numbered lists.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save analysis back to session in Redis
    const key = `user:${session.user.email}:backtestSessions`
    const sessions: BacktestSession[] = (await redis.get(key) as BacktestSession[]) || []
    const idx = sessions.findIndex((s: BacktestSession) => s.id === sessionId)
    if (idx !== -1) {
      sessions[idx].coachAnalysis = analysis
      await redis.set(key, sessions)
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('Backtesting analyze error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
