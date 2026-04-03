'use client'
import { useState, useEffect, Suspense } from 'react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import Link from 'next/link'
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import LifeHubChat from '@/components/LifeHubChat'

// ─── Types ────────────────────────────────────────────────────────────────────
interface IncomeStream {
  id: string
  name: string
  color: string
  emoji: string
}

interface IncomeEntry {
  id: string
  date: string
  amount: number
  streamId: string
  account?: string
  payoutType?: string
  source?: string
  notes?: string
}

interface ExpenseEntry {
  id: string
  date: string
  amount: number
  category: string
  notes?: string
}

interface NetWorthEntry {
  date: string
  assets: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Software', 'Education', 'Travel', 'Equipment', 'Food', 'Other']
const NW_STORAGE_KEY = 'trabits_net_worth_history'
const GOAL_STORAGE_KEY = 'trabits_trading_monthly_goal'

const PRESET_COLORS = ['#00ff88', '#00f2ff', '#ffb400', '#ff2d78', '#c084fc', '#ff6b35']

const DEFAULT_STREAMS: IncomeStream[] = [
  { id: 'trading', name: 'Trading', color: '#00ff88', emoji: '📈' },
  { id: 'content', name: 'Content', color: '#00f2ff', emoji: '🎬' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }
const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function getNetWorthVerdict(history: NetWorthEntry[]): string {
  if (history.length === 0) return ''
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]
  if (!prev) return 'Current net worth: ' + fmt(latest.assets) + '. Keep tracking monthly.'
  const diff = latest.assets - prev.assets
  const pct = prev.assets > 0 ? Math.round((diff / prev.assets) * 100) : 0
  if (diff > 0) return 'Up ' + fmt(diff) + ' (' + pct + '%) from last month — momentum is real.'
  if (diff < 0) return 'Down ' + fmt(Math.abs(diff)) + ' (' + Math.abs(pct) + '%) from last month — stay the course.'
  return 'Net worth held flat this month — stability is underrated.'
}

// ─── New Stream Form ──────────────────────────────────────────────────────────
function NewStreamForm({ onSave, onCancel }: { onSave: (s: Omit<IncomeStream,'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#00ff88')
  const [emoji, setEmoji] = useState('💰')
  return (
    <div className="premium-card p-4 mb-4">
      <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW INCOME STREAM</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 md:col-span-1">
          <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>STREAM NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} className="cyber-input w-full" placeholder="e.g. Freelance" />
        </div>
        <div>
          <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>ICON EMOJI</label>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} className="cyber-input w-full" placeholder="💰" maxLength={2} />
        </div>
        <div>
          <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>COLOR</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={() => name.trim() && onSave({ name: name.trim(), color, emoji })} className="btn-cyber-primary flex-1 text-xs">Save</button>
          <button onClick={onCancel} className="btn-cyber-ghost text-xs">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function FinancePage() {
  const params = useSearchParams()
  const [streams, setStreams] = useState<IncomeStream[]>(DEFAULT_STREAMS)
  const [activeTab, setActiveTab] = useState<string>('trading')
  const [showForm, setShowForm] = useState(false)
  const [showNewStream, setShowNewStream] = useState(false)

  const [income, setIncome] = useState<IncomeEntry[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [shaiMsg, setShaiMsg] = useState<string | null>(null)
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10000)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('10000')

  const [nwHistory, setNwHistory] = useState<NetWorthEntry[]>([])
  const [nwInput, setNwInput] = useState('')
  const [nwDate, setNwDate] = useState(new Date().toISOString().slice(0, 7))
  const [nwSaved, setNwSaved] = useState(false)

  const [incomeForm, setIncomeForm] = useState({
    date: today(), amount: '', notes: '', account: '', source: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    date: today(), category: 'Software', amount: '', notes: '',
  })

  const defaultChatOpen = params.get('chat') === '1'

  // ─── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/life/finance')
      .then(r => r.json())
      .then(d => {
        setIncome(d.income || [])
        setExpenses(d.expenses || [])
        if (d.streams && d.streams.length > 0) setStreams(d.streams)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const g = localStorage.getItem(GOAL_STORAGE_KEY)
    if (g) { setMonthlyGoal(Number(g)); setGoalInput(g) }
    const nw = localStorage.getItem(NW_STORAGE_KEY)
    if (nw) { try { setNwHistory(JSON.parse(nw)) } catch {} }
  }, [])

  // ─── Stream management ────────────────────────────────────────────────────
  async function addStream(s: Omit<IncomeStream, 'id'>) {
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_stream', stream: s }),
    })
    const data = await res.json()
    if (data.streams) setStreams(data.streams)
    setShowNewStream(false)
    setActiveTab(data.streams?.[data.streams.length - 1]?.id || activeTab)
  }

