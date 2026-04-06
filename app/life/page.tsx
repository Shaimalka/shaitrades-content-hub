'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LineChart, Target, Flame, Heart, BookOpen, DollarSign, RefreshCw } from 'lucide-react'
import Onboarding from '@/app/components/Onboarding'

const sections = [
  {
    key: 'trading',
    name: 'Trading Journal',
    descriptor: 'Track trades, P&L, and patterns',
    icon: LineChart,
    href: '/life/trading',
    accentColor: '#00f2ff',
    iconBg: 'rgba(0,242,255,0.08)',
    iconBorder: 'rgba(0,242,255,0.2)',
    btnBg: 'rgba(0,242,255,0.06)',
    btnBorder: 'rgba(0,242,255,0.2)',
    statusBadge: 'NO TRADES',
    badgeColor: '#00f2ff',
    badgeBg: 'rgba(0,242,255,0.08)',
    badgeBorder: 'rgba(0,242,255,0.2)',
    topGradient: 'linear-gradient(90deg, #00f2ff, transparent)',
    statusKey: 'trading',
  },
  {
    key: 'goals',
    name: 'Goals',
    descriptor: 'Define targets, track progress',
    icon: Target,
    href: '/life/goals',
    accentColor: '#ff00e5',
    iconBg: 'rgba(255,0,229,0.08)',
    iconBorder: 'rgba(255,0,229,0.2)',
    btnBg: 'rgba(255,0,229,0.06)',
    btnBorder: 'rgba(255,0,229,0.2)',
    statusBadge: '0 GOALS',
    badgeColor: '#ff00e5',
    badgeBg: 'rgba(255,0,229,0.08)',
    badgeBorder: 'rgba(255,0,229,0.2)',
    topGradient: 'linear-gradient(90deg, #ff00e5, transparent)',
    statusKey: 'goals',
  },
  {
    key: 'habits',
    name: 'Habits',
    descriptor: 'Build streaks, stay consistent',
    icon: Flame,
    href: '/life/habits',
    accentColor: '#00ff88',
    iconBg: 'rgba(0,255,136,0.08)',
    iconBorder: 'rgba(0,255,136,0.2)',
    btnBg: 'rgba(0,255,136,0.06)',
    btnBorder: 'rgba(0,255,136,0.2)',
    statusBadge: '0 STREAK',
    badgeColor: '#00ff88',
    badgeBg: 'rgba(0,255,136,0.08)',
    badgeBorder: 'rgba(0,255,136,0.2)',
    topGradient: 'linear-gradient(90deg, #00ff88, transparent)',
    statusKey: 'habits',
  },
  {
    key: 'health',
    name: 'Health',
    descriptor: 'Log wellness, track vitals',
    icon: Heart,
    href: '/life/health',
    accentColor: '#ffb400',
    iconBg: 'rgba(255,180,0,0.08)',
    iconBorder: 'rgba(255,180,0,0.2)',
    btnBg: 'rgba(255,180,0,0.06)',
    btnBorder: 'rgba(255,180,0,0.2)',
    statusBadge: 'NO LOGS',
    badgeColor: '#ffb400',
    badgeBg: 'rgba(255,180,0,0.08)',
    badgeBorder: 'rgba(255,180,0,0.2)',
    topGradient: 'linear-gradient(90deg, #ffb400, transparent)',
    statusKey: 'health',
  },
  {
    key: 'journal',
    name: 'Daily Journal',
    descriptor: 'Reflect, plan, and capture ideas',
    icon: BookOpen,
    href: '/life/journal',
    accentColor: '#7c3aed',
    iconBg: 'rgba(124,58,237,0.08)',
    iconBorder: 'rgba(124,58,237,0.2)',
    btnBg: 'rgba(124,58,237,0.06)',
    btnBorder: 'rgba(124,58,237,0.2)',
    statusBadge: 'NO ENTRY',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124,58,237,0.08)',
    badgeBorder: 'rgba(124,58,237,0.2)',
    topGradient: 'linear-gradient(90deg, #7c3aed, transparent)',
    statusKey: 'journal',
  },
  {
    key: 'finance',
    name: 'Finance',
    descriptor: 'Income, expenses, net worth',
    icon: DollarSign,
    href: '/life/finance',
    accentColor: '#00f2ff',
    iconBg: 'rgba(0,242,255,0.08)',
    iconBorder: 'rgba(0,242,255,0.2)',
    btnBg: 'rgba(0,242,255,0.06)',
    btnBorder: 'rgba(0,242,255,0.2)',
    statusBadge: '$0 THIS MONTH',
    badgeColor: '#00f2ff',
    badgeBg: 'rgba(0,242,255,0.08)',
    badgeBorder: 'rgba(0,242,255,0.2)',
    topGradient: 'linear-gradient(90deg, #00f2ff, transparent)',
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

type LiveMetrics = {
  pnlWeek: string
  habitStreak: string
  weekScore: string
  incomeMonth: string
}

type DailyBrief = {
  text: string
  generatedAt: string
  date: string
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

export default function LifeHubPage() {
  const width = useWindowWidth()
  const isMobile = width < 768
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  const [stats, setStats] = useState<SectionStats>({
    trading: 'No trades logged',
    goals: 'No goals set',
    habits: 'No habits created',
    health: 'No entries yet',
    journal: 'No entries yet',
    finance: 'No entries yet',
  })

  const [metrics, setMetrics] = useState<LiveMetrics>({
    pnlWeek: '$0',
    habitStreak: '0d',
    weekScore: 'N/A',
    incomeMonth: '$0',
  })

  const [journalTodaySaved, setJournalTodaySaved] = useState(false)
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [briefLoading, setBriefLoading] = useState(true)
  const [briefNoData, setBriefNoData] = useState(false)
  const [briefError, setBriefError] = useState(false)

  // Check onboarding status on mount
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch('/api/onboarding')
        const data = await res.json()
        if (data.complete === false) {
          setShowOnboarding(true)
        }
      } catch (e) {
        // if fails, don't show onboarding
      } finally {
        setOnboardingChecked(true)
      }
    }
    checkOnboarding()
  }, [])

  const fetchBrief = useCallback(async (refresh = false) => {
    setBriefLoading(true)
    setBriefError(false)
    try {
      const res = await fetch('/api/life/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      const data = await res.json()
      if (data.noData) {
        setBriefNoData(true)
        setBrief(null)
      } else if (data.brief) {
        setBrief(data.brief)
        setBriefNoData(false)
      } else {
        setBriefError(true)
      }
    } catch {
      setBriefError(true)
    } finally {
      setBriefLoading(false)
    }
  }, [])

  useEffect(() => {
    if (onboardingChecked && !showOnboarding) {
      fetchBrief(false)
    }
  }, [fetchBrief, onboardingChecked, showOnboarding])

  useEffect(() => {
    if (!onboardingChecked || showOnboarding) return

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
        const healthStatus = lastHealth ? 'Last: ' + new Date(lastHealth.date).toLocaleDateString() : 'No entries yet'
        const journalEntries: any[] = Array.isArray(journal.data) ? journal.data : Array.isArray(journal.entries) ? journal.entries : []
        const todayJournalEntry = journalEntries.find((e: any) => e.date === today)
        const hasTodayJournal = !!todayJournalEntry
        setJournalTodaySaved(hasTodayJournal)
        const journalStatus = hasTodayJournal ? "Today's entry saved" : journalEntries.length > 0 ? 'Last: ' + new Date(journalEntries[journalEntries.length - 1].date).toLocaleDateString() : 'No entries yet'
        const incomeEntries = finance.income || []
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthlyIncome = incomeEntries
          .filter((e: any) => e.date?.startsWith(currentMonth))
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekPnl = tradingLogs
          .filter((t: any) => t.date >= weekStartStr)
          .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
        let maxStreak = 0
        if (habitsList.length > 0) {
          let streak = 0
          const d = new Date()
          for (let i = 0; i < 60; i++) {
            const ds = d.toISOString().split('T')[0]
            const done = habitsList.filter((h: any) => completions[ds]?.[h.id]).length
            if (done > 0) { streak++; maxStreak = Math.max(maxStreak, streak) }
            else { streak = 0 }
            d.setDate(d.getDate() - 1)
          }
        }
        const reviews = review.reviews || []
        const latestReview = reviews[reviews.length - 1]
        const weekScore = latestReview?.score ?? null

        setStats({
          trading: todayTrades > 0 ? todayTrades + ' trade' + (todayTrades !== 1 ? 's' : '') + ' today' : tradingLogs.length > 0 ? tradingLogs.length + ' total trades' : 'No trades logged',
          goals: activeGoals > 0 ? activeGoals + ' active goal' + (activeGoals !== 1 ? 's' : '') : 'No goals set',
          habits: habitsList.length > 0 ? todayCompletions + '/' + habitsList.length + ' habits done today' : 'No habits created',
          health: healthStatus,
          journal: journalStatus,
          finance: monthlyIncome > 0 ? '$' + monthlyIncome.toLocaleString() + ' income this month' : 'No entries yet',
        })
        setMetrics({
          pnlWeek: weekPnl !== 0 ? (weekPnl >= 0 ? '+' : '') + '$' + Math.abs(weekPnl).toLocaleString() : '$0',
          habitStreak: maxStreak > 0 ? maxStreak + 'd' : '0d',
          weekScore: weekScore !== null ? weekScore + '/10' : 'N/A',
          incomeMonth: monthlyIncome > 0 ? '$' + monthlyIncome.toLocaleString() : '$0',
        })
      } catch {
        // keep defaults
      }
    }
    loadStats()
  }, [onboardingChecked, showOnboarding])

  if (!onboardingChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(0,242,255,0.5)', letterSpacing: '2px' }}>
          LOADING...
        </div>
      </div>
    )
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  const liveMetrics = [
    { label: 'NET P&L THIS WEEK', value: metrics.pnlWeek, color: '#00f2ff', borderColor: '#00f2ff' },
    { label: 'HABIT STREAK', value: metrics.habitStreak, color: '#00ff88', borderColor: '#00ff88' },
    { label: 'WEEK SCORE', value: metrics.weekScore, color: '#ff00e5', borderColor: '#ff00e5' },
    { label: 'INCOME THIS MONTH', value: metrics.incomeMonth, color: '#ffb400', borderColor: '#ffb400' },
  ]

  const formatGeneratedAt = (iso: string) => {
    try {
      const d = new Date(iso)
      return (
        d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      )
    } catch {
      return iso
    }
  }

  return (
    <div className="cyber-bg-grid min-h-screen" style={{ padding: isMobile ? '24px 16px' : '40px 48px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div className="section-header">// LIFE HUB</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Personal Command Center
          </h1>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,242,255,0.6)', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>
            TRACK EVERYTHING · MISS NOTHING · EVOLVE DAILY
          </p>
        </div>

        {/* Daily Brief Card */}
        <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,242,255,0.15)', borderLeft: '3px solid #00f2ff', borderRadius: '12px', padding: isMobile ? '16px' : '24px 28px', marginBottom: '32px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, #00f2ff, transparent)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '3px', color: '#00f2ff', fontWeight: 700 }}>COACH SHAI · DAILY BRIEF</span>
              {brief && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>
                  {formatGeneratedAt(brief.generatedAt)}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchBrief(true)}
              disabled={briefLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', minHeight: '44px', borderRadius: '6px', background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.2)', color: briefLoading ? 'rgba(0,242,255,0.3)' : '#00f2ff', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '2px', cursor: briefLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              <RefreshCw size={10} style={{ animation: briefLoading ? 'spin 1s linear infinite' : 'none' }} />
              REFRESH
            </button>
          </div>
          {briefLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f2ff', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(0,242,255,0.5)', letterSpacing: '1px' }}>Coach Shai is reading your data...</span>
            </div>
          ) : briefNoData ? (
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.7, letterSpacing: '0.5px' }}>
              Start logging your data and Coach Shai will brief you every morning.
            </p>
          ) : briefError ? (
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,100,100,0.6)', margin: 0 }}>
              Failed to load brief. Click Refresh to try again.
            </p>
          ) : brief ? (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '13px' : '14px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.8, letterSpacing: '0.2px' }}>
              {brief.text}
            </p>
          ) : null}
        </div>

        {/* Live Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {liveMetrics.map((m) => (
            <div key={m.label} className="stat-card-premium accent-cyan" style={{ borderTop: '2px solid ' + m.borderColor }}>
              <div className="stat-label">{m.label}</div>
              <div className="stat-value" style={{ color: m.color }}>{m.value}</div>
              <div className="stat-hint">LIVE · REDIS</div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: '20px' }}>MODULES</div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }} className="sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon
            const statusText = stats[section.statusKey as keyof SectionStats]
            const isJournal = section.key === 'journal'
            const badgeLabel = isJournal ? (journalTodaySaved ? 'ENTRY SAVED' : 'NO ENTRY') : section.statusBadge
            const badgeColor = isJournal && journalTodaySaved ? '#00ff88' : section.badgeColor
            const badgeBg = isJournal && journalTodaySaved ? 'rgba(0,255,136,0.08)' : section.badgeBg
            const badgeBorder = isJournal && journalTodaySaved ? 'rgba(0,255,136,0.2)' : section.badgeBorder
            return (
              <div key={section.key} className="premium-card" style={{ minHeight: '210px' }}>
                <div style={{ height: '1px', background: section.topGradient, position: 'relative', zIndex: 1 }} />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100% - 1px)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: section.iconBg, border: '1px solid ' + section.iconBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color={section.accentColor} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff', marginBottom: '2px' }}>{section.name}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{section.descriptor}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '1px', padding: '3px 7px', borderRadius: '4px', background: badgeBg, border: '1px solid ' + badgeBorder, color: badgeColor, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, flex: 1 }}>{statusText}</p>
                  <div style={{ height: '1px', background: '#1a1a28' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link href={section.href} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', minHeight: '44px', borderRadius: '6px', background: section.btnBg, border: '1px solid ' + section.btnBorder, color: section.accentColor, fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '2px', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s' }}>
                      OPEN →
                    </Link>
                    <Link href={section.href + '?chat=1'} title="Open AI Chat" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,229,0.05)', border: '1px solid rgba(255,0,229,0.2)', color: 'rgba(255,0,229,0.5)', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      AI
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p style={{ marginTop: '48px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.1)' }}>
          {'// ALL DATA STORED IN UPSTASH REDIS · AI POWERED BY CLAUDE HAIKU'}
        </p>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 640px) { .sm\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}
