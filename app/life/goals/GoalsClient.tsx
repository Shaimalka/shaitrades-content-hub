'use client'
import { useState, useEffect } from 'react'
import { Plus, Target, Settings, X } from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'

type TimeHorizon = 'weekly' | 'monthly' | 'quarterly'
type GoalType = 'trading' | 'life'
type TradingMetric = 'pnl' | 'winRate' | 'profitFactor' | 'maxDrawdown' | 'tradeCount' | 'payout'
type FormMode = 'closed' | 'new' | 'edit'

const TRADING_METRICS: { value: TradingMetric; label: string; unit: string; placeholder: string }[] = [
  { value: 'pnl', label: 'Net PnL ($)', unit: '$', placeholder: '3000' },
  { value: 'winRate', label: 'Win Rate (%)', unit: '%', placeholder: '60' },
  { value: 'profitFactor', label: 'Profit Factor', unit: 'ratio', placeholder: '1.5' },
  { value: 'maxDrawdown', label: 'Max Drawdown ($)', unit: '$', placeholder: '500' },
  { value: 'tradeCount', label: 'Trade Count', unit: 'trades', placeholder: '20' },
  { value: 'payout', label: 'Payout ($)', unit: '$', placeholder: '3000' },
]

type Goal = {
  id: string
  title: string
  type: GoalType
  metric: string
  timeHorizon: TimeHorizon
  status: 'active' | 'completed' | 'archived'
  current: number
  target: number
  unit: string
  note?: string
  startDate: string
  endDate: string
  createdAt: string
}

type FormState = {
  goalType: GoalType
  title: string
  tradingMetric: TradingMetric
  lifeMetricLabel: string
  lifeUnit: string
  target: string
  timeHorizon: TimeHorizon
  note: string
  currentProgress: string
}