  async function deleteStream(streamId: string) {
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_stream', streamId }),
    })
    const data = await res.json()
    if (data.streams) setStreams(data.streams)
    if (activeTab === streamId) setActiveTab(data.streams?.[0]?.id || 'expenses')
  }

  // ─── Save income ──────────────────────────────────────────────────────────
  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income',
        entry: { ...incomeForm, amount: parseFloat(incomeForm.amount), streamId: activeTab },
      }),
    })
    const data = await res.json()
    setIncome(data.income || [])
    setShowForm(false)
    setIncomeForm({ date: today(), amount: '', notes: '', account: '', source: '' })
    const stream = streams.find(s => s.id === activeTab)
    setShaiMsg(stream ? stream.emoji + ' ' + fmt(parseFloat(incomeForm.amount)) + ' logged to ' + stream.name + '. Keep stacking.' : null)
    setTimeout(() => setShaiMsg(null), 10000)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'expense', entry: { ...expenseForm, amount: parseFloat(expenseForm.amount) } }),
    })
    const data = await res.json()
    setExpenses(data.expenses || [])
    setShowForm(false)
    setExpenseForm({ date: today(), category: 'Software', amount: '', notes: '' })
  }

  async function deleteEntry(id: string, type: 'income' | 'expense') {
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', type, entry: { id } }),
    })
    const data = await res.json()
    if (type === 'income') setIncome(data.income || [])
    else setExpenses(data.expenses || [])
  }

  function saveGoal() {
    const val = parseFloat(goalInput) || 10000
    setMonthlyGoal(val)
    localStorage.setItem(GOAL_STORAGE_KEY, String(val))
    setEditingGoal(false)
  }

  function saveNetWorth() {
    if (!nwInput) return
    const newEntry: NetWorthEntry = { date: nwDate, assets: parseFloat(nwInput) }
    const updated = [...nwHistory.filter(e => e.date !== nwDate), newEntry].sort((a, b) => a.date.localeCompare(b.date))
    setNwHistory(updated)
    localStorage.setItem(NW_STORAGE_KEY, JSON.stringify(updated))
    setNwInput('')
    setNwSaved(true)
    setTimeout(() => setNwSaved(false), 3000)
  }

  // ─── Derived stats ────────────────────────────────────────────────────────
  const totalIn = income.reduce((s, e) => s + e.amount, 0)
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalIn - totalOut

  const streamTotals = streams.map(s => ({
    ...s,
    total: income.filter(e => e.streamId === s.id).reduce((sum, e) => sum + e.amount, 0),
    count: income.filter(e => e.streamId === s.id).length,
  }))

  const currentMonth = new Date().toISOString().slice(0, 7)

  const monthlyMap: Record<string, number> = {}
  for (const e of income) {
    const m = e.date.slice(0, 7)
    monthlyMap[m] = (monthlyMap[m] || 0) + e.amount
  }
  const bestMonth = Object.entries(monthlyMap).sort((a, b) => b[1] - a[1])[0]

  const catMap: Record<string, number> = {}
  for (const e of expenses) catMap[e.category] = (catMap[e.category] || 0) + e.amount
  const biggestCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

  const allMonths = Array.from(new Set([
    ...Object.keys(monthlyMap),
    ...expenses.map(e => e.date.slice(0, 7)),
  ])).sort().slice(-6)

  const chartData = allMonths.map(m => {
    const monthIncome: any = { month: m.slice(5) }
    for (const s of streams) {
      monthIncome[s.name] = income.filter(e => e.streamId === s.id && e.date.slice(0, 7) === m).reduce((sum, e) => sum + e.amount, 0)
    }
    monthIncome.expenses = expenses.filter(e => e.date.slice(0, 7) === m).reduce((sum, e) => sum + e.amount, 0)
    return monthIncome
  })

  const tradingStream = streams.find(s => s.id === 'trading')
  const thisMonthTrading = income.filter(e => e.streamId === 'trading' && e.date.slice(0, 7) === currentMonth).reduce((s, e) => s + e.amount, 0)
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((thisMonthTrading / monthlyGoal) * 100)) : 0

  const nwChartData = nwHistory.map(e => ({ month: e.date.slice(5), assets: e.assets }))
  const nwVerdict = getNetWorthVerdict(nwHistory)

  const activeStream = streams.find(s => s.id === activeTab)
  const activeIncome = income.filter(e => e.streamId === activeTab)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-header">FINANCE</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Finance Dashboard</h1>
          </div>
          <Wallet size={32} style={{ color: '#00ff88', opacity: 0.4 }} />
        </div>

        {/* Coach Shai banner */}
        {shaiMsg && (
          <div className="flex items-start gap-3 mb-5 rounded-xl px-5 py-4 relative"
            style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,242,255,0.06))', border: '1px solid rgba(0,255,136,0.35)' }}>
            <div className="flex-1">
              <span className="block text-[9px] font-mono tracking-widest mb-1.5 font-bold" style={{ color: '#00ff88' }}>COACH SHAI</span>
              <p className="text-sm font-mono" style={{ color: '#00f2ff' }}>{shaiMsg}</p>
            </div>
            <button onClick={() => setShaiMsg(null)} className="opacity-30 hover:opacity-70 text-sm" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="stat-card">
            <p className="metric-label">TOTAL IN (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#00ff88' }}>{fmt(totalIn)}</p>
          </div>
          <div className="stat-card">
            <p className="metric-label">TOTAL OUT (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#ff2d78' }}>{fmt(totalOut)}</p>
          </div>
          <div className="stat-card">
            <p className="metric-label">NET PROFIT (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: netProfit >= 0 ? '#00ff88' : '#ff2d78' }}>
              {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
            </p>
          </div>
          <div className="stat-card">
            <p className="metric-label">TAX RESERVE (25%)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#ffb400' }}>{fmt(Math.max(0, 0.25 * netProfit))}</p>
          </div>
        </div>

        {/* Per-stream breakdown */}
        {streamTotals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {streamTotals.map(s => (
              <div key={s.id} className="premium-card p-4 flex items-center gap-3" style={{ borderLeft: '3px solid ' + s.color }}>
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.name.toUpperCase()}</p>
                  <p className="font-mono font-semibold" style={{ color: s.color }}>{fmt(s.total)}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.count} entries</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly trading goal */}
        {tradingStream && (
          <div className="premium-card p-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>TRADING GOAL — {currentMonth}</p>
                  <button onClick={() => setEditingGoal(!editingGoal)} className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ color: '#00f2ff', background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)' }}>
                    {editingGoal ? 'cancel' : 'edit goal'}
                  </button>
                </div>
                {editingGoal ? (
                  <div className="flex gap-2 items-center">
                    <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} className="cyber-input text-sm w-32" />
                    <button onClick={saveGoal} className="btn-cyber-primary text-xs px-3 py-1.5">Save</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-lg font-bold" style={{ color: '#00ff88' }}>
                      {fmt(thisMonthTrading)} <span className="text-xs ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>/ {fmt(monthlyGoal)}</span>
                    </p>
                    <span className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ color: goalPct >= 100 ? '#00ff88' : '#ffb400', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.2)' }}>
                      {goalPct}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: goalPct + '%', background: goalPct >= 100 ? 'linear-gradient(90deg,#00ff88,#00f2ff)' : 'linear-gradient(90deg,#ffb400,#00f2ff)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best month / biggest expense */}
        {(bestMonth || biggestCat) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {bestMonth && (
              <div className="premium-card p-4 flex items-center gap-3">
                <TrendingUp size={20} style={{ color: '#00ff88', flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BEST INCOME MONTH</p>
                  <p className="font-mono font-semibold" style={{ color: '#00ff88' }}>{bestMonth[0]} — {fmt(bestMonth[1])}</p>
                </div>
              </div>
            )}
            {biggestCat && (
              <div className="premium-card p-4 flex items-center gap-3">
                <TrendingDown size={20} style={{ color: '#ff2d78', flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BIGGEST EXPENSE CATEGORY</p>
                  <p className="font-mono font-semibold" style={{ color: '#ff2d78' }}>{biggestCat[0]} — {fmt(biggestCat[1])}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="chart-container mb-6">
            <h3 className="section-header mb-4">MONTHLY INCOME vs EXPENSES</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                {streams.map(s => <Bar key={s.id} dataKey={s.name} fill={s.color} radius={[4,4,0,0]} />)}
                <Bar dataKey="expenses" fill="#ff2d78" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabs: each stream + expenses + new stream button */}
        <div className="flex gap-1 mb-4 flex-wrap items-center">
          {streams.map(s => (
            <div key={s.id} className="relative group">
              <button onClick={() => { setActiveTab(s.id); setShowForm(false) }}
                className="px-4 py-2 text-xs font-mono font-semibold rounded transition-all flex items-center gap-1.5"
                style={activeTab === s.id
                  ? { background: s.color + '1a', borderBottom: '2px solid ' + s.color, color: s.color }
                  : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
                <span>{s.emoji}</span> {s.name.toUpperCase()}
              </button>
              {!['trading','content'].includes(s.id) && (
                <button onClick={() => deleteStream(s.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: '#ff2d78', color: '#fff', fontSize: '9px' }}>×</button>
              )}
            </div>
          ))}
          <button onClick={() => { setActiveTab('expenses'); setShowForm(false) }}
            className="px-4 py-2 text-xs font-mono font-semibold rounded transition-all"
            style={activeTab === 'expenses'
              ? { background: 'rgba(255,45,120,0.12)', borderBottom: '2px solid #ff2d78', color: '#ff2d78' }
              : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
            EXPENSES
          </button>
          <button onClick={() => setShowNewStream(!showNewStream)}
            className="px-3 py-2 text-xs font-mono font-semibold rounded transition-all flex items-center gap-1"
            style={{ background: 'rgba(0,242,255,0.06)', color: '#00f2ff', border: '1px dashed rgba(0,242,255,0.3)' }}>
            <Plus size={10} /> New Stream
          </button>
          <button onClick={() => setShowForm(!showForm)} className="ml-auto btn-cyber-primary flex items-center gap-1.5 text-xs">
            <Plus size={12} /> Add Entry
          </button>
        </div>

        {/* New stream form */}
        {showNewStream && <NewStreamForm onSave={addStream} onCancel={() => setShowNewStream(false)} />}

        {/* Add income form */}
        {showForm && activeTab !== 'expenses' && activeStream && (
          <div className="premium-card p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: activeStream.color }}>
              // NEW {activeStream.name.toUpperCase()} INCOME {activeStream.emoji}
            </h3>
            <form onSubmit={saveIncome} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label>
                <input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="1500.00" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>ACCOUNT / SOURCE</label>
                <input value={incomeForm.account} onChange={e => setIncomeForm(f => ({ ...f, account: e.target.value }))} className="cyber-input w-full" placeholder="e.g. TopStep, Brand Deal" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={incomeForm.notes} onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="btn-cyber-primary flex-1">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Add expense form */}
        {showForm && activeTab === 'expenses' && (
          <div className="premium-card p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW EXPENSE</h3>
            <form onSubmit={saveExpense} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CATEGORY</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} className="cyber-input w-full">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label>
                <input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="99.00" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="btn-cyber-primary flex-1">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Data table */}
        {loading ? (
          <div className="text-center py-12 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div className="premium-card overflow-hidden mb-6">
            {/* Income stream table */}
            {activeTab !== 'expenses' && activeStream && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-header" style={{ color: activeStream.color }}>
                    {activeStream.emoji} {activeStream.name.toUpperCase()} INCOME · {activeIncome.length} ENTRIES · {fmt(activeIncome.reduce((s,e)=>s+e.amount,0))}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE','ACCOUNT / SOURCE','AMOUNT','NOTES',''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeIncome].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{e.account || e.source || '—'}</td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: activeStream.color }}>{fmt(e.amount)}</td>
                          <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteEntry(e.id, 'income')} className="opacity-30 hover:opacity-70">
                              <Trash2 size={12} style={{ color: '#ff00e5' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeIncome.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No {activeStream.name} income yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Expenses table */}
            {activeTab === 'expenses' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-header">EXPENSES · {expenses.length} ENTRIES · {fmt(expenses.reduce((s,e)=>s+e.amount,0))}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE','CATEGORY','AMOUNT','NOTES',''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td className="px-4 py-3"><span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#ff2d78', borderColor: 'rgba(255,45,120,0.3)' }}>{e.category}</span></td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#ff2d78' }}>{fmt(e.amount)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteEntry(e.id, 'expense')} className="opacity-30 hover:opacity-70">
                              <Trash2 size={12} style={{ color: '#ff00e5' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No expenses yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Net Worth Tracker */}
        <div className="chart-container mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="section-header">NET WORTH TRACKER</h3>
              {nwVerdict && (
                <div className="mt-2 flex items-start gap-2">
                  <span className="text-[9px] font-mono tracking-widest font-bold flex-shrink-0 mt-0.5" style={{ color: '#00ff88' }}>COACH SHAI</span>
                  <p className="text-xs font-mono" style={{ color: '#00f2ff' }}>{nwVerdict}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="month" value={nwDate} onChange={e => setNwDate(e.target.value)} className="cyber-input text-xs" style={{ width: '140px' }} />
              <input type="number" value={nwInput} onChange={e => setNwInput(e.target.value)} className="cyber-input text-xs" placeholder="Current total assets ($)" style={{ width: '200px' }}
                onKeyDown={ev => { if (ev.key === 'Enter') saveNetWorth() }} />
              <button onClick={saveNetWorth} disabled={!nwInput} className="btn-cyber-primary text-xs px-4 py-2 disabled:opacity-40">
                {nwSaved ? '✓ Saved' : 'Update'}
              </button>
            </div>
          </div>
          {nwChartData.length === 0 ? (
            <div className="text-center py-10 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              No net worth data yet — enter your current total assets above to start tracking
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={nwChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }} formatter={(value: number) => [fmt(value), 'Net Worth']} />
                <Line type="monotone" dataKey="assets" stroke="#00f2ff" strokeWidth={2.5} dot={{ fill: '#00f2ff', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#00ff88' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {nwHistory.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[...nwHistory].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                <div key={e.date} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                  style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.15)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{e.date}</span>
                  <span className="font-semibold" style={{ color: '#00f2ff' }}>{fmt(e.assets)}</span>
                  <button onClick={() => { const updated = nwHistory.filter(x => x.date !== e.date); setNwHistory(updated); localStorage.setItem(NW_STORAGE_KEY, JSON.stringify(updated)) }}
                    className="opacity-30 hover:opacity-70 ml-1" style={{ color: '#ff00e5' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LifeHubChat
        section="finance"
        apiRoute="/api/life/finance/chat"
        contextData={{ income, expenses, streams }}
        systemPrompt="You are Coach Shai, a finance AI. Analyze income across all streams, expenses, and net profit. Be direct and insightful."
        defaultOpen={defaultChatOpen}
      />
    </div>
  )
}

export default function Finance() {
  return (
    <Suspense fallback={
      <div className="cyber-bg-grid min-h-screen flex items-center justify-center">
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    }>
      <FinancePage />
    </Suspense>
  )
}
