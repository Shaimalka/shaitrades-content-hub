'use client'
import { useTheme } from '@/app/contexts/ThemeContext'
import { ReactNode, CSSProperties } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    trend?: {
      direction: 'up' | 'down'
      percent: string | number
    }
    icon?: ReactNode
    style?: CSSProperties
}

export default function StatCard({ label, value, trend, icon, style }: StatCardProps) {
    const { isDark } = useTheme()

  const bg = isDark ? '#111118' : '#ffffff'
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    const textColor = isDark ? '#ffffff' : '#0a0a0f'
    const mutedColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
    const profit = '#00c48c'
    const loss = '#ff4d6a'

  return (
        <div style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '24px',
                position: 'relative',
                ...style,
        }}>
          {/* Icon top right */}
          {icon && (
                  <div style={{
                              position: 'absolute',
                              top: '20px',
                              right: '20px',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                  }}>
                    {icon}
                  </div>div>
                )}

          {/* Label */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: mutedColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '10px',
        }}>
                  {label}
                </div>div>

          {/* Value */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '28px',
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: 1.1,
                  marginBottom: trend ? '10px' : 0,
        }}>
                  {value}
                </div>div>

          {/* Trend */}
          {trend && (
                  <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: trend.direction === 'up' ? profit : loss,
                              fontSize: '12px',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 500,
                  }}>
                    {trend.direction === 'up'
                                  ? <TrendingUp size={13} />
                                  : <TrendingDown size={13} />
                    }
                              <span>{trend.direction === 'up' ? '+' : ''}{trend.percent}%</span>span>
                  </div>div>
              )}
        </div>div>
      )
}</span>
