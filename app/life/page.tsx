'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LineChart, Target, Flame, Heart, BookOpen, DollarSign, RefreshCw, X, Calendar, Plus, Check } from 'lucide-react'
import Onboarding from '@/app/components/Onboarding'
import { useTheme } from '@/app/contexts/ThemeContext'
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
  const [briefVisible, setBriefVisible] = useState(true)
  const [briefFading, setBriefFading] = useState(false)
  const [newBriefAvailable, setNewBriefAvailable] = useState(false)
  const [tradingData, setTradingData] = useState<any[]>([])
  const [habitsData, setHabitsData] = useState<{ habits: any[]; completions: any }>({
    habits: [],
    completions: {},
  })
  const [financeData, setFinanceData] = useState<{ income: any[]; trading: any[] }>({
    income: [],
    trading: [],
  })
  const [edgeScore, setEdgeScore] = useState<any>(null)
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false, false])

  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e8e8e2'
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const bg = isDark ? '#0a0a0f' : '#f8f8f6'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const dismissIconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  useEffect(() => {
    const today = getLocalDateString()
    const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
    if (dismissedDate === today) {
      setBriefVisible(false)
      setBriefFading(false)
    } else if (dismissedDate && dismissedDate !== today) {
      setNewBriefAvailable(true)
      setBriefVisible(false)
    }
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
      const today = getLocalDateString()
      const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
      if (dismissedDate !== today) {
        fetchBrief(false)
      } else {
        setBriefLoading(false)
      }
    }
  }, [fetchBrief, onboardingChecked, showOnboarding])

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

  const handleLoadNewBrief = () => {
    localStorage.removeItem(DISMISS_KEY_PREFIX + 'date')
    setNewBriefAvailable(false)
    setBriefVisible(true)
    fetchBrief(false)
  }

  const handleRefresh = () => {
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
        setTradingData(tradingLogs)
        const today = getLocalDateString()
        const todayTrades = tradingLogs.filter((t: any) => t.date === today).length
        const goalsList = goals.goals || []
        const activeGoals = goalsList.length
        const habitsList = habits.habits || []
        const completions = habits.completions || {}
        setHabitsData({ habits: habitsList, completions })
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
        const tradingIncomeEntries = finance.trading || []
        setFinanceData({ income: incomeEntries, trading: tradingIncomeEntries })
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
        if (latestReview?.edgeScore) setEdgeScore(latestReview.edgeScore)

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
  const pnlColor = pnlValue.startsWith('+') ? '#16a34a' : pnlValue === '$0' ? textPrimary : '#dc2626'

  // ---- Derived data for new layout ----

  // Date range string
  const now = new Date()
  const dateRangeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Stats for 5 stat cards
  const allTrades = tradingData
  const currentMonth2 = new Date().toISOString().slice(0, 7)
  const monthTrades = allTrades.filter((t: any) => t.date?.startsWith(currentMonth2))
  const wins = monthTrades.filter((t: any) => (t.pnl || 0) > 0)
  const losses = monthTrades.filter((t: any) => (t.pnl || 0) < 0)
  const netPnl = monthTrades.reduce((s: number, t: any) => s + (t.pnl || 0), 0)
  const winRate = monthTrades.length > 0 ? Math.round((wins.length / monthTrades.length) * 100) : null
  const grossWin = wins.reduce((s: number, t: any) => s + (t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + (t.pnl || 0), 0))
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : wins.length > 0 ? '\u221e' : null
  const avgRR = wins.length > 0 && losses.length > 0
    ? ((grossWin / wins.length) / (grossLoss / losses.length)).toFixed(2)
    : null
  const habitStreakNum = parseInt(metrics.habitStreak) || 0

  // Edge score pillars
  const pillars = [
    { label: 'Discipline', color: '#60a5fa', score: edgeScore?.discipline ?? null },
    { label: 'Consistency', color: '#22c55e', score: edgeScore?.consistency ?? null },
    { label: 'Execution', color: '#c026d3', score: edgeScore?.execution ?? null },
    { label: 'Risk Control', gradient: 'linear-gradient(to right, #ef4444 0%, #22c55e 100%)', score: edgeScore?.riskControl ?? null },
  ]
  const totalEdgeScore = edgeScore?.total ?? null

  // Heatmap: last 12 weeks Mon-Fri
  const today2 = new Date()
  const heatmapWeeks: Array<Array<{ date: string; pnl: number | null; hasTrade: boolean }>> = []
  const startDay = new Date(today2)
  // Go back to Monday 12 weeks ago
  const dayOfWeek = startDay.getDay() // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDay.setDate(startDay.getDate() - daysToMonday - 11 * 7)
  for (let w = 0; w < 12; w++) {
    const week: Array<{ date: string; pnl: number | null; hasTrade: boolean }> = []
    for (let d = 0; d < 5; d++) {
      const cellDate = new Date(startDay)
      cellDate.setDate(startDay.getDate() + w * 7 + d)
      const ds = cellDate.toISOString().split('T')[0]
      const dayTrades = allTrades.filter((t: any) => t.date === ds)
      const dayPnl = dayTrades.length > 0 ? dayTrades.reduce((s: number, t: any) => s + (t.pnl || 0), 0) : null
      week.push({ date: ds, pnl: dayPnl, hasTrade: dayTrades.length > 0 })
    }
    heatmapWeeks.push(week)
  }

  function heatmapColor(cell: { pnl: number | null; hasTrade: boolean }) {
    if (!cell.hasTrade) return isDark ? 'rgba(255,255,255,0.06)' : '#f0f0eb'
    if (cell.pnl === null) return isDark ? 'rgba(255,255,255,0.06)' : '#f0f0eb'
    if (cell.pnl > 500) return '#16a34a'
    if (cell.pnl > 0) return '#4ade80'
    if (cell.pnl > -500) return '#f87171'
    return '#dc2626'
  }

  // Daily checklist items
  const checklistItems = [
    'Review trading plan',
    'Log morning routine',
    'Check positions',
    'Journal entry',
    'Evening review',
  ]
  const checkedCount = checkedItems.filter(Boolean).length

  // Recent trades
  const recentTrades = [...allTrades].sort((a: any, b: any) => (b.date > a.date ? 1 : -1)).slice(0, 5)

  // Income this month
  const tradingIncomePnl = monthTrades.reduce((s: number, t: any) => s + (t.pnl || 0), 0)
  const contentIncome = financeData.income
    .filter((e: any) => e.date?.startsWith(currentMonth2))
    .reduce((s: number, e: any) => s + (e.amount || 0), 0)
  const totalMonthIncome = tradingIncomePnl + contentIncome

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: isMobile ? '16px' : '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ===== TOPBAR ROW 1: Title + Buttons ===== */}
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display, Syne, Inter, sans-serif)',
              fontWeight: 700,
              fontSize: isMobile ? '22px' : '26px',
              color: textPrimary,
              margin: '0 0 3px',
              letterSpacing: '-0.01em',
            }}>
              Personal Command Center
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: textSecondary }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button style={{
              background: '#eff6ff',
              border: '1.5px solid #93c5fd',
              color: '#60a5fa',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Calendar size={12} />
              {dateRangeStr}
            </button>
            <Link href="/life/trading?new=1" style={{
              backgroundColor: '#60a5fa',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              padding: '7px 15px',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
            }}>
              <Plus size={13} />
              Log Trade
            </Link>
          </div>
        </div>

        {/* ===== COACH SHAI CARD (exact as-is, dark bg) ===== */}
        {newBriefAvailable && !briefVisible && (
          <button
            onClick={handleLoadNewBrief}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
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

        <div
          style={{
            display: briefVisible || briefFading ? 'block' : 'none',
            opacity: briefFading ? 0 : 1,
            transition: 'opacity 0.3s ease',
            backgroundColor: '#0f1117',
            color: 'rgba(255,255,255,0.82)',
            border: '0.5px solid #e8e8e2',
            borderLeft: '3px solid #2563eb',
            borderRadius: '10px',
            padding: isMobile ? '16px' : '24px 28px',
            marginBottom: '20px',
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
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ffffff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {briefLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Coach Shai is reading your data...</span>
            </div>
          ) : briefNoData ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.7 }}>
              Start logging your data and Coach Shai will brief you every morning.
            </p>
          ) : briefError ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ff4d6a', margin: 0 }}>
              Failed to load brief. Click Refresh to try again.
            </p>
          ) : brief ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? '14px' : '15px', color: 'rgba(255,255,255,0.82)', margin: 0, lineHeight: 1.7 }}>
              {brief.text}
            </p>
          ) : null}
        </div>

  
      {/* ===== ROW 2: 5 Stat Cards ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'NET P&L', value: netPnl !== 0 ? (netPnl >= 0 ? '+' : '') + '$' + Math.abs(netPnl).toLocaleString() : '—', color: netPnl > 0 ? '#16a34a' : netPnl < 0 ? '#dc2626' : textPrimary },
            { label: 'WIN RATE', value: winRate !== null ? winRate + '%' : '—', color: textPrimary },
            { label: 'PROFIT FACTOR', value: profitFactor !== null ? profitFactor : '—', color: textPrimary },
            { label: 'AVG R:R', value: avgRR !== null ? avgRR : '—', color: textPrimary },
            { label: 'HABIT STREAK', value: habitStreakNum > 0 ? habitStreakNum + 'd' : '—', color: '#60a5fa' },
          ].map((card, i) => (
            <div key={i} style={{
              background: cardBg,
              border: '0.5px solid ' + cardBorder,
              borderRadius: '8px',
              padding: '11px 13px',
            }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', marginBottom: '5px', fontWeight: 600 }}>
                {card.label}
              </div>
              <div style={{ fontSize: '19px', fontWeight: 600, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* ===== ROW 3: 3 Columns ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr 1.4fr',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'start',
        }}>

          {/* === COLUMN 1: Edge Score === */}
          <div style={{
            background: cardBg,
            border: '0.5px solid ' + cardBorder,
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>Edge Score</div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontFamily: 'Syne, var(--font-display, sans-serif)', fontSize: '52px', fontWeight: 800, color: textPrimary, lineHeight: 1 }}>
                {totalEdgeScore !== null ? totalEdgeScore : '—'}
              </div>
              {(totalEdgeScore !== null && totalEdgeScore !== 0) ? (
                <div style={{
                  display: 'inline-block',
                  marginTop: '6px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '99px',
                  padding: '2px 10px',
                  letterSpacing: '0.04em',
                }}>Sharp</div>
              ) : (
                <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', fontWeight: 700, color: '#aaaaaa', letterSpacing: '0.04em' }}>—</div>
              )}
            </div>
            {/* Overall progress bar */}
            <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', marginBottom: '14px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: totalEdgeScore !== null ? totalEdgeScore + '%' : '0%',
                background: '#60a5fa',
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            {/* Pillar bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pillars.map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: textSecondary }}>{p.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: textPrimary }}>{p.score !== null ? p.score : '—'}</span>
                  </div>
                  <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: p.score !== null ? p.score + '%' : '0%',
                      background: p.gradient || p.color,
                      borderRadius: '2px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === COLUMN 2: Heatmap + Checklist === */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Heatmap */}
            <div style={{
              background: cardBg,
              border: '0.5px solid ' + cardBorder,
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>Trading Activity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((dayLabel, dayIdx) => (
                  <div key={dayLabel} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', color: '#aaaaaa', width: '22px', flexShrink: 0 }}>{dayLabel}</span>
                    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                      {heatmapWeeks.map((week, wi) => {
                        const cell = week[dayIdx]
                        if (!cell) return null
                        return (
                          <div
                            key={wi}
                            title={cell.date + (cell.pnl !== null ? ': $' + cell.pnl.toFixed(0) : '')}
                            style={{
                              flex: 1,
                              height: '11px',
                              borderRadius: '2px',
                              background: heatmapColor(cell),
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
                {[['Win', '#4ade80'], ['Loss', '#f87171'], ['No trade', isDark ? 'rgba(255,255,255,0.06)' : '#f0f0eb']].map(([label, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, border: '0.5px solid ' + cardBorder }} />
                    <span style={{ fontSize: '9px', color: '#aaaaaa' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Checklist */}
            <div style={{
              background: cardBg,
              border: '0.5px solid ' + cardBorder,
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', fontWeight: 600 }}>Daily Checklist</div>
                <span style={{ fontSize: '11px', color: textSecondary }}>{checkedCount}/{checklistItems.length}</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: (checkedCount / checklistItems.length * 100) + '%',
                  background: '#60a5fa',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {checklistItems.map((item, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    onClick={() => {
                      const next = [...checkedItems]
                      next[i] = !next[i]
                      setCheckedItems(next)
                    }}
                  >
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      border: '1.5px solid ' + (checkedItems[i] ? '#60a5fa' : '#d1d5db'),
                      background: checkedItems[i] ? '#60a5fa' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                      {checkedItems[i] && <Check size={9} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: checkedItems[i] ? textMuted : (isDark ? 'rgba(255,255,255,0.7)' : '#555555'),
                      textDecoration: checkedItems[i] ? 'line-through' : 'none',
                      transition: 'all 0.15s',
                    }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === COLUMN 3: Recent Trades + Income === */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Recent Trades */}
            <div style={{
              background: cardBg,
              border: '0.5px solid ' + cardBorder,
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', fontWeight: 600 }}>Recent Trades</div>
                <Link href="/life/trading" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>View all</Link>
              </div>
              {recentTrades.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        {['Date', 'Symbol', 'Side', 'P&L'].map(h => (
                          <th key={h} style={{ textAlign: 'left', color: '#aaaaaa', fontWeight: 600, paddingBottom: '6px', borderBottom: '0.5px solid ' + cardBorder, paddingRight: '8px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map((t: any, i: number) => {
                        const tp = t.pnl || 0
                        const pnlColor2 = tp > 0 ? '#16a34a' : tp < 0 ? '#dc2626' : textPrimary
                        return (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px 5px 0', color: textSecondary, whiteSpace: 'nowrap' }}>{t.date}</td>
                            <td style={{ padding: '5px 8px 5px 0', color: textPrimary, fontWeight: 600 }}>{t.symbol || '—'}</td>
                            <td style={{ padding: '5px 8px 5px 0', color: textSecondary, textTransform: 'capitalize' }}>{t.side || t.direction || '—'}</td>
                            <td style={{ padding: '5px 0 5px 0', color: pnlColor2, fontWeight: 600, whiteSpace: 'nowrap' }}>{tp !== 0 ? (tp > 0 ? '+' : '') + '$' + Math.abs(tp).toLocaleString() : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: textMuted, textAlign: 'center', padding: '16px 0' }}>No trades logged yet</div>
              )}
            </div>

            {/* Income This Month */}
            <div style={{
              background: cardBg,
              border: '0.5px solid ' + cardBorder,
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>Income This Month</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: textPrimary, marginBottom: '12px' }}>
                {totalMonthIncome !== 0 ? '$' + totalMonthIncome.toLocaleString() : '—'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: cardBg, borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.06em', marginBottom: '4px' }}>Trading</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: tradingIncomePnl >= 0 ? '#16a34a' : '#dc2626' }}>
                    {tradingIncomePnl !== 0 ? (tradingIncomePnl >= 0 ? '+' : '') + '$' + Math.abs(tradingIncomePnl).toLocaleString() : '—'}
                  </div>
                </div>
                <div style={{ background: cardBg, borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaaaaa', letterSpacing: '0.06em', marginBottom: '4px' }}>Content</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                    {contentIncome > 0 ? '$' + contentIncome.toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', color: textMuted }}>
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
