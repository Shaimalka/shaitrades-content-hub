// v3 - Tradovate integration added
'use client'
import { useState, useEffect, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Plus, Trash2, Flame, RefreshCw, Loader2, CheckCircle, XCircle, Settings } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Trade = {
  id: string; date: string; direction: 'Long' | 'Short'
  entryPrice: number; exitPrice: number; contracts: number
  pnl: number; notes: string; emotion: number; time?: string
  source?: string; accountName?: string; symbol?: string
}

const EMOTIONS = ['😰', '😟', '😐', '🙂', '🚀']

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
      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-lg text-xs" style={{
        background: 'rgba(255,180,0,0.06)',
        border: '1px solid rgba(255,180,0,0.2)',
      }}>
        <XCircle size={13} style={{ color: '#ffb400', flexShrink: 0 }} />
        <span className="font-mono" style={{ color: '#ffb400' }}>Tradovate not connected</span>
        <Link href="/life/trading/settings" className="ml-auto font-mono hover:underline" style={{ color: '#00f2ff' }}>
          Connect Tradovate →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 rounded-lg text-xs" style={{
      background: 'rgba(0,255,136,0.06)',
      border: '1px solid rgba(0,255,136,0.2)',
    }}>
      <CheckCircle size={13} style={{ color: '#00ff88', flexShrink: 0 }} />
      <span className="font-mono" style={{ color: '#00ff88' }}>Tradovate Connected</span>
      {status.lastSync && (
        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
          · Last sync: {new Date(status.lastSync).toLocaleString()}
        </span>
      )}
      {syncMsg && <span className="font-mono" style={{ color: syncMsg.startsWith('✓') ? '#00ff88' : '#ff00e5' }}>{syncMsg}</span>}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs disabled:opacity-50 transition-all"
          style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.3)', color: '#00f2ff' }}
        >
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

function TradingJournalInner() {
  const searchParams = useSearchParams()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    direction: 'Long' as 'Long' | 'Short',
    entryPrice: '', exitPrice: '', contracts: '', notes: '', emotion: 3,
  })

  function loadTrades() {
    fetch('/api/life/trading').then(r => r.json()).then((d: { logs: Trade[] }) => {
      setTrades(d.logs || []); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadTrades() }, [])

  async function submitTrade(e: React.FormEvent) {
    e.preventDefault()
    const entry = { date: form.date, time: form.time, direction: form.direction, entryPrice: parseFloat(form.entryPrice), exitPrice: parseFloat(form.exitPrice), contracts: parseFloat(form.contracts), notes: form.notes, emotion: form.emotion }
    const res = await fetch('/api/life/trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry }) })
    const data = await res.json()
    setTrades(data.logs || [])
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), direction: 'Long', entryPrice: '', exitPrice: '', contracts: '', notes: '', emotion: 3 })
  }

  async function deleteTrade(id: string) {
    const res = await fetch('/api/life/trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', entry: { id } }) })
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
            <Link href="/life/trading/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.2)', color: 'var(--text-muted)' }}><Settings size={12} /> Settings</Link>
            <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2"><Plus size={14} /> Log Trade</button>
          </div>
        </div>

        {/* Tradovate Status Bar */}
        <TradovateStatusBar onSyncComplete={loadTrades} />

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

        {showForm && (
          <div className="premium-card p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW TRADE ENTRY</h3>
            <form onSubmit={submitTrade} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TIME</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="cyber-input w-full" /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DIRECTION</label><select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as 'Long' | 'Short' }))} className="cyber-input w-full"><option value="Long">Long</option><option value="Short">Short</option></select></div>
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
              <div className="col-span-2 md:col-span-4"><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full h-20 resize-none" placeholder="What happened? Mistakes? Lessons?" /></div>
              <div className="col-span-2 md:col-span-4 flex gap-3"><button type="submit" className="btn-cyber-primary">Save Trade</button><button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button></div>
            </form>
          </div>
        )}

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
          {loading ? <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          : trades.length === 0 ? <div className="p-8 text-center"><p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No trades logged yet.</p><button onClick={() => setShowForm(true)} className="btn-cyber-primary mt-3">Log Your First Trade</button></div>
          : (
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
                    <td className="px-4 py-3">
                      {trade.accountName ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.25)', color: '#00f2ff' }}>
                          {trade.accountName}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: 'var(--text-muted)' }}>{trade.notes}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteTrade(trade.id)} className="opacity-30 hover:opacity-70 transition-opacity"><Trash2 size={12} style={{ color: '#ff00e5' }} /></button></td>
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
