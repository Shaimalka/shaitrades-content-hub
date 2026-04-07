'use client'
// v8 - Professional Trading Journal — Tradezella-style Dashboard
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import {
  Plus, Trash2, Flame, RefreshCw, Loader2, CheckCircle, XCircle,
  Settings, ChevronLeft, ChevronRight, Pencil, BarChart2, TrendingUp,
  ChevronDown, Building2
} from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link' 
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import StatCard from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'

type Trade = {
  id: string; date: string; direction: 'Long' | 'Short'
  entryPrice: number; exitPrice: number; contracts: number
  pnl: number; notes: string; emotion: number; time?: string
  source?: string; accountName?: string; symbol?: string
  playbookId?: string | null; accountType?: 'live' | 'propfirm' | 'paper'
  stopLoss?: number; takeProfit?: number
}
type Playbook = { id: string; name: string; description: string; createdAt: string }
type CoachInsight = { text: string; visible: boolean; fading: boolean }

const EMOTIONS = ['😰', '😟', '😐', '🙂', '🚀']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ACCOUNT_TYPES = [
  { value: 'live', label: 'Live Account (Tradovate)' },
  { value: 'propfirm', label: 'Prop Firm (APEX/Topstep/FTMO)' },
  { value: 'paper', label: 'Paper Trading (Manual)' },
]

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

function EmptyState({ icon: Icon, heading, subtext }: { icon: React.ElementType; heading: string; subtext: string }) {
  const { isDark } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
)

function CoachShaiCard({ insight, isDark }: { insight: CoachInsight; isDark: boolean }) {
  const [progress, setProgress] = useState(100)
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  useEffect(() => {
    if (!insight.visible) return
    setProgress(100)
    const start = Date.now()
    const duration = 15000
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (elapsed >= duration) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [insight.text, insight.visible])
  if (!insight.visible) return null
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderLeft: '3px solid #2563eb', borderRadius: 10, padding: '16px 20px 0 20px', marginBottom: 16, opacity: insight.fading ? 0 : 1, transition: 'opacity 2s ease', overflow: 'hidden' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#2563eb', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>⚡ COACH SHAI</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textPrimary, lineHeight: 1.7, marginBottom: 12 }}>{insight.text}</p>
      <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 1 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb', borderRadius: 1, transition: 'width 0.1s linear' }} />
      </div>
    </div>
  )
}

function TradovateStatusBar({ onSyncComplete }: { onSyncComplete: () => void }) {
  const { isDark } = useTheme()
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  useEffect(() => {
    fetch('/api/tradovate/status')
      .then(r => r.json())
      .then((d: { connected: boolean; lastSync: string | null }) => setStatus(d))
      .catch(() => setStatus({ connected: false, lastSync: null }))
  }, [])
  async function handleSync() {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncMsg(`✓ ${data.imported} new trades imported`)
      setStatus({ connected: true, lastSync: new Date().toISOString() })
      onSyncComplete()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setSyncMsg(`⚠ ${msg}`)
    } finally { setSyncing(false) }
  }
  if (!status) return null
  if (!status.connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <XCircle size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f59e0b' }}>Tradovate not connected — manual logging available for all account types</span>
        <Link href="/life/trading/settings" style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>Connect →</Link>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}>
      <CheckCircle size={12} style={{ color: '#00c48c', flexShrink: 0 }} />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00c48c' }}>Tradovate Connected</span>
      {status.lastSync && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted }}>· Last: {new Date(status.lastSync).toLocaleString()}</span>}
      {syncMsg && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: syncMsg.startsWith('✓') ? '#00c48c' : '#ff4d6a' }}>{syncMsg}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={10} />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <Link href="/life/trading/settings" style={{ color: textMuted, opacity: 0.6 }} title="Settings"><Settings size={12} /></Link>
      </div>
    </div>
  )
}

