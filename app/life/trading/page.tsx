export const metadata = {
  title: 'Trading Journal'
}

// v6 - Edit + Delete Confirmation
'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Plus, Trash2, Flame, RefreshCw, Loader2, CheckCircle, XCircle, Settings, ChevronLeft, ChevronRight, Pencil, BarChart2 } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

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
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function EmptyState({ icon: Icon, heading, subtext }: { icon: React.ElementType; heading: string; subtext: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: 'rgba(0,242,255,0.3)', marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#888888', fontSize: 13, letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

function CoachShaiCard({ insight }: { insight: CoachInsight }) {
  const [progress, setProgress] = useState(100)

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
    <div
      style={{
        background: 'rgba(0, 242, 255, 0.05)',
        border: '1px solid #00f2ff',
        borderRadius: 8,
        padding: '14px 16px 0 16px',
        marginBottom: 16,
        opacity: insight.fading ? 0 : 1,
        transition: 'opacity 2s ease',
        overflow: 'hidden',
      }}
    >
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00f2ff', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>
        ⚡ COACH SHAI
      </p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary, #ccc)', lineHeight: 1.6, marginBottom: 12 }}>
        {insight.text}
      </p>
      <div style={{ height: 2, background: 'rgba(0,242,255,0.15)', borderRadius: 1, marginBottom: 0 }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#00f2ff',
            borderRadius: 1,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  )
}

function TradovateStatusBar({ onSyncComplete }: { onSyncComplete: () => void }) {
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

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
      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.2)', }}>
        <XCircle size={13} style={{ color: '#ffb400', flexShrink: 0 }} />
        <span className="font-mono" style={{ color: '#ffb400' }}>Tradovate not connected</span>
        <Link href="/life/trading/settings" className="ml-auto font-mono hover:underline" style={{ color: '#00f2ff' }}>
          Connect Tradovate →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', }}>
      <CheckCircle size={13} style={{ color: '#00ff88', flexShrink: 0 }} />
      <span className="font-mono" style={{ color: '#00ff88' }}>Tradovate Connected</span>
      {status.lastSync && (
        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
          · Last sync: {new Date(status.lastSync).toLocaleString()}
        </span>
      )}
      {syncMsg && <span className="font-mono" style={{ color: syncMsg.startsWith('✓') ? '#00ff88' : '#ff00e5' }}>{syncMsg}</span>}
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs disabled:opacity-50 transition-all" style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.3)', color: '#00f2ff' }} >
          {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <Link href="/life/trading/settings" style={{ color: 'var(--text-muted)', opacity: 0.6 }} title="Tradovate Settings">
          <Settings size={13} />
        </Link>
      </div>
    </div>
  )
}

// ---- Trading Calendar Component ----
function TradingCalendar({ trades }: { trades: Trade[] }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const todayStr = today.toISOString().split('T')[0]

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
    <div className="premium-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/[0.08]" style={{ color: '#00f2ff', border: '1px solid rgba(0,242,255,0.3)' }}>
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-3">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          {monthPnl !== 0 && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: monthPnl > 0 ? '#00ff88' : '#ff00e5', background: monthPnl > 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,0,229,0.1)', border: `1px solid ${monthPnl > 0 ? 'rgba(0,255,136,0.3)' : 'rgba(255,0,229,0.3)'}` }}>
              {monthPnl > 0 ? '+' : ''}{monthPnl.toFixed(2)}
            </span>
          )}
        </div>
        <button onClick={nextMonth} className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/[0.08]" style={{ color: '#00f2ff', border: '1px solid rgba(0,242,255,0.3)' }}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-mono py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="rounded-lg" style={{ minHeight: 60 }} />
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayData = dayMap[dateStr]
          const isToday = dateStr === todayStr
          const isSelected = selectedDay === dateStr
          const hasTrades = !!dayData
          const pnl = dayData?.pnl ?? 0
          const isGreen = hasTrades && pnl > 0
          const isRed = hasTrades && pnl < 0
          let bg = 'rgba(255,255,255,0.02)'
          let border = '1px solid rgba(255,255,255,0.05)'
          let pnlColor = 'transparent'
          if (isGreen) { bg = 'rgba(0,255,136,0.15)'; border = '1px solid #00ff88'; pnlColor = '#00ff88' }
          if (isRed) { bg = 'rgba(255,0,229,0.15)'; border = '1px solid #ff00e5'; pnlColor = '#ff00e5' }
          if (isSelected) { border = isGreen ? '2px solid #00ff88' : isRed ? '2px solid #ff00e5' : '1px solid rgba(255,255,255,0.3)' }
          const boxShadow = isToday ? '0 0 0 2px #00f2ff' : undefined
          const transform = isSelected ? 'scale(1.05)' : undefined
          return (
            <div key={dateStr} onClick={() => handleDayClick(dateStr)} style={{ minHeight: 60, borderRadius: 8, background: bg, border, boxShadow, transform, cursor: hasTrades ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px', transition: 'transform 0.15s ease, box-shadow 0.15s ease', position: 'relative', }}>
              <span className="text-xs font-mono font-semibold" style={{ color: isToday ? '#00f2ff' : hasTrades ? 'var(--text-primary)' : 'var(--text-muted)' }}>{day}</span>
              {hasTrades && (<span className="text-[9px] font-mono mt-0.5" style={{ color: pnlColor, lineHeight: 1 }}>{pnl > 0 ? '+' : ''}{pnl.toFixed(0)}</span>)}
            </div>
          )
        })}
      </div>
      {selectedDay && selectedTrades.length > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-mono mb-3" style={{ color: '#00f2ff', letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase' }}>
            Trades — {selectedDay}
          </p>
          <div className="space-y-2">
            {selectedTrades.map(trade => (
              <div key={trade.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: trade.pnl >= 0 ? 'rgba(0,255,136,0.06)' : 'rgba(255,0,229,0.06)', border: `1px solid ${trade.pnl >= 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,229,0.2)'}` }}>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: trade.direction === 'Long' ? '#00ff88' : '#ff00e5', background: trade.direction === 'Long' ? 'rgba(0,255,136,0.12)' : 'rgba(255,0,229,0.12)', border: `1px solid ${trade.direction === 'Long' ? 'rgba(0,255,136,0.3)' : 'rgba(255,0,229,0.3)'}`, flexShrink: 0 }}>{trade.direction}</span>
                {trade.symbol && (<span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)', flexShrink: 0 }}>{trade.symbol}</span>)}
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{trade.time || '--:--'}</span>
                {trade.notes && (<span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>{trade.notes}</span>)}
                <span className="text-xs font-mono font-bold ml-auto flex-shrink-0" style={{ color: trade.pnl >= 0 ? '#00ff88' : '#ff00e5' }}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</span>
                <span className="text-base flex-shrink-0">{EMOTIONS[(trade.emotion || 3) - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TradingJournalInner() {
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

  useEffect(() => {
    loadTrades()
    loadPlaybooks()
  }, [])

  useEffect(() => {
    return () => {
      if (insightTimerRef.current) clearTimeout(insightTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  function startEdit(trade: Trade) {
    setEditingId(trade.id)
    setForm({
      date: trade.date,
      time: trade.time || '',
      direction: trade.direction,
      entryPrice: String(trade.entryPrice),
      exitPrice: String(trade.exitPrice),
      contracts: String(trade.contracts),
      notes: trade.notes || '',
      emotion: trade.emotion || 3,
      playbookId: trade.playbookId || '',
      symbol: trade.symbol || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
  }

  async function triggerCoachInsight(trade: Trade) {
    if (insightTimerRef.current) clearTimeout(insightTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setCoachInsight({ text: 'Coach Shai is watching...', visible: true, fading: false })
    try {
      const res = await fetch('/api/life/trading/coach-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      date: form.date,
      time: form.time,
      direction: form.direction,
      entryPrice: parseFloat(form.entryPrice),
      exitPrice: parseFloat(form.exitPrice),
      contracts: parseFloat(form.contracts),
      notes: form.notes,
      emotion: form.emotion,
      playbookId: form.playbookId || null,
      symbol: form.symbol || undefined,
    }

    if (editingId) {
      // Edit mode: PUT request
      const res = await fetch('/api/life/trading', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...fields })
      })
      const data = await res.json()
      if (res.ok) {
        setTrades(data.logs || [])
        cancelEdit()
      }
    } else {
      // Add mode: POST request
      const res = await fetch('/api/life/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: fields })
      })
      const data = await res.json()
      const savedLogs: Trade[] = data.logs || []
      setTrades(savedLogs)
      setShowForm(false)
      setForm(emptyForm)
      if (res.ok) {
        const savedTrade = savedLogs[savedLogs.length - 1]
        if (savedTrade) { triggerCoachInsight(savedTrade) }
      }
    }
  }

  async function deleteTrade(id: string) {
    const confirmed = window.confirm('Delete this trade? This cannot be undone.')
    if (!confirmed) return
    const res = await fetch('/api/life/trading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'
  const sortedDates = Array.from(new Set(trades.map(t => t.date))).sort().reverse()
  let streak = 0
  for (const d of sortedDates) {
    const dayPnl = trades.filter(t => t.date === d).reduce((s, t) => s + t.pnl, 0)
    if (dayPnl > 0) streak++; else break
  }
  const monthlyData: Record<string, number> = {}
  trades.forEach(t => { const m = t.date.slice(0, 7); monthlyData[m] = (monthlyData[m] || 0) + t.pnl })
  const chartData = Object.entries(monthlyData).sort().map(([month, pnl]) => ({ month: month.slice(5), pnl: Math.round(pnl * 100) / 100 }))
  const bestDay = sortedDates.reduce((best, d) => { const dp = trades.filter(t => t.date === d).reduce((s, t) => s + t.pnl, 0); return dp > best ? dp : best }, 0)
  const worstDay = sortedDates.reduce((worst, d) => { const dp = trades.filter(t => t.date === d).reduce((s, t) => s + t.pnl, 0); return dp < worst ? dp : worst }, 0)

  return (
    <div className="cyber-bg-grid cyber-bg-grid min-h-screen">
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-header">TRADING JOURNAL</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Trade Log</h1>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}><Flame size={12} /> {streak} day streak</div>}
            <Link href="/life/trading/playbook" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold" style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.4)', color: '#00f2ff' }}>PLAYBOOK</Link>
            <Link href="/life/trading/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.2)', color: 'var(--text-muted)' }}><Settings size={12} /> Settings</Link>
            <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(!showForm) }} className="btn-cyber-primary flex items-center gap-2"><Plus size={14} /> Log Trade</button>
          </div>
        </div>

        {/* Tradovate Status Bar */}
        <TradovateStatusBar onSyncComplete={loadTrades} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'TOTAL P&L', value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? '#00ff88' : '#ff00e5' },
            { label: 'WIN RATE', value: `${winRate}%`, color: '#00f2ff' },
            { label: 'AVG R:R', value: rr, color: '#ffb400' },
            { label: 'TRADES', value: trades.length, color: '#00f2ff' },
            { label: 'BEST DAY', value: `$${bestDay.toFixed(2)}`, color: '#00ff88' },
            { label: 'WORST DAY', value: `$${worstDay.toFixed(2)}`, color: '#ff00e5' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <p className="metric-label">{stat.label}</p>
              <p className="metric-value text-lg" style={{ color: stat.color, fontFamily: 'JetBrains Mono' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Trading Calendar */}
        <TradingCalendar trades={trades} />

        {showForm && (
          <div className="premium-card p-5 mb-6" style={editingId ? { boxShadow: '0 0 0 2px #00f2ff' } : {}}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editingId ? '// EDIT TRADE' : '// NEW TRADE ENTRY'}</h3>
            <form onSubmit={submitTrade} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TIME</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="cyber-input w-full" /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DIRECTION</label><select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as 'Long' | 'Short' }))} className="cyber-input w-full"><option value="Long">Long</option><option value="Short">Short</option></select></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>SYMBOL</label><input type="text" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} className="cyber-input w-full" placeholder="NQ, ES..." /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CONTRACTS</label><input type="number" step="0.01" value={form.contracts} onChange={e => setForm(f => ({ ...f, contracts: e.target.value }))} className="cyber-input w-full" placeholder="1" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>ENTRY PRICE</label><input type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} className="cyber-input w-full" placeholder="0.00" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>EXIT PRICE</label><input type="number" step="0.01" value={form.exitPrice} onChange={e => setForm(f => ({ ...f, exitPrice: e.target.value }))} className="cyber-input w-full" placeholder="0.00" required /></div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>EMOTION</label>
                <div className="flex gap-1">{EMOTIONS.map((em, i) => (<button key={i} type="button" onClick={() => setForm(f => ({ ...f, emotion: i + 1 }))} className={`flex-1 py-1.5 text-lg rounded transition-all ${form.emotion === i + 1 ? 'ring-1 ring-cyan-400 bg-cyan-400/10' : 'opacity-40 hover:opacity-70'}`}>{em}</button>))}</div>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>P&amp;L (AUTO)</label>
                <div className="cyber-input flex items-center" style={{ fontFamily: 'JetBrains Mono' }}>
                  {form.entryPrice && form.exitPrice && form.contracts ? (() => { const pnl = form.direction === 'Long' ? (parseFloat(form.exitPrice) - parseFloat(form.entryPrice)) * parseFloat(form.contracts) : (parseFloat(form.entryPrice) - parseFloat(form.exitPrice)) * parseFloat(form.contracts); return <span style={{ color: pnl >= 0 ? '#00ff88' : '#ff00e5' }}>${pnl.toFixed(2)}</span> })() : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TAG PLAYBOOK (OPTIONAL)</label>
                <select value={form.playbookId} onChange={e => setForm(f => ({ ...f, playbookId: e.target.value }))} className="cyber-input w-full" disabled={playbooks.length === 0} style={{ fontFamily: 'JetBrains Mono', background: '#0a0a0f', color: playbooks.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)', borderColor: 'rgba(0,242,255,0.3)' }} >
                  {playbooks.length === 0 ? (
                    <option value="">No playbooks yet — create one</option>
                  ) : (
                    <>
                      <option value="">None</option>
                      {playbooks.map(pb => (
                        <option key={pb.id} value={pb.id}>{pb.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="col-span-2 md:col-span-4"><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full h-20 resize-none" placeholder="What happened? Mistakes? Lessons?" /></div>
              <div className="col-span-2 md:col-span-4 flex gap-3">
                <button type="submit" className="btn-cyber-primary">{editingId ? 'UPDATE TRADE' : 'ADD TRADE'}</button>
                <button type="button" onClick={cancelEdit} style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', background: 'transparent', borderRadius: 6, padding: '6px 16px', fontFamily: 'JetBrains Mono', fontSize: 12, cursor: 'pointer' }}>CANCEL</button>
              </div>
            </form>
          </div>
        )}

        {/* Coach Shai Insight Card */}
        <CoachShaiCard insight={coachInsight} />

        {chartData.length > 0 && (
          <div className="chart-container mb-6">
            <h3 className="section-header mb-4">MONTHLY P&L</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }} formatter={(v: number) => [`$${v}`, 'P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{chartData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#00ff88' : '#ff00e5'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="premium-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}><h3 className="section-header">TRADE LOG · {trades.length} ENTRIES</h3></div>
          {loading ? <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div> : trades.length === 0 ? <div><EmptyState icon={BarChart2} heading="NO TRADES LOGGED YET" subtext="Log your first trade above to start tracking your performance." /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>{['DATE', 'TIME', 'DIR', 'ENTRY', 'EXIT', 'QTY', 'P&L', '😊', 'ACCOUNT', 'NOTES', ''].map(h => <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>{[...trades].reverse().map(trade => (
                  <tr key={trade.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{trade.date}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-muted)' }}>{trade.time || '—'}</td>
                    <td className="px-4 py-3"><span className="badge-pill" style={trade.direction === 'Long' ? { color: '#00ff88', borderColor: 'rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.08)' } : { color: '#ff00e5', borderColor: 'rgba(255,0,229,0.3)', background: 'rgba(255,0,229,0.08)' }}>{trade.direction}</span></td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{trade.entryPrice}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{trade.exitPrice}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{trade.contracts}</td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: trade.pnl >= 0 ? '#00ff88' : '#ff00e5' }}>${trade.pnl.toFixed(2)}</td>
                    <td className="px-4 py-3 text-base">{EMOTIONS[(trade.emotion || 3) - 1]}</td>
                    <td className="px-4 py-3">{trade.accountName ? (<span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.25)', color: '#00f2ff' }}>{trade.accountName}</span>) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: 'var(--text-muted)' }}>{trade.notes}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(trade)} className="opacity-40 hover:opacity-80 transition-opacity" title="Edit trade">
                          <Pencil size={12} style={{ color: '#00f2ff' }} />
                        </button>
                        <button onClick={() => deleteTrade(trade.id)} className="opacity-30 hover:opacity-70 transition-opacity" title="Delete trade">
                          <Trash2 size={12} style={{ color: '#ff00e5' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <LifeHubChat section="trading" apiRoute="/api/life/trading/chat" contextData={{ trades, stats: { totalPnl, winRate, totalTrades: trades.length } }} systemPrompt="You are a trading AI analyst. Analyze the user's trade log and provide insights." defaultOpen={chatOpen} />
    </div>
  )
}

export default function TradingJournalPage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <TradingJournalInner />
    </Suspense>
  )
}
