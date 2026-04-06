// v7 - Clean Premium Design System
'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Plus, Trash2, Flame, RefreshCw, Loader2, CheckCircle, XCircle, Settings, ChevronLeft, ChevronRight, Pencil, BarChart2 } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import StatCard from '@/app/components/ui/StatCard'
import Card from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'

type Trade = {
  id: string; date: string; direction: 'Long' | 'Short'
  entryPrice: number; exitPrice: number; contracts: number
  pnl: number; notes: string; emotion: number; time?: string
  source?: string; accountName?: string; symbol?: string
  playbookId?: string | null
}

type Playbook = {
  id: string
  name: string
  description: string
  createdAt: string
}

type CoachInsight = {
  text: string
  visible: boolean
  fading: boolean
}

const EMOTIONS = ['😰', '😟', '😐', '🙂', '🚀']

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

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
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
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
    <div style={{
      background: surface,
      border: `1px solid ${border}`,
      borderLeft: '3px solid #2563eb',
      borderRadius: 10,
      padding: '16px 20px 0 20px',
      marginBottom: 16,
      opacity: insight.fading ? 0 : 1,
      transition: 'opacity 2s ease',
      overflow: 'hidden',
    }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#2563eb', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>
        ⚡ COACH SHAI
      </p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textPrimary, lineHeight: 1.7, marginBottom: 12 }}>
        {insight.text}
      </p>
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
    setSyncing(true)
    setSyncMsg('')
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
    } finally {
      setSyncing(false)
    }
  }

  if (!status) return null
  if (!status.connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <XCircle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#f59e0b' }}>Tradovate not connected</span>
        <Link href="/life/trading/settings" style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
          Connect Tradovate →
        </Link>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 16px', borderRadius: 8, background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}>
      <CheckCircle size={13} style={{ color: '#00c48c', flexShrink: 0 }} />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00c48c' }}>Tradovate Connected</span>
      {status.lastSync && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted }}>
          · Last sync: {new Date(status.lastSync).toLocaleString()}
        </span>
      )}
      {syncMsg && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: syncMsg.startsWith('✓') ? '#00c48c' : '#ff4d6a' }}>{syncMsg}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6,
            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
            color: '#2563eb', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1,
          }}
        >
          {syncing ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <Link href="/life/trading/settings" style={{ color: textMuted, opacity: 0.6 }} title="Tradovate Settings">
          <Settings size={13} />
        </Link>
      </div>
    </div>
  )
}

