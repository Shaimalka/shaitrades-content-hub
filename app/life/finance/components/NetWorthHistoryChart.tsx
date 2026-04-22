'use client'
import { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Plus } from 'lucide-react'
import type { NetWorthSnapshot } from '@/lib/finance-keys'

type Range = '30d' | '90d' | '1y' | 'all'

type Props = {
  snapshots: NetWorthSnapshot[]
  isDark: boolean
  onTakeSnapshot: () => void
}

const GREEN = '#10b981'
const RED = '#ef4444'
const BLUE = '#60a5fa'

const fmtShort = (n: number) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${abs.toFixed(0)}`
}
const fmtFull = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

function rangeToDays(r: Range): number | null {
  if (r === '30d') return 30
  if (r === '90d') return 90
  if (r === '1y') return 365
  return null
}

export default function NetWorthHistoryChart({ snapshots, isDark, onTakeSnapshot }: Props) {
  const [range, setRange] = useState<Range>('30d')

  const filtered = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
    const days = rangeToDays(range)
    if (days === null) return sorted
    const cutoff = new Date(Date.now() - days * 86400000)
    const cutoffISO = `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoff.getUTCDate()).padStart(2, '0')}`
    return sorted.filter(s => s.date >= cutoffISO)
  }, [snapshots, range])

  const data = filtered.map(s => ({
    date: s.date.slice(5),
    assets: s.assets,
    liabilities: -(s.liabilities + s.debts),
    netWorth: s.netWorth,
  }))

  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const ranges: Range[] = ['30d', '90d', '1y', 'all']

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        fontFamily: 'Inter, sans-serif',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h3
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
          NET WORTH HISTORY
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }}>
            {ranges.map(r => {
              const active = range === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: active ? BLUE : 'transparent',
                    color: active ? '#ffffff' : textSecondary,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  {r === 'all' ? 'All' : r.toUpperCase()}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={onTakeSnapshot}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: BLUE,
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              padding: '9px 14px',
              cursor: 'pointer',
              transition: 'filter 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <Plus size={12} /> Snapshot now
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 20px',
            border: `1px dashed ${cardBorder}`,
            borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textSecondary, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            Take your first snapshot to start tracking your net-worth journey.
          </p>
          <button
            type="button"
            onClick={onTakeSnapshot}
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: BLUE,
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              padding: '9px 18px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <Plus size={12} /> Snapshot now
          </button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="date"
              tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: textMuted }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
            />
            <YAxis
              tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: textMuted }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
              tickFormatter={fmtShort}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? '#0f1117' : '#ffffff',
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: textPrimary,
              }}
              labelStyle={{ color: textMuted, fontWeight: 600, marginBottom: 2 }}
              formatter={(value: number, name: string) => {
                const label = name === 'assets' ? 'Assets' : name === 'liabilities' ? 'Liabilities' : 'Net Worth'
                return [fmtFull(Math.abs(Number(value))), label]
              }}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSecondary }}
              formatter={value => (
                <span style={{ color: textSecondary, fontWeight: 500 }}>
                  {value === 'assets' ? 'Assets' : value === 'liabilities' ? 'Liabilities' : 'Net Worth'}
                </span>
              )}
            />
            <Line type="monotone" dataKey="assets" stroke={GREEN} strokeWidth={2.25} dot={{ fill: GREEN, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="liabilities" stroke={RED} strokeWidth={2.25} dot={{ fill: RED, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="netWorth" stroke={BLUE} strokeWidth={2.5} dot={{ fill: BLUE, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
