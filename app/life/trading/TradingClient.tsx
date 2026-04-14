'use client'
// v9 - Professional Trading Journal — Tradezella-style Dashboard
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { Plus, Trash2, Flame, RefreshCw, Loader2, CheckCircle, XCircle, Settings, ChevronLeft, ChevronRight, Pencil, BarChart2, TrendingUp, ChevronDown, Building2, ImagePlus, Upload, X, Send, MessageCircle } from 'lucide-react'
import CSVImportModal from '@/app/components/trading/CSVImportModal'
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
  playbookId?: string | null; accountType?: 'live' | 'propfir' | 'paper'
  stopLoss?: number; takeProfit?: number
  tradeImage?: string // base64
}

type Playbook = { id: string; name: string; description: string; createdAt: string }
type CoachInsight = { text: string; visible: boolean; fading: boolean }

// Emotion word pills config
const EMOTION_WORDS = [
  { label: 'Confident', value: 1, color: '#00c48c', bg: 'rgba(0,196,140,0.15)', border: 'rgba(0,196,140,0.4)' },
  { label: 'Disciplined', value: 2, color: '#60a5fa', bg: 'rgba(37,99,235,0.15)', border: 'rgba(37,99,235,0.4)' },
  { label: 'Neutral', value: 3, color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)' },
  { label: 'Nervous', value: 4, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
  { label: 'FOMO', value: 5, color: '#ff4d6a', bg: 'rgba(255,77,106,0.15)', border: 'rgba(255,77,106,0.4)' },
  { label: 'Revenge', value: 6, color: '#ff4d6a', bg: 'rgba(255,77,106,0.15)', border: 'rgba(255,77,106,0.4)' },
]
const EMOTIONS = ['ð°', 'ð', 'ð', 'ð', 'ð']
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
  <div style={{ width, height, borderRadius, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
)

// WinRateGauge — semi-circular SVG gauge
const WinRateGauge = ({ rate }: { rate: number }) => {
  const pct = Math.min(rate, 100)
  const color = pct > 50 ? '#00c48c' : '#ff4d6a'
  const r = 30
  const circ = Math.PI * r
  const fill = (pct / 100) * circ
  return (
    <svg width="80" height="45" viewBox="0 0 80 45" style={{ display: 'block', margin: '0 auto' }}>
      <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke="rgba(128,128,128,0.2)" strokeWidth="6" strokeLinecap="round"/>
      <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`} />
    </svg>
  )
}
function CoachShaiCard({ insight, isDark }: { insight: CoachInsight; isDark: boolean }) {
  const [progress, setProgress] = useState(100)
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
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
    <div style={{ background: surface, border: `1px solid ${border}`, borderLeft: '3px solid #60a5fa', borderRadius: 12, padding: '16px 20px 0 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', opacity: insight.fading ? 0 : 1, transition: 'opacity 2s ease', overflow: 'hidden' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#60a5fa', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>⚡ COACH SHAI</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textPrimary, lineHeight: 1.7, marginBottom: 12 }}>{insight.text}</p>
      <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 1 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#60a5fa', borderRadius: 1, transition: 'width 0.1s linear' }} />
      </div>
    </div>
  )
}

function TradovateStatusBar({ onSyncComplete }: { onSyncComplete: () => void }) {
  const { isDark } = useTheme()
  const textBody = isDark ? '#ffffff' : '#0f1117'
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
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
        <Link href="/life/trading/settings" style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#60a5fa', textDecoration: 'none' }}>Connect →</Link>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}>
      <CheckCircle size={12} style={{ color: '#00c48c', flexShrink: 0 }} />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00c48c' }}>Tradovate Connected</span>
      {status.lastSync && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textBody }}>· Last: {new Date(status.lastSync).toLocaleString()}</span>}
      {syncMsg && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: syncMsg.startsWith('✓') ? '#00c48c' : '#ff4d6a' }}>{syncMsg}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
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
  const pnls = trades.map(t => t.pnl)
  const mean = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0
  const variance = pnls.length > 0 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / pnls.length : 1
  const stdDev = Math.sqrt(variance)
  const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (Math.abs(mean) + 1)) * 10))
  let maxDrawdown = 0; let current = 0
  for (const t of trades) {
    if (t.pnl < 0) { current += Math.abs(t.pnl); if (current > maxDrawdown) maxDrawdown = current }
    else current = 0
  }
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
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  if (trades.length === 0) return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>PERFORMANCE SCORE</p>
      <EmptyState icon={BarChart2} heading="NO DATA" subtext="Log trades to see your radar" />
    </div>
  )
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>PERFORMANCE SCORE</p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <Radar name="Score" dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.15} strokeWidth={2} />
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
function AccountRadar({ trades, isDark }: { trades: Trade[], isDark: boolean }) {

  const [mode, setMode] = React.useState<'prop' | 'live'>('prop')

  const surface = isDark ? '#1a1f2e' : '#ffffff'

  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'

  const textPrimary = isDark ? '#f9fafb' : '#0f172a'

  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#475569'

  const textFaint = isDark ? 'rgba(255,255,255,0.2)' : '#64748b'

  const cellBg = isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9'

  const cellBorder = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'

  const insightBg = isDark ? 'rgba(255,255,255,0.02)' : '#f1f5f9'

  const dividerColor = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'

  const alertBg = isDark ? 'rgba(245,158,11,0.07)' : '#fffbeb'

  const alertBorder = isDark ? 'rgba(245,158,11,0.18)' : '#fde68a'

  const alertTxt = isDark ? 'rgba(255,255,255,0.5)' : '#92400e'

  const rorBg = isDark ? 'rgba(16,185,129,0.06)' : '#f0fdf4'

  const rorBorder = isDark ? 'rgba(16,185,129,0.14)' : '#bbf7d0'

  const rorTxt = isDark ? 'rgba(255,255,255,0.35)' : '#166534'

  const progBg = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'

  const wins = trades.filter(t => (t.pnl || 0) > 0)

  const losses = trades.filter(t => (t.pnl || 0) < 0)

  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)

  const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0

  const avgWin = wins.length > 0 ? Math.round(wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length) : 0

  const avgLoss = losses.length > 0 ? Math.round(Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length)) : 0

  const profitTarget = 3000

  const maxDrawdown = 2000

  const currentDD = Math.min(0, totalPnl)

  const ddUsed = Math.abs(currentDD)

  const bufferLeft = maxDrawdown - ddUsed

  const toPayout = Math.max(0, profitTarget - totalPnl)

  const rAmount = 300

  const bufferInR = rAmount > 0 ? (bufferLeft / rAmount).toFixed(1) : '—'

  const winsNeeded = avgWin > 0 ? (toPayout / avgWin).toFixed(1) : '—'

  const ddPct = Math.min(100, Math.round((ddUsed / maxDrawdown) * 100))

  const targetPct = Math.min(100, Math.round((Math.max(0, totalPnl) / profitTarget) * 100))

  const sorted = [...trades].sort((a: Trade, b: Trade) => (a.date > b.date ? 1 : -1))

  let streak = 0

  for (let i = sorted.length - 1; i >= 0; i--) {

    if ((sorted[i].pnl || 0) < 0) streak++

    else break

  }

  const showAlert = streak >= 3

  const payoutDays = winRate > 0 && avgWin > 0

    ? Math.ceil(toPayout / (avgWin * (winRate / 100)))

    : null

  const blowLosses = avgLoss > 0

    ? (bufferLeft / avgLoss).toFixed(1)

    : null

  const now = new Date()

  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const tradingDaysTotal = Math.round(totalDays * 5 / 7)

  const tradingDaysPassed = Math.round(now.getDate() * 5 / 7)

  const monthPct = Math.round((tradingDaysPassed / tradingDaysTotal) * 100)

  const dailyNeeded = tradingDaysTotal > tradingDaysPassed

    ? Math.round(toPayout / (tradingDaysTotal - tradingDaysPassed))

    : 0

  const tradeCountPct = trades.length > 0 ? Math.min(100, Math.round((trades.length / 12) * 100)) : 0

  const safetyPct = 100 - ddPct

  const safetyColor = safetyPct > 60 ? '#10b981' : safetyPct > 30 ? '#f59e0b' : '#ef4444'

  const rorScore = trades.length > 0 ? Math.max(5, Math.round(100 - (ddPct * 1.5) - (streak * 5))) : 0

  const rorLabel = ddPct < 30 ? 'LOW' : ddPct < 60 ? 'MEDIUM' : 'HIGH'

  const rorDesc = ddPct < 30

    ? 'Account healthy. Drawdown within normal variance. Stay disciplined.'

    : ddPct < 60

    ? 'Account under moderate stress. Reduce size and protect the buffer.'

    : 'Account in danger. Stop trading and review your plan immediately.'

  const progressBars = [

    { label: 'Profit Target', pct: targetPct, val: `${targetPct}% · $${Math.max(0, totalPnl).toLocaleString()} / $${profitTarget.toLocaleString()}`, color: '#10b981' },

    { label: 'Drawdown Safety', pct: safetyPct, val: `${safetyPct}% safe · $${bufferLeft.toLocaleString()} left`, color: safetyColor },

    { label: 'Month Pace', pct: monthPct, val: `${monthPct}% · ${tradingDaysPassed} of ${tradingDaysTotal} days`, color: '#60a5fa' },

    { label: 'Daily Target', pct: 0, val: `$0 / $${dailyNeeded} needed today`, color: textFaint },

    { label: 'Trade Count Pace', pct: tradeCountPct, val: `${trades.length} of 8–12 optimal`, color: '#a78bfa' },

  ]

  const liveGrowthText = trades.length > 0

    ? `At your current pace (+$${avgWin * winRate / 100 > 0 ? Math.round(avgWin * winRate / 100) : 0}/trade avg), your account grows approximately ${winRate > 50 ? 'consistently' : 'inconsistently'} this month. Focus on consistency over size.`

    : 'Log trades to see your live account growth forecast.'

  const forecasts = [

    {

      color: '#10b981',

      text: mode === 'live'

        ? <><strong style={{ fontWeight: 700, color: textPrimary }}>{liveGrowthText}</strong></>

        : payoutDays

        ? <><strong style={{ fontWeight: 700, color: textPrimary }}>Payout in ~{payoutDays} trading days</strong> — {winRate}% WR + ${avgWin} avg win. Maintain pace and avoid sizing up.</>

        : <><strong style={{ fontWeight: 700, color: textPrimary }}>Log trades to unlock payout forecast.</strong> Stats will power this prediction once you have history.</>

    },

    {

      color: '#ef4444',

      text: blowLosses

        ? <><strong style={{ fontWeight: 700, color: textPrimary }}>Account blow in ~{blowLosses} losses</strong> — at avg -${avgLoss}/loss your buffer of ${bufferLeft.toLocaleString()} {ddPct > 50 ? 'is dangerously thin' : 'is manageable, stay focused'}.</>

        : <><strong style={{ fontWeight: 700, color: textPrimary }}>Blow risk: N/A</strong> — No loss data yet. Start logging trades to see your risk exposure.</>

    },

    {

      color: '#60a5fa',

      text: <><strong style={{ fontWeight: 700, color: textPrimary }}>Need +${dailyNeeded}/day to pace</strong> — {tradingDaysTotal - tradingDaysPassed} trading days remain this month. Stay consistent.</>

    },

  ]

  const statCells = mode === 'live'

    ? [

        { label: 'Current P&L', value: totalPnl >= 0 ? `+$${totalPnl.toLocaleString()}` : `-$${Math.abs(totalPnl).toLocaleString()}`, color: totalPnl >= 0 ? '#10b981' : '#ef4444', sub: 'this account' },

        { label: 'Drawdown Used', value: `-$${ddUsed.toLocaleString()}`, color: ddUsed === 0 ? textFaint : ddPct > 60 ? '#ef4444' : '#f59e0b', sub: `of -$${maxDrawdown.toLocaleString()} max` },

        { label: 'Buffer Left', value: `$${bufferLeft.toLocaleString()}`, color: textPrimary, sub: `${bufferInR}R remaining` },

        { label: 'Account Size', value: '$50,000', color: '#10b981', sub: 'live account' },

      ]

    : [

        { label: 'Current P&L', value: totalPnl >= 0 ? `+$${totalPnl.toLocaleString()}` : `-$${Math.abs(totalPnl).toLocaleString()}`, color: totalPnl >= 0 ? '#10b981' : '#ef4444', sub: 'this account' },

        { label: 'Drawdown Used', value: `-$${ddUsed.toLocaleString()}`, color: ddUsed === 0 ? textFaint : ddPct > 60 ? '#ef4444' : '#f59e0b', sub: `of -$${maxDrawdown.toLocaleString()} max` },

        { label: 'Buffer Left', value: `$${bufferLeft.toLocaleString()}`, color: textPrimary, sub: `${bufferInR}R remaining` },

        { label: 'To Payout', value: `$${toPayout.toLocaleString()}`, color: '#60a5fa', sub: `~${winsNeeded} wins away` },

      ]

  return (

    <div style={{ background: surface, border: `1px solid ${isDark ? 'rgba(96,165,250,0.12)' : '#bfdbfe'}`, borderRadius: 14, padding: '22px 26px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${dividerColor}` }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧠</div>

          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Account Radar</span>

          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: mode === 'live' ? 'rgba(16,185,129,0.08)' : 'rgba(96,165,250,0.08)', border: `1px solid ${mode === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(96,165,250,0.15)'}`, color: mode === 'live' ? '#10b981' : '#60a5fa', letterSpacing: '0.04em' }}>{mode === 'live' ? 'LIVE CAPITAL' : 'PROP FIRM'}</span>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: 20, padding: '3px 4px' }}>

            {(['prop', 'live'] as const).map(m => (

              <div

                key={m}

                onClick={() => setMode(m)}

                style={{

                  padding: '4px 12px',

                  borderRadius: 20,

                  fontSize: 11,

                  fontWeight: mode === m ? 700 : 500,

                  color: mode === m ? '#fff' : textFaint,

                  background: mode === m ? '#60a5fa' : 'transparent',

                  cursor: 'pointer',

                  transition: 'all 0.15s'

                }}

              >

                {m === 'prop' ? 'Prop Firm' : 'Live Capital'}

              </div>

            ))}

          </div>

          {mode === 'prop' && (['Trailing DD', 'EOD DD', 'Static DD'] as const).map((label, i) => (

            <div key={label} style={{ padding: '5px 14px', background: i === 0 ? 'rgba(96,165,250,0.12)' : 'transparent', border: `1px solid ${i === 0 ? 'rgba(96,165,250,0.25)' : border}`, borderRadius: 20, fontSize: 11, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#60a5fa' : textFaint, cursor: 'pointer' }}>{label}</div>

          ))}

          <span style={{ fontSize: 11, color: textFaint, marginLeft: 4, cursor: 'pointer' }}>⚙ Configure</span>

        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>

        {statCells.map(s => (

          <div key={s.label} style={{ background: cellBg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${cellBorder}` }}>

            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: textFaint, marginBottom: 5 }}>{s.label}</div>

            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: s.color, marginBottom: 3 }}>{s.value}</div>

            <div style={{ fontSize: 11, color: textFaint }}>{s.sub}</div>

          </div>

        ))}

      </div>

      {showAlert && (

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: alertBg, border: `1px solid ${alertBorder}`, borderRadius: 10, marginBottom: 18 }}>

          <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>

          <div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>Pattern Alert — {streak}-Loss Streak Detected</div>

            <div style={{ fontSize: 12, color: alertTxt, lineHeight: 1.45 }}>Your history shows avg loss tends to increase after {streak} consecutive losses. High probability of revenge trading. Consider stopping for today.</div>

          </div>

        </div>

      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.2)' : '#0f172a' }}>Account Progress</div>

          {progressBars.map(p => (

            <div key={p.label}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>

                <span style={{ fontSize: 12, fontWeight: 500, color: textMuted }}>{p.label}</span>

                <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.val}</span>

              </div>

              <div style={{ height: 7, background: progBg, borderRadius: 4, overflow: 'hidden' }}>

                <div style={{ height: 7, width: `${p.pct}%`, background: p.color, borderRadius: 4 }} />

              </div>

            </div>

          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4 }}>

            <div style={{ background: cellBg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${cellBorder}` }}>

              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: textFaint, marginBottom: 4 }}>Avg Win</div>

              <div style={{ fontSize: 14, fontWeight: 700, color: avgWin > 0 ? '#10b981' : textFaint }}>{avgWin > 0 ? `+$${avgWin}` : '—'}</div>

              <div style={{ fontSize: 10, color: textFaint, marginTop: 2 }}>last {trades.length} trades</div>

            </div>

            <div style={{ background: cellBg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${cellBorder}` }}>

              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: textFaint, marginBottom: 4 }}>Avg Loss</div>

              <div style={{ fontSize: 14, fontWeight: 700, color: avgLoss > 0 ? '#ef4444' : textFaint }}>{avgLoss > 0 ? `-$${avgLoss}` : '—'}</div>

              <div style={{ fontSize: 10, color: textFaint, marginTop: 2 }}>last {trades.length} trades</div>

            </div>

          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.2)' : '#0f172a', marginBottom: 14 }}>AI Forecast · based on last 30 trades</div>

          {forecasts.map((ins, i) => (

            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: insightBg, borderRadius: 8, borderLeft: `2px solid ${ins.color}`, marginBottom: 8 }}>

              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ins.color, flexShrink: 0, marginTop: 5 }} />

              <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.55 }}>{ins.text}</div>

            </div>

          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: rorBg, border: `1px solid ${rorBorder}`, borderRadius: 10, marginTop: 8 }}>

            <div style={{ width: 42, height: 42, borderRadius: '50%', border: '2.5px solid #10b981', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>

              {trades.length > 0 ? rorScore : '—'}

            </div>

            <div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 3 }}>Risk of Ruin — {trades.length > 0 ? rorLabel : 'N/A'}</div>

              <div style={{ fontSize: 11, color: rorTxt, lineHeight: 1.45 }}>{trades.length > 0 ? rorDesc : 'Log trades to calculate your risk of ruin score.'}</div>

            </div>

          </div>

        </div>

      </div>

    </div>

  )

}
// Trading Heatmap — GitHub-style contribution grid
function TradingHeatmap({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  const today = new Date()
  const weeks: { date: string; pnl: number }[][] = []
  let week: { date: string; pnl: number }[] = []
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
    if (pnl === 0) return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
    if (pnl > 0) { const intensity = Math.min(pnl / maxPnl, 1); return `rgba(0,196,140,${0.15 + intensity * 0.75})` }
    const intensity = Math.min(Math.abs(pnl) / maxPnl, 1); return `rgba(255,77,106,${0.15 + intensity * 0.75})`
  }
  const weekLabels = ['S','M','T','W','T','F','S']
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((wk, wi) => {
    const m = new Date(wk[0].date).getMonth()
    if (m !== lastMonth) { monthLabels.push({ label: MONTH_NAMES[m].slice(0,3), col: wi }); lastMonth = m }
  })
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>TRADING ACTIVITY</p>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `20px repeat(${weeks.length}, 1fr)`, gap: 2, minWidth: 400 }}>
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
          {weekLabels.map((label, di) => (
            <React.Fragment key={di}>
              <div key={`label-${di}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: di % 2 === 1 ? textMuted : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
              {weeks.map((wk, wi) => {
                const cell = wk[di]
                if (!cell) return <div key={`empty-${wi}-${di}`} />
                return (
                  <div key={`${wi}-${di}`} title={`${cell.date}: ${cell.pnl !== 0 ? (cell.pnl > 0 ? '+' : '') + cell.pnl.toFixed(2) : 'No trades'}`}
                    style={{ width: '100%', paddingBottom: '100%', borderRadius: 2, background: getCellColor(cell.pnl), cursor: cell.pnl !== 0 ? 'pointer' : 'default', transition: 'opacity 0.1s' }} />
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
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const weeks: { weekNum: number; startStr: string; endStr: string; pnl: number; trades: number; days: number; wins: number; winRate: number }[] = []
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
    const weekWins = weekTrades.filter(t => t.pnl > 0).length
    const weekWinRate = weekTrades.length > 0 ? (weekWins / weekTrades.length) * 100 : 0
    weeks.push({ weekNum, startStr, endStr, pnl, trades: weekTrades.length, days: uniqueDays, wins: weekWins, winRate: weekWinRate })
    weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() + 1)
    weekNum++
  }
  const totalMonthPnl = weeks.reduce((s, w) => s + w.pnl, 0)
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>WEEKLY BREAKDOWN</p>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: totalMonthPnl >= 0 ? '#00c48c' : '#ff4d6a' }}>
          {totalMonthPnl >= 0 ? '+' : ''}${totalMonthPnl.toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {weeks.filter(w => w.trades > 0 || w.weekNum <= 4).map(week => (
          <div key={week.weekNum} style={{ padding: '12px 14px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: textPrimary }}>Week {week.weekNum}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: week.pnl > 0 ? '#00c48c' : week.pnl < 0 ? '#ff4d6a' : textPrimary }}>
                {week.pnl !== 0 ? (week.pnl > 0 ? '+' : '') + '$' + week.pnl.toFixed(2) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textSecondary }}>{week.trades} trades</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textPrimary }}>{week.winRate.toFixed(0)}% WR</span>
            </div>
            {week.trades > 0 && (
              <div style={{ marginTop: 8, height: 3, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${Math.min(Math.abs(week.pnl) / (Math.max(...weeks.map(w => Math.abs(w.pnl)), 1)) * 100, 100)}%`, background: week.pnl >= 0 ? '#00c48c' : '#ff4d6a', borderRadius: 2 }} />
              </div>
            )}
          </div>
        ))}
        {weeks.every(w => w.trades === 0) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textPrimary }}>No trades this month</p>
          </div>
        )}
      </div>
    </div>
  )
}
// Equity Curve Chart
function EquityCurve({ trades, isDark }: { trades: Trade[]; isDark: boolean }) {
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const sortedTrades = [...trades].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return (a.time || '').localeCompare(b.time || '')
  })
  let cumulative = 0
  const data = sortedTrades.map((trade, i) => {
    cumulative += trade.pnl
    return { index: i + 1, label: trade.date, cumPnl: Math.round(cumulative * 100) / 100, pnl: trade.pnl }
  })
  if (data.length === 0) return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>EQUITY CURVE</p>
      <EmptyState icon={TrendingUp} heading="NO TRADES YET" subtext="Your equity curve will appear here as you log trades." />
    </div>
  )
  const totalPnl = data[data.length - 1]?.cumPnl ?? 0
  const lineColor = totalPnl >= 0 ? '#00c48c' : '#ff4d6a'
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>EQUITY CURVE</p>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: totalPnl >= 0 ? '#00c48c' : '#ff4d6a' }}>
          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
          <Tooltip contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, color: textPrimary }} formatter={(v: number) => [`${v.toFixed(2)}`, 'Cumulative P&L']} labelFormatter={(label) => `Date: ${label}`} />
          <ReferenceLine y={0} stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="cumPnl" stroke={lineColor} strokeWidth={2} fill="url(#equityGradient)" dot={false} activeDot={{ r: 4, fill: lineColor }} />
        </AreaChart>
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
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const dayMap = useMemo(() => {
    const map: Record<string, { pnl: number; trades: Trade[]; tradeCount: number; wins: number; winRate: number }> = {}
    for (const trade of trades) {
      if (!map[trade.date]) map[trade.date] = { pnl: 0, trades: [], tradeCount: 0, wins: 0, winRate: 0 }
      map[trade.date].pnl += trade.pnl
      map[trade.date].trades.push(trade)
      map[trade.date].tradeCount++
      if (trade.pnl > 0) map[trade.date].wins++
    }
    for (const key of Object.keys(map)) {
      map[key].winRate = map[key].tradeCount > 0 ? (map[key].wins / map[key].tradeCount) * 100 : 0
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
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }
  const selectedTrades = selectedDay ? (dayMap[selectedDay]?.trades || []) : []
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#60a5fa', cursor: 'pointer' }}>
          <ChevronLeft size={13} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: textPrimary, margin: 0 }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textPrimary }}>{monthTrades.length} trades</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textPrimary }}>{monthWinRate}% WR</span>
            {monthPnl !== 0 && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: monthPnl > 0 ? '#00c48c' : '#ff4d6a' }}>
                {monthPnl > 0 ? '+' : ''}${monthPnl.toFixed(0)}
              </span>
            )}
          </div>
        </div>
        <button onClick={nextMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#60a5fa', cursor: 'pointer' }}>
          <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, padding: '3px 0' }}>{d}</div>
        ))}
      </div>
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
          const boxShadow = isToday ? '0 0 0 2px #60a5fa' : isSelected ? '0 0 0 2px rgba(37,99,235,0.5)' : undefined
          return (
            <div key={dateStr} onClick={() => { if (hasTrades) setSelectedDay(prev => prev === dateStr ? null : dateStr) }}
              style={{ minHeight: 80, borderRadius: 5, background: bg, border: cellBorder, boxShadow, cursor: hasTrades ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '4px 5px', transition: 'box-shadow 0.15s ease' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600, color: isToday ? '#60a5fa' : textMuted }}>{day}</span>
              {hasTrades && (
                <>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, marginTop: 2, color: pnlColor, lineHeight: 1.2 }}>
                    {Math.abs(pnl) >= 1000 ? (pnl > 0 ? '+' : '-') + '$' + (Math.abs(pnl)/1000).toFixed(2) + 'K' : (pnl > 0 ? '+' : '') + '$' + pnl.toFixed(0)}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: textSecondary, marginTop: 2 }}>{dayData!.tradeCount} trade{dayData!.tradeCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: textSecondary }}>{dayData!.winRate.toFixed(2)}%</span>
                </>
              )}
            </div>
          )
        })}
      </div>
      {selectedDay && selectedTrades.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#60a5fa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Trades — {selectedDay}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedTrades.map(trade => (
              <div key={trade.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: trade.pnl >= 0 ? 'rgba(0,196,140,0.06)' : 'rgba(255,77,106,0.06)', border: `1px solid ${trade.pnl >= 0 ? 'rgba(0,196,140,0.2)' : 'rgba(255,77,106,0.2)'}` }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 5px', borderRadius: 3, color: trade.direction === 'Long' ? '#60a5fa' : '#ff4d6a', background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)', flexShrink: 0 }}>{trade.direction}</span>
                {trade.symbol && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: textPrimary, flexShrink: 0 }}>{trade.symbol}</span>}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textPrimary, flexShrink: 0 }}>{trade.time || '--:--'}</span>
                {trade.notes && <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textPrimary }}>{trade.notes}</span>}
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
  const [chatOpen, setChatOpen] = useState(searchParams.get('chat') === '1')
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: "Hey! What's on your mind? I can analyze your trades, patterns, and help you improve." },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // ── sendToTrading ────────────────────────────────────────────────
  const sendToTrading = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chatLoading) return
    const userMsg = { role: 'user' as const, text: trimmed }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)
    try {
      const history = chatMessages
        .slice(1)
        .map(m => ({ role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.text }))
      const allMessages = [...history, { role: 'user' as const, content: trimmed }]
      const res = await fetch('/api/life/trading/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })
      const data = await res.json()
      if (data.content) {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.content }])
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Network error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [coachInsight, setCoachInsight] = useState<CoachInsight>({ text: '', visible: false, fading: false })
  const insightTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const lastInsightTime = useRef<number>(0)
  const COOLDOWN_MS = 5 * 60 * 1000

  const bg = isDark ? '#0f1117' : '#f8f8f6'
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
  const bgPage = isDark ? '#0f1117' : '#f8fafc'
  const inputBg = isDark ? '#1a1f2e' : '#ffffff'

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    direction: 'Long' as 'Long' | 'Short',
    entryPrice: '', exitPrice: '', contracts: '', notes: '',
    emotion: 3, playbookId: '', symbol: '',
    stopLoss: '', takeProfit: '',
    accountType: 'live' as 'live' | 'propfirm' | 'paper',
    tradeImage: '',
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

  const accountNames = useMemo(() => {
    const names = new Set(trades.map(t => t.accountName).filter(Boolean))
    return Array.from(names) as string[]
  }, [trades])

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
      accountType: trade.accountType || 'live', tradeImage: trade.tradeImage || '',
    })
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
      const res = await fetch('/api/life/trading/coach-insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade }) })
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
      contracts: parseFloat(form.contracts), notes: form.notes, emotion: form.emotion,
      playbookId: form.playbookId || null, symbol: form.symbol || undefined,
      accountType: form.accountType, tradeImage: form.tradeImage || undefined,
    }
    if (editingId) {
      const res = await fetch('/api/life/trading', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...fields }) })
      const data = await res.json()
      if (res.ok) { setTrades(data.logs || []); cancelEdit() }
    } else {
      const res = await fetch('/api/life/trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry: fields }) })
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
    const res = await fetch('/api/life/trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', entry: { id } }) })
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
  const todayStr = new Date().toISOString().split('T')[0]
  const todayTrades = filteredTrades.filter(t => t.date === todayStr)
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)
  const todayWins = todayTrades.filter(t => t.pnl > 0)
  const todayWR = todayTrades.length > 0 ? ((todayWins.length / todayTrades.length) * 100).toFixed(0) : '—'
  const winRateNum = parseFloat(winRate)
  const winRateColor = winRateNum > 50 ? '#00c48c' : winRateNum < 50 ? '#ff4d6a' : textPrimary
  const pnlColor = totalPnl > 0 ? '#00c48c' : totalPnl < 0 ? '#ff4d6a' : textPrimary

  // Auto-calculate R:R from form fields
  const formRR = (() => {
    const entry = parseFloat(form.entryPrice)
    const sl = parseFloat(form.stopLoss)
    const tp = parseFloat(form.takeProfit)
    if (!entry || !sl || !tp || isNaN(entry) || isNaN(sl) || isNaN(tp)) return null
    const risk = Math.abs(entry - sl)
    const reward = Math.abs(tp - entry)
    if (risk === 0) return null
    return (reward / risk).toFixed(2)
  })()

  const inputStyle: React.CSSProperties = {
    width: '100%', background: inputBg, border: `1px solid ${border}`,
    borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter, sans-serif',
    fontSize: 13, color: textPrimary, outline: 'none',
  }
  return (
    <div style={{ minHeight: '100vh', background: bgPage }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .trade-row:hover .trade-actions { opacity: 1 !important; }
        .stat-card-hover:hover { transform: translateY(-1px); transition: transform 0.15s ease; }
      `}} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '24px 24px' }}>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={{ appearance: 'none', background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 28px 8px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, cursor: 'pointer', outline: 'none' }}>
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
            <Link href='/life/trading/playbook' style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Playbook</Link>
            <Link href='/life/trading/settings' style={{ padding: '7px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: textMuted, fontFamily: 'Inter, sans-serif', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings size={12} /> Settings
            </Link>
            <button
                onClick={() => setShowImportModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(0,196,255,0.08)', border: '1px solid rgba(0,196,255,0.25)', color: '#00c4ff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Upload size={14} />
                Import CSV
              </button>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Log Trade
              </Button>
        </div>

        {/* ===== TODAY'S STATS BAR ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderRadius: 8, background: surface, border: `1px solid ${border}`, marginBottom: 16, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>{todayTrades.length} trades</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>{todayWR !== '—' ? todayWR + '% WR' : '—'}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: todayPnl > 0 ? '#00c48c' : todayPnl < 0 ? '#ff4d6a' : textPrimary }}>
            {todayTrades.length > 0 ? (todayPnl > 0 ? '+' : '') + '$' + todayPnl.toFixed(2) : 'No trades today'}
          </span>
        </div>

        {/* ===== TRADOVATE STATUS BAR ===== */}
        <TradovateStatusBar onSyncComplete={loadTrades} />

        {/* ===== 5 STAT CARDS ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12, marginBottom: 20, alignItems: 'stretch' }}>

          {/* TOTAL TRADES */}
          <div className='stat-card-hover' style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: '3px solid #60a5fa', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8 }}>TOTAL TRADES</div>
            <div style={{ fontSize: filteredTrades.length > 0 ? 28 : 32, fontWeight: filteredTrades.length > 0 ? 700 : 300, color: filteredTrades.length > 0 ? textPrimary : 'var(--text-empty)', lineHeight: 1.1 }}>{filteredTrades.length > 0 ? filteredTrades.length : '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: filteredTrades.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{filteredTrades.length === 0 ? 'no trades yet' : wins.length + 'W · ' + losses.length + 'L'}</div>
          </div>

          {/* WIN RATE */}
          <div className='stat-card-hover' style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: '3px solid #ef4444', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8 }}>WIN RATE</div>
            <WinRateGauge rate={winRateNum} />
            <div style={{ fontSize: filteredTrades.length > 0 ? 28 : 32, fontWeight: filteredTrades.length > 0 ? 700 : 300, color: filteredTrades.length > 0 ? winRateColor : 'var(--text-empty)', lineHeight: 1.1 }}>{winRate}%</div>
          </div>

          {/* NET P&L */}
          <div className='stat-card-hover' style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: '3px solid #10b981', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8 }}>NET P&L</div>
            <div style={{ fontSize: filteredTrades.length > 0 ? 28 : 32, fontWeight: filteredTrades.length > 0 ? 700 : 300, color: filteredTrades.length > 0 ? pnlColor : 'var(--text-empty)', lineHeight: 1.1 }}>{filteredTrades.length > 0 ? (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2) : '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: filteredTrades.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{filteredTrades.length === 0 ? 'no trades yet' : MONTH_NAMES[new Date().getMonth()]}</div>
          </div>

          {/* PROFIT FACTOR */}
          <div className='stat-card-hover' style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: '3px solid #10b981', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8 }}>PROFIT FACTOR</div>
            <div style={{ fontSize: filteredTrades.length > 0 ? 28 : 32, fontWeight: filteredTrades.length > 0 ? 700 : 300, color: 'var(--green)', lineHeight: 1.1 }}>{filteredTrades.length > 0 ? profitFactor : '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: filteredTrades.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{filteredTrades.length === 0 ? 'no trades yet' : 'gross W/L ratio'}</div>
          </div>

          {/* AVG R:R */}
          <div className='stat-card-hover' style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', borderTop: '3px solid #a78bfa', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8 }}>AVG R:R</div>
            <div style={{ fontSize: filteredTrades.length > 0 ? 28 : 32, fontWeight: filteredTrades.length > 0 ? 700 : 300, color: 'var(--purple)', lineHeight: 1.1 }}>{filteredTrades.length > 0 ? avgRR : '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: filteredTrades.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{filteredTrades.length === 0 ? 'no trades yet' : 'risk to reward'}</div>
          </div>

        </div>

        {/* ===== ACCOUNT RADAR — FULL WIDTH ===== */}
        <div style={{ marginBottom: 16 }}>
          <AccountRadar trades={filteredTrades} isDark={isDark} />
        </div>

        {/* ===== 2-COLUMN ROW: Performance + Weekly ===== */}
        {!isMobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
            <PerformanceRadar trades={filteredTrades} isDark={isDark} />
            <WeeklyBreakdown trades={filteredTrades} isDark={isDark} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <PerformanceRadar trades={filteredTrades} isDark={isDark} />
            <WeeklyBreakdown trades={filteredTrades} isDark={isDark} />
          </div>
        )}

        {/* ===== EQUITY CURVE ===== */}
        <EquityCurve trades={filteredTrades} isDark={isDark} />

        {/* ===== CALENDAR ===== */}
        <TradingCalendar trades={filteredTrades} isMobile={isMobile} isDark={isDark} />
        {/* ===== TRADE FORM ===== */}
        {showForm && (
          <div ref={formRef} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 24, marginBottom: 24, animation: 'slideDown 0.2s ease', boxShadow: editingId ? '0 0 0 2px #60a5fa' : '0 1px 3px rgba(0,0,0,0.04)' }}>

            {/* Form header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#60a5fa', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                {editingId ? 'Edit Trade' : 'New Trade Entry'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} style={{ color: textMuted }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textPrimary }}>Manual logging — all account types supported</span>
              </div>
            </div>

            <form onSubmit={submitTrade}>

              {/* Account Type Pills */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 600 }}>ACCOUNT TYPE</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ACCOUNT_TYPES.map(at => (
                    <button key={at.value} type="button"
                      onClick={() => setForm(f => ({ ...f, accountType: at.value as 'live' | 'propfirm' | 'paper' }))}
                      style={{
                        padding: '12px 20px', borderRadius: 8,
                        fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: `1.5px solid ${form.accountType === at.value ? '#60a5fa' : border}`,
                        background: form.accountType === at.value ? 'rgba(37,99,235,0.12)' : inputBg,
                        color: form.accountType === at.value ? '#60a5fa' : textMuted,
                        boxShadow: form.accountType === at.value ? '0 0 0 1px rgba(37,99,235,0.2)' : 'none',
                      }}>
                      {at.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 1: Date, Time, Direction, Symbol */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>DATE</label>
                  <input type='date' value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>TIME</label>
                  <input type='time' value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>DIRECTION</label>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
                    {(['Long', 'Short'] as const).map(dir => (
                      <button key={dir} type='button' onClick={() => setForm(f => ({ ...f, direction: dir }))}
                        style={{ flex: 1, padding: '8px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.direction === dir ? '#60a5fa' : inputBg, color: form.direction === dir ? '#ffffff' : textMuted, transition: 'all 0.15s' }}>
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>SYMBOL</label>
                  <input type='text' value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder='NQ, ES, AAPL...' style={inputStyle} />
                </div>
              </div>

              {/* Row 2: Contracts (narrow), Entry, Exit, Stop Loss, Take Profit */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '120px 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>CONTRACTS</label>
                  <input type='number' step='0.01' value={form.contracts} onChange={e => setForm(f => ({ ...f, contracts: e.target.value }))} placeholder='1' required style={{ ...inputStyle, maxWidth: 120 }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>ENTRY PRICE</label>
                  <input type='number' step='0.01' value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} placeholder='0.00' required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>EXIT PRICE</label>
                  <input type='number' step='0.01' value={form.exitPrice} onChange={e => setForm(f => ({ ...f, exitPrice: e.target.value }))} placeholder='0.00' required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>STOP LOSS</label>
                  <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 10, color: textMuted, marginBottom: 4 }}>optional</span>
                  <input type='number' step='0.01' value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: e.target.value }))} placeholder='0.00' style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>TAKE PROFIT</label>
                  <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 10, color: textMuted, marginBottom: 4 }}>optional</span>
                  <input type='number' step='0.01' value={form.takeProfit} onChange={e => setForm(f => ({ ...f, takeProfit: e.target.value }))} placeholder='0.00' style={inputStyle} />
                </div>
              </div>

              {/* Row 3: NET P&L (auto), R:R (auto), Emotion */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 2, fontWeight: 600 }}>NET P&L</label>
                  <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 10, color: textMuted, marginBottom: 6 }}>auto-calculated</span>
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
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 2, fontWeight: 600 }}>RISK : REWARD</label>
                  <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 10, color: textMuted, marginBottom: 6 }}>auto-calculated</span>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formRR ? (
                      <span style={{ color: parseFloat(formRR) >= 1 ? '#00c48c' : '#f59e0b', fontWeight: 700 }}>1:{formRR}</span>
                    ) : (
                      <span style={{ color: textMuted }}>—</span>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>EMOTION</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {EMOTION_WORDS.map(em => {
                      const isSelected = form.emotion === em.value
                      return (
                        <button key={em.value} type='button' onClick={() => setForm(f => ({ ...f, emotion: em.value }))}
                          style={{
                            padding: '8px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif',
                            borderRadius: 6, border: `1px solid ${isSelected ? em.border : border}`,
                            background: isSelected ? em.bg : 'rgba(255,255,255,0.05)',
                            color: isSelected ? em.color : textMuted,
                            cursor: 'pointer', transition: 'all 0.15s', fontWeight: isSelected ? 600 : 400,
                          }}>
                          {em.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Playbook Tag */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>TAG PLAYBOOK</label>
                <select value={form.playbookId} onChange={e => setForm(f => ({ ...f, playbookId: e.target.value }))} disabled={playbooks.length === 0} style={{ ...inputStyle, fontFamily: 'Inter, sans-serif' }}>
                  {playbooks.length === 0 ? <option value=''>No playbooks yet</option> : <><option value=''>None</option>{playbooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}</>}
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>NOTES</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder='What happened? Mistakes? Lessons? Setup?' style={{ ...inputStyle, height: 80, resize: 'none' }} />
              </div>

              {/* Chart Screenshot Upload */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 500 }}>Chart Screenshot</label>
                <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, color: textMuted, opacity: 0.7, marginBottom: 8 }}>optional · PNG, JPG up to 5MB</span>
                {form.tradeImage ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={form.tradeImage} alt='Trade screenshot' style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: `1px solid ${border}` }} />
                    <button type='button' onClick={() => setForm(f => ({ ...f, tradeImage: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff4d6a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>×</span>
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '18px 20px', borderRadius: 8, border: '1.5px dashed rgba(37,99,235,0.5)', background: 'rgba(37,99,235,0.08)', cursor: 'pointer', minHeight: 80 }}>
                    <ImagePlus size={24} style={{ color: 'rgba(37,99,235,0.6)' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted }}>Chart Screenshot</span>
                    <input type='file' accept='image/jpeg,image/png,image/webp' style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5MB'); return }
                      const reader = new FileReader()
                      reader.onload = ev => { if (ev.target?.result) setForm(f => ({ ...f, tradeImage: ev.target!.result as string })) }
                      reader.readAsDataURL(file)
                    }} />
                  </label>
                )}
              </div>

              {/* Action buttons — ADD TRADE full width */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type='submit' style={{ width: '100%', height: 48, background: '#60a5fa', border: 'none', borderRadius: '6px', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#60a5fa')}>
                  {editingId ? 'UPDATE TRADE' : 'ADD TRADE'}
                </button>
                <button type='button' onClick={cancelEdit} style={{ width: '100%', height: 36, background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, color: textPrimary, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        )}
        {/* ===== COACH SHAI ===== */}
        <CoachShaiCard insight={coachInsight} isDark={isDark} />

        {/* ===== TRADE LOG TABLE ===== */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              TRADE LOG · {filteredTrades.length} ENTRIES
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height='40px' /><Skeleton height='40px' /><Skeleton height='40px' />
            </div>
          ) : filteredTrades.length === 0 ? (
            <EmptyState icon={BarChart2} heading='NO TRADES LOGGED YET' subtext='Click "Log Trade" above to log your first trade — works for all account types.' />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['DATE','TIME','DIR','SYMBOL','ENTRY','EXIT','QTY','P&L','R:R','EMOTION','NOTES','IMG',''].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTrades].reverse().map(trade => {
                    const tradePnl = trade.pnl
                    const tradeAvgLoss = avgLoss
                    const rr = tradeAvgLoss > 0 ? (tradePnl / tradeAvgLoss).toFixed(1) : '—'
                    const emotionWord = EMOTION_WORDS.find(e => e.value === trade.emotion)
                    return (
                      <tr key={trade.id} className='trade-row' style={{ borderBottom: `1px solid ${border}`, height: 40 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary, whiteSpace: 'nowrap' }}>{trade.date}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary, whiteSpace: 'nowrap' }}>{trade.time || '—'}</td>
                        <td style={{ padding: '6px 14px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, color: trade.direction === 'Long' ? '#60a5fa' : '#ff4d6a', background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)' }}>{trade.direction}</span>
                        </td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary, fontWeight: 600 }}>{trade.symbol || '—'}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.entryPrice}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.exitPrice}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.contracts}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: trade.pnl >= 0 ? '#16a34a' : '#dc2626' }}>${trade.pnl.toFixed(2)}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono, monospace', color: parseFloat(rr) >= 1 ? '#00c48c' : parseFloat(rr) < 0 ? '#ff4d6a' : textPrimary }}>{rr}</td>
                        <td style={{ padding: '6px 14px', fontFamily: 'Inter, sans-serif', fontSize: 11, color: emotionWord ? emotionWord.color : textPrimary }}>{emotionWord ? emotionWord.label : EMOTIONS[(trade.emotion || 3) - 1]}</td>
                        <td style={{ padding: '6px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textPrimary }}>{trade.notes}</td>
                        <td style={{ padding: '6px 14px' }}>
                          {trade.tradeImage && (
                            <img src={trade.tradeImage} alt='Trade screenshot' title='Click to open full image' style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(37,99,235,0.3)' }}
                              onClick={e => { e.stopPropagation(); const w = window.open(); if (w) { w.document.write('<img src="' + trade.tradeImage + '" style="max-width:100%;max-height:100vh;" />') } }} />
                          )}
                        </td>
                        <td style={{ padding: '6px 14px' }}>
                          <div className='trade-actions' style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0, transition: 'opacity 0.15s' }}>
                            <button onClick={() => startEdit(trade)} title='Edit' style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}><Pencil size={12} style={{ color: '#60a5fa' }} /></button>
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
      {showImportModal && (
          <CSVImportModal
            isDark={isDark}
            onClose={() => setShowImportModal(false)}
            onImportComplete={loadTrades}
          />
        )}
        {/* Floating Chat Bubble */}
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          {chatOpen && (
            <div style={{ width: 400, height: 560, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: m.role === 'ai' ? '4px 10px 10px 10px' : '10px 4px 10px 10px', background: m.role === 'ai' ? 'var(--bg-page)' : 'var(--brand)', color: m.role === 'ai' ? 'var(--text-primary)' : '#fff', fontSize: 12, lineHeight: 1.5 }}>{m.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '4px 10px 10px 10px', background: 'var(--bg-page)', color: 'var(--text-muted)', fontSize: 12 }}>...</div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) { const msg = chatInput.trim(); setChatInput(''); sendToTrading(msg) } }} placeholder="Ask anything..." style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={() => { if (chatInput.trim()) { const msg = chatInput.trim(); setChatInput(''); sendToTrading(msg) } }} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--brand)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Send size={13} color="#fff" /></button>
              </div>

              {/* Hide chat bar */}
              <div onClick={() => setChatOpen(false)} style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px', cursor: 'pointer', borderTop: '1px solid var(--border)' }}>Hide chat</div>
            </div>
          )}
          {/* Bubble toggle */}
          <button onClick={() => setChatOpen(p => !p)} style={{ width: 52, height: 52, borderRadius: '50%', background: '#0f1117', border: '2px solid var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }}>
            <MessageCircle size={22} color="var(--brand)" />
          </button>
        </div>
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
