'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, CheckSquare, Heart, BookOpen, DollarSign, MessageSquare } from 'lucide-react'

const sections = [
  {
    key: 'trading',
    name: 'Trading Journal',
    descriptor: 'Track trades, P&L, and patterns',
    icon: TrendingUp,
    emoji: '📈',
    href: '/life/trading',
    color: 'cyan',
    statusKey: 'trading',
    statusBadge: 'NO TRADES',
  },
  {
    key: 'goals',
    name: 'Goals',
    descriptor: 'Define targets, track progress',
    icon: Target,
    emoji: '🎯',
    href: '/life/goals',
    color: 'magenta',
    statusKey: 'goals',
    statusBadge: '0 GOALS',
  },
  {
    key: 'habits',
    name: 'Habits',
    descriptor: 'Build streaks, stay consistent',
    icon: CheckSquare,
    emoji: '✅',
    href: '/life/habits',
    color: 'green',
    statusKey: 'habits',
    statusBadge: '0 STREAK',
  },
  {
    key: 'health',
    name: 'Health',
    descriptor: 'Log wellness, track vitals',
    icon: Heart,
    emoji: '💪',
    href: '/life/health',
    color: 'amber',
    statusKey: 'health',
    statusBadge: 'NO LOGS',
  },
  {
    key: 'journal',
    name: 'Daily Journal',
    descriptor: 'Reflect, plan, and capture ideas',
    icon: BookOpen,
    emoji: '📓',
    href: '/life/journal',
    color: 'purple',
    statusKey: 'journal',
    statusBadge: 'NO ENTRY',
  },
  {
    key: 'finance',
    name: 'Finance',
    descriptor: 'Income, expenses, net worth',
    icon: DollarSign,
    emoji: '💰',
    href: '/life/finance',
    color: 'cyan',
    statusKey: 'finance',
    statusBadge: '$0 THIS MONTH',
  },
]

type SectionStats = {
  trading: string
  goals: string
  habits: string
  health: string
  journal: string
  finance: string
}

type LiveMetrics = {
  pnlWeek: string
  habitStreak: string
  weekScore: string
  incomeMonth: string
}

