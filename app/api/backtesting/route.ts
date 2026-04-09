import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
  })

function getKey(userId: string) {
    return `user:${userId}:backtestSessions`
  }

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
          const sessions = await redis.get(getKey(session.user.email)) || []
          return NextResponse.json({ sessions })
        } catch (err) {
          console.error('Backtesting GET error:', err)
          return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
        }
  }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
          const body = await req.json()
          const { action } = body
          const key = getKey(session.user.email)
          const sessions: BacktestSession[] = (await redis.get(key) as BacktestSession[]) || []

          if (action === 'createSession') {
                  const newSession: BacktestSession = {
                            id: crypto.randomUUID(),
                            name: body.name || 'Untitled Session',
                            playbookId: body.playbookId || null,
                            instrument: body.instrument || 'NQ1!',
                            dateRange: body.dateRange || { from: '', to: '' },
                            trades: [],
                            createdAt: new Date().toISOString(),
                          }
                  sessions.unshift(newSession)
                  await redis.set(key, sessions)
                  return NextResponse.json({ session: newSession })
                }

          if (action === 'addTrade') {
                  const { sessionId, trade } = body
                  const idx = sessions.findIndex((s: BacktestSession) => s.id === sessionId)
                  if (idx === -1) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

                  const newTrade: BacktestTrade = {
                            id: crypto.randomUUID(),
                            direction: trade.direction,
                            entryPrice: Number(trade.entryPrice),
                            exitPrice: Number(trade.exitPrice),
                            contracts: Number(trade.contracts),
                            netPnl: trade.netPnl,
                            riskReward: trade.riskReward,
                            result: trade.result,
                            followedRules: trade.followedRules,
                            notes: trade.notes || '',
                          }
                  sessions[idx].trades.push(newTrade)
                  await redis.set(key, sessions)
                  return NextResponse.json({ trade: newTrade, session: sessions[idx] })
                }

          if (action === 'deleteTrade') {
                  const { sessionId, tradeId } = body
                  const idx = sessions.findIndex((s: BacktestSession) => s.id === sessionId)
                  if (idx === -1) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
                  sessions[idx].trades = sessions[idx].trades.filter((t: BacktestTrade) => t.id !== tradeId)
                  await redis.set(key, sessions)
                  return NextResponse.json({ session: sessions[idx] })
                }

          if (action === 'deleteSession') {
                  const { sessionId } = body
                  const filtered = sessions.filter((s: BacktestSession) => s.id !== sessionId)
                  await redis.set(key, filtered)
                  return NextResponse.json({ success: true })
                }

          if (action === 'saveAnalysis') {
                  const { sessionId, analysis } = body
                  const idx = sessions.findIndex((s: BacktestSession) => s.id === sessionId)
                  if (idx === -1) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
                  sessions[idx].coachAnalysis = analysis
                  await redis.set(key, sessions)
                  return NextResponse.json({ success: true })
                }

          return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        } catch (err) {
          console.error('Backtesting POST error:', err)
          return NextResponse.json({ error: 'Server error' }, { status: 500 })
        }
  }

interface BacktestTrade {
    id: string
    direction: 'Long' | 'Short'
    entryPrice: number
    exitPrice: number
    contracts: number
    netPnl: number
    riskReward: number
    result: 'Win' | 'Loss' | 'BE'
    followedRules: boolean
    notes: string
  }

interface BacktestSession {
    id: string
    name: string
    playbookId: string | null
    instrument: string
    dateRange: { from: string; to: string }
    trades: BacktestTrade[]
    coachAnalysis?: string
    createdAt: string
  }
