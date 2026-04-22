'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Lock, Check, X } from 'lucide-react'
import type { Milestone } from '@/lib/finance-keys'

type Props = {
  milestones: Milestone[]
  netWorth: number
  totalDebts: number
  monthlyExpenses: number
  liquidAssets: number
  isDark: boolean
  onAdd: (item: Omit<Milestone, 'id' | 'createdAt'>) => Promise<void>
  onEdit: (item: Milestone) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const BLUE = '#60a5fa'
const GREEN = '#10b981'
const PURPLE = '#a78bfa'
const AMBER = '#f59e0b'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

function progressFor(m: Milestone, ctx: { netWorth: number; totalDebts: number; monthlyExpenses: number; liquidAssets: number }): { pct: number; achieved: boolean; locked: boolean; label: string } {
  if (m.type === 'net_worth') {
    const target = m.target || 0
    if (target <= 0) return { pct: 100, achieved: true, locked: false, label: 'achieved' }
    const pct = Math.max(0, Math.min(100, (ctx.netWorth / target) * 100))
    return { pct, achieved: ctx.netWorth >= target, locked: false, label: pct >= 100 ? 'achieved' : `${Math.round(pct)}%` }
  }
  if (m.type === 'debt_free') {
    const achieved = ctx.totalDebts <= 0
    return { pct: achieved ? 100 : 0, achieved, locked: false, label: achieved ? 'achieved' : fmt(ctx.totalDebts) + ' to go' }
  }
  // runway_months
  const months = m.months ?? m.target ?? 0
  if (ctx.monthlyExpenses <= 0) {
    return { pct: 0, achieved: false, locked: true, label: 'log expenses to unlock' }
  }
  const required = months * ctx.monthlyExpenses
  const pct = required > 0 ? Math.max(0, Math.min(100, (ctx.liquidAssets / required) * 100)) : 0
  const achieved = ctx.liquidAssets >= required
  return { pct, achieved, locked: false, label: achieved ? 'achieved' : `${Math.round(pct)}%` }
}

function chipAccent(m: Milestone): string {
  if (m.type === 'debt_free') return GREEN
  if (m.type === 'runway_months') return PURPLE
  return BLUE
}

function AddForm({
  onSubmit,
  onCancel,
  isDark,
}: {
  onSubmit: (m: Omit<Milestone, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  isDark: boolean
}) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'net_worth' | 'debt_free' | 'runway_months'>('net_worth')
  const [target, setTarget] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const inputStyle: React.CSSProperties = {
    background: isDark ? '#0f1117' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
    borderRadius: 8,
    color: isDark ? '#f9fafb' : '#0f172a',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: isDark ? 'rgba(96,165,250,0.06)' : 'rgba(96,165,250,0.06)',
        border: `1px solid ${BLUE}40`,
        borderRadius: 999,
        flexShrink: 0,
      }}
    >
      <input
        autoFocus
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Milestone label"
        style={{ ...inputStyle, width: 140 }}
      />
      <select
        value={type}
        onChange={e => setType(e.target.value as any)}
        style={{ ...inputStyle, width: 130 }}
      >
        <option value="net_worth">Net worth $</option>
        <option value="debt_free">Debt-free</option>
        <option value="runway_months">Runway (months)</option>
      </select>
      {type !== 'debt_free' && (
        <input
          type="number"
          inputMode="decimal"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder={type === 'runway_months' ? 'months' : 'target $'}
          style={{ ...inputStyle, width: 100 }}
        />
      )}
      <button
        type="button"
        disabled={submitting || !label.trim() || (type !== 'debt_free' && !target)}
        onClick={async () => {
          setSubmitting(true)
          try {
            const t = parseFloat(target) || 0
            await onSubmit({
              label: label.trim(),
              type,
              target: type === 'debt_free' ? 0 : t,
              months: type === 'runway_months' ? t : undefined,
            })
            onCancel()
          } finally {
            setSubmitting(false)
          }
        }}
        style={{
          background: BLUE,
          border: 'none',
          borderRadius: 6,
          color: '#ffffff',
          padding: '6px 8px',
          cursor: submitting ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        title="Save"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: 6,
          color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function EditForm({
  initial,
  onSubmit,
  onCancel,
  isDark,
}: {
  initial: Milestone
  onSubmit: (m: Milestone) => Promise<void>
  onCancel: () => void
  isDark: boolean
}) {
  const [label, setLabel] = useState(initial.label)
  const [target, setTarget] = useState(String(initial.type === 'runway_months' ? (initial.months ?? initial.target) : initial.target))
  const [submitting, setSubmitting] = useState(false)

  const inputStyle: React.CSSProperties = {
    background: isDark ? '#0f1117' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
    borderRadius: 8,
    color: isDark ? '#f9fafb' : '#0f172a',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: isDark ? 'rgba(96,165,250,0.06)' : 'rgba(96,165,250,0.06)',
        border: `1px solid ${BLUE}40`,
        borderRadius: 999,
        flexShrink: 0,
      }}
    >
      <input value={label} onChange={e => setLabel(e.target.value)} style={{ ...inputStyle, width: 140 }} />
      {initial.type !== 'debt_free' && (
        <input
          type="number"
          inputMode="decimal"
          value={target}
          onChange={e => setTarget(e.target.value)}
          style={{ ...inputStyle, width: 100 }}
        />
      )}
      <button
        type="button"
        disabled={submitting || !label.trim()}
        onClick={async () => {
          setSubmitting(true)
          try {
            const t = parseFloat(target) || 0
            const next: Milestone = {
              ...initial,
              label: label.trim(),
              target: initial.type === 'debt_free' ? 0 : t,
              months: initial.type === 'runway_months' ? t : initial.months,
            }
            await onSubmit(next)
            onCancel()
          } finally {
            setSubmitting(false)
          }
        }}
        style={{
          background: BLUE,
          border: 'none',
          borderRadius: 6,
          color: '#ffffff',
          padding: '6px 8px',
          cursor: submitting ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        title="Save"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: 6,
          color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function Chip({
  m,
  ctx,
  isDark,
  onEditClick,
  onDelete,
}: {
  m: Milestone
  ctx: { netWorth: number; totalDebts: number; monthlyExpenses: number; liquidAssets: number }
  isDark: boolean
  onEditClick: () => void
  onDelete: () => void
}) {
  const accent = chipAccent(m)
  const { pct, achieved, locked, label: statusLabel } = progressFor(m, ctx)
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'
  const fillColor = achieved ? GREEN : locked ? AMBER : accent

  return (
    <div
      style={{
        flexShrink: 0,
        minWidth: 220,
        background: cardBg,
        border: `1px solid ${achieved ? `${GREEN}60` : cardBorder}`,
        borderRadius: 12,
        padding: '10px 12px',
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        opacity: locked ? 0.7 : 1,
        position: 'relative',
        transition: 'border-color 0.12s, transform 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {locked && <Lock size={11} style={{ color: AMBER }} />}
        {achieved && <Check size={12} style={{ color: GREEN }} />}
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: textPrimary, letterSpacing: '0.01em' }}>
          {m.label}
        </span>
        <button
          type="button"
          onClick={onEditClick}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: textMuted,
            display: 'inline-flex',
          }}
          aria-label="Edit milestone"
          onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
          onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: textMuted,
            display: 'inline-flex',
          }}
          aria-label="Delete milestone"
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div
        style={{
          height: 5,
          width: '100%',
          background: trackBg,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: fillColor,
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: textMuted, fontWeight: 500 }}>{statusLabel}</div>
    </div>
  )
}

export default function MilestonesStrip({
  milestones,
  netWorth,
  totalDebts,
  monthlyExpenses,
  liquidAssets,
  isDark,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const ctx = { netWorth, totalDebts, monthlyExpenses, liquidAssets }
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'

  const ordered = [...milestones].sort((a, b) => {
    const aTarget = a.type === 'runway_months' ? (a.months ?? a.target) : a.target
    const bTarget = b.type === 'runway_months' ? (b.months ?? b.target) : b.target
    return aTarget - bTarget
  })

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: textMuted,
            margin: 0,
          }}
        >
          MILESTONES
        </h4>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '4px 2px 8px 2px',
          scrollbarWidth: 'thin',
        }}
      >
        {ordered.map(m =>
          editingId === m.id ? (
            <EditForm
              key={m.id}
              initial={m}
              isDark={isDark}
              onSubmit={async next => { await onEdit(next) }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Chip
              key={m.id}
              m={m}
              ctx={ctx}
              isDark={isDark}
              onEditClick={() => setEditingId(m.id)}
              onDelete={async () => {
                if (!confirm(`Delete milestone "${m.label}"?`)) return
                await onDelete(m.id)
              }}
            />
          )
        )}
        {adding ? (
          <AddForm onSubmit={onAdd} onCancel={() => setAdding(false)} isDark={isDark} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              flexShrink: 0,
              minWidth: 110,
              background: 'transparent',
              border: `1px dashed ${cardBorder}`,
              borderRadius: 12,
              color: textMuted,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'
              e.currentTarget.style.color = '#60a5fa'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = textMuted
            }}
          >
            <Plus size={12} /> Add milestone
          </button>
        )}
      </div>
    </div>
  )
}
