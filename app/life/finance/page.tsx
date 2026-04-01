'use client'
import { useState, useEffect, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LifeHubChat from '@/components/LifeHubChat'

type IncomeType = 'Trading' | 'Content'
type PayoutType = 'Profit Split' | 'Salary' | 'Bonus'
type ContentSource = 'Brand Deal' | 'Course Sale' | 'Stan Store' | 'YouTube' | 'Other'
type ExpenseCategory = 'Software' | 'Education' | 'Travel' | 'Equipment' | 'Food' | 'Other'

type TradeIncome = {
  id: string
  date: string
  account: string
  amount: number
  payoutType: PayoutType
  notes?: string
}

type ContentIncome = {
  id: string
  date: string
  source: ContentSource
  amount: number
  notes?: string
}

type Expense = {
  id: string
  date: string
  category: ExpenseCategory
  amount: number
  notes?: string
}

type Tab = 'trading' | 'content' | 'expenses'

const PAYOUT_TYPES: PayoutType[] = ['Profit Split', 'Salary', 'Bonus']
const CONTENT_SOURCES: ContentSource[] = ['Brand Deal', 'Course Sale', 'Stan Store', 'YouTube', 'Other']
const EXPENSE_CATS: ExpenseCategory[] = ['Software', 'Education', 'Travel', 'Equipment', 'Food', 'Other']

function FinanceInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('trading')
  const [tradeIncome, setTradeIncome] = useState<TradeIncome[]>([])
  const [contentIncome, setContentIncome] = useState<ContentIncome[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const [tradeForm, setTradeForm] = useState({ date: new Date().toISOString().split('T')[0], account: '', amount: '', payoutType: 'Profit Split' as PayoutType, notes: '' })
  const [contentForm, setContentForm] = useState({ date: new Date().toISOString().split('T')[0], source: 'Brand Deal' as ContentSource, amount: '', notes: '' })
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'Software' as ExpenseCategory, amount: '', notes: '' })

  useEffect(() => {
    fetch('/api/life/finance').then(r => r.json()).then(d => {
      const allIncome: any[] = d.income || []
      setTradeIncome(allIncome.filter(i => !i.source))
      setContentIncome(allIncome.filter(i => i.source))
      setExpenses(d.expenses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function addTradeIncome(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'income', entry: { ...tradeForm, amount: parseFloat(tradeForm.amount) } }) })
    const data = await res.json()
    const allIncome: any[] = data.income || []
    setTradeIncome(allIncome.filter((i: any) => !i.source))
    setContentIncome(allIncome.filter((i: any) => i.source))
    setShowForm(false)
    setTradeForm({ date: new Date().toISOString().split('T')[0], account: '', amount: '', payoutType: 'Profit Split', notes: '' })
  }

  async function addContentIncome(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'income', entry: { ...contentForm, amount: parseFloat(contentForm.amount) } }) })
    const data = await res.json()
    const allIncome: any[] = data.income || []
    setTradeIncome(allIncome.filter((i: any) => !i.source))
    setContentIncome(allIncome.filter((i: any) => i.source))
    setShowForm(false)
    setContentForm({ date: new Date().toISOString().split('T')[0], source: 'Brand Deal', amount: '', notes: '' })
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', entry: { ...expenseForm, amount: parseFloat(expenseForm.amount) } }) })
    const data = await res.json()
    setExpenses(data.expenses || [])
    setShowForm(false)
    setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'Software', amount: '', notes: '' })
  }

  async function deleteItem(id: string, type: 'income' | 'expense') {
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type, entry: { id } }) })
    const data = await res.json()
    if (type === 'income') {
      const allIncome: any[] = data.income || []
      setTradeIncome(allIncome.filter((i: any) => !i.source))
      setContentIncome(allIncome.filter((i: any) => i.source))
    } else {
      setExpenses(data.expenses || [])
    }
  }

  // === Dashboard Stats ===
  const ytdTotalIn = [...tradeIncome, ...contentIncome].reduce((s, i) => s + i.amount, 0)
  const ytdTotalOut = expenses.reduce((s, e) => s + e.amount, 0)
  const ytdNet = ytdTotalIn - ytdTotalOut
  const taxEstimate = Math.max(0, ytdNet * 0.25)

  // Best income month
  const monthlyIncome: Record<string, number> = {}
  for (const i of [...tradeIncome, ...contentIncome]) {
    const m = i.date.slice(0, 7)
    monthlyIncome[m] = (monthlyIncome[m] || 0) + i.amount
  }
  const bestMonth = Object.entries(monthlyIncome).sort((a, b) => b[1] - a[1])[0]

  // Biggest expense category
  const expCats: Record<string, number> = {}
  for (const e of expenses) {
    expCats[e.category] = (expCats[e.category] || 0) + e.amount
  }
  const biggestExpCat = Object.entries(expCats).sort((a, b) => b[1] - a[1])[0]

  // Monthly bar chart data
  const allMonths = [...new Set([...Object.keys(monthlyIncome), ...expenses.reduce((acc, e) => { acc.add(e.date.slice(0, 7)); return acc }, new Set<string>())])].sort()
  const barData = allMonths.slice(-6).map(m => {
    const inc = [...tradeIncome, ...contentIncome].filter(i => i.date.slice(0, 7) === m).reduce((s, i) => s + i.amount, 0)
    const exp = expenses.filter(e => e.date.slice(0, 7) === m).reduce((s, e) => s + e.amount, 0)
    return { month: m.slice(5), income: inc, expenses: exp }
  })

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">FINANCE</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Finance Dashboard</h1>
          </div>
          <Wallet size={32} style={{ color: '#00ff88', opacity: 0.4 }} />
        </div>

        {/* YTD Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="stat-card">
            <p className="metric-label">TOTAL IN (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#00ff88' }}>{fmt(ytdTotalIn)}</p>
          </div>
          <div className="stat-card">
            <p className="metric-label">TOTAL OUT (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#ff2d78' }}>{fmt(ytdTotalOut)}</p>
          </div>
          <div className="stat-card">
            <p className="metric-label">NET PROFIT (YTD)</p>
            <p className="metric-value text-xl font-mono" style={{ color: ytdNet >= 0 ? '#00ff88' : '#ff2d78' }}>
              {ytdNet >= 0 ? '+' : ''}{fmt(ytdNet)}
            </p>
          </div>
          <div className="stat-card">
            <p className="metric-label">TAX RESERVE (25%)</p>
            <p className="metric-value text-xl font-mono" style={{ color: '#ffb400' }}>{fmt(taxEstimate)}</p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>Set aside for taxes</p>
          </div>
        </div>

        {/* Secondary Stats */}
        {(bestMonth || biggestExpCat) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {bestMonth && (
              <div className="cyber-panel p-4 flex items-center gap-3">
                <TrendingUp size={20} style={{ color: '#00ff88', flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BEST INCOME MONTH</p>
                  <p className="font-mono font-semibold" style={{ color: '#00ff88' }}>{bestMonth[0]} — {fmt(bestMonth[1])}</p>
                </div>
              </div>
            )}
            {biggestExpCat && (
              <div className="cyber-panel p-4 flex items-center gap-3">
                <TrendingDown size={20} style={{ color: '#ff2d78', flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BIGGEST EXPENSE CATEGORY</p>
                  <p className="font-mono font-semibold" style={{ color: '#ff2d78' }}>{biggestExpCat[0]} — {fmt(biggestExpCat[1])}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bar Chart */}
        {barData.length > 0 && (
          <div className="chart-container mb-6">
            <h3 className="section-label mb-4">MONTHLY INCOME vs EXPENSES</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Bar dataKey="income" fill="#00ff88" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="#ff2d78" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['trading', 'content', 'expenses'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false) }}
              className="px-4 py-2 text-xs font-mono font-semibold rounded transition-all"
              style={tab === t
                ? { background: 'rgba(0,242,255,0.12)', borderBottom: '2px solid #00f2ff', color: '#00f2ff' }
                : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
              {t === 'trading' ? 'TRADING INCOME' : t === 'content' ? 'CONTENT INCOME' : 'EXPENSES'}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="ml-auto btn-cyber-primary flex items-center gap-1.5 text-xs">
            <Plus size={12} /> Add Entry
          </button>
        </div>

        {/* Forms */}
        {showForm && tab === 'trading' && (
          <div className="cyber-panel p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW TRADING INCOME</h3>
            <form onSubmit={addTradeIncome} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label><input type="date" value={tradeForm.date} onChange={e => setTradeForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>PROP FIRM / ACCOUNT</label><input value={tradeForm.account} onChange={e => setTradeForm(f => ({ ...f, account: e.target.value }))} className="cyber-input w-full" placeholder="TopStep, APEX, etc" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label><input type="number" step="0.01" value={tradeForm.amount} onChange={e => setTradeForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="1500.00" required /></div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>PAYOUT TYPE</label>
                <select value={tradeForm.payoutType} onChange={e => setTradeForm(f => ({ ...f, payoutType: e.target.value as PayoutType }))} className="cyber-input w-full">
                  {PAYOUT_TYPES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label><input value={tradeForm.notes} onChange={e => setTradeForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" /></div>
              <div className="flex items-end gap-2"><button type="submit" className="btn-cyber-primary flex-1">Save</button><button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button></div>
            </form>
          </div>
        )}

        {showForm && tab === 'content' && (
          <div className="cyber-panel p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW CONTENT INCOME</h3>
            <form onSubmit={addContentIncome} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label><input type="date" value={contentForm.date} onChange={e => setContentForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required /></div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>SOURCE</label>
                <select value={contentForm.source} onChange={e => setContentForm(f => ({ ...f, source: e.target.value as ContentSource }))} className="cyber-input w-full">
                  {CONTENT_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label><input type="number" step="0.01" value={contentForm.amount} onChange={e => setContentForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="500.00" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label><input value={contentForm.notes} onChange={e => setContentForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" /></div>
              <div className="flex items-end gap-2"><button type="submit" className="btn-cyber-primary flex-1">Save</button><button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button></div>
            </form>
          </div>
        )}

        {showForm && tab === 'expenses' && (
          <div className="cyber-panel p-4 mb-4">
            <h3 className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>// NEW EXPENSE</h3>
            <form onSubmit={addExpense} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label><input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required /></div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CATEGORY</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))} className="cyber-input w-full">
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>AMOUNT ($)</label><input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} className="cyber-input w-full" placeholder="99.00" required /></div>
              <div><label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label><input value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Optional" /></div>
              <div className="flex items-end gap-2"><button type="submit" className="btn-cyber-primary flex-1">Save</button><button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button></div>
            </form>
          </div>
        )}

        {/* Tables */}
        {loading ? (
          <div className="text-center py-12 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div className="cyber-panel overflow-hidden">
            {tab === 'trading' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-label">TRADING INCOME · {tradeIncome.length} ENTRIES · {fmt(tradeIncome.reduce((s, i) => s + i.amount, 0))}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE','ACCOUNT','AMOUNT','TYPE','NOTES',''].map(h => <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...tradeIncome].sort((a,b) => b.date.localeCompare(a.date)).map(item => (
                        <tr key={item.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{item.date}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{item.account}</td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#00ff88' }}>{fmt(item.amount)}</td>
                          <td className="px-4 py-3"><span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#00f2ff', borderColor: 'rgba(0,242,255,0.3)' }}>{item.payoutType}</span></td>
                          <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{item.notes || '—'}</td>
                          <td className="px-4 py-3"><button onClick={() => deleteItem(item.id, 'income')} className="opacity-30 hover:opacity-70"><Trash2 size={12} style={{ color: '#ff00e5' }} /></button></td>
                        </tr>
                      ))}
                      {tradeIncome.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No trading income yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'content' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-label">CONTENT INCOME · {contentIncome.length} ENTRIES · {fmt(contentIncome.reduce((s, i) => s + i.amount, 0))}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE','SOURCE','AMOUNT','NOTES',''].map(h => <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...contentIncome].sort((a,b) => b.date.localeCompare(a.date)).map(item => (
                        <tr key={item.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{item.date}</td>
                          <td className="px-4 py-3"><span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#ffb400', borderColor: 'rgba(255,180,0,0.3)' }}>{item.source}</span></td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#00ff88' }}>{fmt(item.amount)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{item.notes || '—'}</td>
                          <td className="px-4 py-3"><button onClick={() => deleteItem(item.id, 'income')} className="opacity-30 hover:opacity-70"><Trash2 size={12} style={{ color: '#ff00e5' }} /></button></td>
                        </tr>
                      ))}
                      {contentIncome.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No content income yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'expenses' && (
              <>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
                  <h3 className="section-label">EXPENSES · {expenses.length} ENTRIES · {fmt(expenses.reduce((s, e) => s + e.amount, 0))}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        {['DATE','CATEGORY','AMOUNT','NOTES',''].map(h => <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).map(item => (
                        <tr key={item.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{item.date}</td>
                          <td className="px-4 py-3"><span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#ff2d78', borderColor: 'rgba(255,45,120,0.3)' }}>{item.category}</span></td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#ff2d78' }}>{fmt(item.amount)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{item.notes || '—'}</td>
                          <td className="px-4 py-3"><button onClick={() => deleteItem(item.id, 'expense')} className="opacity-30 hover:opacity-70"><Trash2 size={12} style={{ color: '#ff00e5' }} /></button></td>
                        </tr>
                      ))}
                      {expenses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No expenses yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <LifeHubChat section="finance" apiRoute="/api/life/finance/chat" contextData={{ tradeIncome, contentIncome, expenses }} systemPrompt="You are Coach Shai, a finance AI. Analyze income, expenses, and net profit. Be direct and insightful." defaultOpen={chatOpen} />
    </div>
  )
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <FinanceInner />
    </Suspense>
  )
}
