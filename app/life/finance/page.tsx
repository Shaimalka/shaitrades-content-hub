'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DollarSign, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type FinanceEntry = {
  id: string
  date: string
  source?: string
  category?: string
  amount: number
  notes?: string
  type: 'income' | 'expense'
}

const INCOME_SOURCES = ['Trading', 'Content', 'Other']
const EXPENSE_CATEGORIES = ['Software', 'Education', 'Travel', 'Equipment', 'Other']

export default function FinancePage() {
  const searchParams = useSearchParams()
  const [income, setIncome] = useState<FinanceEntry[]>([])
  const [expenses, setExpenses] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: 'Trading',
    category: 'Software',
    amount: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/life/finance').then(r => r.json()).then(d => {
      setIncome(d.income || [])
      setExpenses(d.expenses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault()
    const entry = {
      date: form.date,
      amount: parseFloat(form.amount),
      notes: form.notes,
      ...(tab === 'income' ? { source: form.source } : { category: form.category }),
    }
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, entry }),
    })
    const data = await res.json()
    if (tab === 'income') setIncome(data.income || income)
    else setExpenses(data.expenses || expenses)
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], source: 'Trading', category: 'Software', amount: '', notes: '' })
  }

  async function deleteEntry(id: string, type: 'income' | 'expense') {
    const res = await fetch('/api/life/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', type, id }),
    })
    if (res.ok) {
      if (type === 'income') setIncome(prev => prev.filter(e => e.id !== id))
      else setExpenses(prev => prev.filter(e => e.id !== id))
    }
  }

  // Stats
  const currentYear = new Date().getFullYear().toString()
  const ytdIncome = income.filter(e => e.date.startsWith(currentYear)).reduce((s, e) => s + e.amount, 0)
  const ytdExpenses = expenses.filter(e => e.date.startsWith(currentYear)).reduce((s, e) => s + e.amount, 0)
  const ytdNet = ytdIncome - ytdExpenses
  const taxEstimate = ytdNet > 0 ? ytdNet * 0.25 : 0

  // Monthly chart
  const monthlyData: Record<string, { income: number; expense: number }> = {}
  income.forEach(e => {
    const m = e.date.slice(0, 7)
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 }
    monthlyData[m].income += e.amount
  })
  expenses.forEach(e => {
    const m = e.date.slice(0, 7)
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 }
    monthlyData[m].expense += e.amount
  })
  const chartData = Object.entries(monthlyData).sort().map(([month, data]) => ({
    month: month.slice(5),
    income: Math.round(data.income),
    expense: Math.round(data.expense),
    net: Math.round(data.income - data.expense),
  }))

  const currentEntries = tab === 'income' ? income : expenses

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">FINANCE</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Finance Tracker</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
            <Plus size={14} /> Add Entry
          </button>
        </div>

        {/* YTD Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'YTD INCOME', value: `$${ytdIncome.toLocaleString()}`, color: '#00ff88', icon: TrendingUp },
            { label: 'YTD EXPENSES', value: `$${ytdExpenses.toLocaleString()}`, color: '#ff00e5', icon: TrendingDown },
            { label: 'YTD NET', value: `$${ytdNet.toLocaleString()}`, color: ytdNet >= 0 ? '#00ff88' : '#ff00e5', icon: DollarSign },
            { label: 'TAX SET ASIDE (25%)', value: `$${taxEstimate.toLocaleString()}`, color: '#ffb400', icon: DollarSign },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={12} style={{ color: s.color }} />
                  <p className="metric-label">{s.label}</p>
                </div>
                <p className="metric-value text-lg" style={{ color: s.color, fontFamily: 'JetBrains Mono' }}>{s.value}</p>
              </div>
            )
          })}
        </div>

        {/* Monthly Chart */}
        {chartData.length > 0 && (
          <div className="chart-container mb-6">
            <h3 className="section-label mb-4">MONTHLY INCOME VS EXPENSES</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                  formatter={(v: number, name: string) => [`$${v}`, name]} />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Bar dataKey="income" fill="#00ff88" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ff00e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Add Entry Form */}
        {showForm && (
          <div className="cyber-panel p-5 mb-6">
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setTab('income')} className={`cyber-tab ${tab === 'income' ? 'active' : ''}`}>Income</button>
              <button type="button" onClick={() => setTab('expense')} className={`cyber-tab ${tab === 'expense' ? 'active' : ''}`}>Expense</button>
            </div>
            <form onSubmit={submitEntry} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              {tab === 'income' ? (
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>SOURCE</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="cyber-input w-full">
                    {INCOME_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CATEGORY</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="cyber-input w-full">
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="0.00" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional notes" />
              </div>
              <div className="md:col-span-4 flex gap-3">
                <button type="submit" className="btn-cyber-primary">Save Entry</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs + Table */}
        <div className="cyber-panel overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
            <div className="cyber-tabs">
              <button onClick={() => setTab('income')} className={`cyber-tab ${tab === 'income' ? 'active' : ''}`}>Income ({income.length})</button>
              <button onClick={() => setTab('expense')} className={`cyber-tab ${tab === 'expense' ? 'active' : ''}`}>Expenses ({expenses.length})</button>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : currentEntries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>No {tab} entries yet.</p>
              <button onClick={() => setShowForm(true)} className="btn-cyber-primary">Add First {tab === 'income' ? 'Income' : 'Expense'}</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                    {['DATE', tab === 'income' ? 'SOURCE' : 'CATEGORY', 'AMOUNT', 'NOTES', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...currentEntries].reverse().map(entry => (
                    <tr key={entry.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{entry.date}</td>
                      <td className="px-4 py-3">
                        <span className="badge-pill" style={tab === 'income' ? { color: '#00f2ff', borderColor: 'rgba(0,242,255,0.3)', background: 'rgba(0,242,255,0.08)' } : { color: '#ff00e5', borderColor: 'rgba(255,0,229,0.3)', background: 'rgba(255,0,229,0.08)' }}>
                          {tab === 'income' ? entry.source : entry.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold" style={{ color: tab === 'income' ? '#00ff88' : '#ff00e5' }}>
                        ${entry.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{entry.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteEntry(entry.id, tab)} className="opacity-30 hover:opacity-70">
                          <Trash2 size={12} style={{ color: '#ff00e5' }} />
                        </button>
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
        section="finance"
        apiRoute="/api/life/finance/chat"
        contextData={{ income, expenses, ytdNet, taxEstimate }}
        systemPrompt="You are a personal finance AI. Analyze income, expenses, and provide tax and savings guidance."
        defaultOpen={chatOpen}
      />
    </div>
  )
}