// Performance Radar Chart
function PerformanceRadar({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1
  const profitFactor = Math.min((avgWin / avgLoss) * 20, 100)
  // Consistency: lower std dev is better
  const pnls = trades.map(t => t.pnl)
  const mean = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0
  const variance = pnls.length > 0 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / pnls.length : 1
  const stdDev = Math.sqrt(variance)
  const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (Math.abs(mean) + 1)) * 10))
  // Drawdown: fewer losing streaks = better
  let maxDrawdown = 0; let current = 0
  for (const t of trades) { if (t.pnl < 0) { current += Math.abs(t.pnl); if (current > maxDrawdown) maxDrawdown = current } else current = 0 }
  const drawdownScore = Math.max(0, 100 - (maxDrawdown / (Math.max(...trades.map(t => t.pnl), 1)) * 20))
  const rrRatio = avgLoss > 0 ? Math.min((avgWin / avgLoss) * 25, 100) : 50

  const data = [
    { subject: 'Win Rate', value: Math.round(winRate), fullMark: 100 },
    { subject: 'Prof Factor', value: Math.min(Math.round(profitFactor), 100), fullMark: 100 },
    { subject: 'Consistency', value: Math.round(consistency), fullMark: 100 },
    { subject: 'Avg Win', value: Math.min(Math.round((avgWin / 500) * 100), 100), fullMark: 100 },
    { subject: 'Drawdown', value: Math.round(drawdownScore), fullMark: 100 },
    { subject: 'R:R Ratio', value: Math.round(rrRatio), fullMark: 100 },
  ]

  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'

  if (trades.length === 0) return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>PERFORMANCE SCORE</p>
      <EmptyState icon={BarChart2} heading="NO DATA" subtext="Log trades to see your radar" />
    </div>
  )

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>PERFORMANCE SCORE</p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
        {data.map(d => (
          <div key={d.subject} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: d.value >= 60 ? '#00c48c' : d.value >= 40 ? '#f59e0b' : '#ff4d6a' }}>{d.value}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.subject}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Trading Heatmap — GitHub-style contribution grid
