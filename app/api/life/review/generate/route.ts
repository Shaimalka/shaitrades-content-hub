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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { weekStart, weekEnd } = await req.json()

    const [
      tradingLogs, habits, habitCompletions,
      healthLogs, journalEntries, goals,
      financeIncome, financeExpenses,
    ] = await Promise.all([
      redis.get('life:trading:logs').catch(() => []),
      redis.get('life:habits').catch(() => []),
      redis.get('life:habits:completions').catch(() => ({})),
      redis.get('life:health').catch(() => []),
      redis.get('life:journal').catch(() => []),
      redis.get('life:goals').catch(() => []),
      redis.get('life:finance:income').catch(() => []),
      redis.get('life:finance:expenses').catch(() => []),
    ])

    const weekFilter = (item: any) => item.date >= weekStart && item.date <= weekEnd
    const tradingThisWeek = ((tradingLogs as any[]) || []).filter(weekFilter)
    const healthThisWeek = ((healthLogs as any[]) || []).filter(weekFilter)
    const journalThisWeek = ((journalEntries as any[]) || []).filter(weekFilter)
    const financeThisWeek = ((financeIncome as any[]) || []).filter(weekFilter)
    const expensesThisWeek = ((financeExpenses as any[]) || []).filter(weekFilter)

    const completions = (habitCompletions as Record<string, string[]>) || {}
    const weekDates: string[] = []
    const d = new Date(weekStart)
    while (d.toISOString().split('T')[0] <= weekEnd) {
      weekDates.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    const habitsArr = (habits as any[]) || []
    const totalPossible = habitsArr.length * weekDates.length
    const totalDone = weekDates.reduce((sum, date) => sum + ((completions[date] || []).length), 0)

    const tradeWins = tradingThisWeek.filter((t: any) => t.pnl > 0).length
    const winRate = tradingThisWeek.length > 0 ? Math.round((tradeWins / tradingThisWeek.length) * 100) + '%' : '0%'
    const totalPnl = tradingThisWeek.reduce((s: number, t: any) => s + (t.pnl || 0), 0)
    const sleepLogs = healthThisWeek.filter((l: any) => l.sleep)
    const sleepAvg = sleepLogs.length > 0
      ? (sleepLogs.reduce((s: number, l: any) => s + l.sleep, 0) / sleepLogs.length).toFixed(1) + 'h'
      : 'no data'
    const gymSessions = healthThisWeek.filter((l: any) => l.gym).length
    const moodTags: string[] = []
    for (const j of journalThisWeek) {
      if ((j as any).moodTags) moodTags.push(...((j as any).moodTags))
    }
    const moodCount: Record<string, number> = {}
    for (const m of moodTags) moodCount[m] = (moodCount[m] || 0) + 1
    const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral'

    const summaryData = {
      weekStart, weekEnd,
      trading: { totalTrades: tradingThisWeek.length, wins: tradeWins, winRate, totalPnl, recentTrades: tradingThisWeek.slice(0,10).map((t: any) => ({ date: t.date, pnl: t.pnl, instrument: t.instrument })) },
      habits: { completionRate: totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) + '%' : '0%', habits: habitsArr.map((h: any) => h.name), weekDates, completions },
      health: { sleepAvg, gymSessions, energyLogs: healthThisWeek.map((l: any) => ({ date: l.date, energy: l.energy, sleep: l.sleep, gym: l.gym })) },
      journal: journalThisWeek.map((j: any) => ({ date: j.date, morningFocus: j.morningFocus, tradingMindset: j.tradingMindset, bestMoment: j.bestMoment, doDifferently: j.doDifferently, eveningMindsetRating: j.eveningMindsetRating, moodTags: j.moodTags })),
      goals: ((goals as any[]) || []).map((g: any) => ({ title: g.title, currentValue: g.currentValue, targetValue: g.targetValue, deadline: g.deadline })),
      finance: { totalIncome: financeThisWeek.reduce((s: number, i: any) => s + i.amount, 0), totalExpenses: expensesThisWeek.reduce((s: number, e: any) => s + e.amount, 0) },
      dominantMood,
    }

    const promptText = 'You are Coach Shai. Analyze this week (' + weekStart + ' to ' + weekEnd + ') and return only valid JSON.\n\nDATA: ' + JSON.stringify(summaryData) + '\n\nReturn exactly this structure with all fields populated:\n{"overallScore":<1-10>,"verdict":"<one sentence verdict>","trading":{"pnl":<number>,"winRate":"<string>","patterns":"<key pattern>","summary":"<2-3 sentences>"},"habits":{"completionRate":"<percentage>","bestHabit":"<name>","missedHabit":"<name>","streakStatus":"<1-2 sentences>"},"health":{"sleepAvg":"<string>","gymSessions":<number>,"energyTrend":"<1-2 sentences>"},"mindset":{"themes":"<recurring themes>","dominantMood":"<mood>","journalInsight":"<key insight>"},"goals":{"onTrack":[],"atRisk":[],"crushing":[]},"finance":{"incomeLogged":<number>,"expenses":<number>,"net":<number>},"focusNext":"<one specific action for next week>"}'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: promptText }],
    })

    const rawText = (message.content[0] as any).text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const reportData = JSON.parse(jsonMatch[0])

    const report = {
      id: Date.now().toString(),
      weekStart,
      weekEnd,
      generatedAt: new Date().toISOString(),
      ...reportData,
    }

    const existingReviews: any[] = ((await redis.get('life:reviews')) as any[]) || []
    const filtered = existingReviews.filter((r: any) => r.weekStart !== weekStart)
    await redis.set('life:reviews', [report, ...filtered].slice(0, 52))

    return NextResponse.json({ report })
  } catch (e) {
    console.error('Weekly review error:', e)
    return NextResponse.json({ error: 'Failed to generate review. Please try again.' }, { status: 500 })
  }
}
