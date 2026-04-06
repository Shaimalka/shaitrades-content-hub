'use client'
import { useTheme } from '@/app/contexts/ThemeContext'
import { ReactNode, CSSProperties } from 'react'

interface CardProps {
    children: ReactNode
    header?: string
    action?: ReactNode
    style?: CSSProperties
    className?: string
}

export default function Card({ children, header, action, style, className }: CardProps) {
    const { isDark } = useTheme()

  const bg = isDark ? '#111118' : '#ffffff'
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    const headerColor = isDark ? '#ffffff' : '#0a0a0f'

  return (
        <div
                className={className}
                style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          borderRadius: '10px',
                          padding: '24px',
                          ...style,
                }}
              >
          {(header || action) && (
                        <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '20px',
                        }}>
                          {header && (
                                      <h3 style={{
                                                      margin: 0,
                                                      fontSize: '15px',
                                                      fontWeight: 600,
                                                      color: headerColor,
                                                      fontFamily: "'Inter', -apple-system, sans-serif",
                                      }}>
                                        {header}
                                      </h3>h3>
                                  )}
                          {action && <div>{action}</div>div>}
                        </div>div>
              )}
          {children}
        </div>div>
      )
}</div>
