'use client'
import React from 'react'

interface StatCardProps {
  label: string
  value: string | React.ReactNode
  sub?: string
  accentColor: string
  valueColor?: string
  isEmpty?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StatCard({
  label,
  value,
  sub,
  accentColor,
  valueColor,
  isEmpty = false,
  size,
}: StatCardProps) {
  const valueFontSize = size === 'sm' ? (isEmpty ? '18px' : '14px') : size === 'lg' ? (isEmpty ? '32px' : '28px') : (isEmpty ? '24px' : '20px')

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
          fontSize: valueFontSize,
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