const DEFAULT_FORM: FormState = {
  goalType: 'trading',
  title: '',
  tradingMetric: 'pnl',
  lifeMetricLabel: '',
  lifeUnit: '',
  target: '',
  timeHorizon: 'monthly',
  note: '',
  currentProgress: '',
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getPaceStatus(goal: Goal): { label: string; color: string; bg: string } {
  if (goal.current === 0) {
    return { label: 'BEHIND', color: '#d97706', bg: 'rgba(217,119,6,0.12)' }
  }
  return { label: 'ON PACE', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' }
}

function formatValue(value: number, unit: string): string {
  if (unit === '$' || unit === 'USD') {
    return '$' + value.toLocaleString()
  }
  return value.toLocaleString() + (unit ? ' ' + unit : '')
}

// ── Segmented Control ────────────────────────────────────────────────────────
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  isDark: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
      borderRadius: 8,
      padding: 3,
      gap: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            color: value === opt.value ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
            background: value === opt.value ? '#2563eb' : 'transparent',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Goal Form ────────────────────────────────────────────────────────────────
interface GoalFormProps {
  mode: 'new' | 'edit'
  initialForm: FormState
  isDark: boolean
  cardBg: string
  borderColor: string
  textPrimary: string
  onSubmit: (form: FormState) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  saving: boolean
}

function GoalForm({
  mode,
  initialForm,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  onSubmit,
  onCancel,
  onDelete,
  saving,
}: GoalFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: textPrimary,
    background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
    marginBottom: 6,
    display: 'block',
  }

  const selectedMetric = TRADING_METRICS.find(m => m.value === form.tradingMetric) || TRADING_METRICS[0]

  function handleTradingMetricChange(v: TradingMetric) {
    setForm(f => ({ ...f, tradingMetric: v }))
  }

  async function handleSubmit() {
    await onSubmit(form)
  }

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      marginBottom: 16,
    }}>
      {/* Form header */}
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: '#94a3b8',
        marginBottom: 16,
      }}>
        {mode === 'new' ? '+ NEW GOAL' : 'EDIT GOAL'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 1. Goal Type */}
        <div>
          <span style={labelStyle}>Goal Type</span>
          <SegmentedControl<GoalType>
            options={[{ value: 'trading', label: 'Trading' }, { value: 'life', label: 'Life' }]}
            value={form.goalType}
            onChange={v => setForm(f => ({ ...f, goalType: v }))}
            isDark={isDark}
          />
        </div>

        {/* 2. Title */}
        <div>
          <span style={labelStyle}>Title</span>
          <input
            type="text"
            maxLength={60}
            placeholder="e.g. Hit $3k payout this month"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* 3. Metric */}
        {form.goalType === 'trading' ? (
          <div>
            <span style={labelStyle}>Metric</span>
            <select
              value={form.tradingMetric}
              onChange={e => handleTradingMetricChange(e.target.value as TradingMetric)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {TRADING_METRICS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Metric Label</span>
              <input
                type="text"
                placeholder="e.g. Post 60 videos"
                value={form.lifeMetricLabel}
                onChange={e => setForm(f => ({ ...f, lifeMetricLabel: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ width: 100 }}>
              <span style={labelStyle}>Unit</span>
              <input
                type="text"
                placeholder="videos"
                value={form.lifeUnit}
                onChange={e => setForm(f => ({ ...f, lifeUnit: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* 4. Target */}
        <div>
          <span style={labelStyle}>Target</span>
          <input
            type="number"
            placeholder={form.goalType === 'trading' ? selectedMetric.placeholder : '60'}
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* 5. Time Horizon */}
        <div>
          <span style={labelStyle}>Time Horizon</span>
          <SegmentedControl<TimeHorizon>
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
            ]}
            value={form.timeHorizon}
            onChange={v => setForm(f => ({ ...f, timeHorizon: v }))}
            isDark={isDark}
          />
        </div>

        {/* 6. Note */}
        <div>
          <span style={labelStyle}>Note (optional)</span>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="Why does this matter? (optional)"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
          />
        </div>

        {/* 7. Current Progress (life goals in edit mode only) */}
        {mode === 'edit' && form.goalType === 'life' && (
          <div>
            <span style={labelStyle}>Current Progress</span>
            <input
              type="number"
              placeholder="0"
              value={form.currentProgress}
              onChange={e => setForm(f => ({ ...f, currentProgress: e.target.value }))}
              style={inputStyle}
            />
          </div>
        )}

        {/* 8. Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !form.target}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#ffffff',
              background: saving ? '#1d4ed8' : '#2563eb',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              cursor: saving ? 'wait' : 'pointer',
              opacity: (!form.title.trim() || !form.target) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : mode === 'new' ? 'Add Goal' : 'Save Changes'}
          </button>

          {mode === 'edit' && onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: '#dc2626',
                background: 'transparent',
                border: '1px solid #dc2626',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              Delete
            </button>
          )}

          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 400,
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '9px 4px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Goal Row ────────────────────────────────────────────────────────────────
interface GoalRowProps {
  goal: Goal
  isDark: boolean
  textPrimary: string
  borderColor: string
  editingGoalId: string | null
  onGearClick: (goal: Goal) => void
  editForm: FormState
  onEditFormSubmit: (form: FormState) => Promise<void>
  onEditCancel: () => void
  onEditDelete: () => Promise<void>
  saving: boolean
  cardBg: string
}

function GoalRow({
  goal, isDark, textPrimary, borderColor,
  editingGoalId, onGearClick,
  editForm, onEditFormSubmit, onEditCancel, onEditDelete, saving, cardBg,
}: GoalRowProps) {
  const progressPct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0
  const daysLeft = getDaysRemaining(goal.endDate)
  const pace = getPaceStatus(goal)
  const metricLabel = goal.metric || ''
  const isEditing = editingGoalId === goal.id

  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 0',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.3,
            }}>
              {goal.title}
            </p>
            {metricLabel && (
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: '#94a3b8',
                margin: '2px 0 0',
              }}>
                {metricLabel}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: textPrimary,
            }}>
              {formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: 6,
              background: pace.bg,
              color: pace.color,
            }}>
              {pace.label}
            </span>
            {/* Gear icon */}
            <button
              onClick={() => onGearClick(goal)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
                transition: 'color 0.15s',
              }}
              title="Edit goal"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            flex: 1,
            height: 6,
            background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: '#2563eb',
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: '#94a3b8',
            flexShrink: 0,
            minWidth: 70,
            textAlign: 'right',
          }}>
            {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
          </span>
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <GoalForm
            mode="edit"
            initialForm={editForm}
            isDark={isDark}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            onSubmit={onEditFormSubmit}
            onCancel={onEditCancel}
            onDelete={onEditDelete}
            saving={saving}
          />
        </div>
      )}
    </div>
  )
}

