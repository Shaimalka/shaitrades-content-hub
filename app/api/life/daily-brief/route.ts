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

const BASE_SYSTEM_PROMPT = `You are Coach Shai. You greet the user with a personalized 5-sentence daily brief. You are raw, real, direct and empathetic. Use their actual data. Structure: 1. Personal greeting with observation about yesterday 2. Sleep/health note if logged 3. Trading or habits streak status 4. One specific focus for today based on their patterns 5. End with something motivating — never generic. Sign off with "You have 1 life." Keep it under 100 words total. No bullet points — flowing prose like a coach talking to you.`

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
        const body = await req.json().catch(() => ({}))
        const forceRefresh = body.refresh === true

      // Use the client-supplied local date so the cache key matches the user's timezone
      const localDate: string = body.localDate || new Date().toISOString().split('T')[0]

      // Per-user, per-day cache key
      const cacheKey = `dailyBrief:${userId}:${localDate}`

      if (!forceRefresh) {
              const cached = await redis.get<{ text: string; generatedAt: string; date: string }>(cacheKey)
              if (cached) {
                        return NextResponse.json({ brief: cached, cached: true })
              }
      }

      const [
              profile,
              tradingLogs,
              habits,
              habitCompletions,
              health,
              journal,
              goals,
              financeIncome,
              tradingAccounts,
              userSettings,
            ] = await Promise.all([
              redis.get(`profile:${userId}`).catch(() => null),
              redis.get(`trading:${userId}:logs`).catch(() => []),
              redis.get(`habits:${userId}`).catch(() => []),
              redis.get(`habits:${userId}:completions`).catch(() => ({})),
              redis.get(`health:${userId}`).catch(() => []),
              redis.get(`journal:${userId}`).catch(() => []),
              redis.get(`goals:${userId}`).catch(() => []),
              redis.get(`finance:${userId}:income`).catch(() => []),
              redis.get(`tradingAccounts:${userId}`).catch(() => []),
              redis.get(`userSettings:${userId}`).catch(() => null),
            ])

      const tradingArr = (tradingLogs as any[]) || []
            const habitsArr = (habits as any[]) || []
                  const completions = (habitCompletions as Record<string, any>) || {}
                        const healthArr = (health as any[]) || []
                              const journalArr = (journal as any[]) || []
                                    const goalsArr = (goals as any[]) || []
                                          const incomeArr = (financeIncome as any[]) || []
                                                const accountsArr = (tradingAccounts as any[]) || []

                                                      // --- Timezone context ---
                                                      const settings = userSettings as any
        const userTimezone = settings?.timezone || 'UTC'
        const userSession = settings?.primarySession || 'New York'
        const now = new Date()
        const localTime = new Intl.DateTimeFormat('en-US', {
                timeZone: userTimezone,
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
        }).format(now)
        const localHour = parseInt(
                new Intl.DateTimeFormat('en-US', {
                          timeZone: userTimezone,
                          hour: 'numeric',
                          hour12: false,
                }).format(now),
                10
              )
        const timeOfDay =
                localHour < 6 ? 'late night'
                : localHour < 12 ? 'morning'
                : localHour < 17 ? 'afternoon'
                : localHour < 21 ? 'evening'
                : 'night'

      const sessionTimes: Record<string, Record<string, string>> = {
              'New York': {
                        'America/New_York': '9:30 AM - 4:00 PM',
                        'Asia/Bangkok': '8:30 PM - 3:00 AM',
                        'Europe/London': '2:30 PM - 9:00 PM',
                        UTC: '2:30 PM - 9:00 PM',
              },
              London: {
                        'Europe/London': '8:00 AM - 4:30 PM',
                        'Asia/Bangkok': '2:00 PM - 10:30 PM',
                        'America/New_York': '3:00 AM - 11:30 AM',
                        UTC: '8:00 AM - 4:30 PM',
              },
      }
        const sessionTime = sessionTimes[userSession]?.[userTimezone] || 'check your local time'

      const timeGuidance =
              timeOfDay === 'morning'
            ? 'Focus on preparation and intention setting for the day ahead.'
                : timeOfDay === 'afternoon'
            ? 'Check in on progress and mid-day energy.'
                : timeOfDay === 'evening' || timeOfDay === 'night'
            ? 'If they trade evenings, acknowledge the session; review what happened today.'
                : 'Acknowledge the late-night grind and remind them recovery is part of the edge.'

      const hasData =
              tradingArr.length > 0 ||
              habitsArr.length > 0 ||
              healthArr.length > 0 ||
              journalArr.length > 0 ||
              goalsArr.length > 0 ||
              incomeArr.length > 0

      const today = localDate
        const yesterday = new Date(localDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

      const yesterdayTrades = tradingArr.filter((t: any) => t.date === yesterdayStr)
        const recentTrades = tradingArr.slice(-5)
        const yesterdayCompletions = habitsArr.filter((h: any) => completions[yesterdayStr]?.[h.id])

      let currentStreak = 0
        const checkDate = new Date(localDate)
        for (let i = 0; i < 30; i++) {
                const ds = checkDate.toISOString().split('T')[0]
                const dayDone = habitsArr.every((h: any) => completions[ds]?.[h.id])
                if (dayDone && habitsArr.length > 0) {
                          currentStreak++
                          checkDate.setDate(checkDate.getDate() - 1)
                } else {
                          break
                }
        }

      const yesterdayHealth = healthArr.find((h: any) => h.date === yesterdayStr)
        const todayHealth = healthArr.find((h: any) => h.date === today)
        const todayJournal = journalArr.find((j: any) => j.date === today)
        const yesterdayJournal = journalArr.find((j: any) => j.date === yesterdayStr)

      const currentMonth = new Date(localDate).toISOString().slice(0, 7)
        const monthIncome = incomeArr
          .filter((e: any) => e.date?.startsWith(currentMonth))
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

      const weekStartDate = new Date(localDate)
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay())
        const weekStartStr = weekStartDate.toISOString().split('T')[0]
        const weekPnl = tradingArr
          .filter((t: any) => t.date >= weekStartStr)
          .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

      const totalCapital = accountsArr.reduce((sum: number, a: any) => sum + (a.size || 0), 0)
        const propCapital = accountsArr
          .filter((a: any) => a.type === 'propfirm')
          .reduce((sum: number, a: any) => sum + (a.size || 0), 0)
        const liveCapital = accountsArr
          .filter((a: any) => a.type === 'live')
          .reduce((sum: number, a: any) => sum + (a.size || 0), 0)
        const propCount = accountsArr.filter((a: any) => a.type === 'propfirm').length
        const liveCount = accountsArr.filter((a: any) => a.type === 'live').length

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
                        currentStreak,
              },
              health: {
                        yesterdayLog: yesterdayHealth
                          ? { sleep: yesterdayHealth.sleep, energy: yesterdayHealth.energy, gym: yesterdayHealth.gym }
                                    : null,
                        todayLog: todayHealth ? { sleep: todayHealth.sleep, energy: todayHealth.energy } : null,
              },
              journal: {
                        todayEntry: todayJournal
                          ? { morningFocus: todayJournal.morningFocus, intention: todayJournal.intention }
                                    : null,
                        yesterdayEntry: yesterdayJournal
                          ? {
                                          bestMoment: yesterdayJournal.bestMoment,
                                          doDifferently: yesterdayJournal.doDifferently,
                                          hitFocus: yesterdayJournal.hitFocus,
                                          moodTags: yesterdayJournal.moodTags,
                          }
                                    : null,
              },
              goals: goalsArr.map((g: any) => ({
                        title: g.title,
                        currentValue: g.currentValue,
                        targetValue: g.targetValue,
              })),
              finance: { monthlyIncome: monthIncome },
      }

      let systemPrompt = BASE_SYSTEM_PROMPT

      // Inject timezone context
      systemPrompt += `\n\nUser's timezone: ${userTimezone}\nCurrent local time for user: ${localTime} (${timeOfDay})\nPrimary trading session: ${userSession} open (${sessionTime} in user's local time)\nUse this to make time-relevant comments. Never reference wrong times of day. ${timeGuidance} Example: if it's 11pm for the user and they trade NY session, acknowledge the late night grind. Do NOT say "good morning" if it's evening for the user.`

      if (profile) {
              const p = profile as any
              systemPrompt += `\n\nThis trader's name is ${p.name || 'unknown'}. `
              if (p.tradingStyle) systemPrompt += `Trading style: ${p.tradingStyle}. `
              if (p.goals) systemPrompt += `Main goal: ${p.goals}. `
      }

      if (accountsArr.length > 0) {
              systemPrompt += `\n\nTotal capital managed: $${totalCapital.toLocaleString()} across ${accountsArr.length} account${accountsArr.length !== 1 ? 's' : ''} (${propCount} prop firm, ${liveCount} live).`
              if (propCapital > 0) systemPrompt += ` Prop firm capital: $${propCapital.toLocaleString()}.`
              if (liveCapital > 0) systemPrompt += ` Live capital: $${liveCapital.toLocaleString()}.`
      }

      if (!hasData) {
              systemPrompt += '\n\nThe user has just joined and has no data yet. Give them a warm, motivating welcome brief.'
      }

      const message = await client.messages.create({
              model: 'claude-opus-4-5',
              max_tokens: 300,
              system: systemPrompt,
              messages: [
                {
                            role: 'user',
                            content: `Generate my daily brief. Here is my data: ${JSON.stringify(context)}`,
                },
                      ],
      })

      const briefText = (message.content[0] as any).text
        const briefObj = {
                text: briefText,
                generatedAt: new Date().toISOString(),
                date: today,
        }

      // Cache for 25 hours — ensures it survives until midnight + buffer
      await redis.set(cacheKey, briefObj, { ex: 60 * 60 * 25 })

      return NextResponse.json({ brief: briefObj, cached: false })
  } catch (error) {
        console.error('Daily brief error:', error)
        return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}
