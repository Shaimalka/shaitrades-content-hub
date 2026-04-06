'use client'
import { useTheme } from '@/app/contexts/ThemeContext'
import { ButtonHTMLAttributes, ReactNode, CSSProperties, useState } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    children: ReactNode
    style?: CSSProperties
}

const BASE_STYLE: CSSProperties = {
    minHeight: '40px',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '10px 20px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid transparent',
    transition: 'all 150ms',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    outline: 'none',
}

function getVariantStyle(variant: ButtonVariant, isDark: boolean, isHover: boolean): CSSProperties {
    const surfaceHover = isDark ? '#1a1a24' : '#f1f4f9'
    switch (variant) {
      case 'primary':
              return {
                        background: isHover ? '#1d4ed8' : '#2563eb',
                        color: '#ffffff',
                        borderColor: 'transparent',
                        boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
              }
      case 'secondary':
              return {
                        background: isHover ? 'rgba(37,99,235,0.1)' : 'transparent',
                        color: '#2563eb',
                        borderColor: 'rgba(37,99,235,0.3)',
              }
      case 'ghost':
              return {
                        background: isHover ? surfaceHover : 'transparent',
                        color: isDark ? '#ffffff' : '#0a0a0f',
                        borderColor: 'transparent',
              }
      case 'danger':
              return {
                        background: isHover ? 'rgba(255,77,106,0.1)' : 'transparent',
                        color: '#ff4d6a',
                        borderColor: '#ff4d6a',
              }
      default:
              return {}
    }
}

export default function Button({
    variant = 'primary',
    children,
    style,
    disabled,
    ...props
}: ButtonProps) {
    const { isDark } = useTheme()
    const [isHover, setIsHover] = useState(false)

  const variantStyle = getVariantStyle(variant, isDark, isHover && !disabled)

  return (
        <button
          {...props}
                disabled={disabled}
                style={{
                          ...BASE_STYLE,
                          ...variantStyle,
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          ...style,
                }}
                onMouseEnter={(e) => {
                          setIsHover(true)
                          props.onMouseEnter?.(e)
                }}
                onMouseLeave={(e) => {
                          setIsHover(false)
                          props.onMouseLeave?.(e)
                }}
              >
          {children}
        </button>button>
      )
}</button>
