// @charset utf-8
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LineChart, Target, Flame, Heart, BookOpen, DollarSign, RefreshCw, X, Calendar, Plus, Check, Search, Send, MessageCircle } from 'lucide-react'
import Onboarding from '@/app/components/Onboarding'
import { useTheme } from '@/app/contexts/ThemeContext'
import Button from '@/app/components/ui/Button'

const sections = [
  { key: 'trading', name: 'Trading Journal', descriptor: 'Track trades, P&L, and patterns', icon: LineChart, href: '/life/trading', statusBadge: 'NO TRADES', statusKey: 'trading' },
  { key: 'goals', name: 'Goals', descriptor: 'Define targets, track progress', icon: Target, href: '/life/goals', statusBadge: '0 GOALS', statusKey: 'goals' },
  { key: 'habits', name: 'Habits', descriptor: 'Build streaks, stay consistent', icon: Flame, href: '/life/habits', statusBadge: '0 STREAK', statusKey: 'habits' },
  { key: 'health', name: 'Health', descriptor: 'Log wellness, track vitals', icon: Heart, href: '/life/health', statusBadge: 'NO LOGS', statusKey: 'health' },
  { key: 'journal', name: 'Daily Journal', descriptor: 'Reflect, plan, and capture ideas', icon: BookOpen, href: '/life/journal', statusBadge: 'NO ENTRY', statusKey: 'journal' },
  { key: 'finance', name: 'Finance', descriptor: 'Income, expenses, net worth', icon: DollarSign, href: '/life/finance', statusBadge: '$0 THIS MONTH', statusKey: 'finance' },
]

