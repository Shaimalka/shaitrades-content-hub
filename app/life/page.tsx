'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LineChart, Target, Flame, Heart, BookOpen, DollarSign, RefreshCw, X } from 'lucide-react'
import Onboarding from '@/app/components/Onboarding'
import { useTheme } from '@/app/contexts/ThemeContext'
import StatCard from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'

const sections = [
  {
        key: 'trading',
        name: 'Trading Journal',
        descriptor: 'Track trades, P&L, and patterns',
        icon: LineChart,
        href: '/life/trading',
        statusBadge: 'NO TRADES',
        statusKey: 'trading',
  },
  {
        key: 'goals',
        name: 'Goals',
        descriptor: 'Define targets, track progress',
        icon: Target,
        href: '/life/goals',
        statusBadge: '0 GOALS',
        statusKey: 'goals',
  },
  {
        key: 'habits',
        name: 'Habits',
        descriptor: 'Build streaks, stay consistent',
        icon: Flame,
        href: '/life/habits',
        statusBadge: '0 STREAK',
        statusKey: 'habits',
  },
  {
        key: 'health',
        name: 'Health',
        descriptor: 'Log wellness, track vitals',
        icon: Heart,
        href: '/life/health',
        statusBadge: 'NO LOGS',
        statusKey: 'health',
  },
  {
        key: 'journal',
        name: 'Daily Journal',
        descriptor: 'Reflect, plan, and capture ideas',
        icon: BookOpen,
        href: '/life/journal',
        statusBadge: 'NO ENTRY',
        statusKey: 'journal',
  },
  {
        key: 'finance',
        name: 'Finance',
        descriptor: 'Income, expenses, net worth',
        icon: DollarSign,
        href: '/life/finance',
        statusBadge: '$0 THIS MONTH',
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

/** Returns today's date as YYYY-MM-DD in the user's local timezone */
function getLocalDateString(): string {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const DISMISS_KEY_PREFIX = 'coachBriefDismissed:'

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
    const { isDark } = useTheme()
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

  // Dismiss + fade state
  const [briefVisible, setBriefVisible] = useState(true)
    const [briefFading, setBriefFading] = useState(false)
    // True when a new day's brief is available but current day was dismissed
  const [newBriefAvailable, setNewBriefAvailable] = useState(false)

  const bg = isDark ? '#0a0a0f' : '#f8f9fc'
    const surface = isDark ? '#111118' : '#ffffff'
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
    const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
    const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
    const dismissIconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'

  // On mount: check localStorage dismiss state
  useEffect(() => {
        const today = getLocalDateString()
        const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
        if (dismissedDate === today) {
                // Already dismissed today
          setBriefVisible(false)
                setBriefFading(false)
        } else if (dismissedDate && dismissedDate !== today) {
                // Dismissed a previous day — new brief is available
          setNewBriefAvailable(true)
                setBriefVisible(false)
        }
        // else: never dismissed, show normally (default state)
  }, [])

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
                const localDate = getLocalDateString()
                const res = await fetch('/api/life/daily-brief', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ refresh, localDate }),
                })
                const data = await res.json()
                if (data.noData) {
                          setBriefNoData(true)
                          setBrief(null)
                } else if (data.brief) {
                          // Normalise: API now returns brief as an object { text, generatedAt, date }
                  // but handle legacy plain-string responses too
                  if (typeof data.brief === 'string') {
                              setBrief({ text: data.brief, generatedAt: new Date().toISOString(), date: localDate })
                  } else {
                              setBrief(data.brief as DailyBrief)
                  }
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
                // Only auto-fetch if not dismissed today
          const today = getLocalDateString()
                const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
                if (dismissedDate !== today) {
                          fetchBrief(false)
                } else {
                          setBriefLoading(false)
                }
        }
  }, [fetchBrief, onboardingChecked, showOnboarding])

  /** Dismiss the card with a fade, save date to localStorage */
  const handleDismiss = () => {
        setBriefFading(true)
        setTimeout(() => {
                setBriefVisible(false)
                setBriefFading(false)
        }, 300)
        const today = getLocalDateString()
        localStorage.setItem(DISMISS_KEY_PREFIX + 'date', today)
        setNewBriefAvailable(false)
  }

  /** Load today's brief when user clicks the "New brief" pill */
  const handleLoadNewBrief = () => {
        const today = getLocalDateString()
        localStorage.removeItem(DISMISS_KEY_PREFIX + 'date')
        setNewBriefAvailable(false)
        setBriefVisible(true)
        fetchBrief(false)
  }

  /** Refresh: clear dismiss, regenerate */
  const handleRefresh = () => {
        const today = getLocalDateString()
        localStorage.removeItem(DISMISS_KEY_PREFIX + 'date')
        setBriefVisible(true)
        setBriefFading(false)
        setNewBriefAvailable(false)
        fetchBrief(true)
  }

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
                                                                                                  const today = getLocalDateString()
                          const todayTrades = tradingLogs.filter((t: any) => t.date === today).length
                          const goalsList = goals.goals || []
                                    const activeGoals = goalsList.length
                          const habitsList = habits.habits || []
                                    const completions = habits.completions || {}
                                              const todayCompletions = habitsList.filter((h: any) => completions[today]?.[h.id]).length
                          const healthLogs = health.logs || []
                                    const lastHealth = healthLogs[healthLogs.length - 1]
                          const healthStatus = lastHealth
                            ? 'Last: ' + new Date(lastHealth.date).toLocaleDateString()
                                      : 'No entries yet'

                  const journalEntries: any[] = Array.isArray(journal.data)
                            ? journal.data
                              : Array.isArray(journal.entries)
                            ? journal.entries
                              : []
                            const todayJournalEntry = journalEntries.find((e: any) => e.date === today)
                          const hasTodayJournal = !!todayJournalEntry
                          setJournalTodaySaved(hasTodayJournal)
                          const journalStatus = hasTodayJournal
                            ? "Today's entry saved"
                                      : journalEntries.length > 0
                            ? 'Last: ' + new Date(journalEntries[journalEntries.length - 1].date).toLocaleDateString()
                                      : 'No entries yet'

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
                                                    if (done > 0) {
                                                                    streak++
                                                                    maxStreak = Math.max(maxStreak, streak)
                                                    } else {
                                                                    streak = 0
                                                    }
                                                    d.setDate(d.getDate() - 1)
                                      }
                          }

                  const reviews = review.reviews || []
                            const latestReview = reviews[reviews.length - 1]
                          const weekScore = latestReview?.score ?? null

                  setStats({
                              trading:
                                            todayTrades > 0
                                  ? todayTrades + ' trade' + (todayTrades !== 1 ? 's' : '') + ' today'
                                              : tradingLogs.length > 0
                                  ? tradingLogs.length + ' total trades'
                                              : 'No trades logged',
                              goals: activeGoals > 0 ? activeGoals + ' active goal' + (activeGoals !== 1 ? 's' : '') : 'No goals set',
                              habits:
                                            habitsList.length > 0
                                  ? todayCompletions + '/' + habitsList.length + ' habits done today'
                                              : 'No habits created',
                              health: healthStatus,
                              journal: journalStatus,
                              finance: monthlyIncome > 0 ? '$' + monthlyIncome.toLocaleString() + ' income this month' : 'No entries yet',
                  })

                  setMetrics({
                              pnlWeek:
                                            weekPnl !== 0 ? (weekPnl >= 0 ? '+' : '') + '$' + Math.abs(weekPnl).toLocaleString() : '$0',
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
                <div
                          style={{
                                      minHeight: '100vh',
                                      background: bg,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                          }}
                        >
                        <div
                                    style={{
                                                  fontFamily: 'JetBrains Mono, monospace',
                                                  fontSize: '11px',
                                                  color: textMuted,
                                                  letterSpacing: '2px',
                                    }}
                                  >
                                  LOADING...
                        </div>
                </div>
              )
  }
  
    if (showOnboarding) {
          return <Onboarding onComplete={() => setShowOnboarding(false)} />
    }
  
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
      
        const pnlValue = metrics.pnlWeek
            const pnlColor = pnlValue.startsWith('+') ? '#00c48c' : pnlValue === '$0' ? textPrimary : '#ff4d6a'
              
                return (
                      <div style={{ minHeight: '100vh', background: bg, padding: isMobile ? '24px 16px' : '32px 48px' }}>
                            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                              {/* Header */}
                                    <div style={{ marginBottom: '40px' }}>
                                              <div
                                                            style={{
                                                                            fontFamily: 'JetBrains Mono, monospace',
                                                                            fontSize: '10px',
                                                                            letterSpacing: '0.15em',
                                                                            color: '#2563eb',
                                                                            textTransform: 'uppercase',
                                                                            marginBottom: '8px',
                                                            }}
                                                          >
                                                          // LIFE HUB
                                              </div>
                                              <h1
                                                            style={{
                                                                            fontFamily: 'Inter, sans-serif',
                                                                            fontSize: isMobile ? '24px' : '32px',
                                                                            fontWeight: 700,
                                                                            color: textPrimary,
                                                                            letterSpacing: '-0.02em',
                                                                            margin: '0 0 8px',
                                                            }}
                                                          >
                                                          Personal Command Center
                                              </h1>
                                              <p
                                                            style={{
                                                                            fontFamily: 'Inter, sans-serif',
                                                                            fontSize: '14px',
                                                                            color: textSecondary,
                                                                            margin: 0,
                                                            }}
                                                          >
                                                          Track everything. Miss nothing. Evolve daily.
                                              </p>
                                    </div>
                            
                              {/* "New brief available" pill — shown when user dismissed yesterday and it's a new day */}
                              {newBriefAvailable && !briefVisible && (
                                  <button
                                                onClick={handleLoadNewBrief}
                                                style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '16px',
                                                                padding: '8px 14px',
                                                                borderRadius: '999px',
                                                                background: 'rgba(37,99,235,0.12)',
                                                                border: '1px solid rgba(37,99,235,0.3)',
                                                                color: '#2563eb',
                                                                fontFamily: 'Inter, sans-serif',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                letterSpacing: '0.02em',
                                                }}
                                              >
                                              <RefreshCw size={12} />
                                              New brief from Coach Shai
                                  </button>
                                    )}
                            
                              {/* Coach Shai Daily Brief */}
                                    <div
                                                style={{
                                                              display: briefVisible || briefFading ? 'block' : 'none',
                                                              opacity: briefFading ? 0 : 1,
                                                              transition: 'opacity 0.3s ease',
                                                              backgroundColor: '#0f1117',
                              color: 'rgba(255,255,255,0.82)',
                                                              border: `1px solid ${border}`,
                                                              borderLeft: '3px solid #2563eb',
                                                              borderRadius: '10px',
                                                              padding: isMobile ? '16px' : '24px 28px',
                                                              marginBottom: '32px',
                                                              position: 'relative',
                                                              overflow: 'hidden',
                                                }}
                                              >
                                              <div
                                                            style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            marginBottom: '16px',
                                                                            flexWrap: 'wrap',
                                                                            gap: '8px',
                                                            }}
                                                          >
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                                        <span
                                                                                          style={{
                                                                                                              fontFamily: 'Inter, sans-serif',
                                                                                                              fontSize: '11px',
                                                                                                              letterSpacing: '0.1em',
                                                                                                              color: '#60a5fa',
                                                                                                              fontWeight: 700,
                                                                                                              textTransform: 'uppercase',
                                                                                            }}
                                                                                        >
                                                                                        COACH SHAI · DAILY BRIEF
                                                                        </span>
                                                            {brief && (
                                                                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                                                                              {formatGeneratedAt(brief.generatedAt)}
                                                                            </span>
                                                                        )}
                                                          </div>
                                              
                                                {/* Right side: Refresh + Dismiss */}
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Button
                                                                                          variant="ghost"
                                                                                          onClick={handleRefresh}
                                                                                          disabled={briefLoading}
                                                                                          style={{ fontSize: '12px', padding: '6px 12px', minHeight: '36px', color: 'rgba(255,255,255,0.5)' }}
                                                                                        >
                                                                                        <RefreshCw size={12} style={{ animation: briefLoading ? 'spin 1s linear infinite' : 'none' }} />
                                                                                        Refresh
                                                                        </Button>
                                                          
                                                            {/* Dismiss X button */}
                                                                        <button
                                                                                          onClick={handleDismiss}
                                                                                          aria-label="Dismiss Coach Shai brief"
                                                                                          style={{
                                                                                                              display: 'flex',
                                                                                                              alignItems: 'center',
                                                                                                              justifyContent: 'center',
                                                                                                              width: '32px',
                                                                                                              height: '32px',
                                                                                                              borderRadius: '6px',
                                                                                                              border: 'none',
                                                                                                              background: 'transparent',
                                                                                                              color: 'rgba(255,255,255,0.35)',
                                                                                                              cursor: 'pointer',
                                                                                                              transition: 'opacity 0.15s, color 0.15s',
                                                                                                              flexShrink: 0,
                                                                                            }}
                                                                                          onMouseEnter={e => {
                                                                                                              ;(e.currentTarget as HTMLButtonElement).style.color = textPrimary
                                                                                                                                  ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                                                                                            }}
                                                                                          onMouseLeave={e => {
                                                                                                              ;(e.currentTarget as HTMLButtonElement).style.color = dismissIconColor
                                                                                                                                  ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                                                                                            }}
                                                                                        >
                                                                                        <X size={14} />
                                                                        </button>
                                                          </div>
                                              </div>
                                    
                                      {briefLoading ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                          <div
                                                                                            style={{
                                                                                                                width: '6px',
                                                                                                                height: '6px',
                                                                                                                borderRadius: '50%',
                                                                                                                background: '#2563eb',
                                                                                                                animation: 'pulse 1.5s ease-in-out infinite',
                                                                                              }}
                                                                                          />
                                                                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: textSecondary }}>
                                                                                          Coach Shai is reading your data...
                                                                          </span>
                                                            </div>
                                                          ) : briefNoData ? (
                                                            <p
                                                                            style={{
                                                                                              fontFamily: 'Inter, sans-serif',
                                                                                              fontSize: '14px',
                                                                                              color: textSecondary,
                                                                                              margin: 0,
                                                                                              lineHeight: 1.7,
                                                                            }}
                                                                          >
                                                                          Start logging your data and Coach Shai will brief you every morning.
                                                            </p>
                                                          ) : briefError ? (
                                                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ff4d6a', margin: 0 }}>
                                                                          Failed to load brief. Click Refresh to try again.
                                                            </p>
                                                          ) : brief ? (
                                                            <p
                                                                            style={{
                                                                                              fontFamily: 'Inter, sans-serif',
                                                                                              fontSize: isMobile ? '14px' : '15px',
                                                                                              color: 'rgba(255,255,255,0.82)',
                                                                                              margin: 0,
                                                                                              lineHeight: 1.7,
                                                                            }}
                                                                          >
                                                              {brief.text}
                                                            </p>
                                                          ) : null}
                                    </div>
                            
                              {/* Live Metrics Row */}
                                    <div
                                                style={{
                                                              display: 'grid',
                                                              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                                                              gap: '16px',
                                                              marginBottom: '32px',
                                                }}
                                              >
                                              <StatCard label="NET P&L THIS WEEK" value={metrics.pnlWeek} style={{ borderTop: `3px solid ${pnlColor}` }} />
                                              <StatCard label="HABIT STREAK" value={metrics.habitStreak} />
                                              <StatCard label="WEEK SCORE" value={metrics.weekScore} />
                                              <StatCard label="INCOME THIS MONTH" value={metrics.incomeMonth} />
                                    </div>
                            
                              {/* Section Header */}
                                    <div
                                                style={{
                                                              fontFamily: 'JetBrains Mono, monospace',
                                                              fontSize: '10px',
                                                              letterSpacing: '0.15em',
                                                              color: textMuted,
                                                              textTransform: 'uppercase',
                                                              marginBottom: '20px',
                                                }}
                                              >
                                              MODULES
                                    </div>
                            
                              {/* Modules Grid */}
                                    <div
                                                style={{
                                                              display: 'grid',
                                                              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                                                              gap: '16px',
                                                }}
                                              >
                                      {sections.map(section => {
                                                            const Icon = section.icon
                                                                          const statusText = stats[section.statusKey as keyof SectionStats]
                                                                                        const isJournal = section.key === 'journal'
                                                                                                      const badgeLabel = isJournal ? (journalTodaySaved ? 'ENTRY SAVED' : 'NO ENTRY') : section.statusBadge
                                                                                                                    const badgeColor = isJournal && journalTodaySaved ? '#00c48c' : '#2563eb'
                                                                                                                                  const badgeBg =
                                                                                                                                                  isJournal && journalTodaySaved ? 'rgba(0,196,140,0.1)' : 'rgba(37,99,235,0.1)'
                                                                                                                                    
                                                                                                                                                return (
                                                                                                                                                                <div
                                                                                                                                                                                  key={section.key}
                                                                                                                                                                                  style={{
                                                                                                                                                                                                      background: surface,
                                                                                                                                                                                                      border: `1px solid ${border}`,
                                                                                                                                                                                                      borderRadius: '10px',
                                                                                                                                                                                                      padding: '24px',
                                                                                                                                                                                                      display: 'flex',
                                                                                                                                                                                                      flexDirection: 'column',
                                                                                                                                                                                                      gap: '14px',
                                                                                                                                                                                                      minHeight: '180px',
                                                                                                                                                                                    }}
                                                                                                                                                                                >
                                                                                                                                                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                                                                                                                                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                                                                                                                                                                      <div
                                                                                                                                                                                                                                              style={{
                                                                                                                                                                                                                                                                        width: '36px',
                                                                                                                                                                                                                                                                        height: '36px',
                                                                                                                                                                                                                                                                        borderRadius: '8px',
                                                                                                                                                                                                                                                                        background: 'rgba(37,99,235,0.08)',
                                                                                                                                                                                                                                                                        display: 'flex',
                                                                                                                                                                                                                                                                        alignItems: 'center',
                                                                                                                                                                                                                                                                        justifyContent: 'center',
                                                                                                                                                                                                                                                                        flexShrink: 0,
                                                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                                            >
                                                                                                                                                                                                                                            <Icon size={20} color="#2563eb" />
                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                      <div>
                                                                                                                                                                                                                                            <div
                                                                                                                                                                                                                                                                      style={{
                                                                                                                                                                                                                                                                                                  fontFamily: 'Inter, sans-serif',
                                                                                                                                                                                                                                                                                                  fontWeight: 600,
                                                                                                                                                                                                                                                                                                  fontSize: '15px',
                                                                                                                                                                                                                                                                                                  color: textPrimary,
                                                                                                                                                                                                                                                                                                  marginBottom: '2px',
                                                                                                                                                                                                                                                                                                }}
                                                                                                                                                                                                                                                                    >
                                                                                                                                                                                                                                                                    {section.name}
                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                            <div
                                                                                                                                                                                                                                                                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: textSecondary }}
                                                                                                                                                                                                                                                                    >
                                                                                                                                                                                                                                                                    {section.descriptor}
                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                  <span
                                                                                                                                                                                                                        style={{
                                                                                                                                                                                                                                                fontFamily: 'JetBrains Mono, monospace',
                                                                                                                                                                                                                                                fontSize: '10px',
                                                                                                                                                                                                                                                letterSpacing: '0.05em',
                                                                                                                                                                                                                                                padding: '3px 8px',
                                                                                                                                                                                                                                                borderRadius: '4px',
                                                                                                                                                                                                                                                background: badgeBg,
                                                                                                                                                                                                                                                color: badgeColor,
                                                                                                                                                                                                                                                flexShrink: 0,
                                                                                                                                                                                                                                                whiteSpace: 'nowrap',
                                                                                                                                                                                                                                              }}
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      {badgeLabel}
                                                                                                                                                                                                                    </span>
                                                                                                                                                                                  </div>
                                                                                                                                                                
                                                                                                                                                                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: textMuted, margin: 0, flex: 1 }}>
                                                                                                                                                                                  {statusText}
                                                                                                                                                                                  </p>
                                                                                                                                                                
                                                                                                                                                                                <div style={{ height: '1px', background: border }} />
                                                                                                                                                                
                                                                                                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                                                                                                                  <Link
                                                                                                                                                                                                                        href={section.href}
                                                                                                                                                                                                                        style={{
                                                                                                                                                                                                                                                flex: 1,
                                                                                                                                                                                                                                                display: 'flex',
                                                                                                                                                                                                                                                alignItems: 'center',
                                                                                                                                                                                                                                                justifyContent: 'center',
                                                                                                                                                                                                                                                padding: '10px 12px',
                                                                                                                                                                                                                                                minHeight: '40px',
                                                                                                                                                                                                                                                borderRadius: '8px',
                                                                                                                                                                                                                                                background: '#2563eb',
                                                                                                                                                                                                                                                color: '#ffffff',
                                                                                                                                                                                                                                                fontFamily: 'Inter, sans-serif',
                                                                                                                                                                                                                                                fontSize: '13px',
                                                                                                                                                                                                                                                fontWeight: 600,
                                                                                                                                                                                                                                                textDecoration: 'none',
                                                                                                                                                                                                                                                transition: 'background 0.15s',
                                                                                                                                                                                                                                              }}
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      OPEN
                                                                                                                                                                                                                    </Link>
                                                                                                                                                                                                  <Link
                                                                                                                                                                                                                        href={section.href + '?chat=1'}
                                                                                                                                                                                                                        title="Open AI Chat"
                                                                                                                                                                                                                        style={{
                                                                                                                                                                                                                                                width: '40px',
                                                                                                                                                                                                                                                height: '40px',
                                                                                                                                                                                                                                                borderRadius: '8px',
                                                                                                                                                                                                                                                display: 'flex',
                                                                                                                                                                                                                                                alignItems: 'center',
                                                                                                                                                                                                                                                justifyContent: 'center',
                                                                                                                                                                                                                                                background: 'transparent',
                                                                                                                                                                                                                                                border: `1px solid ${border}`,
                                                                                                                                                                                                                                                color: textMuted,
                                                                                                                                                                                                                                                fontFamily: 'JetBrains Mono, monospace',
                                                                                                                                                                                                                                                fontSize: '10px',
                                                                                                                                                                                                                                                fontWeight: 700,
                                                                                                                                                                                                                                                textDecoration: 'none',
                                                                                                                                                                                                                                                flexShrink: 0,
                                                                                                                                                                                                                                              }}
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      AI
                                                                                                                                                                                                                    </Link>
                                                                                                                                                                                  </div>
                                                                                                                                                                  </div>
                                                                                                                                                              )
                                      })}
                                    </div>
                            
                              {/* Footer */}
                                    <p
                                                style={{
                                                              marginTop: '48px',
                                                              textAlign: 'center',
                                                              fontFamily: 'JetBrains Mono, monospace',
                                                              fontSize: '10px',
                                                              letterSpacing: '0.1em',
                                                              color: textMuted,
                                                }}
                                              >
                                      {'// ALL DATA STORED IN UPSTASH REDIS · AI POWERED BY CLAUDE HAIKU'}
                                    </p>
                            </div>
                      
                            <style>{`
                                    @keyframes spin {
                                              from { transform: rotate(0deg); }
                                                        to { transform: rotate(360deg); }
                                                                }
                                                                        @keyframes pulse {
                                                                                  0%, 100% { opacity: 1; }
                                                                                            50% { opacity: 0.3; }
                                                                                                    }
                                                                                                          `}</style>
                      </div>
                    )
}
