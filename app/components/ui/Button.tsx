'use client'

import React from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps {
      variant?: ButtonVariant
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
      style?: React.CSSProperties
      className?: string
}

export default function Button({
      variant = 'primary',
      children,
      onClick,
      disabled,
      type = 'button',
      style,
}: ButtonProps) {
      const { isDark } = useTheme()
      const [hovered, setHovered] = React.useState(false)

  const base: React.CSSProperties = {
          minHeight: '40px',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 150ms',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
  }

  const variants: Record<ButtonVariant, React.CSSProperties> = {
          primary: {
                    background: hovered ? '#1d4ed8' : '#2563eb',
                    color: '#ffffff',
          },
          secondary: {
                    background: hovered ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: '#2563eb',
                    border: '1px solid rgba(37,99,235,0.3)',
          },
          ghost: {
                    background: hovered
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                                : 'transparent',
                    color: isDark ? '#ffffff' : '#0a0a0f',
          },
          danger: {
                    background: hovered ? 'rgba(255,77,106,0.1)' : 'transparent',
                    color: '#ff4d6a',
                    border: '1px solid #ff4d6a',
          },
  }

  return React.createElement('button', {
          type,
          onClick,
          disabled,
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
          style: { ...base, ...variants[variant], ...style },
  }, children)
}
