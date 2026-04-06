'use client'
import React from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'

interface CardProps {
  children: React.ReactNode
  header?: string
  action?: React.ReactNode
  style?: React.CSSProperties
}

export default function Card({ children, header, action, style }: CardProps) {
  const { isDark } = useTheme()

  return React.createElement('div', {
    style: {
      background: isDark ? '#111118' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '10px',
      padding: '24px',
      ...style,
    }
  },
    (header || action) && React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }
    },
      header && React.createElement('h3', {
        style: {
          color: isDark ? '#ffffff' : '#0a0a0f',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          margin: 0,
        }
      }, header),
      action && React.createElement('div', null, action)
    ),
    children
  )
}