export default function LifeHubPage() {
  const [stats, setStats] = useState<SectionStats>({
    trading: 'Loading...',
    goals: 'Loading...',
    habits: 'Loading...',
    health: 'Loading...',
    journal: 'Loading...',
    finance: 'Loading...',
  })

  const [metrics, setMetrics] = useState<LiveMetrics>({
    pnlWeek: '—',
    habitStreak: '—',
    weekScore: '—',
    incomeMonth: '—',
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const results = await Promise.allSettled([
          fetch('/api/life/trading').then(r => r.json()),
          fetch('/api/life/goals').then(r => r.json()),
          fetch('/api/life/habits').then(r => r.json()),
          fetch('/api/life/health').then(r => r.json()),
          fetch('/api/life/journal').then(r => r.json()),
          fetch('/api/life/finance').then(r => r.json()),
          fetch('/api/life/review').then(r => r.json()),
        ])

        const [tradingRes, goalsRes, habitsRes, healthRes, journalRes, financeRes, reviewRes] = results

        const trading = tradingRes.status === 'fulfilled' ? tradingRes.value : {}
        const goals = goalsRes.status === 'fulfilled' ? goalsRes.value : {}
        const habits = habitsRes.status === 'fulfilled' ? habitsRes.value : {}
        const health = healthRes.status === 'fulfilled' ? healthRes.value : {}
        const journal = journalRes.status === 'fulfilled' ? journalRes.value : {}
        const finance = financeRes.status === 'fulfilled' ? financeRes.value : {}
        const review = reviewRes.status === 'fulfilled' ? reviewRes.value : {}

        const tradingLogs = trading.logs || []
        const today = new Date().toISOString().split('T')[0]
        const todayTrades = tradingLogs.filter((t: any) => t.date === today).length

        const goalsList = goals.goals || []
        const activeGoals = goalsList.length

        const habitsList = habits.habits || []
        const completions = habits.completions || {}
        const todayCompletions = habitsList.filter((h: any) => completions[today]?.[h.id]).length

        const healthLogs = health.logs || []
        const lastHealth = healthLogs[healthLogs.length - 1]
        const healthStatus = lastHealth ? `Last: ${new Date(lastHealth.date).toLocaleDateString()}` : 'No entries yet'

        const journalEntries = journal.entries || []
        const lastJournal = journalEntries[journalEntries.length - 1]
        const journalStatus = lastJournal ? `Last: ${new Date(lastJournal.date).toLocaleDateString()}` : 'No entries yet'

        const incomeEntries = finance.income || []
        const expenseEntries = finance.expenses || []
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthlyIncome = incomeEntries
          .filter((e: any) => e.date?.startsWith(currentMonth))
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

        // Compute week P&L from trading logs
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekPnl = tradingLogs
          .filter((t: any) => t.date >= weekStartStr)
          .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

        // Habit streak
        let maxStreak = 0
        if (habitsList.length > 0) {
          let streak = 0
          const d = new Date()
          for (let i = 0; i < 60; i++) {
            const ds = d.toISOString().split('T')[0]
            const done = habitsList.filter((h: any) => completions[ds]?.[h.id]).length
            if (done > 0) {
              streak++
              maxStreak = Math.max(maxStreak, streak)
            } else {
              streak = 0
            }
            d.setDate(d.getDate() - 1)
          }
        }

        // Week score from review
        const reviews = review.reviews || []
        const latestReview = reviews[reviews.length - 1]
        const weekScore = latestReview?.score ?? null

        setStats({
          trading: todayTrades > 0 ? `${todayTrades} trade${todayTrades !== 1 ? 's' : ''} today` : tradingLogs.length > 0 ? `${tradingLogs.length} total trades` : 'No trades logged',
          goals: activeGoals > 0 ? `${activeGoals} active goal${activeGoals !== 1 ? 's' : ''}` : 'No goals set',
          habits: habitsList.length > 0 ? `${todayCompletions}/${habitsList.length} habits done today` : 'No habits created',
          health: healthStatus,
          journal: journalStatus,
          finance: monthlyIncome > 0 ? `$${monthlyIncome.toLocaleString()} income this month` : 'No entries yet',
        })

        setMetrics({
          pnlWeek: weekPnl !== 0 ? `${weekPnl >= 0 ? '+' : ''}$${Math.abs(weekPnl).toLocaleString()}` : '$0',
          habitStreak: maxStreak > 0 ? `${maxStreak}d` : '0d',
          weekScore: weekScore !== null ? `${weekScore}/10` : 'N/A',
          incomeMonth: monthlyIncome > 0 ? `$${monthlyIncome.toLocaleString()}` : '$0',
        })
      } catch {
        setStats({
          trading: 'Click to get started',
          goals: 'Click to get started',
          habits: 'Click to get started',
          health: 'Click to get started',
          journal: 'Click to get started',
          finance: 'Click to get started',
        })
      }
    }
    loadStats()
  }, [])

  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string; topGradient: string }> = {
    cyan: {
      border: 'rgba(0,242,255,0.3)',
      bg: 'rgba(0,242,255,0.06)',
      text: '#00f2ff',
      glow: 'rgba(0,242,255,0.15)',
      topGradient: 'linear-gradient(90deg, #00f2ff, transparent)',
    },
    magenta: {
      border: 'rgba(255,0,229,0.3)',
      bg: 'rgba(255,0,229,0.06)',
      text: '#ff00e5',
      glow: 'rgba(255,0,229,0.15)',
      topGradient: 'linear-gradient(90deg, #ff00e5, transparent)',
    },
    green: {
      border: 'rgba(0,255,136,0.3)',
      bg: 'rgba(0,255,136,0.06)',
      text: '#00ff88',
      glow: 'rgba(0,255,136,0.15)',
      topGradient: 'linear-gradient(90deg, #00ff88, transparent)',
    },
    amber: {
      border: 'rgba(255,180,0,0.3)',
      bg: 'rgba(255,180,0,0.06)',
      text: '#ffb400',
      glow: 'rgba(255,180,0,0.15)',
      topGradient: 'linear-gradient(90deg, #ffb400, transparent)',
    },
    purple: {
      border: 'rgba(180,0,255,0.3)',
      bg: 'rgba(180,0,255,0.06)',
      text: '#b400ff',
      glow: 'rgba(180,0,255,0.15)',
      topGradient: 'linear-gradient(90deg, #b400ff, transparent)',
    },
  }

  const liveMetricCards = [
    {
      label: 'Net P&L This Week',
      value: metrics.pnlWeek,
      borderColor: '#00f2ff',
      textColor: '#00f2ff',
    },
    {
      label: 'Habit Streak',
      value: metrics.habitStreak,
      borderColor: '#00ff88',
      textColor: '#00ff88',
    },
    {
      label: 'Week Score',
      value: metrics.weekScore,
      borderColor: '#ff00e5',
      textColor: '#ff00e5',
    },
    {
      label: 'Income This Month',
      value: metrics.incomeMonth,
      borderColor: '#ffb400',
      textColor: '#ffb400',
    },
  ]

  return (
    <div className="cyber-bg-grid min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="section-label text-xs">LIFE HUB</span>
          <h1 className="text-4xl font-bold mt-3 mb-2" style={{ color: 'var(--text-primary)' }}>
            Personal Command Center
          </h1>
          <p className="text-sm font-mono tracking-widest" style={{ color: '#00f2ff', fontSize: '0.65rem', letterSpacing: '0.2em' }}>
            TRACK EVERYTHING · MISS NOTHING · EVOLVE DAILY
          </p>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {liveMetricCards.map((m) => (
            <div
              key={m.label}
              className="cyber-panel p-4 flex flex-col gap-1"
              style={{
                borderTop: `2px solid ${m.borderColor}`,
                background: 'var(--bg-card)',
              }}
            >
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                {m.label}
              </p>
              <p className="text-2xl font-bold font-mono" style={{ color: m.textColor, textShadow: `0 0 12px ${m.borderColor}66` }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* 2x3 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section) => {
            const Icon = section.icon
            const colors = colorMap[section.color] || colorMap.cyan
            const statusText = stats[section.statusKey as keyof SectionStats]

            return (
              <div
                key={section.key}
                className="cyber-panel flex flex-col group hover:scale-[1.01] transition-all duration-200 overflow-hidden"
                style={{ minHeight: '200px' }}
              >
                {/* Colored top gradient line */}
                <div style={{ height: '1px', background: colors.topGradient, flexShrink: 0 }} />

                <div className="p-6 flex flex-col gap-4 flex-1">
                  {/* Top row: icon area + status badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 flex items-center justify-center rounded-lg"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                      >
                        <Icon size={18} style={{ color: colors.text }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {section.name}
                        </h3>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                          {section.descriptor}
                        </p>
                      </div>
                    </div>
                    {/* Status badge */}
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm flex-shrink-0"
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {section.statusBadge}
                    </span>
                  </div>

                  {/* Status text */}
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {statusText}
                  </p>

                  {/* Divider */}
                  <div className="cyber-divider my-0" />

                  {/* Bottom row: OPEN button + AI badge */}
                  <div className="flex items-center gap-2 mt-auto">
                    <Link
                      href={section.href}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all duration-150 hover:brightness-110"
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    >
                      OPEN →
                    </Link>
                    <Link
                      href={`${section.href}?chat=1`}
                      className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 hover:brightness-110 text-[10px] font-bold font-mono"
                      title="Open AI Chat"
                      style={{
                        background: 'rgba(255,0,229,0.08)',
                        border: '1px solid rgba(255,0,229,0.25)',
                        color: '#ff00e5',
                      }}
                    >
                      AI
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
          {'// ALL DATA STORED IN UPSTASH REDIS · AI POWERED BY CLAUDE SONNET'}
        </p>
      </div>
    </div>
  )
}
