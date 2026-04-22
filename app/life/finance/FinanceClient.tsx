'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import Link from 'next/link'
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Pencil, X, DollarSign, BarChart2, Settings, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import LifeHubChat from '@/components/LifeHubChat'
import { useTheme } from '@/app/contexts/ThemeContext'
import PageHeader from '@/app/components/PageHeader'
import TrendIndicators from './components/TrendIndicators'
import NetWorthHistoryChart from './components/NetWorthHistoryChart'
import NetWorthPies from './components/NetWorthPies'
import MilestonesStrip from './components/MilestonesStrip'
import SnapshotModal from './components/SnapshotModal'
import type { NetWorthSnapshot, Milestone, FinancePreferences } from '@/lib/finance-keys'

interface IncomeStream { id: string; name: string; color: string; emoji: string }
interface IncomeEntry { id: string; date: string; amount: number; streamId: string; account?: string; payoutType?: string; source?: string; notes?: string }
interface ExpenseEntry { id: string; date: string; amount: number; category: string; notes?: string }
interface Asset { id: string; name: string; value: number; category: 'Cash' | 'Crypto' | 'Stocks' | 'Real Estate' | 'Other'; liquidity?: 'liquid' | 'illiquid' }
interface Liability { id: string; name: string; amount: number; category: 'Credit Card' | 'Loan' | 'Other' }
interface Debt { id: string; userId: string; name: string; type: 'credit_card' | 'student_loan' | 'personal_loan' | 'mortgage' | 'auto_loan' | 'other'; balance: number; originalBalance: number; interestRate: number; minimumPayment: number; dueDayOfMonth?: number; payoffDate?: string; createdAt: string; updatedAt: string }

const LIQUID_DEFAULT_BY_CATEGORY: Record<Asset['category'], 'liquid' | 'illiquid'> = {
  Cash: 'liquid',
  Crypto: 'liquid',
  Stocks: 'liquid',
  'Real Estate': 'illiquid',
  Other: 'illiquid',
}
function getAssetLiquidity(a: Asset): 'liquid' | 'illiquid' {
  return a.liquidity ?? LIQUID_DEFAULT_BY_CATEGORY[a.category] ?? 'illiquid'
}

type DebtAnalysis = {
  strategy: 'avalanche' | 'snowball' | 'hybrid' | 'emergency_first' | 'consolidation'
  strategyLabel: string
  why: string
  monthlyPlan: Array<{ debtId: string; debtName: string; amount: number; note: string }>
  timeline: Array<{ date: string; milestone: string }>
  debtFreeDate: string
  interestSaved: number
  sustainabilityNote: string | null
  analyzedAt: string
}

// Client-side mirror of server simulateMinimumsOnly — total interest if paying only minimums.
function computeInterestAtMinimums(ds: Debt[]): number {
  let total = 0
  for (const d of ds) {
    if (d.balance <= 0) continue
    let bal = d.balance
    const rate = (d.interestRate || 0) / 100 / 12
    let localTotal = 0
    let broke = false
    for (let i = 0; i < 600 && bal > 0.01; i++) {
      const ix = bal * rate
      const principal = Math.max(0, d.minimumPayment - ix)
      localTotal += ix
      bal -= principal
      if (principal <= 0) { broke = true; break }
    }
    if (broke) return Number.POSITIVE_INFINITY
    total += localTotal
  }
  return total
}
const DEBT_TYPE_LABELS: Record<Debt['type'], string> = { credit_card: 'Credit Card', student_loan: 'Student Loan', personal_loan: 'Personal Loan', mortgage: 'Mortgage', auto_loan: 'Auto Loan', other: 'Other' }
const DEBT_TYPES: Debt['type'][] = ['credit_card', 'student_loan', 'auto_loan', 'mortgage', 'personal_loan', 'other']

const EXPENSE_CATEGORIES = ['Software', 'Education', 'Travel', 'Equipment', 'Food', 'Other']
const ASSET_CATEGORIES: Asset['category'][] = ['Cash', 'Crypto', 'Stocks', 'Real Estate', 'Other']
const LIABILITY_CATEGORIES: Liability['category'][] = ['Credit Card', 'Loan', 'Other']
const ASSET_CATEGORY_COLORS: Record<string, string> = {
  Cash: '#00c48c',
  Crypto: '#f59e0b',
  Stocks: '#2563eb',
  'Real Estate': '#a78bfa',
  Other: 'rgba(255,255,255,0.35)',
}
const LIABILITY_CATEGORY_COLORS: Record<string, string> = {
  'Credit Card': '#ff4d6a',
  Loan: '#f97316',
  Other: 'rgba(255,255,255,0.35)',
}

const GOAL_STORAGE_KEY = 'trabits_trading_monthly_goal'
const PRESET_COLORS = ['#00c48c', '#2563eb', '#f59e0b', '#ff4d6a', '#a78bfa', '#f97316']
const DEFAULT_STREAMS: IncomeStream[] = [
  { id: 'trading', name: 'Trading', color: '#00c48c', emoji: '📈' },
  { id: 'content', name: 'Content', color: '#2563eb', emoji: '🎬' },
]

function today() { return new Date().toISOString().split('T')[0] }
const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// Strip commas from a user-typed money string and return digits + optional decimal point.
function stripCommas(s: string): string { return (s || '').replace(/,/g, '') }

// Format a raw string (possibly containing commas) as a comma-grouped number string for display.
// Preserves a trailing "." and decimal portion so the user can type "1500.5" naturally.
function formatNumberInput(value: string): string {
  if (value == null) return ''
  const raw = String(value).replace(/[^0-9.]/g, '')
  if (raw === '') return ''
  const parts = raw.split('.')
  const intPart = parts[0] === '' ? '0' : parts[0]
  const n = parseInt(intPart, 10)
  const intFormatted = Number.isFinite(n) ? n.toLocaleString('en-US') : ''
  if (parts.length === 1) return intFormatted
  const dec = parts.slice(1).join('').slice(0, 2)
  return intFormatted + '.' + dec
}

// Compute estimated months to payoff using the standard amortization formula.
// Returns null when the payment cannot cover interest (never pays off) or inputs are missing.
function estimateMonthsToPayoff(balance: number, apr: number, minPayment: number): number | null {
  if (!minPayment || minPayment <= 0) return null
  if (!balance || balance <= 0) return 0
  if (!apr || apr <= 0) return Math.ceil(balance / minPayment)
  const monthlyRate = (apr / 100) / 12
  const interestOnly = balance * monthlyRate
  if (minPayment <= interestOnly) return null
  const months = -Math.log(1 - (balance * monthlyRate / minPayment)) / Math.log(1 + monthlyRate)
  if (!Number.isFinite(months) || months < 0) return null
  return Math.ceil(months)
}