// ── Section Card ─────────────────────────────────────────────────────────────
interface SectionCardProps {
  label: string
  emptyText: string
  goals: Goal[]
  isDark: boolean
  cardBg: string
  borderColor: string
  textPrimary: string
  editingGoalId: string | null
  onGearClick: (goal: Goal) => void
  editForm: FormState
  onEditFormSubmit: (form: FormState) => Promise<void>
  onEditCancel: () => void
  onEditDelete: () => Promise<void>
  saving: boolean
}

function SectionCard({
  label, emptyText, goals, isDark, cardBg, borderColor, textPrimary,
  editingGoalId, onGearClick, editForm, onEditFormSubmit, onEditCancel, onEditDelete, saving,
}: SectionCardProps) {
  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ ...labelStyle, marginBottom: goals.length > 0 ? 4 : 0 }}>{label}</div>
      {goals.length === 0 ? (
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          color: '#94a3b8',
          fontStyle: 'italic',
          margin: '10px 0 0',
        }}>
          {emptyText}
        </p>
      ) : (
        <div>
          {goals.map((goal, idx) => (
            <div key={goal.id} style={idx === goals.length - 1 && editingGoalId !== goal.id ? { } : {}}>
              <GoalRow
                goal={goal}
                isDark={isDark}
                textPrimary={textPrimary}
                borderColor={borderColor}
                editingGoalId={editingGoalId}
                onGearClick={onGearClick}
                editForm={editForm}
                onEditFormSubmit={onEditFormSubmit}
                onEditCancel={onEditCancel}
                onEditDelete={onEditDelete}
                saving={saving}
                cardBg={cardBg}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({
  isDark,
  textPrimary,
  onNewGoal,
}: {
  isDark: boolean
  textPrimary: string
  onNewGoal: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>🎯</div>
      <h2 style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 20,
        fontWeight: 700,
        color: textPrimary,
        margin: '0 0 8px',
      }}>
        No goals yet
      </h2>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        color: '#94a3b8',
        margin: '0 0 24px',
        maxWidth: 320,
      }}>
        Set your first target and start tracking progress
      </p>
      <button
        onClick={onNewGoal}
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#ffffff',
          background: '#2563eb',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Plus size={14} />
        Create your first goal
      </button>
    </div>
  )
}