function TradingHeatmap({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'

  // Build last 52 weeks of data
  const today = new Date()
  const weeks: { date: string; pnl: number }[][] = []
  let week: { date: string; pnl: number }[] = []

  // Pad to start on Sunday
  const dayOfWeek = today.getDay()
  for (let d = 364; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(today.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    const tradePnl = trades.filter(t => t.date === dateStr).reduce((s, t) => s + t.pnl, 0)
    week.push({ date: dateStr, pnl: tradePnl })
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push(week)

  const maxPnl = Math.max(...trades.map(t => t.pnl), 1)

  function getCellColor(pnl: number) {
    if (pnl === 0) return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
    if (pnl > 0) {
      const intensity = Math.min(pnl / maxPnl, 1)
      return `rgba(0,196,140,${0.15 + intensity * 0.75})`
    }
    const intensity = Math.min(Math.abs(pnl) / maxPnl, 1)
    return `rgba(255,77,106,${0.15 + intensity * 0.75})`
  }

  const weekLabels = ['S','M','T','W','T','F','S']
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((wk, wi) => {
    const m = new Date(wk[0].date).getMonth()
    if (m !== lastMonth) { monthLabels.push({ label: MONTH_NAMES[m].slice(0,3), col: wi }); lastMonth = m }
  })

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>TRADING ACTIVITY</p>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `20px repeat(${weeks.length}, 1fr)`, gap: 2, minWidth: 400 }}>
          {/* Day labels */}
          <div />
          {weeks.map((_, wi) => (
            <div key={wi} style={{ position: 'relative' }}>
              {monthLabels.find(ml => ml.col === wi) && (
                <span style={{ position: 'absolute', top: -16, left: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, whiteSpace: 'nowrap' }}>
                  {monthLabels.find(ml => ml.col === wi)?.label}
                </span>
              )}
            </div>
          ))}
          {/* Grid */}
          {weekLabels.map((label, di) => (
            <React.Fragment key={di}>
              <div key={`label-${di}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: di % 2 === 1 ? textMuted : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
              {weeks.map((wk, wi) => {
                const cell = wk[di]
                if (!cell) return <div key={`empty-${wi}-${di}`} />
                return (
                  <div
                    key={`${wi}-${di}`}
                    title={`${cell.date}: ${cell.pnl !== 0 ? (cell.pnl > 0 ? '+' : '') + cell.pnl.toFixed(2) : 'No trades'}`}
                    style={{ width: '100%', paddingBottom: '100%', borderRadius: 2, background: getCellColor(cell.pnl), cursor: cell.pnl !== 0 ? 'pointer' : 'default', transition: 'opacity 0.1s' }}
                  />
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: i === 0 ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)') : `rgba(0,196,140,${0.15 + i * 0.75})` }} />
        ))}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted }}>More</span>
      </div>
    </div>
  )
}

// Weekly Breakdown Panel
function WeeklyBreakdown({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  // Get current month's weeks
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Split month into 4 weeks
  const weeks: { weekNum: number; startStr: string; endStr: string; pnl: number; trades: number; days: number }[] = []
  let weekStart = new Date(firstDay)
  let weekNum = 1
  while (weekStart <= lastDay && weekNum <= 5) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime())
    const startStr = weekStart.toISOString().split('T')[0]
    const endStr = weekEnd.toISOString().split('T')[0]
    const weekTrades = trades.filter(t => t.date >= startStr && t.date <= endStr)
    const pnl = weekTrades.reduce((s, t) => s + t.pnl, 0)
    const uniqueDays = new Set(weekTrades.map(t => t.date)).size
    weeks.push({ weekNum, startStr, endStr, pnl, trades: weekTrades.length, days: uniqueDays })
    weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() + 1)
    weekNum++
  }

  const totalMonthPnl = weeks.reduce((s, w) => s + w.pnl, 0)

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>WEEKLY BREAKDOWN</p>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: totalMonthPnl >= 0 ? '#00c48c' : '#ff4d6a' }}>
          {totalMonthPnl >= 0 ? '+' : ''}${totalMonthPnl.toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {weeks.filter(w => w.trades > 0 || w.weekNum <= 4).map(week => (
          <div key={week.weekNum} style={{ padding: '12px 14px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: textPrimary }}>Week {week.weekNum}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: week.pnl > 0 ? '#00c48c' : week.pnl < 0 ? '#ff4d6a' : textMuted }}>
                {week.pnl !== 0 ? (week.pnl > 0 ? '+' : '') + '$' + week.pnl.toFixed(2) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textSecondary }}>{week.trades} trades</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted }}>{week.days} day{week.days !== 1 ? 's' : ''}</span>
            </div>
            {week.trades > 0 && (
              <div style={{ marginTop: 8, height: 3, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${Math.min(Math.abs(week.pnl) / (Math.max(...weeks.map(w => Math.abs(w.pnl)), 1)) * 100, 100)}%`, background: week.pnl >= 0 ? '#00c48c' : '#ff4d6a', borderRadius: 2 }} />
              </div>
            )}
          </div>
        ))}
        {weeks.every(w => w.trades === 0) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted }}>No trades this month</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Equity Curve Chart
function EquityCurve({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'

  const sortedTrades = [...trades].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return (a.time || '').localeCompare(b.time || '')
  })

  let cumulative = 0
  const data = sortedTrades.map((trade, i) => {
    cumulative += trade.pnl
    return {
      index: i + 1,
      label: trade.date,
      cumPnl: Math.round(cumulative * 100) / 100,
      pnl: trade.pnl,
    }
  })

  if (data.length === 0) return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>EQUITY CURVE</p>
      <EmptyState icon={TrendingUp} heading="NO TRADES YET" subtext="Your equity curve will appear here as you log trades." />
    </div>
  )

  const totalPnl = data[data.length - 1]?.cumPnl ?? 0
  const lineColor = totalPnl >= 0 ? '#00c48c' : '#ff4d6a'

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>EQUITY CURVE</p>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: totalPnl >= 0 ? '#00c48c' : '#ff4d6a' }}>
          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="label" tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, color: textPrimary }}
            formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cumulative P&L']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <ReferenceLine y={0} stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="cumPnl" stroke={lineColor} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: lineColor }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Compact Trading Calendar Component
