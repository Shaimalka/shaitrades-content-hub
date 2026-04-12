'use client'
import React from 'react'

interface PanelHeaderProps {
    label: string
    action?: React.ReactNode
    style?: React.CSSProperties
}

export default function PanelHeader({
    label,
    action,
    style,
}: PanelHeaderProps) {
    return (
          <div
                  style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '14px',
                            ...style,
                  }}
                >
                <span
                          style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      letterSpacing: '0.08em',
                                      textTransform: 'uppercase',
                                      color: 'var(--text-primary)',
                          }}
                        >
                  {label}
                </span>span>
            {action && (
                          <div style={{ marginLeft: 'auto' }}>
                            {action}
                          </div>div>
                )}
          </div>div>
        )
}</div>
