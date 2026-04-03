'use client'

import { useState, useEffect, Suspense } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import LifeHubChat from '@/components/LifeHubChat'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeEntry {
  id: string
  date: string
  amount: number
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

const TRADING_PAYOUT_TYPES = ['Profit Split', 'Salary', 'Bonus']
const CONTENT_SOURCES      = ['Brand Deal', 'Course Sale', 'Stan Store', 'YouTube', 'Other']
const EXPENSE_CATEGORIES   = ['Software', 'Education', 'Travel', 'Equipment', 'Food', 'Other']

const NW_STORAGE_KEY   = 'trabits_net_worth_history'
const GOAL_STORAGE_KEY = 'trabits_trading_monthly_goal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0]
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ─── Coach Shai response logic ────────────────────────────────────────────────

function getShaiResponse(
  type: 'trading' | 'content',
  amount: number,
  allIncome: IncomeEntry[],
  monthlyGoal: number,
): string {
  // ① Top-3 biggest single payout check (across all income)
  const sorted = [...allIncome].sort((a, b) => b.amount - a.amount)
  const isTop1 = sorted.length >= 1 && amount >= sorted[0].amount
  const isTop2 = sorted.length >= 2 && amount >= sorted[1].amount
  const isTop3 = sorted.length >= 3 && amount >= sorted[2].amount

  if (isTop1 && sorted.length >= 1) {
    return "That's your biggest single payout. Take a moment. 🏆"
  }
  if (isTop2 && sorted.length >= 2) {
    return "That's your 2nd biggest payout ever. You're building. 🔥"
  }
  if (isTop3 && sorted.length >= 3) {
    return "Top 3 biggest payout. The numbers are climbing. 📈"
  }

  // ② Trading income: X% of monthly goal
  if (type === 'trading') {
    const pct = monthlyGoal > 0 ? Math.round((amount / monthlyGoal) * 100) : 0
    return `That's a ${pct}% of your monthly goal. How does it feel to earn from trading?`
  }

  // ③ Content income: milestone acknowledgement
  const totalContent = allIncome
    .filter(e => e.source)
    .reduce((s, e) => s + e.amount, 0)
  const count = allIncome.filter(e => e.source).length

  if (count === 1) return 'First content income logged. The creator era begins. 🎬'
  if (count === 5) return '5 content payouts in. You\'re building a real revenue stream.'
  if (count === 10) return '10 content entries. Consistency is compounding.'
  if (totalContent >= 10000) return `${fmt(totalContent)} total content income. That\'s a business.`
  if (totalContent >= 5000) return `${fmt(totalContent)} from content. Halfway to five figures.`
  if (totalContent >= 1000) return 'Content income crossed $1,000. The brand is paying off.'
  return `${fmt(amount)} logged from content. Stack it.`
}

// ─── Net Worth verdict ────────────────────────────────────────────────────────

function getNetWorthVerdict(history: NetWorthEntry[]): string {
  if (history.length === 0) return ''
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const prev   = sorted[sorted.length - 2]

  if (!prev) return `Current net worth: ${fmt(latest.assets)}. Keep tracking monthly.`

  const diff = latest.assets - prev.assets
  const pct  = prev.assets > 0 ? Math.round((diff / prev.assets) * 100) : 0

  if (diff > 0) return `Up ${fmt(diff)} (${pct}%) from last month — momentum is real.`
  if (diff < 0) return `Down ${fmt(Math.abs(diff))} (${Math.abs(pct)}%) from last month — stay the course.`
  return 'Net worth held flat this month — stability is underrated.'
}

// ─── Main component ───────────────────────────────────────────────────────────

function FinancePage() {
  const params = useSearchParams()

  // ── Tab & form state
  const [activeTab, setActiveTab] = useState<'trading' | 'content' | 'expenses'>('trading')
  const [showForm, setShowForm]   = useState(false)

  // ── Data
  const [tradingIncome, setTradingIncome] = useState<IncomeEntry[]>([])
  const [contentIncome, setContentIncome] = useState<IncomeEntry[]>([])
  const [expenses,      setExpenses]      = useState<ExpenseEntry[]>([])
  const [loading,       setLoading]       = useState(true)

  // ── Coach Shai auto-response
  const [shaiMsg, setShaiMsg] = useState<string | null>(null)

  // ── Monthly trading goal
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10000)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput,   setGoalInput]   = useState('10000')

  // ── Net Worth
  const [nwHistory, setNwHistory] = useState<NetWorthEntry[]>([])
  const [nwInput,   setNwInput]   = useState('')
  const [nwDate,    setNwDate]    = useState(new Date().toISOString().slice(0, 7))
  const [nwSaved,   setNwSaved]   = useState(false)

  // ── Entry forms
  const [tradingForm, setTradingForm] = useState({
    date: today(), account: '', amount: '', payoutType: 'Profit Split', notes: '',
  })
  const [contentForm, setContentForm] = useState({
    date: today(), source: 'Brand Deal', amount: '', notes: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    date: today(), category: 'Software', amount: '', notes: '',
  })

  const defaultChatOpen = params.get('chat') === '1'

  // ─── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/life/finance')
      .then(r => r.json())
      .then(d => {
        const inc: IncomeEntry[] = d.income || []
        setTradingIncome(inc.filter(e => !e.source))
        setContentIncome(inc.filter(e =>  e.source))
        setExpenses(d.expenses || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const g  = localStorage.getItem(GOAL_STORAGE_KEY)
    if (g) { setMonthlyGoal(Number(g)); setGoalInput(g) }
    const nw = localStorage.getItem(NW_STORAGE_KEY)
    if (nw) { try { setNwHistory(JSON.parse(nw)) } catch {} }
  }, [])

  // ─── Save handlers ─────────────────────────────────────────────────────────

  async function saveTradingIncome(e: React.FormEvent) {
    e.preventDefault()
    const res  = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'income', entry: { ...tradingForm, amount: parseFloat(tradingForm.amount) } }),
    })
    const data = await res.json()
    const inc: IncomeEntry[] = data.income || []
    const newT = inc.filter(e => !e.source)
    const newC = inc.filter(e =>  e.source)
    setTradingIncome(newT)
    setContentIncome(newC)
    setShowForm(false)
    setTradingForm({ date: today(), account: '', amount: '', payoutType: 'Profit Split', notes: '' })

    const amt = parseFloat(tradingForm.amount)
    setShaiMsg(getShaiResponse('trading', amt, [...newT, ...newC], monthlyGoal))
    setTimeout(() => setShaiMsg(null), 12000)
  }

  async function saveContentIncome(e: React.FormEvent) {
    e.preventDefault()
    const res  = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'income', entry: { ...contentForm, amount: parseFloat(contentForm.amount) } }),
    })
    const data = await res.json()
    const inc: IncomeEntry[] = data.income || []
    const newT = inc.filter(e => !e.source)
    const newC = inc.filter(e =>  e.source)
    setTradingIncome(newT)
    setContentIncome(newC)
    setShowForm(false)
    setContentForm({ date: today(), source: 'Brand Deal', amount: '', notes: '' })

    const amt = parseFloat(contentForm.amount)
    setShaiMsg(getShaiResponse('content', amt, [...newT, ...newC], monthlyGoal))
    setTimeout(() => setShaiMsg(null), 12000)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const res  = await fetch('/api/life/finance', {
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
    const res  = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', type, entry: { id } }),
    })
    const data = await res.json()
    if (type === 'income') {
      const inc: IncomeEntry[] = data.income || []
      setTradingIncome(inc.filter(e => !e.source))
      setContentIncome(inc.filter(e =>  e.source))
    } else {
      setExpenses(data.expenses || [])
    }
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
    const updated = [...nwHistory.filter(e => e.date !== nwDate), newEntry]
      .sort((a, b) => a.date.localeCompare(b.date))
    setNwHistory(updated)
    localStorage.setItem(NW_STORAGE_KEY, JSON.stringify(updated))
    setNwInput('')
    setNwSaved(true)
    setTimeout(() => setNwSaved(false), 3000)
  }

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const totalIn   = [...tradingIncome, ...contentIncome].reduce((s, e) => s + e.amount, 0)
  const totalOut  = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalIn - totalOut

  const monthlyMap: Record<string, number> = {}
  for (const e of [...tradingIncome, ...contentIncome]) {
    const m = e.date.slice(0, 7)
    monthlyMap[m] = (monthlyMap[m] || 0) + e.amount
  }
  const bestMonth = Object.entries(monthlyMap).sort((a, b) => b[1] - a[1])[0]

  const catMap: Record<string, number> = {}
  for (const e of expenses) catMap[e.category] = (catMap[e.category] || 0) + e.amount
  const biggestCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

  const allMonths = Array.from(new Set([
    ...Object.keys(monthlyMap),
    ...Array.from(expenses.reduce((s, e) => { s.add(e.date.slice(0, 7)); return s }, new Set<string>())),
  ])).sort().slice(-6)

  const chartData = allMonths.map(m => ({
    month:    m.slice(5),
    income:   [...tradingIncome, ...contentIncome].filter(e => e.date.slice(0, 7) === m).reduce((s, e) => s + e.amount, 0),
    expenses: expenses.filter(e => e.date.slice(0, 7) === m).reduce((s, e) => s + e.amount, 0),
  }))

  const currentMonth     = new Date().toISOString().slice(0, 7)
  const thisMonthTrading = tradingIncome
    .filter(e => e.date.slice(0, 7) === currentMonth)
    .reduce((s, e) => s + e.amount, 0)
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((thisMonthTrading / monthlyGoal) * 100)) : 0

  const nwChartData = nwHistory.map(e => ({ month: e.date.slice(5), assets: e.assets }))
  const nwVerdict   = getNetWorthVerdict(nwHistory)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>
              ← LIFE HUB
            </Link>
            <span className="section-header">FINANCE</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Finance Dashboard</h1>
          </div>
          <Wallet size={32} style={{ color: '#00ff88', opacity: 0.4 }} />
        </div>

        {/* Coach Shai auto-response banner */}
        {shaiMsg && (
          <div
            className="flex items-start gap-3 mb-5 rounded-xl px-5 py-4 relative animate-in fade-in duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,242,255,0.06))',
              border: '1px solid rgba(0,255,136,0.35)',
              boxShadow: '0 0 16px rgba(0,255,136,0.15)',
            }}
          >
            <div className="flex-1">
              <span
                className="block text-[9px] font-mono tracking-widest mb-1.5 font-bold"
                style={{ color: '#00ff88', fontVariant: 'small-caps' }}
              >
                COACH SHAI
              </span>
              <p className="text-sm font-mono leading-relaxed" style={{ color: '#00f2ff' }}>{shaiMsg}</p>
            </div>
            <button
              onClick={() => setShaiMsg(null)}
              className="opacity-30 hover:opacity-70 flex-shrink-0 text-sm ml-2"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
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
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>Set aside for taxes</p>
          </div>
        </div>

        {/* Monthly trading goal */}
        <div className="premium-card p-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  TRADING GOAL — {currentMonth}
                </p>
                <button
                  onClick={() => setEditingGoal(!editingGoal)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ color: '#00f2ff', background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)' }}
                >
                  {editingGoal ? 'cancel' : 'edit goal'}
                </button>
              </div>
              {editingGoal ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    className="cyber-input text-sm w-32"
                    placeholder="10000"
                  />
                  <button onClick={saveGoal} className="btn-cyber-primary text-xs px-3 py-1.5">Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="font-mono text-lg font-bold" style={{ color: '#00ff88' }}>
                    {fmt(thisMonthTrading)}
                    <span className="text-xs ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>/ {fmt(monthlyGoal)}</span>
                  </p>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      color: goalPct >= 100 ? '#00ff88' : '#ffb400',
                      background: 'rgba(255,180,0,0.08)',
                      border: '1px solid rgba(255,180,0,0.2)',
                    }}
                  >
                    {goalPct}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: goalPct + '%',
                    background: goalPct >= 100
                      ? 'linear-gradient(90deg, #00ff88, #00f2ff)'
                      : 'linear-gradient(90deg, #ffb400, #00f2ff)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

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

        {/* Monthly income vs expenses chart */}
        {chartData.length > 0 && (
          <div className="chart-container mb-6">
            <h3 className="section-header mb-4">MONTHLY INCOME vs EXPENSES</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Bar dataKey="income"   fill="#00ff88" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ff2d78" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Income / Expense tabs */}
        <div className="flex gap-1 mb-4">
          {(['trading', 'content', 'expenses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setShowForm(false) }}
              className="px-4 py-2 text-xs font-mono font-semibold rounded transition-all"
              style={activeTab === tab
                ? { background: 'rgba(0,242,255,0.12)', borderBottom: '2px solid #00f2ff', color: '#00f2ff' }
                : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }
              }
            >
              {tab === 'trading' ? 'TRADING INCOME' : tab === 'content' ? 'CONTENT INCOME' : 'EXPENSES'}
            </button>
          ))}
          <button
            onClick={() => setShowForm(!showForm)}
            className="ml-auto btn-cyber-primary flex items-center gap-1.5 text-xs"
          >
            <Plus size={12} /> Add Entry
          </button>
        </div>

        {/* Add trading income form */}
        {showForm && activeTab === 'trading' && (
          <div className="premium-card p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW TRADING INCOME</h3>
            <form onSubmit={saveTradingIncome} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={tradingForm.date} onChange={e => setTradingForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>PROP FIRM / ACCOUNT</label>
                <input value={tradingForm.account} onChange={e => setTradingForm(f => ({ ...f, account: e.target.value }))} className="cyber-input w-full" placeholder="TopStep, APEX, etc" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label>
                <input type="number" step="0.01" value={tradingForm.amount} onChange={e => setTradingForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="1500.00" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>PAYOUT TYPE</label>
                <select value={tradingForm.payoutType} onChange={e => setTradingForm(f => ({ ...f, payoutType: e.target.value }))} className="cyber-input w-full">
                  {TRADING_PAYOUT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={tradingForm.notes} onChange={e => setTradingForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="btn-cyber-primary flex-1">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Add content income form */}
        {showForm && activeTab === 'content' && (
          <div className="premium-card p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW CONTENT INCOME</h3>
            <form onSubmit={saveContentIncome} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={contentForm.date} onChange={e => setContentForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>SOURCE</label>
                <select value={contentForm.source} onChange={e => setContentForm(f => ({ ...f, source: e.target.value }))} className="cyber-input w-full">
                  {CONTENT_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label>
                <input type="number" step="0.01" value={contentForm.amount} onChange={e => setContentForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="500.00" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={contentForm.notes} onChange={e => setContentForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" />
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

            {/* Trading income table */}
            {activeTab === 'trading' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-header">
                    TRADING INCOME · {tradingIncome.length} ENTRIES · {fmt(tradingIncome.reduce((s, e) => s + e.amount, 0))}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE', 'ACCOUNT', 'AMOUNT', 'TYPE', 'NOTES', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...tradingIncome].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{e.account}</td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#00ff88' }}>{fmt(e.amount)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#00f2ff', borderColor: 'rgba(0,242,255,0.3)' }}>
                              {e.payoutType}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteEntry(e.id, 'income')} className="opacity-30 hover:opacity-70">
                              <Trash2 size={12} style={{ color: '#ff00e5' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tradingIncome.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            No trading income yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Content income table */}
            {activeTab === 'content' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-header">
                    CONTENT INCOME · {contentIncome.length} ENTRIES · {fmt(contentIncome.reduce((s, e) => s + e.amount, 0))}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE', 'SOURCE', 'AMOUNT', 'NOTES', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...contentIncome].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#ffb400', borderColor: 'rgba(255,180,0,0.3)' }}>
                              {e.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#00ff88' }}>{fmt(e.amount)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteEntry(e.id, 'income')} className="opacity-30 hover:opacity-70">
                              <Trash2 size={12} style={{ color: '#ff00e5' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {contentIncome.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            No content income yet
                          </td>
                        </tr>
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
                  <h3 className="section-header">
                    EXPENSES · {expenses.length} ENTRIES · {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE', 'CATEGORY', 'AMOUNT', 'NOTES', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#ff2d78', borderColor: 'rgba(255,45,120,0.3)' }}>
                              {e.category}
                            </span>
                          </td>
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
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            No expenses yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            NET WORTH TRACKER
        ════════════════════════════════════════════════════════════ */}
        <div className="chart-container mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="section-header">NET WORTH TRACKER</h3>
              {nwVerdict && (
                <div className="mt-2 flex items-start gap-2">
                  <span className="text-[9px] font-mono tracking-widest font-bold flex-shrink-0 mt-0.5" style={{ color: '#00ff88', fontVariant: 'small-caps' }}>
                    COACH SHAI
                  </span>
                  <p className="text-xs font-mono" style={{ color: '#00f2ff' }}>{nwVerdict}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="month"
                value={nwDate}
                onChange={e => setNwDate(e.target.value)}
                className="cyber-input text-xs"
                style={{ width: '140px' }}
              />
              <input
                type="number"
                value={nwInput}
                onChange={e => setNwInput(e.target.value)}
                className="cyber-input text-xs"
                placeholder="Current total assets ($)"
                style={{ width: '200px' }}
                onKeyDown={ev => { if (ev.key === 'Enter') saveNetWorth() }}
              />
              <button
                onClick={saveNetWorth}
                disabled={!nwInput}
                className="btn-cyber-primary text-xs px-4 py-2 disabled:opacity-40"
              >
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
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                  formatter={(value: number) => [fmt(value), 'Net Worth']}
                />
                <Line
                  type="monotone"
                  dataKey="assets"
                  stroke="#00f2ff"
                  strokeWidth={2.5}
                  dot={{ fill: '#00f2ff', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#00ff88' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* History pills */}
          {nwHistory.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[...nwHistory].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <div
                  key={e.date}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                  style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.15)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{e.date}</span>
                  <span className="font-semibold" style={{ color: '#00f2ff' }}>{fmt(e.assets)}</span>
                  <button
                    onClick={() => {
                      const updated = nwHistory.filter(x => x.date !== e.date)
                      setNwHistory(updated)
                      localStorage.setItem(NW_STORAGE_KEY, JSON.stringify(updated))
                    }}
                    className="opacity-30 hover:opacity-70 ml-1"
                    style={{ color: '#ff00e5' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <LifeHubChat
        section="finance"
        apiRoute="/api/life/finance/chat"
        contextData={{ tradeIncome: tradingIncome, contentIncome, expenses }}
        systemPrompt="You are Coach Shai, a finance AI. Analyze income, expenses, and net profit. Be direct and insightful."
        defaultOpen={defaultChatOpen}
      />
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Finance() {
  return (
    <Suspense
      fallback={
        <div className="cyber-bg-grid min-h-screen flex items-center justify-center">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        </div>
      }
    >
      <FinancePage />
    </Suspense>
  )
}