type SectionStats = { trading: string; goals: string; habits: string; health: string; journal: string; finance: string }
type LiveMetrics = { pnlWeek: string; habitStreak: string; weekScore: string; incomeMonth: string }
type DailyBrief = { text: string; generatedAt: string; date: string }

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

  // ââ existing state ââââââââââââââââââââââââââââââââââââââââââââââ
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [stats, setStats] = useState<SectionStats>({
    trading: 'No trades logged', goals: 'No goals set', habits: 'No habits created',
    health: 'No entries yet', journal: 'No entries yet', finance: 'No entries yet',
  })
  const [metrics, setMetrics] = useState<LiveMetrics>({
    pnlWeek: '$0', habitStreak: '0d', weekScore: 'N/A', incomeMonth: '$0',
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
  const [habitsData, setHabitsData] = useState<{ habits: any[]; completions: any }>({ habits: [], completions: {} })
  const [financeData, setFinanceData] = useState<{ income: any[]; trading: any[] }>({ income: [], trading: [] })
  const [edgeScore, setEdgeScore] = useState<any>(null)
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false, false])
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  // ââ new UI state âââââââââââââââââââââââââââââââââââââââââââââââââ
  const [searchOpen, setSearchOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTab, setChatTab] = useState<'coach' | 'support'>('coach')
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: "Hey! What's on your mind? Trading, health, mindset — I'm here. You have 1 life." },
  ])
  const [chatInput, setChatInput] = useState('')
  const [supportName, setSupportName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')

  useEffect(() => {
    const handleClickOutside = () => setActiveTooltip(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (e.key === 'Escape') { setSearchOpen(false) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // ââ dismiss/brief logic (unchanged) ââââââââââââââââââââââââââââââ
  useEffect(() => {
    const today = getLocalDateString()
    const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
    if (dismissedDate === today) { setBriefVisible(false); setBriefFading(false) }
    else if (dismissedDate && dismissedDate !== today) { setNewBriefAvailable(true); setBriefVisible(false) }
  }, [])

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch('/api/onboarding')
        const data = await res.json()
        if (data.complete === false) setShowOnboarding(true)
      } catch (e) {}
      finally { setOnboardingChecked(true) }
    }
    checkOnboarding()
  }, [])

  const fetchBrief = useCallback(async (refresh = false) => {
    setBriefLoading(true); setBriefError(false)
    try {
      const localDate = getLocalDateString()
      const res = await fetch('/api/life/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh, localDate }),
      })
      const data = await res.json()
      if (data.noData) { setBriefNoData(true); setBrief(null) }
      else if (data.brief) {
        if (typeof data.brief === 'string') setBrief({ text: data.brief, generatedAt: new Date().toISOString(), date: localDate })
        else setBrief(data.brief as DailyBrief)
        setBriefNoData(false)
      } else { setBriefError(true) }
    } catch { setBriefError(true) }
    finally { setBriefLoading(false) }
  }, [])

  useEffect(() => {
    if (onboardingChecked && !showOnboarding) {
      const today = getLocalDateString()
      const dismissedDate = localStorage.getItem(DISMISS_KEY_PREFIX + 'date')
      if (dismissedDate !== today) fetchBrief(false)
      else setBriefLoading(false)
    }
  }, [fetchBrief, onboardingChecked, showOnboarding])

  const handleDismiss = () => {
    setBriefFading(true)
    setTimeout(() => { setBriefVisible(false); setBriefFading(false) }, 300)
    const today = getLocalDateString()
    localStorage.setItem(DISMISS_KEY_PREFIX + 'date', today)
    setNewBriefAvailable(false)
  }
  const handleLoadNewBrief = () => {
    localStorage.removeItem(DISMISS_KEY_PREFIX + 'date')
    setNewBriefAvailable(false); setBriefVisible(true)
    fetchBrief(false)
  }
  const handleRefresh = () => {
    localStorage.removeItem(DISMISS_KEY_PREFIX + 'date')
    setBriefVisible(true); setBriefFading(false); setNewBriefAvailable(false)
    fetchBrief(true)
  }

  // ââ data loading (unchanged) ââââââââââââââââââââââââââââââââââââââ
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
        const healthStatus = lastHealth ? 'Last: ' + new Date(lastHealth.date).toLocaleDateString() : 'No entries yet'
        const journalEntries: any[] = Array.isArray(journal.data) ? journal.data : Array.isArray(journal.entries) ? journal.entries : []
        const todayJournalEntry = journalEntries.find((e: any) => e.date === today)
        const hasTodayJournal = !!todayJournalEntry
        setJournalTodaySaved(hasTodayJournal)
        const journalStatus = hasTodayJournal ? "Today's entry saved" : journalEntries.length > 0 ? 'Last: ' + new Date(journalEntries[journalEntries.length - 1].date).toLocaleDateString() : 'No entries yet'
        const incomeEntries = finance.income || []
        const tradingIncomeEntries = finance.trading || []
        setFinanceData({ income: incomeEntries, trading: tradingIncomeEntries })
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthlyIncome = incomeEntries.filter((e: any) => e.date?.startsWith(currentMonth)).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekPnl = tradingLogs.filter((t: any) => t.date >= weekStartStr).reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
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
        if (latestReview?.edgeScore) setEdgeScore(latestReview.edgeScore)
        setStats({
          trading: todayTrades > 0 ? todayTrades + ' trade' + (todayTrades !== 1 ? 's' : '') + ' today' : tradingLogs.length > 0 ? tradingLogs.length + ' total trades' : 'No trades logged',
          goals: activeGoals > 0 ? activeGoals + ' active goal' + (activeGoals !== 1 ? 's' : '') : 'No goals set',
          habits: habitsList.length > 0 ? todayCompletions + '/' + habitsList.length + ' habits done today' : 'No habits created',
          health: healthStatus, journal: journalStatus,
          finance: monthlyIncome > 0 ? '$' + monthlyIncome.toLocaleString() + ' income this month' : 'No entries yet',
        })
        setMetrics({
          pnlWeek: weekPnl !== 0 ? (weekPnl >= 0 ? '+' : '') + '$' + Math.abs(weekPnl).toLocaleString() : '$0',
          habitStreak: maxStreak > 0 ? maxStreak + 'd' : '0d',
          weekScore: weekScore !== null ? weekScore + '/10' : 'N/A',
          incomeMonth: monthlyIncome > 0 ? '$' + monthlyIncome.toLocaleString() : '$0',
        })
      } catch {}
    }
    loadStats()
  }, [onboardingChecked, showOnboarding])

  // ââ guards (unchanged) ââââââââââââââââââââââââââââââââââââââââââ
  if (!onboardingChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING...</div>
      </div>
    )
  }
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />

  // ââ helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const formatGeneratedAt = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  // ââ derived data (unchanged calculations) ââââââââââââââââââââââââ
  const now = new Date()
  const dateRangeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' — ' + new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const todayLong = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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
  const avgRR = wins.length > 0 && losses.length > 0 ? ((grossWin / wins.length) / (grossLoss / losses.length)).toFixed(2) : null
  const habitStreakNum = parseInt(metrics.habitStreak) || 0

  const pillars = [
    { label: 'Discipline', color: '#60a5fa', score: edgeScore?.discipline ?? null },
    { label: 'Consistency', color: '#22c55e', score: edgeScore?.consistency ?? null },
    { label: 'Execution', color: '#c026d3', score: edgeScore?.execution ?? null },
    { label: 'Risk Control', color: '#ef4444', score: edgeScore?.riskControl ?? null },
  ]
  const totalEdgeScore = edgeScore?.total ?? null

  // ââ heatmap (unchanged) ââââââââââââââââââââââââââââââââââââââââââ
  const today2 = new Date()
  const heatmapWeeks: Array<Array<{ date: string; pnl: number | null; hasTrade: boolean }>> = []
  const startDay = new Date(today2)
  const dayOfWeek = startDay.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDay.setDate(startDay.getDate() - daysToMonday - 5 * 7)
  for (let w = 0; w < 6; w++) {
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
    if (!cell.hasTrade) return 'var(--border)'
    if (cell.pnl === null) return 'var(--border)'
    if (cell.pnl > 500) return '#16a34a'
    if (cell.pnl > 0) return '#4ade80'
    if (cell.pnl > -500) return '#f87171'
    return '#dc2626'
  }

  // ââ checklist (unchanged) ââââââââââââââââââââââââââââââââââââââââ
  const checklistItems = ['Review trading plan', 'Log morning routine', 'Check positions', 'Journal entry', 'Evening review']
  const checkedCount = checkedItems.filter(Boolean).length

  // ââ recent trades (unchanged) ââââââââââââââââââââââââââââââââââââ
  const recentTrades = [...allTrades].sort((a: any, b: any) => (b.date > a.date ? 1 : -1)).slice(0, 5)

  // ââ income (unchanged) âââââââââââââââââââââââââââââââââââââââââââ
  const tradingIncomePnl = monthTrades.reduce((s: number, t: any) => s + (t.pnl || 0), 0)
  const contentIncome = financeData.income.filter((e: any) => e.date?.startsWith(currentMonth2)).reduce((s: number, e: any) => s + (e.amount || 0), 0)
  const totalMonthIncome = tradingIncomePnl + contentIncome

  // ââ equity curve (from trade data) âââââââââââââââââââââââââââââââ
  const sortedTrades = [...allTrades].sort((a: any, b: any) => (a.date > b.date ? 1 : -1))
  const equityCurve: number[] = []
  let runningPnl = 0
  for (const t of sortedTrades) { runningPnl += (t.pnl || 0); equityCurve.push(runningPnl) }
  if (equityCurve.length === 0) { equityCurve.push(0, 0) }
  const maxEquity = Math.max(...equityCurve, 1)
  const minEquity = Math.min(...equityCurve, -1)
  const equityRange = maxEquity - minEquity || 1
  const svgW = 400, svgH = 80, pad = 8
  const pts = equityCurve.map((v, i) => {
    const x = pad + (i / (equityCurve.length - 1)) * (svgW - 2 * pad)
    const y = (svgH - pad) - ((v - minEquity) / equityRange) * (svgH - 2 * pad)
    return `${x},${y}`
  })
  const pathD = 'M' + pts.join(' L')
  const fillD = pathD + ` L${svgW - pad},${svgH - pad} L${pad},${svgH - pad} Z`
  const equityColor = equityCurve[equityCurve.length - 1] >= 0 ? 'var(--green)' : 'var(--red)'
  const equityFillId = 'equityFill'

  // ââ best/worst days âââââââââââââââââââââââââââââââââââââââââââââââ
  const dayPnlMap: Record<string, number> = {}
  for (const t of allTrades) { if (t.date) dayPnlMap[t.date] = (dayPnlMap[t.date] || 0) + (t.pnl || 0) }
  const dayPnlArr = Object.entries(dayPnlMap).map(([date, pnl]) => ({ date, pnl }))
  const topDays = [...dayPnlArr].sort((a, b) => b.pnl - a.pnl).slice(0, 3)
  const worstDays = [...dayPnlArr].sort((a, b) => a.pnl - b.pnl).slice(0, 3)

  // ââ habits data for Life OS âââââââââââââââââââââââââââââââââââââââ
  const habitsList2 = habitsData.habits
  const completions2 = habitsData.completions
  const today3 = getLocalDateString()
  const habitsWithPct = habitsList2.map((h: any) => {
    let done = 0, total = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      total++
      if (completions2[ds]?.[h.id]) done++
    }
    return { ...h, pct: Math.round((done / total) * 100) }
  })

  // ââ journal data âââââââââââââââââââââââââââââââââââââââââââââââââ
  const journalStreak = (() => {
    let streak = 0
    const d = new Date()
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if (journalTodaySaved && ds === today3) { streak++; d.setDate(d.getDate() - 1); continue }
      break
    }
    return streak
  })()
  const journalWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return { ds: d.toISOString().split('T')[0], label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()] }
  })

  // ââ health data ââââââââââââââââââââââââââââââââââââââââââââââââââ
  // We derive from stats text — actual data is not separately loaded, show placeholders
  const healthMetrics = [
    { label: 'SLEEP AVG', value: '—', unit: 'hrs', color: 'var(--brand)' },
    { label: 'ENERGY AVG', value: '—', unit: '/10', color: 'var(--green)' },
    { label: 'GYM DAYS', value: '—', unit: 'this wk', color: 'var(--purple)' },
  ]

  const tooltipTexts: Record<string, string> = {
    'NET P&L': 'Total profit or loss for the selected period after all fees.',
    'WIN RATE': 'Percentage of trades that closed in profit. Above 50% means more wins than losses.',
    'PROFIT FACTOR': 'Gross profit divided by gross loss. Above 1.0 is profitable. Above 2.0 is strong.',
    'AVG R:R': 'Average risk-to-reward per trade. 2.0 means you make \$2 for every \$1 risked.',
    'HABIT STREAK': 'Consecutive days where you completed all your habits. Protect this number.',
    'EDGE SCORE': 'Your trading edge from 0–100 based on Discipline, Consistency, Execution and Risk Control.',
    'TRADING ACTIVITY': 'Each cell is one trading day. Green = winning day. Red = losing day. Darker = bigger move.',
    'RECENT TRADES': 'Your last logged trades. Click View all to open the full Trading Journal.',
  }

  // ââ tooltipBtn helper âââââââââââââââââââââââââââââââââââââââââââââ
  const TooltipBtn = ({ id }: { id: string }) => (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === id ? null : id) }}
        style={{ width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginLeft: 6, flexShrink: 0 }}
      >i</button>
      {activeTooltip === id && (
        <div style={{ position: 'absolute', top: 22, left: 0, width: 220, background: '#0f1117', borderRadius: 8, padding: '10px 14px', zIndex: 200, fontSize: 11, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, border: '0.5px solid rgba(255,255,255,0.1)' }}>
          {tooltipTexts[id] || ''}
        </div>
      )}
    </div>
  )

  // ââ panel label style âââââââââââââââââââââââââââââââââââââââââââââ
  const panelLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font)' }}>
      {/* ââ TOPBAR ââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ height: 64, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 28px', position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Personal Command Center</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{todayLong}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', color: 'var(--brand)', fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={12} />{dateRangeStr}
          </button>
          <Link href="/life/trading?new=1" style={{ background: 'var(--brand)', color: '#ffffff', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 'var(--radius-md)', border: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />Log Trade
          </Link>
        </div>
      </div>

      {/* ââ SEARCH BAR ââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 28px' }}>
        <div
          onClick={() => setSearchOpen(true)}
          style={{ background: 'var(--bg-page)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'text', maxWidth: '100%' }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>Ask Coach Shai anything — trading, health, wealth, mindset, fitness plans...</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {['⌘', 'K'].map(k => (
              <span key={k} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{k}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ââ SEARCH OVERLAY ââââââââââââââââââââââââââââââââââââââ */}
      {searchOpen && (
        <div
          onClick={() => setSearchOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,23,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 600, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', maxWidth: '90vw' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input autoFocus placeholder="Ask Coach Shai anything..." style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-primary)', outline: 'none' }} onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)} />
            </div>
            <div style={{ padding: '12px 20px 20px' }}>
              {[
                { cat: 'Trading', items: ['What is my best trading pattern?', 'How can I improve my win rate?'] },
                { cat: 'Health & Fitness', items: ['Create a morning routine for traders', 'Best workout split for focus?'] },
                { cat: 'Mindset & Life', items: ['How do I overcome FOMO in trading?', 'Build a 90-day goal system'] },
              ].map(({ cat, items }) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>{cat}</div>
                  {items.map(item => (
                    <div key={item} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ââ CONTENT AREA ââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '20px 28px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 80 }}>

        {/* ââ Coach Shai new-brief banner ââ */}
        {newBriefAvailable && !briefVisible && (
          <button onClick={handleLoadNewBrief} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: 'var(--brand)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={12} />New brief from Coach Shai
          </button>
        )}

        {/* ââ Coach Shai Card ââ */}
        <div style={{ display: briefVisible || briefFading ? 'block' : 'none', opacity: briefFading ? 0 : 1, transition: 'opacity 0.3s ease', background: '#0f1117', borderLeft: '3px solid var(--brand)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>COACH SHAI · DAILY BRIEF</span>
              {brief && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{formatGeneratedAt(brief.generatedAt)}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button variant="ghost" onClick={handleRefresh} disabled={briefLoading} style={{ fontSize: 12, padding: '4px 10px', color: 'rgba(255,255,255,0.4)' }}>
                <RefreshCw size={12} style={{ animation: briefLoading ? 'spin 1s linear infinite' : 'none' }} />Refresh
              </Button>
              <button onClick={handleDismiss} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
          </div>
          {briefLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Coach Shai is reading your data...</span>
            </div>
          ) : briefNoData ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>Start logging your data and Coach Shai will brief you every morning.</p>
          ) : briefError ? (
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>Failed to load brief. Click Refresh to try again.</p>
          ) : brief ? (
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>{brief.text}</p>
              <span onClick={() => setIsExpanded(p => !p)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'inline-block', marginTop: 4 }}>{isExpanded ? 'Show less â' : 'Read more →'}</span>
            </div>
          ) : null}
        </div>

        {/* ââ 5 Stat Cards ââ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(5,minmax(0,1fr))', gap: 12 }}>
          {[
            { label: 'NET P&L', accent: '#60a5fa', value: netPnl !== 0 ? (netPnl >= 0 ? '+' : '') + '$' + Math.abs(netPnl).toLocaleString() : null, color: netPnl > 0 ? 'var(--green)' : netPnl < 0 ? 'var(--red)' : 'var(--text-primary)', sub: netPnl !== 0 ? 'month to date' : 'no trades yet' },
            { label: 'WIN RATE', accent: '#ef4444', value: winRate !== null ? winRate + '%' : null, color: winRate !== null && winRate >= 50 ? 'var(--green)' : winRate !== null ? 'var(--red)' : 'var(--text-primary)', sub: winRate !== null ? wins.length + 'W · ' + losses.length + 'L' : 'no trades yet' },
            { label: 'PROFIT FACTOR', accent: '#10b981', value: profitFactor !== null ? String(profitFactor) : null, color: 'var(--green)', sub: profitFactor !== null ? 'gross W/L ratio' : 'no trades yet' },
            { label: 'AVG R:R', accent: '#a78bfa', value: avgRR !== null ? String(avgRR) : null, color: 'var(--purple)', sub: avgRR !== null ? 'risk to reward' : 'no trades yet' },
            { label: 'HABIT STREAK', accent: '#60a5fa', value: habitStreakNum > 0 ? habitStreakNum + 'd' : null, color: 'var(--brand)', sub: habitStreakNum > 0 ? 'consecutive days' : 'start a habit' },
          ].map((card) => (
            <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: `3px solid ${card.accent}`, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
              <div style={{ ...panelLabel, marginBottom: 8, fontSize: 11, letterSpacing: '0.06em', position: 'relative' }}>
                {card.label}<TooltipBtn id={card.label} />
              </div>
              <div style={{ fontSize: card.value ? 24 : 28, fontWeight: card.value ? 700 : 300, color: card.value ? card.color : 'var(--text-empty)', lineHeight: 1.1 }}>
                {card.value || '—'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: card.value ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ââ Three Column Row ââ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.05fr) minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>

          {/* Edge Score */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 12, position: 'relative' }}>Edge Score<TooltipBtn id="EDGE SCORE" /></div>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalEdgeScore !== null ? totalEdgeScore : '—'}</span>
                {totalEdgeScore !== null && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>}
              </div>
              <div style={{ marginTop: 6 }}>
                {totalEdgeScore !== null ? (
                  <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{totalEdgeScore >= 80 ? 'Elite' : totalEdgeScore >= 65 ? 'Sharp' : totalEdgeScore >= 50 ? 'Developing' : 'Beginner'}</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No review yet</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pillars.map((p) => (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{p.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{p.score !== null ? p.score : '—'}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-page)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: p.score !== null ? p.score + '%' : '0%', background: p.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trading Activity + Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ ...panelLabel, marginBottom: 12, position: 'relative' }}>Trading Activity<TooltipBtn id="TRADING ACTIVITY" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(['Mon','Tue','Wed','Thu','Fri'] as const).map((dayLabel, dayIdx) => (
                  <div key={dayLabel} style={{ display: 'grid', gridTemplateColumns: '28px repeat(6,1fr)', gap: 2, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{dayLabel}</span>
                    {heatmapWeeks.map((week, wi) => {
                      const cell = week[dayIdx]
                      if (!cell) return null
                      return <div key={wi} title={cell.date + (cell.pnl !== null ? ': $' + cell.pnl.toFixed(0) : '')} style={{ height: 11, borderRadius: 2, background: heatmapColor(cell) }} />
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                {[['Win','#bbf7d0','#16a34a'],['Loss','#fecaca','#dc2626'],['None','var(--border)','var(--border)']].map(([label, bg, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: bg }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={panelLabel}>Daily Checklist</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{checkedCount}/{checklistItems.length}</span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-page)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (checkedCount / checklistItems.length * 100) + '%', background: 'var(--brand)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklistItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => { const n = [...checkedItems]; n[i] = !n[i]; setCheckedItems(n) }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${checkedItems[i] ? 'var(--brand)' : 'var(--border)'}`, background: checkedItems[i] ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {checkedItems[i] && <Check size={9} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', textDecoration: checkedItems[i] ? 'line-through' : 'none', opacity: checkedItems[i] ? 0.5 : 1 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Trades + Income */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ ...panelLabel, position: 'relative' }}>Recent Trades<TooltipBtn id="RECENT TRADES" /></div>
                <Link href="/life/trading" style={{ fontSize: 11, color: 'var(--brand)' }}>View all</Link>
              </div>
              {recentTrades.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Date','Symbol','Side','P&L'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', paddingRight: 8 }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {recentTrades.map((t: any, i: number) => {
                      const tp = t.pnl || 0
                      return (
                        <tr key={i}>
                          <td style={{ padding: '6px 8px 6px 0', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{t.date}</td>
                          <td style={{ padding: '6px 8px 6px 0' }}><span style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{t.symbol || '—'}</span></td>
                          <td style={{ padding: '6px 8px 6px 0', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{t.side || t.direction || '—'}</td>
                          <td style={{ padding: '6px 0', fontSize: 12, fontWeight: 700, color: tp > 0 ? 'var(--green)' : tp < 0 ? 'var(--red)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>{tp !== 0 ? (tp > 0 ? '+' : '') + '$' + Math.abs(tp).toLocaleString() : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No trades logged yet</div>
              )}
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ ...panelLabel, marginBottom: 12 }}>Income This Month</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginBottom: 14 }}>{totalMonthIncome !== 0 ? '$' + totalMonthIncome.toLocaleString() : '—'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Trading', value: tradingIncomePnl !== 0 ? (tradingIncomePnl >= 0 ? '+' : '') + '$' + Math.abs(tradingIncomePnl).toLocaleString() : '—', color: tradingIncomePnl >= 0 ? 'var(--green)' : 'var(--red)' },
                  { label: 'Content', value: contentIncome > 0 ? '$' + contentIncome.toLocaleString() : '—', color: 'var(--text-primary)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ââ Section Divider: Performance ââ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Performance</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ââ Performance: Equity Curve + Best/Worst Days ââ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,2fr) minmax(0,1fr)', gap: 14 }}>
          {/* Equity Curve */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 16 }}>Equity Curve</div>
            <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', borderRadius: 4 }}>
              <defs>
                <linearGradient id={equityFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={equityCurve[equityCurve.length - 1] >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={equityCurve[equityCurve.length - 1] >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={fillD} fill={`url(#${equityFillId})`} />
              <path d={pathD} fill="none" stroke={equityColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>start of period</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: equityColor }}>{netPnl !== 0 ? (netPnl >= 0 ? '+' : '') + '$' + Math.abs(netPnl).toLocaleString() : '$0'}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>today</span>
            </div>
          </div>

          {/* Best & Worst Days */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 14 }}>Best & Worst Days</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Top Days', data: topDays, color: 'var(--green)' },
                { label: 'Worst Days', data: worstDays, color: 'var(--red)' },
              ].map(({ label, data, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: 8 }}>{label}</div>
                  {data.length > 0 ? data.map(({ date, pnl }) => (
                    <div key={date} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{(pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toLocaleString()}</span>
                    </div>
                  )) : (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No trades yet</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ââ Section Divider: Life OS ââ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Life OS</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ââ Life OS: 4 columns ââ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: 14 }}>

          {/* Habits */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Habits</span>
              <Link href="/life/habits" style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.5px', textDecoration: 'none' }}>View all</Link>
            </div>
            {habitsWithPct.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {habitsWithPct.slice(0, 5).map((h: any) => {
                  console.log('[habits panel] habit object:', h)
                  const displayName = h.name
                  return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{displayName}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{h.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-page)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: h.pct + '%', background: h.pct >= 70 ? 'var(--green)' : h.pct >= 40 ? 'var(--amber)' : 'var(--red)', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No habits tracked yet</div>
            )}
          </div>

          {/* Goals */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 14 }}>Goals</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No goals yet</div>
          </div>

          {/* Journal Streak */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 14 }}>Journal Streak</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{journalStreak}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}> days</span></div>
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
              {journalWeek.map(({ ds, label }) => {
                const done = ds === today3 ? journalTodaySaved : false
                return (
                  <div key={ds} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 4, background: done ? '#dcfce7' : 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: done ? '#16a34a' : 'var(--text-muted)' }}>
                      {done ? 'â' : '·'}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Health */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...panelLabel, marginBottom: 14 }}>Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 12 }}>
              {healthMetrics.map(m => (
                <div key={m.label} style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>Log your health data in the Health section to unlock Coach Shai insights.</p>
          </div>
        </div>

        {/* ââ Footer ââ */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0 40px' }}>
          {'// ALL DATA STORED IN UPSTASH REDIS · AI POWERED BY CLAUDE HAIKU'}
        </div>
      </div>

      {/* ââ CHAT WIDGET âââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
        {chatOpen && (
          <div style={{ width: 320, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <div style={{ background: '#0f1117', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>S</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Coach Shai</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Always here</span>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {(['coach','support'] as const).map(tab => (
                <button key={tab} onClick={() => setChatTab(tab)} style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: chatTab === tab ? 'var(--brand)' : 'var(--text-muted)', borderBottom: chatTab === tab ? '2px solid var(--brand)' : '2px solid transparent', textTransform: 'capitalize' }}>
                  {tab === 'coach' ? 'Coach Shai' : 'Support'}
                </button>
              ))}
            </div>

            {chatTab === 'coach' ? (
              <>
                <div style={{ height: 200, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: m.role === 'ai' ? '4px 10px 10px 10px' : '10px 4px 10px 10px', background: m.role === 'ai' ? 'var(--bg-page)' : 'var(--brand)', color: m.role === 'ai' ? 'var(--text-primary)' : '#fff', fontSize: 12, lineHeight: 1.5 }}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) { setChatMessages(prev => [...prev, { role: 'user', text: chatInput.trim() }]); setChatInput('') } }} placeholder="Ask anything..." style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }} />
                  <button onClick={() => { if (chatInput.trim()) { setChatMessages(prev => [...prev, { role: 'user', text: chatInput.trim() }]); setChatInput('') } }} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--brand)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Send size={13} color="#fff" /></button>
                </div>
              </>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>AI handles technical questions instantly. Billing routes to Shai.</p>
                <input value={supportName} onChange={e => setSupportName(e.target.value)} placeholder="Name" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }} />
                <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="Email" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }} />
                <textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Message..." rows={3} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} />
                <button style={{ background: '#0f1117', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Submit</button>
              </div>
            )}

            {/* Hide chat bar */}
            <div onClick={() => setChatOpen(false)} style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px', cursor: 'pointer', borderTop: '1px solid var(--border)' }}>Hide chat</div>
          </div>
        )}
        {/* Bubble */}
        <button onClick={() => setChatOpen(p => !p)} style={{ width: 52, height: 52, borderRadius: '50%', background: '#0f1117', border: '2px solid var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }}>
          <MessageCircle size={22} color="var(--brand)" />
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
