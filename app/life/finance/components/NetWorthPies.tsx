'use client'
import { Plus } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

type Asset = {
  id: string
  name: string
  value: number
  category: 'Cash' | 'Crypto' | 'Stocks' | 'Real Estate' | 'Other'
  liquidity?: 'liquid' | 'illiquid'
}

type Props = {
  assets: Asset[]
  isDark: boolean
  onAddAsset: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Cash: '#10b981',
  Crypto: '#f59e0b',
  Stocks: '#60a5fa',
  'Real Estate': '#a78bfa',
  Other: '#94a3b8',
}
const LIQUIDITY_COLORS: Record<string, string> = {
  liquid: '#60a5fa',
  illiquid: '#a78bfa',
}
const LIQUID_DEFAULT_BY_CATEGORY: Record<Asset['category'], 'liquid' | 'illiquid'> = {
  Cash: 'liquid',
  Crypto: 'liquid',
  Stocks: 'liquid',
  'Real Estate': 'illiquid',
  Other: 'illiquid',
}

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

function buildBuckets<K extends string>(items: Asset[], keyFn: (a: Asset) => K): { key: K; value: number }[] {
  const map = new Map<K, number>()
  for (const a of items) {
    const k = keyFn(a)
    map.set(k, (map.get(k) || 0) + a.value)
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
}

function PieCard({
  title,
  buckets,
  colorFor,
  total,
  isDark,
}: {
  title: string
  buckets: { key: string; value: number }[]
  colorFor: (k: string) => string
  total: number
  isDark: boolean
}) {
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h4
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: textMuted,
          margin: '0 0 12px 0',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={buckets}
                dataKey="value"
                nameKey="key"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
              >
                {buckets.map(b => <Cell key={b.key} fill={colorFor(b.key)} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDark ? '#0f1117' : '#ffffff',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: textPrimary,
                }}
                formatter={(value: number, name: string) => [fmt(Number(value)), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {buckets.map(b => {
            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0
            return (
              <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor(b.key), flexShrink: 0 }} />
                <span style={{ color: textSecondary, fontWeight: 500, textTransform: 'capitalize', flex: 1 }}>{b.key}</span>
                <span style={{ color: textMuted, fontSize: 11 }}>{pct}%</span>
                <span style={{ color: textPrimary, fontWeight: 600, minWidth: 56, textAlign: 'right' }}>{fmt(b.value)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function NetWorthPies({ assets, isDark, onAddAsset }: Props) {
  const total = assets.reduce((s, a) => s + a.value, 0)
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'
  const GREEN = '#10b981'

  if (assets.length === 0 || total === 0) {
    return (
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          fontFamily: 'Inter, sans-serif',
          marginBottom: 16,
        }}
      >
        <h4
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: textMuted,
            margin: '0 0 12px 0',
          }}
        >
          ALLOCATION
        </h4>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            border: `1px dashed ${cardBorder}`,
            borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textSecondary, margin: 0, textAlign: 'center' }}>
            Add assets to see your allocation.
          </p>
          <button
            type="button"
            onClick={onAddAsset}
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: `1px solid #a7f3d0`,
              borderRadius: 8,
              color: GREEN,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 14px',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={12} /> Add asset
          </button>
        </div>
      </div>
    )
  }

  const categoryBuckets = buildBuckets(assets, a => a.category)
  const liquidityBuckets = buildBuckets(assets, a => a.liquidity ?? LIQUID_DEFAULT_BY_CATEGORY[a.category] ?? 'illiquid')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <PieCard
        title="ALLOCATION BY CATEGORY"
        buckets={categoryBuckets}
        colorFor={k => CATEGORY_COLORS[k] || '#94a3b8'}
        total={total}
        isDark={isDark}
      />
      <PieCard
        title="ALLOCATION BY LIQUIDITY"
        buckets={liquidityBuckets}
        colorFor={k => LIQUIDITY_COLORS[k] || '#94a3b8'}
        total={total}
        isDark={isDark}
      />
    </div>
  )
}
