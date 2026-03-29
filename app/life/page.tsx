'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, CheckSquare, Heart, BookOpen, DollarSign, MessageSquare, ArrowRight } from 'lucide-react'

const sections = [
  {
    key: 'trading',
    name: 'Trading Journal',
    icon: TrendingUp,
    emoji: '📈',
    href: '/life/trading',
    color: 'cyan',
    statusKey: 'trading',
  },
  {
    key: 'goals',
    name: 'Goals',
    icon: Target,
    emoji: '🎯',
    href: '/life/goals',
    color: 'magenta',
    statusKey: 'goals',
  },
  {
    key: 'habits',
    name: 'Habits',
    icon: CheckSquare,
    emoji: '✅',
    href: '/life/habits',
    color: 'green',
    statusKey: 'habits',
  },
  {
    key: 'health',
    name: 'Health',
    icon: Heart,
    emoji: '💪',
    href: '/life/health',
    color: 'amber',
    statusKey: 'health',
  },
  {
    key: 'journal',
    name: 'Daily Journal',
    icon: BookOpen,
    emoji: '📓',
    href: '/life/journal',
    color: 'cyan',
    statusKey: 'journal',
  },
  {
    key: 'finance',
    name: 'Finance',
    icon: DollarSign,
    emoji: '💰',
    href: '/life/finance',
    color: 'green',
    statusKey: 'finance',
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

export default function LifeHubPage() {
  const [stats, setStats] = useState<SectionStats>({
    trading: 'Loading...',
    goals: 'Loading...',
    habits: 'Loading...',
    health: 'Loading...',
    journal: 'Loading...',
    finance: 'Loading...',
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
        ])

        const [tradingRes, goalsRes, habitsRes, healthRes, journalRes, financeRes] = results

        const trading = tradingRes.status === 'fulfilled' ? tradingRes.value : {}
        const goals = goalsRes.status === 'fulfilled' ? goalsRes.value : {}
        const habits = habitsRes.status === 'fulfilled' ? habitsRes.value : {}
        const health = healthRes.status === 'fulfilled' ? healthRes.value : {}
        const journal = journalRes.status === 'fulfilled' ? journalRes.value : {}
        const finance = financeRes.status === 'fulfilled' ? financeRes.value : {}

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
        const healthStatus = lastHealth
          ? `Last log: ${new Date(lastHealth.date).toLocaleDateString()}`
          : 'No entries yet'

        const journalEntries = journal.entries || []
        const lastJournal = journalEntries[journalEntries.length - 1]
        const journalStatus = lastJournal
          ? `Last entry: ${new Date(lastJournal.date).toLocaleDateString()}`
          : 'No entries yet'

        const incomeEntries = finance.income || []
        const expenseEntries = finance.expenses || []
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthlyIncome = incomeEntries
          .filter((e: any) => e.date?.startsWith(currentMonth))
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

        setStats({
          trading: todayTrades > 0 ? `${todayTrades} trade${todayTrades !== 1 ? 's' : ''} today` : tradingLogs.length > 0 ? `${tradingLogs.length} total trades` : 'No trades logged',
          goals: activeGoals > 0 ? `${activeGoals} active goal${activeGoals !== 1 ? 's' : ''}` : 'No goals set',
          habits: habitsList.length > 0 ? `${todayCompletions}/${habitsList.length} habits done today` : 'No habits created',
          health: healthStatus,
          journal: journalStatus,
          finance: monthlyIncome > 0 ? `$${monthlyIncome.toLocaleString()} income this month` : 'No entries yet',
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

  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    cyan: {
      border: 'rgba(0,242,255,0.3)',
      bg: 'rgba(0,242,255,0.06)',
      text: '#00f2ff',
      glow: 'rgba(0,242,255,0.15)',
    },
    magenta: {
      border: 'rgba(255,0,229,0.3)',
      bg: 'rgba(255,0,229,0.06)',
      text: '#ff00e5',
      glow: 'rgba(255,0,229,0.15)',
    },
    green: {
      border: 'rgba(0,255,136,0.3)',
      bg: 'rgba(0,255,136,0.06)',
      text: '#00ff88',
      glow: 'rgba(0,255,136,0.15)',
    },
    amber: {
      border: 'rgba(255,180,0,0.3)',
      bg: 'rgba(255,180,0,0.06)',
      text: '#ffb400',
      glow: 'rgba(255,180,0,0.15)',
    },
  }

  return (
    <div className="cyber-bg-grid min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="mb-10">
          <span className="section-label text-xs">LIFE HUB</span>
          <h1 className="text-4xl font-bold mt-3 mb-2" style={{ color: 'var(--text-primary)' }}>
            Personal Command Center
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Track everything that matters — trading, goals, habits, health, journaling, and finance.
          </p>
        </div>

        {/* 2x3 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section) => {
            const Icon = section.icon
            const colors = colorMap[section.color]
            const statusText = stats[section.statusKey as keyof SectionStats]

            return (
              <div
                key={section.key}
                className="cyber-panel p-6 flex flex-col gap-4 group hover:scale-[1.01] transition-all duration-200"
                style={{ minHeight: '200px' }}
              >
                {/* Top row */}
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
                        {statusText}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl">{section.emoji}</span>
                </div>

                {/* Divider */}
                <div className="cyber-divider my-0" />

                {/* Actions */}
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
                    Open Section
                    <ArrowRight size={12} />
                  </Link>
                  <Link
                    href={`${section.href}?chat=1`}
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 hover:brightness-110"
                    title="Open AI Chat"
                    style={{
                      background: 'rgba(255,0,229,0.08)',
                      border: '1px solid rgba(255,0,229,0.25)',
                    }}
                  >
                    <MessageSquare size={14} style={{ color: '#ff00e5' }} />
                  </Link>
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
