'use client'
import type { NetWorthSnapshot } from '@/lib/finance-keys'

type Props = {
  snapshots: NetWorthSnapshot[]
  currentNetWorth: number
  isDark: boolean
}

const fmt = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

function findSnapshotNDaysAgo(snapshots: NetWorthSnapshot[], days: number): NetWorthSnapshot | null {
  if (snapshots.length === 0) return null
  const target = new Date(Date.now() - days * 86400000)
  const targetISO = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  let best: NetWorthSnapshot | null = null
  for (const s of sorted) {
    if (s.date <= targetISO) best = s
    else break
  }
  return best || sorted[0]
}

function Pill({
  label,
  delta,
  isDark,
  hasData,
}: {
  label: string
  delta: number | null
  isDark: boolean
  hasData: boolean
}) {
  const GREEN = '#10b981'
  const RED = '#ef4444'
  const MUTED = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const BORDER = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'

  if (!hasData || delta === null) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          border: `1px solid ${BORDER}`,
          background: 'transparent',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          color: MUTED,
        }}
        title="Not enough history yet"
      >
        <span style={{ letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ color: MUTED, fontWeight: 500 }}>—</span>
      </div>
    )
  }

  const positive = delta >= 0
  const accent = positive ? GREEN : RED
  const sign = positive ? '+' : '−'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        border: `1px solid ${accent}40`,
        background: `${accent}14`,
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        color: accent,
      }}
    >
      <span style={{ letterSpacing: '0.04em', color: isDark ? 'rgba(255,255,255,0.65)' : '#475569', fontWeight: 500 }}>{label}</span>
      <span>{sign}{fmt(delta)}</span>
    </div>
  )
}

export default function TrendIndicators({ snapshots, currentNetWorth, isDark }: Props) {
  const snap30 = findSnapshotNDaysAgo(snapshots, 30)
  const snap90 = findSnapshotNDaysAgo(snapshots, 90)

  const delta30 = snap30 ? currentNetWorth - snap30.netWorth : null
  const delta90 = snap90 ? currentNetWorth - snap90.netWorth : null

  const has30 = !!snap30 && snap30.netWorth !== currentNetWorth ? true : !!snap30
  const has90 = !!snap90 && snap90.netWorth !== currentNetWorth ? true : !!snap90

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      <Pill label="30d" delta={delta30} isDark={isDark} hasData={has30} />
      <Pill label="90d" delta={delta90} isDark={isDark} hasData={has90} />
    </div>
  )
}
