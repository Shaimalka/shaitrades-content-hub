'use client'
import React from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    trend?: { value: number; positive: boolean }
    icon?: React.ReactNode
    style?: React.CSSProperties
}

export default function StatCard({ label, value, trend, icon, style }: StatCardProps) {
    const { isDark } = useTheme()

  return React.createElement('div', {
        style: {
                background: isDark ? '#111118' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '20px 24px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
                ...style,
        }
  },
                                 React.createElement('div', {
                                         style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }
                                 },
                                                           React.createElement('div', null,
                                                                                       React.createElement('div', {
                                                                                                   style: {
                                                                                                                 color: '#aaaaaa',
                                                                                                                 fontSize: '11px',
                                                                                                                 fontFamily: 'JetBrains Mono, monospace',
                                                                                                                 letterSpacing: '0.1em',
                                                                                                                 textTransform: 'uppercase',
                                                                                                                 marginBottom: '8px',
                                                                                                     }
                                                                                       }, label),
                                                                                       React.createElement('div', {
                                                                                                   style: {
                                                                                                                 color: isDark ? '#ffffff' : '#0a0a0f',
                                                                                                                 fontSize: '28px',
                                                                                                                 fontFamily: 'JetBrains Mono, monospace',
                                                                                                                 fontWeight: 'bold',
                                                                                                                 lineHeight: 1,
                                                                                                     }
                                                                                       }, value),
                                                                                       trend && React.createElement('div', {
                                                                                                   style: {
                                                                                                                 display: 'flex',
                                                                                                                 alignItems: 'center',
                                                                                                                 gap: '4px',
                                                                                                                 marginTop: '8px',
                                                                                                                 color: trend.positive ? '#00c48c' : '#ff4d6a',
                                                                                                                 fontSize: '12px',
                                                                                                                 fontFamily: 'JetBrains Mono, monospace',
                                                                                                     }
                                                                                       },
                                                                                                                              trend.positive ? React.createElement(TrendingUp, { size: 12 }) : React.createElement(TrendingDown, { size: 12 }),
                                                                                                                              `${trend.positive ? '+' : ''}${trend.value}%`
                                                                                                                            )
                                                                                     ),
                                                           icon && React.createElement('div', {
                                                                     style: { color: '#2563eb', opacity: 0.8 }
                                                           }, icon)
                                                         )
                               )
}
