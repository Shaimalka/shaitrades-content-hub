'use client'
import React from 'react'

interface StatCardProps {
  label: string
  value: string | React.ReactNode
  sub?: string
  accentColor: string
  valueColor?: string
  isEmpty?: boolean
}

export default function StatCard({
  label,
  value,
  sub,
  accentColor,
  valueColor,
  isEmpty = false,
}: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        borderTop: '3px solid ' + accentColor,
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: isEmpty ? '28px' : '24px',
          fontWeight: isEmpty ? 300 : 700,
          color: isEmpty ? 'var(--text-empty)' : (valueColor || 'var(--text-primary)'),
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: isEmpty ? 'var(--text-muted)' : 'var(--text-primary)',
            marginTop: '6px',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
