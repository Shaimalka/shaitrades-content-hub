'use client'

import { ReactNode } from 'react'

interface ChartWrapperProps {
  title?: string
  subtitle?: string
  children: ReactNode
  height?: number | string
  className?: string
  actions?: ReactNode
}

export function ChartWrapper({ title, subtitle, children, height = 220, className = '', actions }: ChartWrapperProps) {
  return (
    <div className={`chart-container ${className}`}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
          <div>
            {title && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase' as const, color: 'var(--text-label)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--neon-cyan)', opacity: 0.6 }}>//</span>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      <div style={{ height: typeof height === 'number' ? `${height}px` : height, position: 'relative' }}>
        {children}
      </div>
    </div>
  )
}

export const CHART_COLORS = {
  cyan:    '#00f2ff',
  magenta: '#ff00e5',
  green:   '#00ff88',
  amber:   '#ffb400',
  purple:  '#c084fc',
  grid:    'rgba(0,242,255,0.06)',
  tooltip: { bg: 'rgba(13,13,20,0.95)', border: 'rgba(0,242,255,0.25)', text: '#f0f4ff' },
}

export function CyberTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number | string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: '10px', padding: '0.625rem 0.875rem', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,242,255,0.08)' }}>
      {label && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.08em' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 600, color: p.color ?? CHART_COLORS.cyan }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color ?? CHART_COLORS.cyan, boxShadow: `0 0 6px ${p.color ?? CHART_COLORS.cyan}`, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{p.name}:</span>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  )
}
