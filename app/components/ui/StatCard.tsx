'use client'
import React from 'react'

interface StatCardProps {
      label: string
      value: string | React.ReactNode
      sub?: string
      accentColor?: string
      info?: string
}

export default function StatCard({ label, value, sub, accentColor = 'var(--brand)', info }: StatCardProps) {
      return (
              <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderTop: `3px solid ${accentColor}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minWidth: 0,
              }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {label}
                        </div>div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {value}
                        </div>div>
                  {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>div>}
              </div>div>
            )
}
