'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  defaultDate: string
  preview: { assets: number; liabilities: number; debts: number; netWorth: number }
  onSubmit: (date: string) => Promise<void>
}

const BLUE = '#60a5fa'
const GREEN = '#10b981'
const RED = '#ef4444'

const fmt = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

export default function SnapshotModal({ isOpen, onClose, isDark, defaultDate, preview, onSubmit }: Props) {
  const [date, setDate] = useState(defaultDate)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate)
      setSubmitting(false)
      setErr(null)
    }
  }, [isOpen, defaultDate])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: '20px 22px',
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0 }}>Take a snapshot</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              padding: 4,
              display: 'inline-flex',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: textSecondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Captures your current totals as a manual data point in your history.
        </p>

        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: textMuted,
            marginBottom: 6,
          }}
        >
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            width: '100%',
            background: isDark ? '#0f1117' : '#ffffff',
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            color: textPrimary,
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            padding: '8px 12px',
            outline: 'none',
            colorScheme: isDark ? 'dark' : 'light',
            marginBottom: 16,
          }}
        />

        <div
          style={{
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            padding: '12px 14px',
            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: textMuted, marginBottom: 8 }}>Will record</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 13 }}>
            <span style={{ color: textSecondary }}>Assets</span>
            <span style={{ color: GREEN, fontWeight: 600 }}>{fmt(preview.assets)}</span>
            <span style={{ color: textSecondary }}>Liabilities</span>
            <span style={{ color: RED, fontWeight: 600 }}>{fmt(preview.liabilities)}</span>
            <span style={{ color: textSecondary }}>Debts</span>
            <span style={{ color: RED, fontWeight: 600 }}>{fmt(preview.debts)}</span>
            <span style={{ color: textPrimary, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${cardBorder}` }}>Net Worth</span>
            <span style={{ color: BLUE, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${cardBorder}` }}>{fmt(preview.netWorth)}</span>
          </div>
        </div>

        {err && (
          <div style={{ color: RED, fontSize: 12, marginBottom: 10 }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: `1px solid #bfdbfe`,
              borderRadius: 8,
              color: BLUE,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 14px',
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !date}
            onClick={async () => {
              setSubmitting(true)
              setErr(null)
              try {
                await onSubmit(date)
                onClose()
              } catch (e: any) {
                setErr(e?.message || 'Failed to save')
              } finally {
                setSubmitting(false)
              }
            }}
            style={{
              background: BLUE,
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              padding: '9px 18px',
              cursor: submitting ? 'wait' : 'pointer',
              transition: 'filter 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            {submitting ? 'Saving…' : 'Take snapshot'}
          </button>
        </div>
      </div>
    </div>
  )
}