// Add `months` whole months to today and return an ISO date (YYYY-MM-DD) at the 1st of that month.
function addMonthsFromToday(months: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

// Format an ISO date string as "MMM YYYY" for display (e.g. "Jan 2027"). Returns '' on invalid input.
function formatMonthYear(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'rgba(128,128,128,0.12)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
)

function EmptyState({ icon: Icon, heading, subtext, isDark = false }: { icon: React.ElementType; heading: string; subtext: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: 13, maxWidth: 280, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>{subtext}</p>
    </div>
  )
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h)
  }, [])
  return width
}
function NewStreamForm({ onSave, onCancel }: { onSave: (s: Omit<IncomeStream,'id'>) => void; onCancel: () => void }) {
  const { isDark } = useTheme()
  const inputStyle = { background: isDark ? '#1a1a24' : '#f1f4f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e8e8e2'}`, borderRadius: '8px', color: isDark ? '#ffffff' : '#0a0a0f', fontFamily: 'Inter, sans-serif', fontSize: '13px', padding: '8px 12px', outline: 'none', width: '100%' } as React.CSSProperties
  const cardStyle = { background: isDark ? '#1a1f2e' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', padding: '20px' } as React.CSSProperties
  const focusStyle = { borderColor: 'rgba(37,99,235,0.5)', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }
  const blurStyle = { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', boxShadow: 'none' }
  const [name, setName] = useState('')
  const [color, setColor] = useState('#00c48c')
  const [emoji, setEmoji] = useState('💰')
  return (
    <div style={{ ...cardStyle, marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 12 }}>New Income Stream</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>STREAM NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Freelance" />
        </div>
        <div>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>EMOJI</label>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ ...inputStyle, width: '60px' }} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="💰" maxLength={2} />
        </div>
        <div>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>COLOR</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #ffffff' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => name.trim() && onSave({ name: name.trim(), color, emoji })} style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>Save</button>
          <button onClick={onCancel} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
function FinancePage() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const params = useSearchParams()
  const inputStyle = { background: isDark ? '#1a1a24' : '#f1f4f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px', color: isDark ? '#ffffff' : '#0a0a0f', fontFamily: 'Inter, sans-serif', fontSize: '13px', padding: '8px 12px', outline: 'none', width: '100%' } as React.CSSProperties
  const cardStyle = { background: isDark ? '#111118' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', padding: '20px' } as React.CSSProperties
  const statCardStyle = { background: isDark ? '#111118' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', padding: '16px' } as React.CSSProperties
  const focusStyle = { borderColor: 'rgba(37,99,235,0.5)', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }
  const blurStyle = { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', boxShadow: 'none' }

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
  const [taxReservePercent, setTaxReservePercent] = useState(30)
  const [taxReserveInput, setTaxReserveInput] = useState('30')
  const [editingTaxRate, setEditingTaxRate] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ date: today(), amount: '', notes: '', account: '', source: '' })
  const [expenseForm, setExpenseForm] = useState({ date: today(), category: 'Software', amount: '', notes: '' })

  // Net Worth tracker state
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [showLiabilityForm, setShowLiabilityForm] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null)
  const [nwDupDismissed, setNwDupDismissed] = useState<boolean>(false)
  const [nwPrefsLoaded, setNwPrefsLoaded] = useState<boolean>(false)
  const [nwSnapshots, setNwSnapshots] = useState<NetWorthSnapshot[]>([])
  const [nwMilestones, setNwMilestones] = useState<Milestone[]>([])
  const [showSnapshotModal, setShowSnapshotModal] = useState(false)
  const nwTabHydratedRef = useRef(false)
  const [assetForm, setAssetForm] = useState({ name: '', value: '', category: 'Cash' as Asset['category'], liquidity: 'liquid' as 'liquid' | 'illiquid' })
  const [liabilityForm, setLiabilityForm] = useState({ name: '', amount: '', category: 'Credit Card' as Liability['category'] })
  const [debts, setDebts] = useState<Debt[]>([])
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null)
  const [debtForm, setDebtForm] = useState({ name: '', type: 'credit_card' as Debt['type'], balance: '', originalBalance: '', interestRate: '', minimumPayment: '', dueDayOfMonth: '', payoffDate: '' })
  const [debtAnalysis, setDebtAnalysis] = useState<DebtAnalysis | null>(null)
  const [debtAnalysisLoading, setDebtAnalysisLoading] = useState(false)
  const [debtAnalysisError, setDebtAnalysisError] = useState<string | null>(null)
  // Trabits design tokens (scoped to Debts tab analyzer UI; existing Finance UI keeps legacy styling until design migration commit)
  const _tb = {
    BRAND: '#60a5fa',
    BRAND_DARK: '#2563eb',
    BRAND_BORDER: '#bfdbfe',
    RED: '#ef4444',
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    PURPLE: '#a78bfa',
    EMPTY_DASH: '#cbd5e1',
    cardBg: isDark ? '#1a1f2e' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    textPrimary: isDark ? '#f9fafb' : '#0f172a',
    textSecondary: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8',
  }
  const tbCard: React.CSSProperties = {
    background: _tb.cardBg,
    border: `1px solid ${_tb.cardBorder}`,
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    fontFamily: 'Inter, sans-serif',
  }
  const tbStatCard = (accentColor: string): React.CSSProperties => ({
    ...tbCard,
    borderTop: `3px solid ${accentColor}`,
    paddingTop: 15,
  })
  const tbLabel: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: _tb.textMuted,
    margin: 0,
  }

  const defaultChatOpen = params.get('chat') === '1'

  const [activeSection, setActiveSection] = useState<
    'overview' | 'income' | 'expenses' | 'debts' | 'networth' | 'plan'
  >('overview')

  useEffect(() => {
    fetch('/api/life/finance').then(r => r.json()).then(d => {
      setIncome(d.income || []); setExpenses(d.expenses || [])
      if (d.streams && d.streams.length > 0) setStreams(d.streams)
    }).catch(() => {}).finally(() => setLoading(false))
  fetch('/api/life/finance/debts').then(r => r.json()).then(d => { if (d.debts) setDebts(d.debts) }).catch(() => {})
    fetch('/api/life/finance/debt-analysis').then(r => r.json()).then(d => { if (d.analysis) setDebtAnalysis(d.analysis) }).catch(() => {})
    fetch('/api/finance/tax-rate').then(r => r.json()).then(d => {
      if (d.taxReservePercent) { setTaxReservePercent(d.taxReservePercent); setTaxReserveInput(String(d.taxReservePercent)) }
    }).catch(() => {})
    fetch('/api/finance/net-worth').then(r => r.json()).then(d => {
      if (d.assets) setAssets(d.assets)
      if (d.liabilities) setLiabilities(d.liabilities)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const g = localStorage.getItem(GOAL_STORAGE_KEY); if (g) { setMonthlyGoal(Number(g)); setGoalInput(g) }
  }, [])

  // First-mount of Net Worth tab: hydrate snapshots, milestones, preferences,
  // and capture browser timezone (server enforces first-write-wins).
  useEffect(() => {
    if (activeSection !== 'networth' || nwTabHydratedRef.current) return
    nwTabHydratedRef.current = true
    fetch('/api/finance/snapshots?range=all').then(r => r.json()).then(d => {
      if (Array.isArray(d.snapshots)) setNwSnapshots(d.snapshots)
    }).catch(() => {})
    fetch('/api/finance/milestones').then(r => r.json()).then(d => {
      if (Array.isArray(d.milestones)) setNwMilestones(d.milestones)
    }).catch(() => {})
    fetch('/api/finance/preferences').then(r => r.json()).then((d: { preferences?: FinancePreferences }) => {
      const prefs = d.preferences || {}
      setNwDupDismissed(!!prefs.dismissedWarnings?.nwDuplicateDebts)
      setNwPrefsLoaded(true)
      // Capture browser tz only if not already stored (server enforces first-write-wins).
      if (!prefs.timezone) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (tz) {
            fetch('/api/finance/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preferences: { timezone: tz } }),
            }).catch(() => {})
          }
        } catch {}
      }
    }).catch(() => setNwPrefsLoaded(true))
  }, [activeSection])

  useEffect(() => {
    if (activeSection === 'expenses') {
      setActiveTab('expenses')
    } else if (activeSection === 'income') {
      if (activeTab === 'expenses') {
        setActiveTab('trading')
      }
    }
  }, [activeSection])
  async function addStream(s: Omit<IncomeStream, 'id'>) {
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_stream', stream: s }) })
    const data = await res.json(); if (data.streams) setStreams(data.streams); setShowNewStream(false); setActiveTab(data.streams?.[data.streams.length - 1]?.id || activeTab)
  }
  async function deleteStream(streamId: string) {
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_stream', streamId }) })
    const data = await res.json(); if (data.streams) setStreams(data.streams); if (activeTab === streamId) setActiveTab(data.streams?.[0]?.id || 'expenses')
  }
  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'income', entry: { ...incomeForm, amount: parseFloat(incomeForm.amount), streamId: activeTab } }) })
    const data = await res.json(); setIncome(data.income || []); setShowForm(false); setIncomeForm({ date: today(), amount: '', notes: '', account: '', source: '' })
    const stream = streams.find(s => s.id === activeTab)
    setShaiMsg(stream ? stream.emoji + ' ' + fmt(parseFloat(incomeForm.amount)) + ' logged to ' + stream.name + '. Keep stacking.' : null)
    setTimeout(() => setShaiMsg(null), 10000)
  }
  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', entry: { ...expenseForm, amount: parseFloat(expenseForm.amount) } }) })
    const data = await res.json(); setExpenses(data.expenses || []); setShowForm(false); setExpenseForm({ date: today(), category: 'Software', amount: '', notes: '' })
  }
  async function deleteEntry(id: string, type: 'income' | 'expense') {
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type, entry: { id } }) })
    const data = await res.json(); if (type === 'income') setIncome(data.income || []); else setExpenses(data.expenses || [])
  }
  function saveGoal() {
    const val = parseFloat(goalInput) || 10000; setMonthlyGoal(val); localStorage.setItem(GOAL_STORAGE_KEY, String(val)); setEditingGoal(false)
  }
  async function saveTaxRate() {
    const val = Math.min(99, Math.max(1, parseFloat(taxReserveInput) || 30)); setTaxReservePercent(val); setTaxReserveInput(String(val)); setEditingTaxRate(false)
    try { await fetch('/api/finance/tax-rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taxReservePercent: val }) }) } catch {}
  }
  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    if (editingAssetId) {
      const updates = { id: editingAssetId, name: assetForm.name.trim(), value: parseFloat(assetForm.value), category: assetForm.category, liquidity: assetForm.liquidity }
      const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', type: 'asset', item: updates }) })
      const data = await res.json(); if (data.assets) setAssets(data.assets)
      setEditingAssetId(null)
    } else {
      const newAsset: Asset = { id: Date.now().toString(), name: assetForm.name.trim(), value: parseFloat(assetForm.value), category: assetForm.category, liquidity: assetForm.liquidity }
      const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', type: 'asset', item: newAsset }) })
      const data = await res.json(); if (data.assets) setAssets(data.assets)
    }
    setAssetForm({ name: '', value: '', category: 'Cash', liquidity: 'liquid' }); setShowAssetForm(false)
  }
  function editAsset(a: Asset) {
    setEditingAssetId(a.id)
    setAssetForm({ name: a.name, value: String(a.value), category: a.category, liquidity: getAssetLiquidity(a) })
    setShowAssetForm(true)
    setShowLiabilityForm(false)
  }
  async function deleteAsset(id: string) {
    const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type: 'asset', item: { id } }) })
    const data = await res.json(); if (data.assets) setAssets(data.assets)
  }
  async function addLiability(e: React.FormEvent) {
    e.preventDefault()
    if (editingLiabilityId) {
      const updates = { id: editingLiabilityId, name: liabilityForm.name.trim(), amount: parseFloat(liabilityForm.amount), category: liabilityForm.category }
      const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', type: 'liability', item: updates }) })
      const data = await res.json(); if (data.liabilities) setLiabilities(data.liabilities)
      setEditingLiabilityId(null)
    } else {
      const newLiability: Liability = { id: Date.now().toString(), name: liabilityForm.name.trim(), amount: parseFloat(liabilityForm.amount), category: liabilityForm.category }
      const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', type: 'liability', item: newLiability }) })
      const data = await res.json(); if (data.liabilities) setLiabilities(data.liabilities)
    }
    setLiabilityForm({ name: '', amount: '', category: 'Credit Card' }); setShowLiabilityForm(false)
  }
  function editLiability(l: Liability) {
    setEditingLiabilityId(l.id)
    setLiabilityForm({ name: l.name, amount: String(l.amount), category: l.category })
    setShowLiabilityForm(true)
    setShowAssetForm(false)
  }
  async function dismissNwDuplicateWarning() {
    setNwDupDismissed(true)
    try {
      await fetch('/api/finance/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { dismissedWarnings: { nwDuplicateDebts: true } } }),
      })
    } catch {}
  }
  async function takeManualSnapshot(date: string) {
    const res = await fetch('/api/finance/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) })
    if (!res.ok) throw new Error('Failed to save snapshot')
    const refreshed = await fetch('/api/finance/snapshots?range=all').then(r => r.json()).catch(() => null)
    if (refreshed && Array.isArray(refreshed.snapshots)) setNwSnapshots(refreshed.snapshots)
  }
  async function addMilestone(item: Omit<Milestone, 'id' | 'createdAt'>) {
    const res = await fetch('/api/finance/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item }) })
    const data = await res.json(); if (Array.isArray(data.milestones)) setNwMilestones(data.milestones)
  }
  async function editMilestone(item: Milestone) {
    const res = await fetch('/api/finance/milestones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item }) })
    const data = await res.json(); if (Array.isArray(data.milestones)) setNwMilestones(data.milestones)
  }
  async function deleteMilestone(id: string) {
    const res = await fetch('/api/finance/milestones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const data = await res.json(); if (Array.isArray(data.milestones)) setNwMilestones(data.milestones)
  }
  async function deleteLiability(id: string) {
    const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type: 'liability', item: { id } }) })
    const data = await res.json(); if (data.liabilities) setLiabilities(data.liabilities)
  }
  function resetDebtForm() { setDebtForm({ name: '', type: 'credit_card', balance: '', originalBalance: '', interestRate: '', minimumPayment: '', dueDayOfMonth: '', payoffDate: '' }); setEditingDebtId(null); setShowDebtForm(false) }
  function openEditDebt(d: Debt) { const legacy = (d as any).dueDate; const dueDay = d.dueDayOfMonth != null ? d.dueDayOfMonth : (legacy != null ? legacy : null); setDebtForm({ name: d.name, type: d.type, balance: String(d.balance), originalBalance: String(d.originalBalance), interestRate: String(d.interestRate), minimumPayment: String(d.minimumPayment), dueDayOfMonth: dueDay != null ? String(dueDay) : '', payoffDate: d.payoffDate || '' }); setEditingDebtId(d.id); setShowDebtForm(true) }
  async function submitDebt(e: React.FormEvent) { e.preventDefault(); if (!debtForm.name.trim()) return; const balanceNum = parseFloat(stripCommas(debtForm.balance)) || 0; const originalNum = debtForm.originalBalance ? parseFloat(stripCommas(debtForm.originalBalance)) : balanceNum; const rateNum = parseFloat(debtForm.interestRate) || 0; const minNum = parseFloat(stripCommas(debtForm.minimumPayment)) || 0; const dueNum = debtForm.dueDayOfMonth ? Math.max(1, Math.min(31, parseInt(debtForm.dueDayOfMonth, 10))) : undefined; const payload: any = { name: debtForm.name.trim(), type: debtForm.type, balance: balanceNum, originalBalance: originalNum, interestRate: rateNum, minimumPayment: minNum }; if (dueNum !== undefined && !Number.isNaN(dueNum)) payload.dueDayOfMonth = dueNum; if (debtForm.payoffDate && debtForm.payoffDate.trim() !== '') payload.payoffDate = debtForm.payoffDate; if (editingDebtId) { const res = await fetch('/api/life/finance/debts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingDebtId, updates: payload }) }); const data = await res.json(); if (data.debt) setDebts(prev => prev.map(d => d.id === editingDebtId ? data.debt : d)) } else { const res = await fetch('/api/life/finance/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.debt) setDebts(prev => [...prev, data.debt]) } resetDebtForm() }
  async function deleteDebt(id: string) { if (!confirm('Delete this debt? This cannot be undone.')) return; const res = await fetch('/api/life/finance/debts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); if (res.ok) setDebts(prev => prev.filter(d => d.id !== id)) }
  async function runDebtAnalysis() {
    setDebtAnalysisLoading(true)
    setDebtAnalysisError(null)
    try {
      const res = await fetch('/api/life/finance/debt-analysis', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setDebtAnalysis(data.analysis)
    } catch (e: any) {
      setDebtAnalysisError(e?.message || 'Something went wrong')
    } finally {
      setDebtAnalysisLoading(false)
    }
  }
  const totalIn = income.reduce((s, e) => s + e.amount, 0)
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalIn - totalOut
  const streamTotals = streams.map(s => ({ ...s, total: income.filter(e => e.streamId === s.id).reduce((sum, e) => sum + e.amount, 0), count: income.filter(e => e.streamId === s.id).length }))
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyMap: Record<string, number> = {}
  for (const e of income) { const m = e.date.slice(0, 7); monthlyMap[m] = (monthlyMap[m] || 0) + e.amount }
  const bestMonth = Object.entries(monthlyMap).sort((a, b) => b[1] - a[1])[0]
  const catMap: Record<string, number> = {}
  for (const e of expenses) catMap[e.category] = (catMap[e.category] || 0) + e.amount
  const biggestCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
  const allMonths = Array.from(new Set([...Object.keys(monthlyMap), ...expenses.map(e => e.date.slice(0, 7))])).sort().slice(-6)
  const chartData = allMonths.map(m => {
    const monthIncome: any = { month: m.slice(5) }
    for (const s of streams) { monthIncome[s.name] = income.filter(e => e.streamId === s.id && e.date.slice(0, 7) === m).reduce((sum, e) => sum + e.amount, 0) }
    monthIncome.expenses = expenses.filter(e => e.date.slice(0, 7) === m).reduce((sum, e) => sum + e.amount, 0)
    return monthIncome
  })
  const tradingStream = streams.find(s => s.id === 'trading')
  const thisMonthTrading = income.filter(e => e.streamId === 'trading' && e.date.slice(0, 7) === currentMonth).reduce((s, e) => s + e.amount, 0)
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((thisMonthTrading / monthlyGoal) * 100)) : 0
  const activeStream = streams.find(s => s.id === activeTab)
  const activeIncome = income.filter(e => e.streamId === activeTab)
  const tooltipStyle = { background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? '#ffffff' : '#0a0a0f') }
  const axisTickStyle = { fill: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }

  // Net worth calculations (Phase A: folds debts into formula)
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const liquidTotal = assets.filter(a => getAssetLiquidity(a) === 'liquid').reduce((s, a) => s + a.value, 0)
  const illiquidTotal = totalAssets - liquidTotal
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
  const totalDebts = debts.reduce((s, d) => s + (d.balance || 0), 0)
  const totalLiabilitiesCombined = totalLiabilities + totalDebts
  const netWorth = totalAssets - totalLiabilitiesCombined
  const netWorthPositive = netWorth >= 0
  // Monthly expenses (90-day average) — used for runway milestone progress.
  const ninetyDaysAgoISO = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const monthlyExpenses = expenses.filter(e => e.date >= ninetyDaysAgoISO).reduce((s, e) => s + e.amount, 0) / 3
  // Duplicate detection: a user-entered liability whose name roughly matches a debt (case-insensitive trim)
  const duplicateMatches = liabilities.filter(l => {
    const ln = l.name.trim().toLowerCase()
    return ln.length > 0 && debts.some(d => d.name.trim().toLowerCase() === ln)
  })
  return (
    <div style={{ background: (isDark ? '#0f1117' : '#f8f8f6'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>
        <PageHeader
          title="Finance"
          tabs={[
            { id: 'overview', label: 'Overview', active: activeSection === 'overview' },
            { id: 'income', label: 'Income', active: activeSection === 'income' },
            { id: 'expenses', label: 'Expenses', active: activeSection === 'expenses' },
            { id: 'debts', label: 'Debts', active: activeSection === 'debts' },
            { id: 'networth', label: 'Net Worth', active: activeSection === 'networth' },
            { id: 'plan', label: 'Plan', active: activeSection === 'plan' },
          ]}
          onTabClick={(id) => setActiveSection(id as typeof activeSection)}
        />
        {/* Coach Shai Banner */}
        {shaiMsg && (
          <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, borderColor: 'rgba(0,196,140,0.2)' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#00c48c', display: 'block', marginBottom: 4 }}>COACH SHAI</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{shaiMsg}</p>
            </div>
            <button onClick={() => setShaiMsg(null)} style={{ background: 'none', border: 'none', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* ═══════════════════ NET WORTH HERO ═══════════════════ */}
        {activeSection === 'networth' && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>

          {/* 3 brand-kit stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={tbStatCard(_tb.BRAND)}>
              <p style={tbLabel}>NET WORTH</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: netWorthPositive ? _tb.GREEN : _tb.RED, margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>
                {netWorthPositive ? '' : '−'}{fmt(Math.abs(netWorth))}
              </p>
              <TrendIndicators snapshots={nwSnapshots} currentNetWorth={netWorth} isDark={isDark} />
            </div>
            <div style={tbStatCard(_tb.GREEN)}>
              <p style={tbLabel}>TOTAL ASSETS</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: _tb.GREEN, margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>{fmt(totalAssets)}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: _tb.textMuted, margin: '6px 0 0 0' }}>Liquid {fmt(liquidTotal)} · Illiquid {fmt(illiquidTotal)}</p>
            </div>
            <div style={tbStatCard(_tb.RED)}>
              <p style={tbLabel}>TOTAL LIABILITIES</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: _tb.RED, margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>{fmt(totalLiabilitiesCombined)}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: _tb.textMuted, margin: '6px 0 0 0' }}>User {fmt(totalLiabilities)} · Debts {fmt(totalDebts)}</p>
            </div>
          </div>

          {/* Amber dismissible duplicate-debts warning banner */}
          {duplicateMatches.length > 0 && !nwDupDismissed && nwPrefsLoaded && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,0.08)', border: `1px solid ${_tb.AMBER}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <AlertCircle size={14} style={{ color: _tb.AMBER, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 12, color: _tb.textPrimary, lineHeight: 1.5 }}>
                <strong style={{ color: _tb.AMBER }}>Possible duplicate:</strong>{' '}
                You have a Liability with the same name as a Debt ({duplicateMatches.map(m => m.name).join(', ')}). Debts are already included in Total Liabilities.
              </div>
              <button onClick={dismissNwDuplicateWarning} style={{ background: 'none', border: 'none', cursor: 'pointer', color: _tb.textMuted, padding: 2 }} aria-label="Dismiss warning">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Allocation pies + milestones strip */}
          <NetWorthPies assets={assets} isDark={isDark} onAddAsset={() => { setShowAssetForm(true); setShowLiabilityForm(false) }} />
          <MilestonesStrip
            milestones={nwMilestones}
            netWorth={netWorth}
            totalDebts={totalDebts}
            monthlyExpenses={monthlyExpenses}
            liquidAssets={liquidTotal}
            isDark={isDark}
            onAdd={addMilestone}
            onEdit={editMilestone}
            onDelete={deleteMilestone}
          />

          {/* Assets + Liabilities side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            {/* ASSETS PANEL */}
            <div style={tbCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: _tb.GREEN, margin: 0 }}>ASSETS</h3>
                <button onClick={() => { if (showAssetForm) { setShowAssetForm(false); setEditingAssetId(null); setAssetForm({ name: '', value: '', category: 'Cash', liquidity: 'liquid' }) } else { setShowAssetForm(true); setShowLiabilityForm(false); setEditingAssetId(null) } }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: `1px solid #a7f3d0`, borderRadius: 6, color: _tb.GREEN, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.16)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}>
                  <Plus size={11} /> {editingAssetId ? 'Cancel' : 'Add Asset'}
                </button>
              </div>

              {/* Add Asset Form */}
              {showAssetForm && (
                <form onSubmit={addAsset} style={{ background: isDark ? '#111118' : '#f1f4f9', border: `1px solid ${_tb.GREEN}26`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>NAME</label>
                      <input value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }} placeholder="e.g. Savings" required />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>VALUE</label>
                      <input type="number" step="0.01" value={assetForm.value} onChange={e => setAssetForm(f => ({ ...f, value: e.target.value }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }} placeholder="0.00" required />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>CATEGORY</label>
                    <select value={assetForm.category} onChange={e => setAssetForm(f => ({ ...f, category: e.target.value as Asset['category'] }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}>
                      <option value="Cash">Cash</option>
                      <option value="Crypto">Crypto</option>
                      <option value="Stocks">Stocks</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {/* Liquidity toggle (Phase A) */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 4 }}>LIQUIDITY</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['liquid','illiquid'] as const).map(opt => (
                        <button key={opt} type="button" onClick={() => setAssetForm(f => ({ ...f, liquidity: opt }))} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', border: assetForm.liquidity === opt ? `1px solid ${_tb.BRAND}` : `1px solid ${_tb.cardBorder}`, background: assetForm.liquidity === opt ? `${_tb.BRAND}22` : 'transparent', color: assetForm.liquidity === opt ? _tb.BRAND : _tb.textSecondary }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" style={{ width: '100%', background: _tb.GREEN, border: 'none', borderRadius: 6, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, padding: '8px', cursor: 'pointer' }}>{editingAssetId ? 'Update Asset' : 'Save Asset'}</button>
                </form>
              )}

              {/* Assets list (grouped by liquidity) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {assets.length === 0 ? (
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), textAlign: 'center', padding: '20px 0' }}>No assets yet</p>
                ) : (
                  (['liquid','illiquid'] as const).map(group => {
                    const rows = assets.filter(a => getAssetLiquidity(a) === group)
                    if (rows.length === 0) return null
                    const groupTotal = rows.reduce((s, a) => s + a.value, 0)
                    return (
                      <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: _tb.textMuted }}>{group}</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: _tb.textMuted }}>{fmt(groupTotal)}</span>
                        </div>
                        {rows.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: isDark ? '#111118' : '#f8f9fc', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: (ASSET_CATEGORY_COLORS[a.category] || _tb.GREEN) + '20', border: `1px solid ${ASSET_CATEGORY_COLORS[a.category] || _tb.GREEN}40`, color: ASSET_CATEGORY_COLORS[a.category] || _tb.GREEN, whiteSpace: 'nowrap' }}>{a.category}</span>
                            <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{a.name}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: _tb.GREEN }}>{fmt(a.value)}</span>
                            <button onClick={() => editAsset(a)} aria-label="Edit asset" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 2, transition: 'opacity 0.12s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')} onFocus={e => (e.currentTarget.style.opacity = '1')} onBlur={e => (e.currentTarget.style.opacity = '0.4')}><Pencil size={12} style={{ color: _tb.BRAND }} /></button>
                            <button onClick={() => deleteAsset(a.id)} aria-label="Delete asset" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 2, transition: 'opacity 0.12s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')} onFocus={e => (e.currentTarget.style.opacity = '1')} onBlur={e => (e.currentTarget.style.opacity = '0.4')}><Trash2 size={12} style={{ color: _tb.RED }} /></button>
                          </div>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* LIABILITIES PANEL */}
            <div style={tbCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: _tb.RED, margin: 0 }}>LIABILITIES</h3>
                <button onClick={() => { if (showLiabilityForm) { setShowLiabilityForm(false); setEditingLiabilityId(null); setLiabilityForm({ name: '', amount: '', category: 'Credit Card' }) } else { setShowLiabilityForm(true); setShowAssetForm(false); setEditingLiabilityId(null) } }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', border: `1px solid #fecaca`, borderRadius: 6, color: _tb.RED, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.16)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}>
                  <Plus size={11} /> {editingLiabilityId ? 'Cancel' : 'Add Liability'}
                </button>
              </div>

              {/* Add Liability Form */}
              {showLiabilityForm && (
                <form onSubmit={addLiability} style={{ background: isDark ? '#111118' : '#f1f4f9', border: `1px solid ${_tb.RED}26`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>NAME</label>
                      <input value={liabilityForm.name} onChange={e => setLiabilityForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }} placeholder="e.g. Car Loan" required />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>AMOUNT</label>
                      <input type="number" step="0.01" value={liabilityForm.amount} onChange={e => setLiabilityForm(f => ({ ...f, amount: e.target.value }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }} placeholder="0.00" required />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>CATEGORY</label>
                    <select value={liabilityForm.category} onChange={e => setLiabilityForm(f => ({ ...f, category: e.target.value as Liability['category'] }))} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Loan">Loan</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="submit" style={{ width: '100%', background: _tb.RED, border: 'none', borderRadius: 6, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, padding: '8px', cursor: 'pointer' }}>{editingLiabilityId ? 'Update Liability' : 'Save Liability'}</button>
                </form>
              )}

              {/* Editable user Liabilities list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {liabilities.length === 0 ? (
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), textAlign: 'center', padding: '20px 0' }}>No liabilities yet</p>
                ) : (
                  liabilities.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: isDark ? '#111118' : '#f8f9fc', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: (LIABILITY_CATEGORY_COLORS[l.category] || _tb.RED) + '20', border: `1px solid ${LIABILITY_CATEGORY_COLORS[l.category] || _tb.RED}40`, color: LIABILITY_CATEGORY_COLORS[l.category] || _tb.RED, whiteSpace: 'nowrap' }}>{l.category}</span>
                      <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{l.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: _tb.RED }}>{fmt(l.amount)}</span>
                      <button onClick={() => editLiability(l)} aria-label="Edit liability" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 2, transition: 'opacity 0.12s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')} onFocus={e => (e.currentTarget.style.opacity = '1')} onBlur={e => (e.currentTarget.style.opacity = '0.4')}><Pencil size={12} style={{ color: _tb.BRAND }} /></button>
                      <button onClick={() => deleteLiability(l.id)} aria-label="Delete liability" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 2, transition: 'opacity 0.12s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')} onFocus={e => (e.currentTarget.style.opacity = '1')} onBlur={e => (e.currentTarget.style.opacity = '0.4')}><Trash2 size={12} style={{ color: _tb.RED }} /></button>
                    </div>
                  ))
                )}
              </div>

              {/* Read-only Debts merged section */}
              {debts.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: _tb.textMuted }}>Merged from Debts</span>
                    <button onClick={() => setActiveSection('debts')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, color: _tb.BRAND, padding: 0 }}>From Debts tab →</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {debts.map(d => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 8, border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, opacity: 0.85 }}>
                        <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 13, color: _tb.textSecondary }}>{d.name}</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: _tb.RED }}>{fmt(d.balance || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Combined liabilities footer */}
              {(liabilities.length > 0 || debts.length > 0) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: _tb.textMuted, textTransform: 'uppercase' }}>TOTAL LIABILITIES</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: _tb.RED }}>{fmt(totalLiabilitiesCombined)}</span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: _tb.textMuted, marginTop: 4, textAlign: 'right' }}>User {fmt(totalLiabilities)} · Debts {fmt(totalDebts)}</div>
                </div>
              )}
            </div>
          </div>

          {/* History chart (3 lines: assets / liabilities / net worth) + snapshot modal */}
          <div style={{ marginTop: 24 }}>
            <NetWorthHistoryChart
              snapshots={nwSnapshots}
              isDark={isDark}
              onTakeSnapshot={() => setShowSnapshotModal(true)}
            />
          </div>
          <SnapshotModal
            isOpen={showSnapshotModal}
            onClose={() => setShowSnapshotModal(false)}
            isDark={isDark}
            defaultDate={new Date().toLocaleDateString('en-CA')}
            preview={{ assets: totalAssets, liabilities: totalLiabilities, debts: totalDebts, netWorth }}
            onSubmit={takeManualSnapshot}
          />
        </div>
        )}
        {/* ═══════════════════ END NET WORTH ═══════════════════ */}
        {/* Stats Row */}
        {activeSection === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={statCardStyle}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>TOTAL IN (YTD)</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#16a34a', margin: 0 }}>{fmt(totalIn)}</p>
          </div>
          <div style={statCardStyle}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>TOTAL OUT (YTD)</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#dc2626', margin: 0 }}>{fmt(totalOut)}</p>
          </div>
          <div style={statCardStyle}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>NET PROFIT (YTD)</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: netProfit >= 0 ? '#16a34a' : '#dc2626', margin: 0 }}>{netProfit >= 0 ? '+' : ''}{fmt(netProfit)}</p>
          </div>
          <div style={statCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>TAX RESERVE</p>
              <button onClick={() => setEditingTaxRate(!editingTaxRate)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'pointer' }}>{editingTaxRate ? 'done' : 'edit'}</button>
            </div>
            {editingTaxRate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min={1} max={99} value={taxReserveInput} onChange={e => setTaxReserveInput(e.target.value)} onBlur={saveTaxRate} onKeyDown={ev => { if (ev.key === 'Enter') saveTaxRate() }} style={{ background: isDark ? '#1a1a24' : '#f1f4f9', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, padding: '2px 6px', outline: 'none', width: 60, textAlign: 'right' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>%</span>
              </div>
            ) : (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{fmt(Math.max(0, (taxReservePercent / 100) * totalIn))} <span style={{ fontSize: 11, fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{taxReservePercent}%</span></p>
            )}
          </div>
        </div>
        )}

        {/* Per-stream breakdown */}
        {activeSection === 'overview' && (<>
        {streamTotals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {streamTotals.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #2563eb' }}>
                <span style={{ fontSize: 24 }}>{s.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', marginBottom: 2 }}>{s.name}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: s.color, margin: 0 }}>{fmt(s.total)}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 2 }}>{s.count} entries</p>
                </div>
              </div>
            ))}
          </div>
        )}
        </>)}

        {/* Monthly Trading Goal */}
        {activeSection === 'overview' && (<>
        {tradingStream && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', margin: 0 }}>TRADING GOAL — {currentMonth}</p>
                  <button onClick={() => setEditingGoal(!editingGoal)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', cursor: 'pointer' }}>{editingGoal ? 'cancel' : 'edit'}</button>
                </div>
                {editingGoal ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="text" inputMode="decimal" value={formatNumberInput(goalInput)} onChange={e => setGoalInput(stripCommas(e.target.value))} style={{ ...inputStyle, width: 120 }} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} />
                    <button onClick={saveGoal} style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>Save</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#16a34a', margin: 0 }}>
                      {fmt(thisMonthTrading)} <span style={{ fontSize: 12, fontWeight: 400, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>/ {fmt(monthlyGoal)}</span>
                    </p>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: goalPct >= 100 ? '#00c48c' : '#f59e0b' }}>{goalPct}%</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ height: 6, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: goalPct + '%', background: goalPct >= 100 ? '#00c48c' : '#2563eb', borderRadius: 4, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* Best month / biggest expense */}
        {activeSection === 'overview' && (<>
        {(bestMonth || expenses.length > 0 || biggestCat) && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {bestMonth && (
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <TrendingUp size={20} style={{ color: '#00c48c', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', margin: 0 }}>BEST INCOME MONTH</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#00c48c', margin: '2px 0 0 0' }}>{bestMonth[0]} — {fmt(bestMonth[1])}</p>
                </div>
              </div>
            )}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingDown size={20} style={{ color: '#ff4d6a', flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', margin: 0 }}>BIGGEST EXPENSE CATEGORY</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#ff4d6a', margin: '2px 0 0 0' }}>
                  {expenses.length > 0 ? (
                    <span>{biggestCat?.[0] ?? 'No expenses yet'} — {fmt(biggestCat?.[1] ?? 0)}</span>
                  ) : (
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>No expenses logged yet</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* Chart */}
        {activeSection === 'overview' && (<>
        {chartData.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 16 }}>MONTHLY INCOME vs EXPENSES</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                {streams.map(s => <Bar key={s.id} dataKey={s.name} fill={s.color} radius={[4,4,0,0]} />)}
                <Bar dataKey="expenses" fill="#ff4d6a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        </>)}
        {/* Stream Tabs */}
        {activeSection === 'income' && (<>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {streams.map(s => (
            <div key={s.id} style={{ position: 'relative' }}>
              <button onClick={() => { setActiveTab(s.id); setShowForm(false) }} style={{ padding: '8px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: activeTab === s.id ? s.color + '1a' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), borderBottom: activeTab === s.id ? `2px solid ${s.color}` : '2px solid transparent', border: activeTab === s.id ? `1px solid ${s.color}30` : '1px solid rgba(255,255,255,0.06)', color: activeTab === s.id ? s.color : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                {s.emoji} {s.name.toUpperCase()}
              </button>
              {!['trading','content'].includes(s.id) && (
                <button onClick={() => deleteStream(s.id)} style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ff4d6a', color: (isDark ? '#ffffff' : '#0a0a0f'), border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>×</button>
              )}
            </div>
          ))}
          <button onClick={() => setShowNewStream(!showNewStream)} style={{ padding: '8px 14px', fontFamily: 'Inter, sans-serif', fontSize: 12, borderRadius: 8, background: 'rgba(37,99,235,0.06)', border: '1px dashed rgba(37,99,235,0.3)', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} /> New Stream
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: 'auto', background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
            <Plus size={12} /> Add Entry
          </button>
        </div>

        {showNewStream && <NewStreamForm onSave={addStream} onCancel={() => setShowNewStream(false)} />}
        </>)}

        {/* Income Form */}
        {activeSection === 'income' && (<>
        {showForm && activeTab !== 'expenses' && activeStream && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: activeStream.color, marginBottom: 12 }}>New {activeStream.name} Income {activeStream.emoji}</h3>
            <form onSubmit={saveIncome} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>DATE</label><input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} required /></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>AMOUNT ($)</label><input type="text" inputMode="decimal" value={formatNumberInput(incomeForm.amount)} onChange={e => setIncomeForm(f => ({ ...f, amount: stripCommas(e.target.value) }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="1,500" required /></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>ACCOUNT / SOURCE</label><input value={incomeForm.account} onChange={e => setIncomeForm(f => ({ ...f, account: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. TopStep, Brand Deal" /></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>NOTES</label><input value={incomeForm.notes} onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Optional" /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button type="submit" style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer', flex: 1 }}>Save</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        </>)}

        {/* Expense Form */}
        {activeSection === 'expenses' && (<>
        {showForm && activeTab === 'expenses' && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 12 }}>New Expense</h3>
            <form onSubmit={saveExpense} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>DATE</label><input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} required /></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>CATEGORY</label><select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>AMOUNT ($)</label><input type="text" inputMode="decimal" value={formatNumberInput(expenseForm.amount)} onChange={e => setExpenseForm(f => ({ ...f, amount: stripCommas(e.target.value) }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="99" required /></div>
              <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>NOTES</label><input value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Optional" /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button type="submit" style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer', flex: 1 }}>Save</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        </>)}
        {/* Data Table */}
        {(activeSection === 'income' || activeSection === 'expenses') && (<>
        {loading ? (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <Skeleton height="60px" /><div style={{ height: 8 }} /><Skeleton height="60px" /><div style={{ height: 8 }} /><Skeleton height="60px" />
          </div>
        ) : (
          <div style={{ ...cardStyle, marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {activeTab !== 'expenses' && activeStream && (
              <>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
                  <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: activeStream.color, margin: 0 }}>
                    {activeStream.emoji} {activeStream.name.toUpperCase()} INCOME · {activeIncome.length} ENTRIES · {fmt(activeIncome.reduce((s,e)=>s+e.amount,0))}
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
                        {['DATE','ACCOUNT / SOURCE','AMOUNT','NOTES',''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeIncome].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{e.date}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', color: (isDark ? '#ffffff' : '#0a0a0f') }}>{e.account || e.source || '—'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#00c48c' }}>{fmt(e.amount)}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => deleteEntry(e.id, 'income')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}>
                              <Trash2 size={12} style={{ color: '#ff4d6a' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeIncome.length === 0 && <tr><td colSpan={5}><EmptyState icon={DollarSign} heading="NO TRANSACTIONS YET" subtext="Log your first income to start tracking." isDark={isDark} /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {activeTab === 'expenses' && (
              <>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
                  <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), margin: 0 }}>
                    EXPENSES · {expenses.length} ENTRIES · {fmt(expenses.reduce((s,e)=>s+e.amount,0))}
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
                        {['DATE','CATEGORY','AMOUNT','NOTES',''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{e.date}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.2)', color: '#ff4d6a' }}>{e.category}</span></td>
                          <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ff4d6a' }}>{fmt(e.amount)}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => deleteEntry(e.id, 'expense')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}>
                              <Trash2 size={12} style={{ color: '#ff4d6a' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && <tr><td colSpan={5}><EmptyState icon={DollarSign} heading="NO TRANSACTIONS YET" subtext="Log your first expense to start tracking." isDark={isDark} /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
        </>)}

        {activeSection === 'debts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#2563eb', margin: 0 }}>DEBTS</h3>
              {debts.length > 0 && (
                <button
                  onClick={() => { if (showDebtForm) { resetDebtForm() } else { resetDebtForm(); setShowDebtForm(true) } }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, padding: '5px 12px', cursor: 'pointer' }}
                >
                  <Plus size={10} /> Add Debt
                </button>
              )}
            </div>

            {/* ═══════════════════ TRABITS: DEBT ANALYZER ═══════════════════ */}
            {/* Hero row: debt-free countdown + total interest at minimums */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {/* Card A — Debt-free countdown */}
              <div style={tbStatCard(_tb.BRAND)}>
                <p style={tbLabel}>Debt-free in</p>
                {(() => {
                  const activeDebts = debts.filter(d => d.balance > 0)
                  if (activeDebts.length === 0) {
                    return (
                      <>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:300, color:_tb.EMPTY_DASH, margin:'8px 0 4px 0' }}>—</p>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:0 }}>No debts tracked</p>
                      </>
                    )
                  }
                  const hasNever = activeDebts.some(d => estimateMonthsToPayoff(d.balance, d.interestRate, d.minimumPayment) === null)
                  if (hasNever) {
                    return (
                      <>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:700, color:_tb.AMBER, margin:'8px 0 4px 0' }}>Never at current pace</p>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:0 }}>Payment doesn't cover interest on at least one debt</p>
                      </>
                    )
                  }
                  const maxMonths = activeDebts.reduce((acc, d) => Math.max(acc, estimateMonthsToPayoff(d.balance, d.interestRate, d.minimumPayment) || 0), 0)
                  const years = Math.floor(maxMonths / 12)
                  const months = maxMonths % 12
                  const datePill = formatMonthYear(addMonthsFromToday(maxMonths))
                  return (
                    <>
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:700, color:_tb.textPrimary, margin:'8px 0 4px 0' }}>{years} years, {months} months</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textSecondary }}>at current minimum payments</span>
                        <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted }}>· {datePill}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
              {/* Card B — Total interest if minimums only */}
              <div style={tbStatCard(_tb.RED)}>
                <p style={tbLabel}>Total interest if you only pay minimums</p>
                {(() => {
                  const activeDebts = debts.filter(d => d.balance > 0)
                  if (activeDebts.length === 0) {
                    return (
                      <>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:300, color:_tb.EMPTY_DASH, margin:'8px 0 4px 0' }}>$0</p>
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:0 }}>No debts tracked</p>
                      </>
                    )
                  }
                  const interest = computeInterestAtMinimums(activeDebts)
                  return (
                    <>
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:700, color:_tb.RED, margin:'8px 0 4px 0' }}>{Number.isFinite(interest) ? fmt(Math.round(interest)) : '∞'}</p>
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textSecondary, margin:0 }}>You can pay less — see your personalized plan below</p>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Error banner (only when error and not loading) */}
            {debtAnalysisError && !debtAnalysisLoading && (
              <div style={{ ...tbCard, background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.35)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flex:1, minWidth:0 }}>
                  <AlertCircle size={14} style={{ color: _tb.RED, flexShrink:0 }} />
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500, color:_tb.RED, margin:0 }}>{debtAnalysisError}</p>
                </div>
                <button onClick={runDebtAnalysis} style={{ background:'transparent', color:_tb.BRAND, border: `1px solid ${_tb.BRAND_BORDER}`, borderRadius:8, padding:'9px 18px', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Try again</button>
              </div>
            )}

            {/* Loading state */}
            {debtAnalysisLoading && (
              <div style={{ ...tbCard, display:'flex', alignItems:'center', gap:12 }}>
                <style>{`@keyframes trabits-spin { to { transform: rotate(360deg) } }`}</style>
                <Loader2 size={16} style={{ color: _tb.BRAND, animation: 'trabits-spin 1s linear infinite', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600, color:_tb.textPrimary, margin:0 }}>Analyzing your debts…</p>
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:'2px 0 0 0' }}>Coach Shai is crunching the numbers — this takes 5-15 seconds</p>
                </div>
              </div>
            )}

            {/* CTA card (when no analysis yet and not loading) */}
            {!debtAnalysis && !debtAnalysisLoading && (
              <div style={{ ...tbCard, background: isDark ? 'rgba(96,165,250,0.08)' : 'rgba(96,165,250,0.04)', border: `1px solid ${isDark ? 'rgba(96,165,250,0.2)' : _tb.BRAND_BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 280px', minWidth:0 }}>
                  <h4 style={{ fontFamily:'Inter,sans-serif', fontSize:16, fontWeight:700, color:_tb.textPrimary, margin:'0 0 4px 0' }}>Get Your Personalized Debt Strategy</h4>
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500, color:_tb.textSecondary, margin:0, lineHeight:1.5 }}>Coach Shai will analyze your debts, income, and expenses to recommend the fastest sustainable path to debt-free.</p>
                </div>
                {(() => {
                  const hasDebts = debts.filter(d => d.balance > 0).length > 0
                  const hasIncome = income.length > 0
                  const disabled = !hasDebts || !hasIncome
                  const label = !hasDebts ? 'Add a debt first' : !hasIncome ? 'Add some income first' : 'Analyze My Debts'
                  return (
                    <button onClick={disabled ? undefined : runDebtAnalysis} disabled={disabled} style={{ background: _tb.BRAND, color:'#ffffff', border:'none', borderRadius:8, padding:'9px 18px', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace:'nowrap', flexShrink:0 }}>
                      <Sparkles size={14} />
                      {label}
                    </button>
                  )
                })()}
              </div>
            )}

            {/* Analysis result card */}
            {debtAnalysis && !debtAnalysisLoading && (
              <div style={tbCard}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <div style={{ flex:'1 1 260px', minWidth:0 }}>
                    <p style={{ ...tbLabel, color: _tb.BRAND_DARK }}>Your debt strategy — Coach Shai recommends</p>
                    <h3 style={{ fontFamily:'Inter,sans-serif', fontSize:20, fontWeight:700, color:_tb.textPrimary, margin:'6px 0 4px 0' }}>{debtAnalysis.strategyLabel}</h3>
                    <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:0 }}>Analyzed {new Date(debtAnalysis.analyzedAt).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}</p>
                  </div>
                  <button onClick={runDebtAnalysis} style={{ background:'transparent', color:_tb.BRAND, border: `1px solid ${_tb.BRAND_BORDER}`, borderRadius:8, padding:'9px 18px', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Re-analyze</button>
                </div>
                {/* Why */}
                <div style={{ marginTop:16, paddingTop:16, borderTop: `1px solid ${_tb.cardBorder}` }}>
                  <p style={tbLabel}>Why this strategy</p>
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500, color:_tb.textPrimary, lineHeight:1.6, margin:'8px 0 0 0' }}>{debtAnalysis.why}</p>
                </div>
                {/* Monthly plan */}
                {debtAnalysis.monthlyPlan && debtAnalysis.monthlyPlan.length > 0 && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop: `1px solid ${_tb.cardBorder}` }}>
                    <p style={tbLabel}>Your monthly plan</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                      {debtAnalysis.monthlyPlan.map(item => {
                        const isExtra = /extra/i.test(item.note || '')
                        return (
                          <div key={item.debtId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                            <span style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500, color:_tb.textPrimary }}>{item.debtName}</span>
                            <span style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:700, color: isExtra ? _tb.BRAND_DARK : _tb.textSecondary, textAlign:'right' }}>{fmt(item.amount)}/mo — {item.note}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Timeline */}
                {debtAnalysis.timeline && debtAnalysis.timeline.length > 0 && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop: `1px solid ${_tb.cardBorder}` }}>
                    <p style={tbLabel}>Timeline</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                      {debtAnalysis.timeline.map((m, i) => {
                        const isFinal = m.milestone === 'DEBT-FREE'
                        return (
                          <div key={i} style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, minWidth:84 }}>{m.date}</span>
                            <span style={{ fontFamily:'Inter,sans-serif', fontSize:13, fontWeight: isFinal ? 700 : 500, color: isFinal ? _tb.GREEN : _tb.textPrimary }}>{isFinal ? '🎯 DEBT-FREE' : m.milestone}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Interest saved */}
                {debtAnalysis.interestSaved > 0 && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop: `1px solid ${_tb.cardBorder}` }}>
                    <p style={tbLabel}>Interest saved</p>
                    <p style={{ fontFamily:'Inter,sans-serif', fontSize:28, fontWeight:700, color:_tb.GREEN, margin:'8px 0 4px 0' }}>{fmt(debtAnalysis.interestSaved)}</p>
                    <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, color:_tb.textMuted, margin:0 }}>vs paying minimums only</p>
                  </div>
                )}
                {/* Sustainability note */}
                {debtAnalysis.sustainabilityNote && (
                  <div style={{ marginTop:16, background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:8, padding:'10px 12px', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <AlertCircle size={14} style={{ color: _tb.AMBER, flexShrink:0, marginTop:2 }} />
                  <p style={{ fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500, color:_tb.AMBER, margin:0, lineHeight:1.5 }}>{debtAnalysis.sustainabilityNote}</p>
                  </div>
                )}
              </div>
            )}
            {/* ═══════════════════ END TRABITS DEBT ANALYZER ═══════════════════ */}

            {debts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ ...cardStyle, padding: '18px 20px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), margin: 0 }}>TOTAL DEBT</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600, color: debts.reduce((s, d) => s + (d.balance || 0), 0) > 0 ? '#ef4444' : (isDark ? '#ffffff' : '#0a0a0f'), margin: '6px 0 0 0' }}>
                    {fmt(debts.reduce((s, d) => s + (d.balance || 0), 0))}
                  </p>
                </div>
                <div style={{ ...cardStyle, padding: '18px 20px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), margin: 0 }}>MONTHLY MINIMUM</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: '6px 0 0 0' }}>
                    {fmt(debts.reduce((s, d) => s + (d.minimumPayment || 0), 0))}
                    <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>/mo</span>
                  </p>
                </div>
                <div style={{ ...cardStyle, padding: '18px 20px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), margin: 0 }}>HIGHEST APR</p>
                  {(() => {
                    const h = debts.reduce<Debt | null>((max, d) => (max === null || (d.interestRate || 0) > (max.interestRate || 0)) ? d : max, null)
                    return h ? (
                      <div style={{ marginTop: 6 }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600, color: '#ef4444', margin: 0 }}>{h.interestRate.toFixed(2)}%</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), margin: '2px 0 0 0' }}>{h.name}</p>
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, color: (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'), margin: '6px 0 0 0' }}>—</p>
                    )
                  })()}
                </div>
              </div>
            )}

            {showDebtForm && (
              <form onSubmit={submitDebt} style={{ ...cardStyle, padding: '18px 20px', background: isDark ? '#111118' : '#f1f4f9', border: '1px solid rgba(37,99,235,0.25)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>NAME</label>
                    <input
                      value={debtForm.name}
                      onChange={e => setDebtForm(f => ({ ...f, name: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="e.g. Chase Visa"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>TYPE</label>
                    <select
                      value={debtForm.type}
                      onChange={e => setDebtForm(f => ({ ...f, type: e.target.value as Debt['type'] }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      {DEBT_TYPES.map(t => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>CURRENT BALANCE ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(debtForm.balance)}
                      onChange={e => setDebtForm(f => ({ ...f, balance: stripCommas(e.target.value) }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="2,500"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>ORIGINAL BALANCE ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(debtForm.originalBalance)}
                      onChange={e => setDebtForm(f => ({ ...f, originalBalance: stripCommas(e.target.value) }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="5,000"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>APR (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={debtForm.interestRate}
                      onChange={e => setDebtForm(f => ({ ...f, interestRate: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="19.99"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>MIN PAYMENT ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(debtForm.minimumPayment)}
                      onChange={e => setDebtForm(f => ({ ...f, minimumPayment: stripCommas(e.target.value) }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="75"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>DUE DAY (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={debtForm.dueDayOfMonth}
                      onChange={e => setDebtForm(f => ({ ...f, dueDayOfMonth: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="15"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), display: 'block', marginBottom: 3 }}>TARGET PAYOFF DATE (optional)</label>
                    <input
                      type="date"
                      value={debtForm.payoffDate}
                      onChange={e => setDebtForm(f => ({ ...f, payoffDate: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="submit"
                    style={{ flex: 1, background: '#2563eb', border: 'none', borderRadius: 6, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, padding: '7px 12px', cursor: 'pointer' }}
                  >
                    {editingDebtId ? 'Save changes' : 'Add debt'}
                  </button>
                  <button
                    type="button"
                    onClick={resetDebtForm}
                    style={{ background: 'none', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 6, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '7px 12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {debts.length === 0 && !showDebtForm ? (
              <div style={{ ...cardStyle, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: '0 0 6px 0' }}>No debts tracked yet</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), margin: '0 0 16px 0', maxWidth: 380 }}>
                  Add your debts to track payoff progress and see your monthly obligations.
                </p>
                <button
                  onClick={() => { resetDebtForm(); setShowDebtForm(true) }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}
                >
                  <Plus size={12} /> Add your first debt
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {debts.map(d => {
                  const original = d.originalBalance > 0 ? d.originalBalance : d.balance
                  const paid = Math.max(0, original - d.balance)
                  const paidPct = original > 0 ? Math.min(100, Math.max(0, (paid / original) * 100)) : 0
                  const dd = d.dueDayOfMonth != null ? d.dueDayOfMonth : (d as any).dueDate
                  const suffix = dd == null ? '' : ([1, 21, 31].includes(dd) ? 'st' : [2, 22].includes(dd) ? 'nd' : [3, 23].includes(dd) ? 'rd' : 'th')
                  const estMonths = estimateMonthsToPayoff(d.balance || 0, d.interestRate || 0, d.minimumPayment || 0)
                  const estIso = estMonths != null ? addMonthsFromToday(estMonths) : null
                  const targetIso = d.payoffDate || null
                  const targetAggressive = !!(targetIso && estIso && targetIso < estIso)
                  const neededPayment = (() => {
                    if (!targetAggressive || !targetIso) return null
                    const now = new Date()
                    const target = new Date(targetIso)
                    const monthsToTarget = Math.max(1, Math.round((target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())))
                    const apr = d.interestRate || 0
                    const bal = d.balance || 0
                    if (apr <= 0) return Math.ceil(bal / monthsToTarget)
                    const mr = (apr / 100) / 12
                    const pmt = (bal * mr) / (1 - Math.pow(1 + mr, -monthsToTarget))
                    return Number.isFinite(pmt) ? Math.ceil(pmt) : null
                  })()
                  return (
                    <div key={d.id} style={{ ...cardStyle, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{d.name}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563eb', whiteSpace: 'nowrap' }}>{DEBT_TYPE_LABELS[d.type]}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)') }}>
                            <span>APR <span style={{ color: '#ef4444', fontWeight: 600 }}>{(d.interestRate || 0).toFixed(2)}%</span></span>
                            <span>Min <span style={{ color: (isDark ? '#ffffff' : '#0a0a0f'), fontWeight: 600 }}>{fmt(d.minimumPayment || 0)}</span>/mo</span>
                            {dd != null && <span>Due <span style={{ color: (isDark ? '#ffffff' : '#0a0a0f'), fontWeight: 600 }}>{dd}{suffix}</span></span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: '#ef4444' }}>{fmt(d.balance || 0)}</span>
                          <button onClick={() => openEditDebt(d)} aria-label="Edit debt" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 2, color: (isDark ? '#ffffff' : '#0a0a0f') }}>
                            <Settings size={14} />
                          </button>
                          <button onClick={() => deleteDebt(d.id)} aria-label="Delete debt" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 2 }}>
                            <Trash2 size={14} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), marginBottom: 4 }}>
                          <span>Paid {paidPct.toFixed(0)}%</span>
                          <span>{fmt(paid)} of {fmt(original)}</span>
                        </div>
                        <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${paidPct}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
                        </div>
                        {(targetIso || estIso) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                            {targetIso && <span>Target <span style={{ color: (isDark ? '#ffffff' : '#0a0a0f'), fontWeight: 600 }}>{formatMonthYear(targetIso)}</span></span>}
                            {estIso && !targetIso && <span>Est. payoff <span style={{ color: (isDark ? '#ffffff' : '#0a0a0f'), fontWeight: 600 }}>{formatMonthYear(estIso)}</span></span>}
                            {targetAggressive && neededPayment != null && (
                              <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                                Aggressive target — consider {fmt(neededPayment)}/mo
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {activeSection === 'plan' && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontStyle: 'italic', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), margin: 0 }}>Financial plan generator coming in next build step</p>
          </div>
        )}
      </div>
      <LifeHubChat section="finance" apiRoute="/api/life/finance/chat" contextData={{ income, expenses, streams, assets, liabilities, netWorth, debts }} systemPrompt="You are Coach Shai, a finance AI. Analyze income across all streams, expenses, assets, liabilities, and net worth. Be direct and insightful." defaultOpen={defaultChatOpen} />
    </div>
  )
}

export default function FinanceClient() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(128,128,128,0.5)' }}>Loading...</div></div>}>
      <FinancePage />
    </Suspense>
  )
}