// ---- Trading Calendar Component ----
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
  const monthPnl = useMemo(() => {
    return Object.entries(dayMap)
      .filter(([date]) => date.startsWith(monthStr))
      .reduce((sum, [, val]) => sum + val.pnl, 0)
  }, [dayMap, monthStr])

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
  function handleDayClick(dateStr: string) {
    if (!dayMap[dateStr]) return
    setSelectedDay(prev => prev === dateStr ? null : dateStr)
  }

  const selectedTrades = selectedDay ? (dayMap[selectedDay]?.trades || []) : []

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#2563eb', cursor: 'pointer' }}>
          <ChevronLeft size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 600, color: textPrimary, margin: 0 }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          {monthPnl !== 0 && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: monthPnl > 0 ? '#00c48c' : '#ff4d6a',
              background: monthPnl > 0 ? 'rgba(0,196,140,0.1)' : 'rgba(255,77,106,0.1)',
            }}>
              {monthPnl > 0 ? '+' : ''}{monthPnl.toFixed(2)}
            </span>
          )}
        </div>
        <button onClick={nextMonth} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: '#2563eb', cursor: 'pointer' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: isMobile ? 44 : 60, borderRadius: 6 }} />
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
          if (isGreen) { bg = 'rgba(0,196,140,0.1)'; cellBorder = '1px solid #00c48c'; pnlColor = '#00c48c' }
          if (isRed) { bg = 'rgba(255,77,106,0.1)'; cellBorder = '1px solid #ff4d6a'; pnlColor = '#ff4d6a' }
          const boxShadow = isToday ? '0 0 0 2px #2563eb' : isSelected ? '0 0 0 2px rgba(37,99,235,0.5)' : undefined
          return (
            <div key={dateStr} onClick={() => handleDayClick(dateStr)} style={{
              minHeight: isMobile ? 44 : 60, borderRadius: 6, background: bg, border: cellBorder, boxShadow,
              cursor: hasTrades ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px',
              transition: 'box-shadow 0.15s ease',
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: isToday ? '#2563eb' : hasTrades ? textPrimary : textMuted }}>{day}</span>
              {hasTrades && (<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, marginTop: 2, color: pnlColor, lineHeight: 1 }}>{pnl > 0 ? '+' : ''}{pnl.toFixed(0)}</span>)}
            </div>
          )
        })}
      </div>

      {selectedDay && selectedTrades.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Trades — {selectedDay}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedTrades.map(trade => (
              <div key={trade.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 6,
                background: trade.pnl >= 0 ? 'rgba(0,196,140,0.06)' : 'rgba(255,77,106,0.06)',
                border: `1px solid ${trade.pnl >= 0 ? 'rgba(0,196,140,0.2)' : 'rgba(255,77,106,0.2)'}`,
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  color: trade.direction === 'Long' ? '#2563eb' : '#ff4d6a',
                  background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)',
                  flexShrink: 0,
                }}>{trade.direction}</span>
                {trade.symbol && (<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: textPrimary, flexShrink: 0 }}>{trade.symbol}</span>)}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted, flexShrink: 0 }}>{trade.time || '--:--'}</span>
                {trade.notes && (<span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textMuted }}>{trade.notes}</span>)}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, marginLeft: 'auto', flexShrink: 0, color: trade.pnl >= 0 ? '#00c48c' : '#ff4d6a' }}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</span>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{EMOTIONS[(trade.emotion || 3) - 1]}</span>
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
    entryPrice: '',
    exitPrice: '',
    contracts: '',
    notes: '',
    emotion: 3,
    playbookId: '',
    symbol: '',
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

  function startEdit(trade: Trade) {
    setEditingId(trade.id)
    setForm({
      date: trade.date, time: trade.time || '', direction: trade.direction,
      entryPrice: String(trade.entryPrice), exitPrice: String(trade.exitPrice),
      contracts: String(trade.contracts), notes: trade.notes || '',
      emotion: trade.emotion || 3, playbookId: trade.playbookId || '', symbol: trade.symbol || '',
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
        body: JSON.stringify({ trade }),
      })
      const data = await res.json()
      const insightText = data.insight || 'Keep grinding. Every trade is data.'
      setCoachInsight({ text: insightText, visible: true, fading: false })
      fadeTimerRef.current = setTimeout(() => { setCoachInsight(prev => ({ ...prev, fading: true })) }, 13000)
      insightTimerRef.current = setTimeout(() => { setCoachInsight({ text: '', visible: false, fading: false }) }, 15000)
    } catch {
      setCoachInsight({ text: 'Stay sharp. Log the next one.', visible: true, fading: false })
      fadeTimerRef.current = setTimeout(() => { setCoachInsight(prev => ({ ...prev, fading: true })) }, 13000)
      insightTimerRef.current = setTimeout(() => { setCoachInsight({ text: '', visible: false, fading: false }) }, 15000)
    }
  }

  async function submitTrade(e: React.FormEvent) {
    e.preventDefault()
    const fields = {
      date: form.date, time: form.time, direction: form.direction,
      entryPrice: parseFloat(form.entryPrice), exitPrice: parseFloat(form.exitPrice),
      contracts: parseFloat(form.contracts), notes: form.notes, emotion: form.emotion,
      playbookId: form.playbookId || null, symbol: form.symbol || undefined,
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
      setTrades(savedLogs)
      setShowForm(false)
      setForm(emptyForm)
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
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const wins = trades.filter(t => t.pnl > 0)
  const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0'
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const losses = trades.filter(t => t.pnl < 0)
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'
  const sortedDates = Array.from(new Set(trades.map(t => t.date))).sort().reverse()
  let streak = 0
  for (const d of sortedDates) {
    const dayPnl = trades.filter(t => t.date === d).reduce((s, t) => s + t.pnl, 0)
    if (dayPnl > 0) streak++; else break
  }
  const monthlyData: Record<string, number> = {}
  trades.forEach(t => { const m = t.date.slice(0, 7); monthlyData[m] = (monthlyData[m] || 0) + t.pnl })
  const chartData = Object.entries(monthlyData).sort().map(([month, pnl]) => ({ month: month.slice(5), pnl: Math.round(pnl * 100) / 100 }))

  const winRateNum = parseFloat(winRate)
  const winRateColor = winRateNum > 50 ? '#00c48c' : winRateNum < 50 ? '#ff4d6a' : textPrimary
  const pnlColor = totalPnl > 0 ? '#00c48c' : totalPnl < 0 ? '#ff4d6a' : textPrimary

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: inputBg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: textPrimary,
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .trade-row:hover .trade-actions { opacity: 1 !important; }
      ` }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px' : '32px 24px' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Link href='/life' style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Life Hub</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 22 : 28, fontWeight: 700, color: textPrimary, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Trading Journal</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textSecondary, margin: 0 }}>Track your trades, analyze patterns, improve your edge.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {streak > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00c48c' }}><Flame size={12} /> {streak}d streak</div>}
            <Link href='/life/trading/playbook' style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Playbook</Link>
            <Link href='/life/trading/settings' style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: textMuted, fontFamily: 'Inter, sans-serif', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={13} /> Settings</Link>
            <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(!showForm) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Log Trade
            </Button>
          </div>
        </div>
        {/* Tradovate Status */}
        <TradovateStatusBar onSyncComplete={loadTrades} />

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label='TOTAL TRADES' value={trades.length} />
          <StatCard label='WIN RATE' value={winRate + '%'} style={{ color: winRateColor }} />
          <StatCard label='NET P&L' value={'$' + totalPnl.toFixed(2)} style={{ color: pnlColor }} />
          <StatCard label='AVG WIN' value={'$' + avgWin.toFixed(2)} />
          <StatCard label='AVG LOSS' value={'$' + avgLoss.toFixed(2)} />
          <StatCard label='PROFIT FACTOR' value={profitFactor} />
        </div>

        {/* Trading Calendar */}
        <TradingCalendar trades={trades} isMobile={isMobile} isDark={isDark} />

        {/* Trade Form */}
        {showForm && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 24, marginBottom: 24, ...(editingId ? { boxShadow: '0 0 0 2px #2563eb' } : {}) }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: textMuted, marginBottom: 20, letterSpacing: '0.1em' }}>
              {editingId ? '// EDIT TRADE' : '// NEW TRADE ENTRY'}
            </h3>
            <form onSubmit={submitTrade} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
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
                    <button key={dir} type='button' onClick={() => setForm(f => ({ ...f, direction: dir }))} style={{
                      flex: 1, padding: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: form.direction === dir ? '#2563eb' : inputBg,
                      color: form.direction === dir ? '#ffffff' : textMuted,
                      transition: 'all 0.15s',
                    }}>{dir}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>SYMBOL</label>
                <input type='text' value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder='NQ, ES...' style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>CONTRACTS</label>
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
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>EMOTION</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {EMOTIONS.map((em, i) => (
                    <button key={i} type='button' onClick={() => setForm(f => ({ ...f, emotion: i + 1 }))} style={{
                      flex: 1, padding: '6px 2px', fontSize: 16, borderRadius: 4, border: `1px solid ${form.emotion === i + 1 ? '#2563eb' : border}`,
                      background: form.emotion === i + 1 ? 'rgba(37,99,235,0.1)' : inputBg,
                      cursor: 'pointer', opacity: form.emotion === i + 1 ? 1 : 0.5,
                    }}>{em}</button>
                  ))}
                </div>
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
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>TAG PLAYBOOK</label>
                <select value={form.playbookId} onChange={e => setForm(f => ({ ...f, playbookId: e.target.value }))} disabled={playbooks.length === 0} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}>
                  {playbooks.length === 0 ? (<option value=''>No playbooks yet</option>) : (<><option value=''>None</option>{playbooks.map(pb => (<option key={pb.id} value={pb.id}>{pb.name}</option>))}</>)}
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>NOTES</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder='What happened? Mistakes? Lessons?' style={{ ...inputStyle, height: 80, resize: 'none' }} />
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4', display: 'flex', gap: 8 }}>
                <Button type='submit'>{editingId ? 'UPDATE TRADE' : 'ADD TRADE'}</Button>
                <Button type='button' variant='ghost' onClick={cancelEdit}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
        {/* Coach Shai Insight */}
        <CoachShaiCard insight={coachInsight} isDark={isDark} />

        {/* Monthly Chart */}
        {chartData.length > 0 && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>MONTHLY P&L</h3>
            <ResponsiveContainer width='100%' height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey='month' tick={{ fill: textMuted, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textMuted, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, color: textPrimary }} formatter={(v: number) => [`$${v}`, 'P&L']} />
                <Bar dataKey='pnl' radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#00c48c' : '#ff4d6a'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trade Log Table */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              TRADE LOG · {trades.length} ENTRIES
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height='60px' /><Skeleton height='60px' /><Skeleton height='60px' />
            </div>
          ) : trades.length === 0 ? (
            <EmptyState icon={BarChart2} heading='NO TRADES LOGGED YET' subtext='Log your first trade above to start tracking your performance.' />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['DATE','TIME','DIR','SYMBOL','ENTRY','EXIT','QTY','P&L','😊','NOTES',''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().map(trade => (
                    <tr key={trade.id} className='trade-row' style={{ borderBottom: `1px solid ${border}` }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.date}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textMuted }}>{trade.time || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          color: trade.direction === 'Long' ? '#2563eb' : '#ff4d6a',
                          background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)',
                        }}>{trade.direction}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary, fontWeight: 600 }}>{trade.symbol || '—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.entryPrice}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.exitPrice}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.contracts}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: trade.pnl >= 0 ? '#00c48c' : '#ff4d6a' }}>${trade.pnl.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{EMOTIONS[(trade.emotion || 3) - 1]}</td>
                      <td style={{ padding: '12px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: textMuted }}>{trade.notes}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className='trade-actions' style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0, transition: 'opacity 0.15s' }}>
                          <button onClick={() => startEdit(trade)} title='Edit trade' style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Pencil size={13} style={{ color: '#2563eb' }} />
                          </button>
                          <button onClick={() => deleteTrade(trade.id)} title='Delete trade' style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={13} style={{ color: '#ff4d6a' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LifeHubChat
        section='trading'
        apiRoute='/api/life/trading/chat'
        contextData={{ trades, stats: { totalPnl, winRate, totalTrades: trades.length } }}
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
