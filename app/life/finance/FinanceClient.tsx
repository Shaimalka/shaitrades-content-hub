'use client'
import { useState, useEffect, Suspense, useRef, Fragment } from 'react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import Link from 'next/link'
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Pencil, X, Check, DollarSign, BarChart2, Settings, Sparkles, Loader2, AlertCircle, Target } from 'lucide-react'
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
import type { Asset, Liability } from '@/types/finance'

interface IncomeStream { id: string; name: string; color: string; emoji: string }
interface IncomeEntry { id: string; date: string; amount: number; streamId: string; account?: string; payoutType?: string; source?: string; notes?: string; recurringRuleId?: string | null; createdAt?: string }
interface RecurringIncomeRule { id: string; streamId: string; amount: number; account: string; notes: string; frequency: 'monthly'; dayOfMonth: number; startDate: string; endDate: string | null; status: 'active' | 'paused' | 'ended'; createdAt: string; lastGeneratedAt: string | null }
interface ExpenseEntry { id: string; date: string; amount: number; category: string; notes?: string }
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
function ordinalDay(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

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
      <p style={{ color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), fontSize: 13, maxWidth: 280, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>{subtext}</p>
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
  const cardStyle = { background: isDark ? '#1a1f2e' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties
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
          <button onClick={onCancel} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isDark,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isDark: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const BLUE = '#60a5fa'
  const RED = '#ef4444'
  const confirmColor = destructive ? RED : BLUE

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '20px 22px', fontFamily: 'Inter, sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0 }}>{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 4, display: 'inline-flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: textSecondary, margin: '0 0 18px 0', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'rgba(96,165,250,0.06)', border: `1px solid #bfdbfe`, borderRadius: 8, color: BLUE, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.12s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.06)')}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ background: confirmColor, border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, padding: '9px 18px', cursor: 'pointer', transition: 'filter 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            {confirmLabel}
          </button>
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
  const cardStyle = { background: isDark ? '#1a1f2e' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties
  const statCardStyle = { background: isDark ? '#1a1f2e' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties
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
  const [streamGoals, setStreamGoals] = useState<Record<string, { amount: number; updatedAt: string | null }>>({})
  const [editingStreamGoal, setEditingStreamGoal] = useState(false)
  const [streamGoalInput, setStreamGoalInput] = useState('')
  const cancelingStreamGoalRef = useRef(false)
  const [taxReservePercent, setTaxReservePercent] = useState(30)
  const [taxReserveInput, setTaxReserveInput] = useState('30')
  const [editingTaxRate, setEditingTaxRate] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ date: today(), amount: '', notes: '', account: '', source: '' })
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ date: string; amount: string; account: string; notes: string }>({ date: '', amount: '', account: '', notes: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [expenseForm, setExpenseForm] = useState({ date: today(), category: 'Software', amount: '', notes: '' })
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [expenseEditForm, setExpenseEditForm] = useState<{ date: string; amount: string; category: string; notes: string }>({ date: '', amount: '', category: '', notes: '' })
  const [expenseEditSaving, setExpenseEditSaving] = useState(false)
  const [expenseEditError, setExpenseEditError] = useState<string | null>(null)

  // Recurring income rules (Sprint 1C).
  const [recurringRules, setRecurringRules] = useState<RecurringIncomeRule[]>([])
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurringForm, setRecurringForm] = useState<{ dayOfMonth: string; startDate: string; endDate: string; generateFirstNow: boolean }>({
    dayOfMonth: String(new Date().getDate()),
    startDate: today(),
    endDate: '',
    generateFirstNow: false,
  })
  const [recurringBusy, setRecurringBusy] = useState(false)
  const [recurringError, setRecurringError] = useState<string | null>(null)
  const [showEndedRules, setShowEndedRules] = useState(false)

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
  type ConfirmRequest = { title: string; message: string; confirmLabel?: string; destructive?: boolean; resolve: (ok: boolean) => void }
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  function requestConfirm(opts: { title?: string; message: string; confirmLabel?: string; destructive?: boolean }): Promise<boolean> {
    return new Promise(resolve => setConfirmRequest({ title: opts.title || 'Confirm', message: opts.message, confirmLabel: opts.confirmLabel, destructive: opts.destructive, resolve }))
  }
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
    fetch('/api/life/finance/recurring-income').then(r => r.json()).then(d => { if (Array.isArray(d.rules)) setRecurringRules(d.rules) }).catch(() => {})
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

  useEffect(() => {
    if (activeSection !== 'income') return
    if (!activeTab || activeTab === 'expenses') return
    if (streamGoals[activeTab]) return
    const streamId = activeTab
    fetch('/api/life/finance/income-goal?streamId=' + encodeURIComponent(streamId))
      .then(r => r.json())
      .then(d => {
        if (typeof d?.amount === 'number') {
          setStreamGoals(prev => (prev[streamId] ? prev : { ...prev, [streamId]: { amount: d.amount, updatedAt: d.updatedAt ?? null } }))
        }
      })
      .catch(() => {})
  }, [activeSection, activeTab, streamGoals])

  // Coach Shai — auto-gen banner for recurring income (Sprint 1C).
  // Runs when user lands on Income tab. Finds unacknowledged auto-generated
  // entries created in the last 24h and surfaces them one-by-one through the
  // existing shaiMsg banner. Acks on show (sessionStorage) so the banner
  // doesn't reappear on navigation within this session.
  useEffect(() => {
    if (activeSection !== 'income') return
    if (typeof window === 'undefined') return
    if (shaiMsg) return
    const now = Date.now()
    const DAY_MS = 24 * 60 * 60 * 1000
    const next = income
      .filter(e => !!e.recurringRuleId && !!e.createdAt)
      .filter(e => {
        const t = new Date(e.createdAt as string).getTime()
        return Number.isFinite(t) && (now - t) <= DAY_MS
      })
      .filter(e => {
        try { return !sessionStorage.getItem('acknowledged_recurring:' + e.id) } catch { return true }
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
    if (!next) return
    const runCount = income.filter(e => e.recurringRuleId === next.recurringRuleId).length
    const stream = streams.find(s => s.id === next.streamId)
    const source = next.account || (stream ? stream.name : 'income')
    const amount = fmt(next.amount)
    let msg: string
    if (runCount <= 1) {
      msg = `Your first ${amount} from ${source} just auto-logged 🔁 — recurring income is leverage.`
    } else if (runCount <= 4) {
      msg = `Another ${amount} from ${source}. Consistency compounds.`
    } else {
      msg = `${ordinalDay(runCount)} ${source} payment. Keep the system running.`
    }
    try { sessionStorage.setItem('acknowledged_recurring:' + next.id, '1') } catch {}
    setShaiMsg(msg)
    // Auto-clear after 10s (matches existing banner pattern); setter guard
    // prevents stomping on a newer message.
    setTimeout(() => setShaiMsg(prev => prev === msg ? null : prev), 10000)
  }, [activeSection, income, streams, shaiMsg])

  async function addStream(s: Omit<IncomeStream, 'id'>) {
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_stream', stream: s }) })
    const data = await res.json(); if (data.streams) setStreams(data.streams); setShowNewStream(false); setActiveTab(data.streams?.[data.streams.length - 1]?.id || activeTab)
  }
  async function deleteStream(streamId: string) {
    const ok = await requestConfirm({
      title: 'Delete stream',
      message: 'Delete this stream? Logged income entries stay; only the stream label is removed.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_stream', streamId }) })
    const data = await res.json(); if (data.streams) setStreams(data.streams); if (activeTab === streamId) setActiveTab(data.streams?.[0]?.id || '')
  }
  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(incomeForm.amount)
    // Recurring branch — create rule instead of (or in addition to) a one-off entry.
    if (recurringEnabled) {
      const dom = parseInt(recurringForm.dayOfMonth, 10)
      if (!Number.isFinite(amt) || amt <= 0) { setRecurringError('Amount must be greater than 0'); return }
      if (!Number.isInteger(dom) || dom < 1 || dom > 31) { setRecurringError('Day of month must be 1–31'); return }
      try {
        await createRecurringRule({
          streamId: activeTab,
          amount: amt,
          account: incomeForm.account,
          notes: incomeForm.notes,
          dayOfMonth: dom,
          startDate: recurringForm.startDate || incomeForm.date || today(),
          endDate: recurringForm.endDate ? recurringForm.endDate : null,
          generateFirstNow: recurringForm.generateFirstNow,
        })
        setShowForm(false)
        setIncomeForm({ date: today(), amount: '', notes: '', account: '', source: '' })
        resetRecurringForm()
        const stream = streams.find(s => s.id === activeTab)
        setShaiMsg(stream ? '🔁 ' + fmt(amt) + ' ' + stream.name + ' set to auto-log on day ' + dom + ' each month.' : null)
        setTimeout(() => setShaiMsg(null), 10000)
      } catch { /* error surfaced in recurringError */ }
      return
    }
    // Manual one-off entry — unchanged existing flow.
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'income', entry: { ...incomeForm, amount: amt, streamId: activeTab } }) })
    const data = await res.json(); setIncome(data.income || []); setShowForm(false); setIncomeForm({ date: today(), amount: '', notes: '', account: '', source: '' })
    const stream = streams.find(s => s.id === activeTab)
    setShaiMsg(stream ? stream.emoji + ' ' + fmt(amt) + ' logged to ' + stream.name + '. Keep stacking.' : null)
    setTimeout(() => setShaiMsg(null), 10000)
  }
  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', entry: { ...expenseForm, amount: parseFloat(expenseForm.amount) } }) })
    const data = await res.json(); setExpenses(data.expenses || []); setShowForm(false); setExpenseForm({ date: today(), category: 'Software', amount: '', notes: '' })
  }
  async function deleteEntry(id: string, type: 'income' | 'expense') {
    const ok = await requestConfirm({
      title: `Delete ${type} entry`,
      message: `Delete this ${type} entry? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await fetch('/api/life/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type, entry: { id } }) })
    const data = await res.json(); if (type === 'income') setIncome(data.income || []); else setExpenses(data.expenses || [])
  }
  function startEditIncome(entry: IncomeEntry) {
    setEditingEntryId(entry.id)
    setEditForm({
      date: entry.date,
      amount: String(entry.amount),
      account: entry.account || entry.source || '',
      notes: entry.notes || '',
    })
    setEditError(null)
  }
  function cancelEditIncome() {
    setEditingEntryId(null)
    setEditError(null)
  }
  async function saveEditIncome(id: string) {
    if (editSaving) return
    setEditSaving(true)
    setEditError(null)
    const prev = income
    const patch = {
      date: editForm.date,
      amount: parseFloat(editForm.amount) || 0,
      account: editForm.account,
      notes: editForm.notes,
    }
    setIncome(prev.map(e => e.id === id ? { ...e, ...patch } : e))
    try {
      const res = await fetch('/api/life/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_income', entryId: id, patch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      if (data.income) setIncome(data.income)
      setEditingEntryId(null)
    } catch (err: any) {
      setIncome(prev)
      setEditError(err?.message || 'Failed to save')
    } finally {
      setEditSaving(false)
    }
  }
  function startEditExpense(entry: ExpenseEntry) {
    setEditingExpenseId(entry.id)
    setExpenseEditForm({
      date: entry.date,
      amount: String(entry.amount),
      category: entry.category || EXPENSE_CATEGORIES[0],
      notes: entry.notes || '',
    })
    setExpenseEditError(null)
  }
  function cancelEditExpense() {
    setEditingExpenseId(null)
    setExpenseEditError(null)
  }
  async function saveEditExpense(id: string) {
    if (expenseEditSaving) return
    setExpenseEditSaving(true)
    setExpenseEditError(null)
    const prev = expenses
    const patch = {
      date: expenseEditForm.date,
      amount: parseFloat(expenseEditForm.amount) || 0,
      category: expenseEditForm.category,
      notes: expenseEditForm.notes,
    }
    setExpenses(prev.map(e => e.id === id ? { ...e, ...patch } : e))
    try {
      const res = await fetch('/api/life/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_expense', entryId: id, patch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      if (data.expenses) setExpenses(data.expenses)
      setEditingExpenseId(null)
    } catch (err: any) {
      setExpenses(prev)
      setExpenseEditError(err?.message || 'Failed to save')
    } finally {
      setExpenseEditSaving(false)
    }
  }

  // ── Recurring income rule handlers (Sprint 1C) ───────────────────────────
  function resetRecurringForm() {
    setRecurringEnabled(false)
    setRecurringError(null)
    setRecurringForm({
      dayOfMonth: String(new Date().getDate()),
      startDate: today(),
      endDate: '',
      generateFirstNow: false,
    })
  }
  async function createRecurringRule(payload: {
    streamId: string; amount: number; account: string; notes: string;
    dayOfMonth: number; startDate: string; endDate: string | null; generateFirstNow: boolean
  }) {
    setRecurringBusy(true)
    setRecurringError(null)
    try {
      const res = await fetch('/api/life/finance/recurring-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create rule')
      if (data.rule) setRecurringRules(prev => [...prev, data.rule])
      if (data.entry) setIncome(prev => [...prev, data.entry])
      return data
    } catch (err: any) {
      setRecurringError(err?.message || 'Failed to create rule')
      throw err
    } finally {
      setRecurringBusy(false)
    }
  }
  async function mutateRecurringRule(ruleId: string, action: 'pause' | 'resume' | 'end' | 'update', updates?: Partial<RecurringIncomeRule>) {
    setRecurringBusy(true)
    setRecurringError(null)
    try {
      const res = await fetch('/api/life/finance/recurring-income', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, action, updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update rule')
      if (data.rule) setRecurringRules(prev => prev.map(r => r.id === ruleId ? data.rule : r))
    } catch (err: any) {
      setRecurringError(err?.message || 'Failed to update rule')
    } finally {
      setRecurringBusy(false)
    }
  }
  async function deleteRecurringRule(ruleId: string) {
    setRecurringBusy(true)
    setRecurringError(null)
    try {
      const res = await fetch('/api/life/finance/recurring-income', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to delete rule')
      setRecurringRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (err: any) {
      setRecurringError(err?.message || 'Failed to delete rule')
    } finally {
      setRecurringBusy(false)
    }
  }

  function saveGoal() {
    const val = parseFloat(goalInput) || 10000; setMonthlyGoal(val); localStorage.setItem(GOAL_STORAGE_KEY, String(val)); setEditingGoal(false)
  }
  async function saveStreamGoal() {
    if (!activeTab || activeTab === 'expenses') { setEditingStreamGoal(false); return }
    const parsed = parseFloat(streamGoalInput)
    const val = Math.max(0, Math.min(10_000_000, Number.isFinite(parsed) ? parsed : 10000))
    setStreamGoals(prev => ({ ...prev, [activeTab]: { amount: val, updatedAt: new Date().toISOString() } }))
    setEditingStreamGoal(false)
    try {
      await fetch('/api/life/finance/income-goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: activeTab, amount: val }),
      })
    } catch {}
  }
  function startEditStreamGoal() {
    const current = streamGoals[activeTab]?.amount ?? 10000
    setStreamGoalInput(String(current))
    setEditingStreamGoal(true)
  }
  function handleStreamGoalBlur() {
    if (cancelingStreamGoalRef.current) { cancelingStreamGoalRef.current = false; return }
    saveStreamGoal()
  }
  function cancelEditStreamGoal() {
    cancelingStreamGoalRef.current = true
    setEditingStreamGoal(false)
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
      const newAsset: Omit<Asset, 'userId' | 'createdAt' | 'updatedAt'> = { id: Date.now().toString(), name: assetForm.name.trim(), value: parseFloat(assetForm.value), category: assetForm.category, liquidity: assetForm.liquidity }
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
    const ok = await requestConfirm({
      title: 'Delete asset',
      message: 'Delete this asset? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
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
      const newLiability: Omit<Liability, 'userId' | 'createdAt' | 'updatedAt'> = { id: Date.now().toString(), name: liabilityForm.name.trim(), amount: parseFloat(liabilityForm.amount), category: liabilityForm.category }
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
    const ok = await requestConfirm({
      title: 'Delete liability',
      message: 'Delete this liability? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await fetch('/api/finance/net-worth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', type: 'liability', item: { id } }) })
    const data = await res.json(); if (data.liabilities) setLiabilities(data.liabilities)
  }
  function resetDebtForm() { setDebtForm({ name: '', type: 'credit_card', balance: '', originalBalance: '', interestRate: '', minimumPayment: '', dueDayOfMonth: '', payoffDate: '' }); setEditingDebtId(null); setShowDebtForm(false) }
  function openEditDebt(d: Debt) { const legacy = (d as any).dueDate; const dueDay = d.dueDayOfMonth != null ? d.dueDayOfMonth : (legacy != null ? legacy : null); setDebtForm({ name: d.name, type: d.type, balance: String(d.balance), originalBalance: String(d.originalBalance), interestRate: String(d.interestRate), minimumPayment: String(d.minimumPayment), dueDayOfMonth: dueDay != null ? String(dueDay) : '', payoffDate: d.payoffDate || '' }); setEditingDebtId(d.id); setShowDebtForm(true) }
  async function submitDebt(e: React.FormEvent) { e.preventDefault(); if (!debtForm.name.trim()) return; const balanceNum = parseFloat(stripCommas(debtForm.balance)) || 0; const originalNum = debtForm.originalBalance ? parseFloat(stripCommas(debtForm.originalBalance)) : balanceNum; const rateNum = parseFloat(debtForm.interestRate) || 0; const minNum = parseFloat(stripCommas(debtForm.minimumPayment)) || 0; const dueNum = debtForm.dueDayOfMonth ? Math.max(1, Math.min(31, parseInt(debtForm.dueDayOfMonth, 10))) : undefined; const payload: any = { name: debtForm.name.trim(), type: debtForm.type, balance: balanceNum, originalBalance: originalNum, interestRate: rateNum, minimumPayment: minNum }; if (dueNum !== undefined && !Number.isNaN(dueNum)) payload.dueDayOfMonth = dueNum; if (debtForm.payoffDate && debtForm.payoffDate.trim() !== '') payload.payoffDate = debtForm.payoffDate; if (editingDebtId) { const res = await fetch('/api/life/finance/debts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingDebtId, updates: payload }) }); const data = await res.json(); if (data.debt) setDebts(prev => prev.map(d => d.id === editingDebtId ? data.debt : d)) } else { const res = await fetch('/api/life/finance/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.debt) setDebts(prev => [...prev, data.debt]) } resetDebtForm() }
  async function deleteDebt(id: string) {
    const ok = await requestConfirm({
      title: 'Delete debt',
      message: 'Delete this debt? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await fetch('/api/life/finance/debts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setDebts(prev => prev.filter(d => d.id !== id))
  }
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
  const currentYear = new Date().toISOString().slice(0, 4)
  const totalIn = income.filter(e => e.date.slice(0, 4) === currentYear).reduce((s, e) => s + e.amount, 0)
  const totalOut = expenses.filter(e => e.date.slice(0, 4) === currentYear).reduce((s, e) => s + e.amount, 0)
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
    <div style={{ background: (isDark ? '#0f1117' : '#f8fafc'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1280px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>
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
            <button onClick={() => setShaiMsg(null)} style={{ background: 'none', border: 'none', color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), cursor: 'pointer', fontSize: 14 }}>✕</button>
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
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.35)' : '#64748b'), margin: '6px 0 0 0' }}>Liquid {fmt(liquidTotal)} · Illiquid {fmt(illiquidTotal)}</p>
            </div>
            <div style={tbStatCard(_tb.RED)}>
              <p style={tbLabel}>TOTAL LIABILITIES</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: _tb.RED, margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>{fmt(totalLiabilitiesCombined)}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.35)' : '#64748b'), margin: '6px 0 0 0' }}>User {fmt(totalLiabilities)} · Debts {fmt(totalDebts)}</p>
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
              <button onClick={dismissNwDuplicateWarning} style={{ background: 'none', border: 'none', cursor: 'pointer', color: _tb.textMuted, padding: 2, borderRadius: 4, transition: 'color 0.12s ease, background 0.12s ease' }} aria-label="Dismiss warning" onMouseEnter={e => { e.currentTarget.style.color = _tb.textPrimary; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.color = _tb.textMuted; e.currentTarget.style.background = 'transparent' }} onFocus={e => { e.currentTarget.style.color = _tb.textPrimary; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} onBlur={e => { e.currentTarget.style.color = _tb.textMuted; e.currentTarget.style.background = 'transparent' }}>
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
                <button onClick={() => { if (showAssetForm) { setShowAssetForm(false); setEditingAssetId(null); setAssetForm({ name: '', value: '', category: 'Cash', liquidity: 'liquid' }) } else { setShowAssetForm(true); setShowLiabilityForm(false); setEditingAssetId(null) } }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.06)', border: `1px solid #a7f3d0`, borderRadius: 6, color: _tb.GREEN, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', transition: 'background 0.12s ease' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.14)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')} onFocus={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.14)')} onBlur={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', border: `1px dashed ${_tb.cardBorder}`, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: _tb.textSecondary, margin: 0, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>
                      Start with your cash balance — most people begin with checking + savings.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowAssetForm(true); setShowLiabilityForm(false); setEditingAssetId(null) }}
                      style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.06)', border: '1px solid #a7f3d0', borderRadius: 8, color: _tb.GREEN, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', transition: 'background 0.12s ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')}
                      onFocus={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.14)')}
                      onBlur={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')}
                    >
                      <Plus size={12} /> Add your first asset
                    </button>
                  </div>
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
                <button onClick={() => { if (showLiabilityForm) { setShowLiabilityForm(false); setEditingLiabilityId(null); setLiabilityForm({ name: '', amount: '', category: 'Credit Card' }) } else { setShowLiabilityForm(true); setShowAssetForm(false); setEditingLiabilityId(null) } }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.06)', border: `1px solid #fecaca`, borderRadius: 6, color: _tb.RED, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', transition: 'background 0.12s ease' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')} onFocus={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')} onBlur={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', border: `1px dashed ${_tb.cardBorder}`, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: _tb.textSecondary, margin: 0, textAlign: 'center', lineHeight: 1.5, maxWidth: 300 }}>
                      No liabilities yet. Loans, credit cards, and other debts show up here.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowLiabilityForm(true); setShowAssetForm(false); setEditingLiabilityId(null) }}
                      style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid #fecaca', borderRadius: 8, color: _tb.RED, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', transition: 'background 0.12s ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                      onFocus={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
                      onBlur={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                    >
                      <Plus size={12} /> Add your first liability
                    </button>
                  </div>
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
                    <button onClick={() => setActiveSection('debts')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: _tb.BRAND, padding: 0, transition: 'color 0.12s ease, text-decoration-color 0.12s ease', textDecoration: 'underline', textDecorationColor: 'transparent', textUnderlineOffset: 3 }} onMouseEnter={e => { e.currentTarget.style.color = _tb.BRAND_DARK; e.currentTarget.style.textDecorationColor = _tb.BRAND_DARK }} onMouseLeave={e => { e.currentTarget.style.color = _tb.BRAND; e.currentTarget.style.textDecorationColor = 'transparent' }} onFocus={e => { e.currentTarget.style.color = _tb.BRAND_DARK; e.currentTarget.style.textDecorationColor = _tb.BRAND_DARK }} onBlur={e => { e.currentTarget.style.color = _tb.BRAND; e.currentTarget.style.textDecorationColor = 'transparent' }}>From Debts tab →</button>
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
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.35)' : '#64748b'), marginTop: 4, textAlign: 'right' }}>User {fmt(totalLiabilities)} · Debts {fmt(totalDebts)}</div>
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
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{fmt(Math.max(0, (taxReservePercent / 100) * netProfit))} <span style={{ fontSize: 11, fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{taxReservePercent}%</span></p>
            )}
          </div>
        </div>
        )}

        {/* Per-stream breakdown */}
        {activeSection === 'overview' && (<>
        {streamTotals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {streamTotals.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${s.color}` }}>
                <span style={{ fontSize: 24 }}>{s.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', marginBottom: 2 }}>{s.name}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: (isDark ? '#f9fafb' : '#0f172a'), margin: 0 }}>{fmt(s.total)}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.25)' : '#64748b'), marginTop: 2 }}>{s.count} entries</p>
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
                      {fmt(thisMonthTrading)} <span style={{ fontSize: 12, fontWeight: 400, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569') }}>/ {fmt(monthlyGoal)}</span>
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
            {biggestCat && (
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <TrendingDown size={20} style={{ color: '#ff4d6a', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', margin: 0 }}>BIGGEST EXPENSE CATEGORY</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#ff4d6a', margin: '2px 0 0 0' }}>{biggestCat[0]} — {fmt(biggestCat[1])}</p>
                </div>
              </div>
            )}
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
        {/* Monthly Income Goal (per stream, Income tab only) */}
        {activeSection === 'income' && activeStream && (() => {
          const goalAmount = streamGoals[activeTab]?.amount ?? 10000
          const thisMonthStream = activeIncome.filter(e => e.date.slice(0, 7) === currentMonth).reduce((s, e) => s + e.amount, 0)
          const pct = goalAmount > 0 ? Math.min(100, Math.round((thisMonthStream / goalAmount) * 100)) : 0
          const now = new Date()
          const dayOfMonth = now.getDate()
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          const expected = goalAmount * (dayOfMonth / daysInMonth)
          const paceRatio = expected > 0 ? thisMonthStream / expected : 1
          const paceColor = paceRatio >= 1 ? '#10b981' : paceRatio >= 0.7 ? '#f59e0b' : '#ef4444'
          const paceColorLight = paceRatio >= 1 ? '#34d399' : paceRatio >= 0.7 ? '#fbbf24' : '#f87171'
          const paceBgRgba = paceRatio >= 1 ? 'rgba(16,185,129,0.12)' : paceRatio >= 0.7 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
          const paceBorderRgba = paceRatio >= 1 ? 'rgba(16,185,129,0.28)' : paceRatio >= 0.7 ? 'rgba(245,158,11,0.28)' : 'rgba(239,68,68,0.28)'
          const cardBg = isDark ? '#1a1f2e' : '#ffffff'
          const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
          const textPrimary = isDark ? '#f9fafb' : '#0f172a'
          const textMuted = '#94a3b8'
          return (
            <div style={{
              background: cardBg,
              border: '1px solid ' + cardBorder,
              borderRadius: 12,
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  margin: 0,
                }}>
                  Monthly Goal — {activeStream.name}
                </p>
                {!editingStreamGoal && (
                  <button
                    onClick={startEditStreamGoal}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      border: '1px solid ' + cardBorder,
                      color: textMuted,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = textPrimary; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                    onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}
                    aria-label="Edit monthly goal"
                  >
                    edit
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {editingStreamGoal ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: '-0.02em' }}>{fmt(thisMonthStream)} <span style={{ fontSize: 13, fontWeight: 500, color: (isDark ? '#94a3b8' : '#64748b') }}>/</span></span>
                    <input
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(streamGoalInput)}
                      onChange={e => setStreamGoalInput(stripCommas(e.target.value))}
                      onBlur={handleStreamGoalBlur}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEditStreamGoal() }
                      }}
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 22,
                        fontWeight: 700,
                        color: textPrimary,
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.14)' : '#cbd5e1'),
                        borderRadius: 8,
                        padding: '4px 10px',
                        outline: 'none',
                        width: 140,
                        letterSpacing: '-0.02em',
                      }}
                      placeholder="10,000"
                    />
                  </div>
                ) : (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 22,
                    fontWeight: 700,
                    color: textPrimary,
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}>
                    {fmt(thisMonthStream)}{' '}
                    <span style={{ fontSize: 13, fontWeight: 500, color: (isDark ? '#94a3b8' : '#64748b') }}>/ {fmt(goalAmount)}</span>
                  </p>
                )}
                {!editingStreamGoal && (
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: paceBgRgba,
                    color: paceColor,
                    border: '1px solid ' + paceBorderRgba,
                  }}>
                    {pct}%
                  </span>
                )}
              </div>
              <div style={{
                height: 6,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: pct + '%',
                  borderRadius: 4,
                  backgroundImage: 'linear-gradient(90deg, ' + paceColor + ' 0%, ' + paceColorLight + ' 50%, ' + paceColor + ' 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          )
        })()}

        {/* Recurring Rules (Sprint 1C) — renders above stream sub-tabs */}
        {activeSection === 'income' && recurringRules.some(r => r.status !== 'ended') && (() => {
          const activeAndPaused = recurringRules.filter(r => r.status !== 'ended')
          const ended = recurringRules.filter(r => r.status === 'ended')
          const actionBtn: React.CSSProperties = {
            background: 'transparent',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
            borderRadius: 6,
            color: isDark ? '#cbd5e1' : '#475569',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'background 0.12s',
          }
          const dangerBtn: React.CSSProperties = { ...actionBtn, color: '#ef4444', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }
          return (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 10px 0' }}>
                RECURRING RULES
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeAndPaused.map(rule => {
                  const stream = streams.find(s => s.id === rule.streamId)
                  const statusColor = rule.status === 'active' ? '#10b981' : '#f59e0b'
                  return (
                    <div key={rule.id} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15 }}>🔁</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: isDark ? '#f9fafb' : '#0f172a' }}>
                        {fmt(rule.amount)}/mo
                      </span>
                      <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>·</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>
                        {ordinalDay(rule.dayOfMonth)} of each month
                      </span>
                      {stream && (<>
                        <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>·</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: stream.color }}>
                          {stream.emoji} {stream.name}
                        </span>
                      </>)}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, background: statusColor + '1a', border: `1px solid ${statusColor}40` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>{rule.status}</span>
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {rule.status === 'active' && (
                          <button onClick={() => mutateRecurringRule(rule.id, 'pause')} disabled={recurringBusy} style={actionBtn}>⏸ Pause</button>
                        )}
                        {rule.status === 'paused' && (
                          <button onClick={() => mutateRecurringRule(rule.id, 'resume')} disabled={recurringBusy} style={actionBtn}>▶ Resume</button>
                        )}
                        <button onClick={async () => { if (await requestConfirm({ title: 'End rule', message: 'End this rule? No more entries will be generated.', confirmLabel: 'End rule' })) mutateRecurringRule(rule.id, 'end') }} disabled={recurringBusy} style={actionBtn}>🛑 End</button>
                        <button onClick={async () => { if (await requestConfirm({ title: 'Delete rule', message: 'Delete this rule? Past generated entries stay.', confirmLabel: 'Delete', destructive: true })) deleteRecurringRule(rule.id) }} disabled={recurringBusy} style={dangerBtn}>✕ Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {ended.length > 0 && (
                <>
                  <button
                    onClick={() => setShowEndedRules(v => !v)}
                    style={{ marginTop: 10, background: 'transparent', border: 'none', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    {showEndedRules ? 'Hide' : 'Show'} {ended.length} ended rule{ended.length !== 1 ? 's' : ''}
                  </button>
                  {showEndedRules && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ended.map(rule => {
                        const stream = streams.find(s => s.id === rule.streamId)
                        return (
                          <div key={rule.id} style={{ ...cardStyle, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: 0.55 }}>
                            <span style={{ fontSize: 13 }}>🔁</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                              {fmt(rule.amount)}/mo · {ordinalDay(rule.dayOfMonth)}{stream ? ` · ${stream.emoji} ${stream.name}` : ''}
                            </span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
                              ended {rule.endDate || ''}
                            </span>
                            <button onClick={async () => { if (await requestConfirm({ title: 'Delete rule', message: 'Delete this ended rule permanently?', confirmLabel: 'Delete', destructive: true })) deleteRecurringRule(rule.id) }} disabled={recurringBusy} style={{ ...dangerBtn, marginLeft: 'auto' }}>✕ Delete</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* Stream Tabs */}
        {activeSection === 'income' && (<>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {streams.map(s => (
            <div key={s.id} style={{ position: 'relative' }}>
              <button onClick={() => { setActiveTab(s.id); setShowForm(false) }} style={{ padding: '8px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: activeTab === s.id ? s.color + '1a' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), borderBottom: activeTab === s.id ? `2px solid ${s.color}` : '2px solid transparent', border: activeTab === s.id ? `1px solid ${s.color}30` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, color: activeTab === s.id ? s.color : (isDark ? 'rgba(255,255,255,0.5)' : '#475569') }}>
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
            <form onSubmit={saveIncome}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>DATE</label><input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} required /></div>
                <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>AMOUNT ($)</label><input type="text" inputMode="decimal" value={formatNumberInput(incomeForm.amount)} onChange={e => setIncomeForm(f => ({ ...f, amount: stripCommas(e.target.value) }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="1,500" required /></div>
                <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>ACCOUNT / SOURCE</label><input value={incomeForm.account} onChange={e => setIncomeForm(f => ({ ...f, account: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. TopStep, Brand Deal" /></div>
                <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 4 }}>NOTES</label><input value={incomeForm.notes} onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Optional" /></div>
              </div>

              {/* Recurring toggle (Sprint 1C) */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#f9fafb' : '#0f172a') }}>
                <input
                  type="checkbox"
                  checked={recurringEnabled}
                  onChange={e => { setRecurringEnabled(e.target.checked); if (!e.target.checked) setRecurringError(null) }}
                  style={{ accentColor: '#2563eb', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span>🔁 Make this recurring</span>
              </label>

              {recurringEnabled && (
                <div style={{ marginTop: 12, padding: '14px 16px', background: (isDark ? 'rgba(37,99,235,0.06)' : '#f8fafc'), border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#e2e8f0'}`, borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>FREQUENCY</label>
                      <select disabled value="monthly" style={{ ...inputStyle, cursor: 'not-allowed', opacity: 0.7 }}>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>DAY OF MONTH</label>
                      <input type="number" min={1} max={31} value={recurringForm.dayOfMonth} onChange={e => setRecurringForm(f => ({ ...f, dayOfMonth: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} required />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>START DATE</label>
                      <input type="date" value={recurringForm.startDate} onChange={e => setRecurringForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} required />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>END DATE <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: (isDark ? '#64748b' : '#94a3b8') }}>(optional)</span></label>
                      <input type="date" value={recurringForm.endDate} onChange={e => setRecurringForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} placeholder="Forever" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? '#f9fafb' : '#0f172a') }}>
                      <input type="radio" name="recurring-generate" checked={recurringForm.generateFirstNow === true} onChange={() => setRecurringForm(f => ({ ...f, generateFirstNow: true }))} style={{ accentColor: '#2563eb' }} />
                      <span>Generate first entry now</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? '#f9fafb' : '#0f172a') }}>
                      <input type="radio" name="recurring-generate" checked={recurringForm.generateFirstNow === false} onChange={() => setRecurringForm(f => ({ ...f, generateFirstNow: false }))} style={{ accentColor: '#2563eb' }} />
                      <span>Wait for scheduled day</span>
                    </label>
                  </div>
                </div>
              )}

              {recurringError && (
                <div style={{ marginTop: 10, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 6 }}>
                  {recurringError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="submit" disabled={recurringBusy} style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: recurringBusy ? 'wait' : 'pointer', opacity: recurringBusy ? 0.6 : 1 }}>
                  {recurringBusy ? 'Saving…' : recurringEnabled ? 'Save Rule' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetRecurringForm() }} style={{ background: (isDark ? '#111118' : '#ffffff'), border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        </>)}

        {/* Expense Form */}
        {activeSection === 'expenses' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#60a5fa', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
            <Plus size={12} /> Add Entry
          </button>
        </div>
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
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
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
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: activeStream.color, margin: 0 }}>
                    {activeStream.emoji} {activeStream.name.toUpperCase()} INCOME · {activeIncome.length} ENTRIES · {fmt(activeIncome.reduce((s,e)=>s+e.amount,0))}
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                        {['DATE','ACCOUNT / SOURCE','AMOUNT','NOTES',''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeIncome].sort((a,b) => b.date.localeCompare(a.date)).map(e => {
                        const isEditing = editingEntryId === e.id
                        const rowBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                        const onEditKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
                          if (ev.key === 'Enter') { ev.preventDefault(); saveEditIncome(e.id) }
                          else if (ev.key === 'Escape') { ev.preventDefault(); cancelEditIncome() }
                        }
                        return (
                          <Fragment key={e.id}>
                            <tr style={{ borderBottom: `1px solid ${rowBorder}` }}>
                              {isEditing ? (
                                <>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="date" autoFocus value={editForm.date} onChange={ev => setEditForm(f => ({ ...f, date: ev.target.value }))} onKeyDown={onEditKey} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light', padding: '6px 10px' }} />
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="text" value={editForm.account} onChange={ev => setEditForm(f => ({ ...f, account: ev.target.value }))} onKeyDown={onEditKey} placeholder="Source" style={{ ...inputStyle, padding: '6px 10px' }} />
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="text" inputMode="decimal" value={formatNumberInput(editForm.amount)} onChange={ev => setEditForm(f => ({ ...f, amount: stripCommas(ev.target.value) }))} onKeyDown={onEditKey} placeholder="0" style={{ ...inputStyle, padding: '6px 10px', color: '#10b981', fontWeight: 700 }} />
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="text" value={editForm.notes} onChange={ev => setEditForm(f => ({ ...f, notes: ev.target.value }))} onKeyDown={onEditKey} placeholder="Notes" style={{ ...inputStyle, padding: '6px 10px' }} />
                                  </td>
                                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                    <button onClick={() => saveEditIncome(e.id)} disabled={editSaving} aria-label="Save edit" style={{ background: 'none', border: 'none', cursor: editSaving ? 'wait' : 'pointer', padding: 4, marginRight: 4, opacity: editSaving ? 0.4 : 0.7, transition: 'opacity 0.12s' }} onMouseEnter={ev => { if (!editSaving) (ev.currentTarget as HTMLButtonElement).style.opacity = '1' }} onMouseLeave={ev => { if (!editSaving) (ev.currentTarget as HTMLButtonElement).style.opacity = '0.7' }}>
                                      <Check size={14} style={{ color: '#10b981' }} />
                                    </button>
                                    <button onClick={cancelEditIncome} aria-label="Cancel edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.5'}>
                                      <X size={14} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#475569' }} />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.65)' : '#475569') }}>
                                    {e.recurringRuleId && (
                                      <span title="Auto-generated from recurring rule" style={{ marginRight: 6, fontSize: 12 }} aria-label="Recurring entry">🔁</span>
                                    )}
                                    {e.date}
                                  </td>
                                  <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: (isDark ? '#f9fafb' : '#0f172a') }}>{e.account || e.source || '—'}</td>
                                  <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmt(e.amount)}</td>
                                  <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                    <button onClick={() => startEditIncome(e)} aria-label="Edit entry" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: 4, opacity: 0.3, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.3'}>
                                      <Pencil size={12} style={{ color: '#60a5fa' }} />
                                    </button>
                                    <button onClick={() => deleteEntry(e.id, 'income')} aria-label="Delete entry" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.3'}>
                                      <Trash2 size={12} style={{ color: '#ef4444' }} />
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                            {isEditing && editError && (
                              <tr>
                                <td colSpan={5} style={{ padding: '0 16px 10px 16px' }}>
                                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 12px', borderRadius: 6, textAlign: 'left' }}>
                                    {editError}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                      {activeIncome.length === 0 && <tr><td colSpan={5}><EmptyState icon={DollarSign} heading="NO TRANSACTIONS YET" subtext="Log your first income to start tracking." isDark={isDark} /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {activeTab !== 'expenses' && !activeStream && (
              <EmptyState icon={DollarSign} heading="NO STREAMS YET" subtext="Add an income stream above to start logging." isDark={isDark} />
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
                      {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).map(e => {
                        const isEditing = editingExpenseId === e.id
                        const rowBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                        const onEditKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
                          if (ev.key === 'Enter') { ev.preventDefault(); saveEditExpense(e.id) }
                          else if (ev.key === 'Escape') { ev.preventDefault(); cancelEditExpense() }
                        }
                        return (
                          <Fragment key={e.id}>
                            <tr style={{ borderBottom: `1px solid ${rowBorder}` }}>
                              {isEditing ? (
                                <>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="date" autoFocus value={expenseEditForm.date} onChange={ev => setExpenseEditForm(f => ({ ...f, date: ev.target.value }))} onKeyDown={onEditKey} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light', padding: '6px 10px' }} />
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <select value={expenseEditForm.category} onChange={ev => setExpenseEditForm(f => ({ ...f, category: ev.target.value }))} style={{ ...inputStyle, padding: '6px 10px', cursor: 'pointer' }}>
                                      {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="text" inputMode="decimal" value={formatNumberInput(expenseEditForm.amount)} onChange={ev => setExpenseEditForm(f => ({ ...f, amount: stripCommas(ev.target.value) }))} onKeyDown={onEditKey} placeholder="0" style={{ ...inputStyle, padding: '6px 10px', color: '#ff4d6a', fontWeight: 700 }} />
                                  </td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <input type="text" value={expenseEditForm.notes} onChange={ev => setExpenseEditForm(f => ({ ...f, notes: ev.target.value }))} onKeyDown={onEditKey} placeholder="Notes" style={{ ...inputStyle, padding: '6px 10px' }} />
                                  </td>
                                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                    <button onClick={() => saveEditExpense(e.id)} disabled={expenseEditSaving} aria-label="Save edit" style={{ background: 'none', border: 'none', cursor: expenseEditSaving ? 'wait' : 'pointer', padding: 4, marginRight: 4, opacity: expenseEditSaving ? 0.4 : 0.7, transition: 'opacity 0.12s' }} onMouseEnter={ev => { if (!expenseEditSaving) (ev.currentTarget as HTMLButtonElement).style.opacity = '1' }} onMouseLeave={ev => { if (!expenseEditSaving) (ev.currentTarget as HTMLButtonElement).style.opacity = '0.7' }}>
                                      <Check size={14} style={{ color: '#10b981' }} />
                                    </button>
                                    <button onClick={cancelEditExpense} aria-label="Cancel edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.5'}>
                                      <X size={14} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#475569' }} />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569') }}>{e.date}</td>
                                  <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.2)', color: '#ff4d6a' }}>{e.category}</span></td>
                                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ff4d6a' }}>{fmt(e.amount)}</td>
                                  <td style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                    <button onClick={() => startEditExpense(e)} aria-label="Edit entry" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: 4, opacity: 0.3, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.3'}>
                                      <Pencil size={12} style={{ color: '#60a5fa' }} />
                                    </button>
                                    <button onClick={() => deleteEntry(e.id, 'expense')} aria-label="Delete entry" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.12s' }} onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '1'} onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.opacity = '0.3'}>
                                      <Trash2 size={12} style={{ color: '#ff4d6a' }} />
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                            {isEditing && expenseEditError && (
                              <tr>
                                <td colSpan={5} style={{ padding: '0 16px 10px 16px' }}>
                                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 12px', borderRadius: 6, textAlign: 'left' }}>
                                    {expenseEditError}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
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
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), margin: '2px 0 0 0' }}>{h.name}</p>
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
                    style={{ background: 'none', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 6, color: (isDark ? 'rgba(255,255,255,0.4)' : '#475569'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '7px 12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {debts.length === 0 && !showDebtForm ? (
              <div style={{ ...cardStyle, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: '0 0 6px 0' }}>No debts tracked yet</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569'), margin: '0 0 16px 0', maxWidth: 380 }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.6)' : '#475569') }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : '#475569') }}>
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
          <div style={{ ...tbCard, marginBottom: 24, padding: '40px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${_tb.BRAND}14`, border: `1px solid ${_tb.BRAND}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={26} style={{ color: _tb.BRAND }} />
              </div>
              <div>
                <p style={{ ...tbLabel, color: _tb.BRAND_DARK, marginBottom: 6 }}>FINANCIAL PLAN</p>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700, color: _tb.textPrimary, margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>Coming soon</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: _tb.textSecondary, margin: 0, lineHeight: 1.5, maxWidth: 380 }}>
                  A consolidated view of your goals, runway, and long-term trajectory.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', maxWidth: 360, marginTop: 8, textAlign: 'left' }}>
                {[
                  'Goals — debt payoff, savings, and investment targets',
                  'Emergency fund — months of runway covered',
                  'Retirement — long-term projection from your data',
                  'Risk tolerance — tailor recommendations to your comfort',
                ].map(line => (
                  <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: _tb.textSecondary }}>
                    <span style={{ color: _tb.BRAND, fontWeight: 700, lineHeight: 1.5 }}>·</span>
                    <span style={{ lineHeight: 1.5 }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!confirmRequest}
        title={confirmRequest?.title || 'Confirm'}
        message={confirmRequest?.message || ''}
        confirmLabel={confirmRequest?.confirmLabel}
        destructive={confirmRequest?.destructive}
        isDark={isDark}
        onConfirm={() => { confirmRequest?.resolve(true); setConfirmRequest(null) }}
        onCancel={() => { confirmRequest?.resolve(false); setConfirmRequest(null) }}
      />
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