// ── Goals Inner ──────────────────────────────────────────────────────────────
function GoalsInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768

  const pageBg = isDark ? '#0f1117' : '#f8fafc'
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

  // Data
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  // Fetch goals
  function refetch() {
    fetch('/api/life/goals')
      .then(r => r.json())
      .then(data => {
        setGoals(data.goals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { refetch() }, [])

  // Derived
  const activeGoals = goals.filter(g => g.status === 'active')
  const weekly = activeGoals.filter(g => g.timeHorizon === 'weekly')
  const monthly = activeGoals.filter(g => g.timeHorizon === 'monthly')
  const quarterly = activeGoals.filter(g => g.timeHorizon === 'quarterly')
  const hasAnyGoals = activeGoals.length > 0

  // Open new form
  function openNewForm() {
    setForm(DEFAULT_FORM)
    setEditingGoalId(null)
    setFormMode('new')
  }

  // Open edit form
  function openEditForm(goal: Goal) {
    if (editingGoalId === goal.id) {
      // Toggle off
      setEditingGoalId(null)
      setFormMode('closed')
      return
    }
    const tradingMetricVal = (TRADING_METRICS.find(m => m.value === goal.metric) ? goal.metric : 'pnl') as TradingMetric
    const editForm: FormState = {
      goalType: (goal.type as GoalType) || 'trading',
      title: goal.title,
      tradingMetric: tradingMetricVal,
      lifeMetricLabel: goal.type === 'life' ? goal.metric : '',
      lifeUnit: goal.type === 'life' ? goal.unit : '',
      target: String(goal.target),
      timeHorizon: goal.timeHorizon,
      note: goal.note || '',
      currentProgress: String(goal.current),
    }
    setForm(editForm)
    setEditingGoalId(goal.id)
    setFormMode('edit')
    // Close new form if open
    if (formMode === 'new') setFormMode('edit')
  }

  // Close form
  function closeForm() {
    setFormMode('closed')
    setEditingGoalId(null)
  }

  // Build payload from form
  function buildPayload(f: FormState) {
    const isTrading = f.goalType === 'trading'
    const metricDef = TRADING_METRICS.find(m => m.value === f.tradingMetric) || TRADING_METRICS[0]
    const metric = isTrading ? f.tradingMetric : f.lifeMetricLabel
    const unit = isTrading ? metricDef.unit : f.lifeUnit
    return {
      type: f.goalType,
      metric,
      target: Number(f.target),
      unit,
      timeHorizon: f.timeHorizon,
      startDate: new Date().toISOString(),
      title: f.title,
      note: f.note || undefined,
    }
  }

  // Add goal (POST)
  async function handleAddGoal(f: FormState) {
    if (!f.title.trim() || !f.target) return
    setSaving(true)
    try {
      await fetch('/api/life/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(f)),
      })
      refetch()
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  // Save goal (PATCH)
  async function handleSaveGoal(f: FormState) {
    if (!editingGoalId || !f.title.trim() || !f.target) return
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {
        ...buildPayload(f),
      }
      if (f.goalType === 'life') {
        updates.current = Number(f.currentProgress) || 0
      }
      await fetch('/api/life/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGoalId, updates }),
      })
      refetch()
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  // Delete goal (DELETE)
  async function handleDeleteGoal() {
    if (!editingGoalId) return
    setSaving(true)
    try {
      await fetch('/api/life/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGoalId }),
      })
      refetch()
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh' }}>
      <div
        className="max-w-[1100px] mx-auto"
        style={{ padding: isMobile ? '24px 16px' : '32px 24px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: isMobile ? 24 : 28,
              fontWeight: 800,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}>
              Goals
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: '#94a3b8',
              margin: '4px 0 0',
            }}>
              Weekly, monthly, and quarterly targets
            </p>
          </div>
          <button
            onClick={openNewForm}
            style={{
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} />
            New Goal
          </button>
        </div>

        {/* New Goal Form (top, above sections) */}
        {formMode === 'new' && (
          <GoalForm
            mode="new"
            initialForm={form}
            isDark={isDark}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            onSubmit={handleAddGoal}
            onCancel={closeForm}
            saving={saving}
          />
        )}

        {/* Coach Shai card */}
        <div style={{
          ...cardStyle,
          background: isDark ? '#0f1117' : '#f8fafc',
          marginBottom: 24,
        }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>
            🧠 COACH SHAI
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.6,
          }}>
            Set clear targets. What gets measured gets done.
          </p>
        </div>

        {/* Main content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                ...cardStyle,
                height: 80,
                background: isDark ? '#1a1f2e' : '#f1f5f9',
                opacity: 0.6,
              }} />
            ))}
          </div>
        ) : !hasAnyGoals ? (
          <div style={cardStyle}>
            <EmptyState isDark={isDark} textPrimary={textPrimary} onNewGoal={openNewForm} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard
              label="THIS WEEK"
              emptyText="No weekly goals yet"
              goals={weekly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              editingGoalId={editingGoalId}
              onGearClick={openEditForm}
              editForm={form}
              onEditFormSubmit={handleSaveGoal}
              onEditCancel={closeForm}
              onEditDelete={handleDeleteGoal}
              saving={saving}
            />
            <SectionCard
              label="THIS MONTH"
              emptyText="No monthly goals yet"
              goals={monthly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              editingGoalId={editingGoalId}
              onGearClick={openEditForm}
              editForm={form}
              onEditFormSubmit={handleSaveGoal}
              onEditCancel={closeForm}
              onEditDelete={handleDeleteGoal}
              saving={saving}
            />
            <SectionCard
              label="THIS QUARTER"
              emptyText="No quarterly goals yet"
              goals={quarterly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              editingGoalId={editingGoalId}
              onGearClick={openEditForm}
              editForm={form}
              onEditFormSubmit={handleSaveGoal}
              onEditCancel={closeForm}
              onEditDelete={handleDeleteGoal}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoalsClient() {
  return <GoalsInner />
    }
