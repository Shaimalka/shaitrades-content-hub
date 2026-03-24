import { ReactNode } from 'react'

const ACCENT_COLORS: Record<string, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  green:   'var(--neon-green)',
  amber:   'var(--neon-amber)',
  purple:  '#c084fc',
}

interface StatCardProps {
  label: string
  value: ReactNode
  subtext?: string
  accent?: 'cyan' | 'magenta' | 'green' | 'amber' | 'purple'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const VALUE_SIZES = { sm: '1.25rem', md: '1.625rem', lg: '2.25rem' }

export function StatCard({
  label, value, subtext,
  accent = 'cyan', className = '', size = 'md',
}: StatCardProps) {
  const color = ACCENT_COLORS[accent] ?? 'var(--neon-cyan)'
  const isMagenta = accent === 'magenta'

  return (
    <div className={`stat-card ${isMagenta ? 'stat-card-magenta' : ''} ${className}`}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', width: '5px', height: '5px', borderRadius: '50%', background: color, opacity: 0.5, boxShadow: `0 0 6px ${color}` }} />
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '0.5rem', textTransform: 'uppercase' as const }}>
        {label}
      </div>
      <div className="metric-value" style={{ fontSize: VALUE_SIZES[size], color, textShadow: `0 0 12px ${color}40`, marginBottom: subtext ? '0.3rem' : 0 }}>
        {value}
      </div>
      {subtext && <div className="metric-label">{subtext}</div>}
    </div>
  )
}

interface StatGridProps {
  children: ReactNode
  cols?: 2 | 3 | 4 | 5
  className?: string
}

export function StatGrid({ children, cols = 4, className = '' }: StatGridProps) {
  const gridCols: Record<number, string> = { 2: 'repeat(2,1fr)', 3: 'repeat(3,1fr)', 4: 'repeat(4,1fr)', 5: 'repeat(5,1fr)' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: gridCols[cols] ?? 'repeat(4,1fr)', gap: '0.75rem' }} className={className}>
      {children}
    </div>
  )
}

export default StatCard