function TradingCalendar({ trades, isMobile, isDark }: { trades: Trade[]; isMobile: boolean; isDark: boolean }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const todayStr = today.toISOString().split('T')[0]
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  const dayMap = useMemo(() => {
    const map: Record<string, { pnl: number; trades: Trade[] }> = {}
    for (const trade of trades) {
      if (!map[trade.date]) map[trade.date] = { pnl: 0, trades: [] }
      map[trade.date].pnl += trade.pnl
      map[trade.date].trades.push(trade)
    }
    return map
  }, [trades])

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const monthTrades = trades.filter(t => t.date.startsWith(monthStr))
  const monthPnl = monthTrades.reduce((s, t) => s + t.pnl, 0)
  const monthWins = monthTrades.filter(t => t.pnl > 0)
  const monthWinRate = monthTrades.length > 0 ? ((monthWins.length / monthTrades.length) * 100).toFixed(0) : '0'

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [currentMonth, currentYear])

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }

  const selectedTrades = selectedDay ? (dayMap[selectedDay]?.trades || []) : []

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#2563eb', cursor: 'pointer' }}>
          <ChevronLeft size={13} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: textPrimary, margin: 0 }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted }}>{monthTrades.length} trades</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted }}>{monthWinRate}% WR</span>
            {monthPnl !== 0 && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: monthPnl > 0 ? '#00c48c' : '#ff4d6a' }}>
                {monthPnl > 0 ? '+' : ''}${monthPnl.toFixed(0)}
              </span>
            )}
          </div>
        </div>
        <button onClick={nextMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#2563eb', cursor: 'pointer' }}>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, padding: '3px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: 50, borderRadius: 5 }} />
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayData = dayMap[dateStr]
          const isToday = dateStr === todayStr
          const isSelected = selectedDay === dateStr
          const hasTrades = !!dayData
          const pnl = dayData?.pnl ?? 0
          const isGreen = hasTrades && pnl > 0
          const isRed = hasTrades && pnl < 0
          let bg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
          let cellBorder = `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`
          let pnlColor = 'transparent'
          if (isGreen) { bg = 'rgba(0,196,140,0.1)'; cellBorder = '1px solid rgba(0,196,140,0.3)'; pnlColor = '#00c48c' }
          if (isRed) { bg = 'rgba(255,77,106,0.1)'; cellBorder = '1px solid rgba(255,77,106,0.3)'; pnlColor = '#ff4d6a' }
          const boxShadow = isToday ? '0 0 0 2px #2563eb' : isSelected ? '0 0 0 2px rgba(37,99,235,0.5)' : undefined
          return (
            <div key={dateStr} onClick={() => { if (hasTrades) setSelectedDay(prev => prev === dateStr ? null : dateStr) }}
              style={{ minHeight: 50, borderRadius: 5, background: bg, border: cellBorder, boxShadow, cursor: hasTrades ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3px 2px', transition: 'box-shadow 0.15s ease' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: isToday ? '#2563eb' : hasTrades ? textPrimary : textMuted }}>{day}</span>
              {hasTrades && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, marginTop: 1, color: pnlColor, lineHeight: 1 }}>{pnl > 0 ? '+' : ''}{pnl.toFixed(0)}</span>}
            </div>
          )
        })}
      </div>

      {/* Selected day trades */}
      {selectedDay && selectedTrades.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Trades — {selectedDay}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedTrades.map(trade => (
              <div key={trade.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: trade.pnl >= 0 ? 'rgba(0,196,140,0.06)' : 'rgba(255,77,106,0.06)', border: `1px solid ${trade.pnl >= 0 ? 'rgba(0,196,140,0.2)' : 'rgba(255,77,106,0.2)'}` }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 5px', borderRadius: 3, color: trade.direction === 'Long' ? '#2563eb' : '#ff4d6a', background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)', flexShrink: 0 }}>{trade.direction}</span>
                {trade.symbol && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: textPrimary, flexShrink: 0 }}>{trade.symbol}</span>}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, flexShrink: 0 }}>{trade.time || '--:--'}</span>
                {trade.notes && <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textMuted }}>{trade.notes}</span>}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, marginLeft: 'auto', flexShrink: 0, color: trade.pnl >= 0 ? '#00c48c' : '#ff4d6a' }}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</span>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{EMOTIONS[(trade.emotion || 3) - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TradingJournalInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const searchParams = useSearchParams()
  const [trades, setTrades] = useState<Trade[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [coachInsight, setCoachInsight] = useState<CoachInsight>({ text: '', visible: false, fading: false })
  const insightTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastInsightTime = useRef<number>(0)
  const COOLDOWN_MS = 5 * 60 * 1000

  const bg = isDark ? '#0a0a0f' : '#f8f9fc'
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const inputBg = isDark ? '#1a1a24' : '#f8f9fc'

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    direction: 'Long' as 'Long' | 'Short',
    entryPrice: '', exitPrice: '', contracts: '',
    notes: '', emotion: 3, playbookId: '', symbol: '',
    stopLoss: '', takeProfit: '',
    accountType: 'live' as 'live' | 'propfirm' | 'paper',
  }
  const [form, setForm] = useState(emptyForm)

  function loadTrades() {
    fetch('/api/life/trading').then(r => r.json()).then((d: { logs: Trade[] }) => {
      setTrades(d.logs || []); setLoading(false)
    }).catch(() => setLoading(false))
  }
  function loadPlaybooks() {
    fetch('/api/life/trading/playbook').then(r => r.json()).then((d: { playbooks: Playbook[] }) => {
      setPlaybooks(d.playbooks || [])
    }).catch(() => setPlaybooks([]))
  }

  useEffect(() => { loadTrades(); loadPlaybooks() }, [])
  useEffect(() => {
    return () => {
      if (insightTimerRef.current) clearTimeout(insightTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  // Get unique account names for selector
  const accountNames = useMemo(() => {
    const names = new Set(trades.map(t => t.accountName).filter(Boolean))
    return Array.from(names) as string[]
  }, [trades])

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (selectedAccount === 'all') return trades
    return trades.filter(t => t.accountName === selectedAccount)
  }, [trades, selectedAccount])

  function startEdit(trade: Trade) {
    setEditingId(trade.id)
    setForm({
      date: trade.date, time: trade.time || '', direction: trade.direction,
      entryPrice: String(trade.entryPrice), exitPrice: String(trade.exitPrice),
      contracts: String(trade.contracts), notes: trade.notes || '',
      emotion: trade.emotion || 3, playbookId: trade.playbookId || '',
      symbol: trade.symbol || '', stopLoss: '', takeProfit: '',
      accountType: trade.accountType || 'live',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancelEdit() { setEditingId(null); setForm(emptyForm); setShowForm(false) }

  async function triggerCoachInsight(trade: Trade) {
    const now = Date.now()
    if (now - lastInsightTime.current < COOLDOWN_MS) return
    lastInsightTime.current = now
    if (insightTimerRef.current) clearTimeout(insightTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setCoachInsight({ text: 'Coach Shai is watching...', visible: true, fading: false })
    try {
      const res = await fetch('/api/life/trading/coach-insight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade })
      })
      const data = await res.json()
      const insightText = data.insight || 'Keep grinding. Every trade is data.'
      setCoachInsight({ text: insightText, visible: true, fading: false })
      fadeTimerRef.current = setTimeout(() => setCoachInsight(prev => ({ ...prev, fading: true })), 13000)
      insightTimerRef.current = setTimeout(() => setCoachInsight({ text: '', visible: false, fading: false }), 15000)
    } catch {
      setCoachInsight({ text: 'Stay sharp. Log the next one.', visible: true, fading: false })
      fadeTimerRef.current = setTimeout(() => setCoachInsight(prev => ({ ...prev, fading: true })), 13000)
      insightTimerRef.current = setTimeout(() => setCoachInsight({ text: '', visible: false, fading: false }), 15000)
    }
  }

  async function submitTrade(e: React.FormEvent) {
    e.preventDefault()
    const fields = {
      date: form.date, time: form.time, direction: form.direction,
      entryPrice: parseFloat(form.entryPrice), exitPrice: parseFloat(form.exitPrice),
      contracts: parseFloat(form.contracts), notes: form.notes,
      emotion: form.emotion, playbookId: form.playbookId || null,
      symbol: form.symbol || undefined, accountType: form.accountType,
    }
    if (editingId) {
      const res = await fetch('/api/life/trading', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...fields })
      })
      const data = await res.json()
      if (res.ok) { setTrades(data.logs || []); cancelEdit() }
    } else {
      const res = await fetch('/api/life/trading', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: fields })
      })
      const data = await res.json()
      const savedLogs: Trade[] = data.logs || []
      setTrades(savedLogs); setShowForm(false); setForm(emptyForm)
      if (res.ok) {
        const savedTrade = savedLogs[savedLogs.length - 1]
        if (savedTrade) triggerCoachInsight(savedTrade)
      }
    }
  }

  async function deleteTrade(id: string) {
    const confirmed = window.confirm('Delete this trade? This cannot be undone.')
    if (!confirmed) return
    const res = await fetch('/api/life/trading', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', entry: { id } })
    })
    const data = await res.json()
    setTrades(data.logs || [])
  }

  // Stats calculations
  const totalPnl = filteredTrades.reduce((s, t) => s + t.pnl, 0)
  const wins = filteredTrades.filter(t => t.pnl > 0)
  const losses = filteredTrades.filter(t => t.pnl < 0)
  const winRate = filteredTrades.length > 0 ? ((wins.length / filteredTrades.length) * 100).toFixed(1) : '0'
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'
  const avgRR = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'

  const sortedDates = Array.from(new Set(filteredTrades.map(t => t.date))).sort().reverse()
  let streak = 0
  for (const d of sortedDates) {
    const dayPnl = filteredTrades.filter(t => t.date === d).reduce((s, t) => s + t.pnl, 0)
    if (dayPnl > 0) streak++; else break
  }

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0]
  const todayTrades = filteredTrades.filter(t => t.date === todayStr)
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)
  const todayWins = todayTrades.filter(t => t.pnl > 0)
  const todayWR = todayTrades.length > 0 ? ((todayWins.length / todayTrades.length) * 100).toFixed(0) : '—'

  const winRateNum = parseFloat(winRate)
  const winRateColor = winRateNum > 50 ? '#00c48c' : winRateNum < 50 ? '#ff4d6a' : textPrimary
  const pnlColor = totalPnl > 0 ? '#00c48c' : totalPnl < 0 ? '#ff4d6a' : textPrimary

  const inputStyle: React.CSSProperties = {
    width: '100%', background: inputBg, border: `1px solid ${border}`,
    borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter, sans-serif',
    fontSize: 13, color: textPrimary, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .trade-row:hover .trade-actions { opacity: 1 !important; }
        .stat-card-hover:hover { transform: translateY(-1px); transition: transform 0.15s ease; }
      `}} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '24px 24px' }}>

        {/* ===== PAGE HEADER ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link href='/life' style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#2563eb', textDecoration: 'none', display: 'block', marginBottom: 2 }}>← Life Hub</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 20 : 24, fontWeight: 700, color: textPrimary, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Trading Journal</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textSecondary, margin: 0 }}>Track, analyze, and improve your trading edge.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Account Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                style={{ appearance: 'none', background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 28px 8px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All Accounts</option>
                {accountNames.map(name => <option key={name} value={name}>{name}</option>)}
                <option value="live">Live (Tradovate)</option>
                <option value="propfirm">Prop Firm</option>
                <option value="paper">Paper Trading</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
            </div>
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00c48c' }}>
                <Flame size={11} /> {streak}d streak
              </div>
            )}
            <Link href='/life/trading/playbook' style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Playbook</Link>
            <Link href='/life/trading/settings' style={{ padding: '7px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: textMuted, fontFamily: 'Inter, sans-serif', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings size={12} /> Settings
            </Link>
            <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Log Trade
            </Button>
          </div>
        </div>

        {/* ===== TODAY'S STATS BAR ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderRadius: 8, background: surface, border: `1px solid ${border}`, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>{todayTrades.length} trades</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>{todayWR !== '—' ? todayWR + '% WR' : '—'}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: todayPnl > 0 ? '#00c48c' : todayPnl < 0 ? '#ff4d6a' : textMuted }}>
            {todayTrades.length > 0 ? (todayPnl > 0 ? '+' : '') + '$' + todayPnl.toFixed(2) : 'No trades today'}
          </span>
        </div>

        {/* ===== TRADOVATE STATUS BAR ===== */}
        <TradovateStatusBar onSyncComplete={loadTrades} />

        {/* ===== 5 STAT CARDS ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label='TOTAL TRADES' value={filteredTrades.length} />
          <StatCard label='WIN RATE' value={winRate + '%'} style={{ color: winRateColor }} />
          <StatCard label='NET P&L' value={'$' + totalPnl.toFixed(2)} style={{ color: pnlColor }} />
          <StatCard label='PROFIT FACTOR' value={profitFactor} />
          <StatCard label='AVG R:R' value={avgRR} />
        </div>

        {/* ===== 3-COLUMN ANALYTICS ROW ===== */}
        {!isMobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '40% 35% 25%', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
            <PerformanceRadar trades={filteredTrades} isDark={isDark} />
            <TradingHeatmap trades={filteredTrades} isDark={isDark} />
            <WeeklyBreakdown trades={filteredTrades} isDark={isDark} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <PerformanceRadar trades={filteredTrades} isDark={isDark} />
            <TradingHeatmap trades={filteredTrades} isDark={isDark} />
            <WeeklyBreakdown trades={filteredTrades} isDark={isDark} />
          </div>
        )}

        {/* ===== EQUITY CURVE ===== */}
        <EquityCurve trades={filteredTrades} isDark={isDark} />

        {/* ===== CALENDAR ===== */}
        <TradingCalendar trades={filteredTrades} isMobile={isMobile} isDark={isDark} />

        {/* ===== TRADE FORM (always accessible) ===== */}
        {showForm && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 24, marginBottom: 24, animation: 'slideDown 0.2s ease', ...(editingId ? { boxShadow: '0 0 0 2px #2563eb' } : { borderColor: '#2563eb', borderWidth: 1 }) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#2563eb', margin: 0, letterSpacing: '0.1em' }}>
                {editingId ? '// EDIT TRADE' : '// NEW TRADE ENTRY'}
              </h3>
              {/* Prop Firm Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} style={{ color: textMuted }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted }}>Manual logging — all account types supported</span>
              </div>
            </div>
            <form onSubmit={submitTrade} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              {/* Account Type */}
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>ACCOUNT TYPE</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ACCOUNT_TYPES.map(at => (
                    <button key={at.value} type="button" onClick={() => setForm(f => ({ ...f, accountType: at.value as 'live' | 'propfirm' | 'paper' }))}
                      style={{ padding: '6px 14px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, cursor: 'pointer', border: `1px solid ${form.accountType === at.value ? '#2563eb' : border}`, background: form.accountType === at.value ? 'rgba(37,99,235,0.1)' : inputBg, color: form.accountType === at.value ? '#2563eb' : textMuted, transition: 'all 0.15s' }}>
                      {at.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>DATE</label>
                <input type='date' value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>TIME</label>
                <input type='time' value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>DIRECTION</label>
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
                  {(['Long', 'Short'] as const).map(dir => (
                    <button key={dir} type='button' onClick={() => setForm(f => ({ ...f, direction: dir }))}
                      style={{ flex: 1, padding: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.direction === dir ? '#2563eb' : inputBg, color: form.direction === dir ? '#ffffff' : textMuted, transition: 'all 0.15s' }}>{dir}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>SYMBOL</label>
                <input type='text' value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder='NQ, ES, AAPL...' style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>CONTRACTS / SHARES</label>
                <input type='number' step='0.01' value={form.contracts} onChange={e => setForm(f => ({ ...f, contracts: e.target.value }))} placeholder='1' required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>ENTRY PRICE</label>
                <input type='number' step='0.01' value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} placeholder='0.00' required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>EXIT PRICE</label>
                <input type='number' step='0.01' value={form.exitPrice} onChange={e => setForm(f => ({ ...f, exitPrice: e.target.value }))} placeholder='0.00' required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>STOP LOSS (opt)</label>
                <input type='number' step='0.01' value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: e.target.value }))} placeholder='0.00' style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>TAKE PROFIT (opt)</label>
                <input type='number' step='0.01' value={form.takeProfit} onChange={e => setForm(f => ({ ...f, takeProfit: e.target.value }))} placeholder='0.00' style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>P&L (AUTO)</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                  {form.entryPrice && form.exitPrice && form.contracts ? (() => {
                    const pnl = form.direction === 'Long'
                      ? (parseFloat(form.exitPrice) - parseFloat(form.entryPrice)) * parseFloat(form.contracts)
                      : (parseFloat(form.entryPrice) - parseFloat(form.exitPrice)) * parseFloat(form.contracts)
                    return <span style={{ color: pnl >= 0 ? '#00c48c' : '#ff4d6a' }}>${pnl.toFixed(2)}</span>
                  })() : <span style={{ color: textMuted }}>—</span>}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>EMOTION</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {EMOTIONS.map((em, i) => (
                    <button key={i} type='button' onClick={() => setForm(f => ({ ...f, emotion: i + 1 }))}
                      style={{ flex: 1, padding: '6px 2px', fontSize: 16, borderRadius: 4, border: `1px solid ${form.emotion === i + 1 ? '#2563eb' : border}`, background: form.emotion === i + 1 ? 'rgba(37,99,235,0.1)' : inputBg, cursor: 'pointer', opacity: form.emotion === i + 1 ? 1 : 0.5 }}>{em}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>TAG PLAYBOOK</label>
                <select value={form.playbookId} onChange={e => setForm(f => ({ ...f, playbookId: e.target.value }))} disabled={playbooks.length === 0} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}>
                  {playbooks.length === 0 ? <option value=''>No playbooks yet</option> : <><option value=''>None</option>{playbooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}</>}
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>NOTES</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder='What happened? Mistakes? Lessons? Setup?' style={{ ...inputStyle, height: 80, resize: 'none' }} />
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4', display: 'flex', gap: 8 }}>
                <Button type='submit'>{editingId ? 'UPDATE TRADE' : 'ADD TRADE'}</Button>
                <Button type='button' variant='ghost' onClick={cancelEdit}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* ===== COACH SHAI ===== */}
        <CoachShaiCard insight={coachInsight} isDark={isDark} />

        {/* ===== TRADE LOG TABLE ===== */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              TRADE LOG · {filteredTrades.length} ENTRIES
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height='40px' /><Skeleton height='40px' /><Skeleton height='40px' />
            </div>
          ) : filteredTrades.length === 0 ? (
            <EmptyState icon={BarChart2} heading='NO TRADES LOGGED YET' subtext='Click "Log Trade" above to log your first trade — works for all account types.' />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['DATE','TIME','DIR','SYMBOL','ENTRY','EXIT','QTY','P&L','R:R','😊','NOTES',''].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTrades].reverse().map(trade => {
                    const tradePnl = trade.pnl
                    const tradeAvgLoss = avgLoss
                    const rr = tradeAvgLoss > 0 ? (tradePnl / tradeAvgLoss).toFixed(1) : '—'
                    return (
                      <tr key={trade.id} className='trade-row' style={{ borderBottom: `1px solid ${border}`, height: 40 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary, whiteSpace: 'nowrap' }}>{trade.date}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textMuted, whiteSpace: 'nowrap' }}>{trade.time || '—'}</td>
                        <td style={{ padding: '6px 14px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, color: trade.direction === 'Long' ? '#2563eb' : '#ff4d6a', background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)' }}>{trade.direction}</span>
                        </td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary, fontWeight: 600 }}>{trade.symbol || '—'}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.entryPrice}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.exitPrice}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.contracts}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: trade.pnl >= 0 ? '#00c48c' : '#ff4d6a' }}>${trade.pnl.toFixed(2)}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: parseFloat(rr) >= 1 ? '#00c48c' : parseFloat(rr) < 0 ? '#ff4d6a' : textMuted }}>{rr}</td>
                        <td style={{ padding: '6px 14px', fontSize: 14 }}>{EMOTIONS[(trade.emotion || 3) - 1]}</td>
                        <td style={{ padding: '6px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textMuted }}>{trade.notes}</td>
                        <td style={{ padding: '6px 14px' }}>
                          <div className='trade-actions' style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0, transition: 'opacity 0.15s' }}>
                            <button onClick={() => startEdit(trade)} title='Edit' style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}><Pencil size={12} style={{ color: '#2563eb' }} /></button>
                            <button onClick={() => deleteTrade(trade.id)} title='Delete' style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}><Trash2 size={12} style={{ color: '#ff4d6a' }} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
      <LifeHubChat
        section='trading'
        apiRoute='/api/life/trading/chat'
        contextData={{ trades: filteredTrades, stats: { totalPnl, winRate, totalTrades: filteredTrades.length } }}
        systemPrompt='You are a trading AI analyst. Analyze the user trade log and provide insights.'
        defaultOpen={chatOpen}
      />
    </div>
  )
}

export default function TradingJournalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Loading...</div></div>}>
      <TradingJournalInner />
    </Suspense>
  )
}
