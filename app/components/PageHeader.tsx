'use client'
import { useTheme } from '@/app/contexts/ThemeContext'

export type PageHeaderTab = {
  id: string
  label: string
  active: boolean
}

type Props = {
  title: string
  tabs?: PageHeaderTab[]
  onTabClick?: (id: string) => void
}

const BRAND = '#60a5fa'

export default function PageHeader({ title, tabs, onTabClick }: Props) {
  const { isDark } = useTheme()
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#475569'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px 0 0 0',
        borderBottom: `0.5px solid ${cardBorder}`,
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <h1
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 20,
          fontWeight: 700,
          color: textPrimary,
          margin: '0 0 14px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h1>
      {tabs && tabs.length > 0 && (
        <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }} aria-label="Page tabs">
          {tabs.map(tab => {
            const active = tab.active
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabClick?.(tab.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? textPrimary : textSecondary,
                  padding: '0 0 14px 0',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2.5px solid ${BRAND}` : '2.5px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.12s ease, border-color 0.12s ease',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = textPrimary
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = textSecondary
                }}
                onFocus={e => {
                  if (!active) e.currentTarget.style.color = textPrimary
                }}
                onBlur={e => {
                  if (!active) e.currentTarget.style.color = textSecondary
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
