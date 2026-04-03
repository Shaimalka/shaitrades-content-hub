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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are Coach Shai. Every morning you greet the user with a personalized 5-sentence daily brief. You are raw, real, direct and empathetic. Use their actual data. Structure: 1. Personal greeting with observation about yesterday 2. Sleep/health note if logged 3. Trading or habits streak status 4. One specific focus for today based on their patterns 5. End with something motivating — never generic. Sign off with "You have 1 life." Keep it under 100 words total. No bullet points — flowing prose like a coach talking to you.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `life:daily-brief:${today}`
    const body = await req.json().catch(() => ({}))
    const forceRefresh = body.refresh === true

    if (!forceRefresh) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ brief: cached, cached: true })
      }
    }

    const [tradingLogs, habits, habitCompletions, health, journal, goals, financeIncome] = await Promise.all([
      redis.get('life:trading:logs').catch(() => []),
      redis.get('life:habits').catch(() => []),
      redis.get('life:habits:completions').catch(() => ({})),
      redis.get('life:health').catch(() => []),
      redis.get('life:journal').catch(() => []),
      redis.get('life:goals').catch(() => []),
      redis.get('life:finance:income').catch(() => []),
    ])

    const tradingArr = (tradingLogs as any[]) || []
    const habitsArr = (habits as any[]) || []
    const completions = (habitCompletions as Record<string, any>) || {}
    const healthArr = (health as any[]) || []
    const journalArr = (journal as any[]) || []
    const goalsArr = (goals as any[]) || []
    const incomeArr = (financeIncome as any[]) || []

    const hasData = tradingArr.length > 0 || habitsArr.length > 0 || healthArr.length > 0 || journalArr.length > 0 || goalsArr.length > 0 || incomeArr.length > 0

    if (!hasData) {
      return NextResponse.json({ brief: null, noData: true })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const yesterdayTrades = tradingArr.filter((t: any) => t.date === yesterdayStr)
    const recentTrades = tradingArr.slice(-5)

    const yesterdayCompletions = habitsArr.filter((h: any) => completions[yesterdayStr]?.[h.id])
    let streak = 0
    const checkDate = new Date()
    for (let i = 0; i < 60; i++) {
      const ds = checkDate.toISOString().split('T')[0]
      const done = habitsArr.filter((h: any) => completions[ds]?.[h.id]).length
      if (done > 0) streak++
      else break
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const yesterdayHealth = healthArr.find((l: any) => l.date === yesterdayStr)
    const todayHealth = healthArr.find((l: any) => l.date === today)
    const todayJournal = journalArr.find((j: any) => j.date === today)
    const yesterdayJournal = journalArr.find((j: any) => j.date === yesterdayStr)

    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthIncome = incomeArr.filter((e: any) => e.date?.startsWith(currentMonth)).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekPnl = tradingArr.filter((t: any) => t.date >= weekStartStr).reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

    const context = {
      today,
      yesterday: yesterdayStr,
      trading: {
        yesterdayTrades: yesterdayTrades.map((t: any) => ({ pnl: t.pnl, instrument: t.instrument })),
        weekPnl,
        totalTrades: tradingArr.length,
        recentTrades: recentTrades.map((t: any) => ({ date: t.date, pnl: t.pnl, instrument: t.instrument })),
      },
      habits: {
        total: habitsArr.length,
        names: habitsArr.map((h: any) => h.name),
        yesterdayDone: yesterdayCompletions.length,
        currentStreak: streak,
      },
      health: {
        yesterdayLog: yesterdayHealth ? { sleep: yesterdayHealth.sleep, energy: yesterdayHealth.energy, gym: yesterdayHealth.gym } : null,
        todayLog: todayHealth ? { sleep: todayHealth.sleep, energy: todayHealth.energy } : null,
      },
      journal: {
        todayEntry: todayJournal ? { morningFocus: todayJournal.morningFocus, intention: todayJournal.intention } : null,
        yesterdayEntry: yesterdayJournal ? { bestMoment: yesterdayJournal.bestMoment, doDifferently: yesterdayJournal.doDifferently, hitFocus: yesterdayJournal.hitFocus, moodTags: yesterdayJournal.moodTags } : null,
      },
      goals: goalsArr.map((g: any) => ({ title: g.title, currentValue: g.currentValue, targetValue: g.targetValue })),
      finance: { monthlyIncome: monthIncome },
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Here is my life data for today (' + today + '). Give me my daily brief:\n\n' + JSON.stringify(context, null, 2) }],
    })

    const briefText = (message.content[0] as any).text
    const briefData = { text: briefText, generatedAt: new Date().toISOString(), date: today }

    await redis.set(cacheKey, briefData, { ex: 86400 })

    return NextResponse.json({ brief: briefData, cached: false })
  } catch (e) {
    console.error('Daily brief error:', e)
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}