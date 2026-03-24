import { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'magenta' | 'ghost'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  children:   ReactNode
  loading?:   boolean
  icon?:      ReactNode
  iconRight?: ReactNode
  active?:    boolean
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-cyber-primary',
  magenta: 'btn-cyber-primary btn-cyber-magenta',
  ghost:   'btn-cyber-ghost',
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  xs: { fontSize: '0.68rem', padding: '0.25rem 0.65rem' },
  sm: { fontSize: '0.75rem', padding: '0.4rem 0.875rem' },
  md: { fontSize: '0.8rem',  padding: '0.5rem 1.1rem'   },
  lg: { fontSize: '0.875rem',padding: '0.65rem 1.4rem'  },
}

export function Button({
  variant  = 'ghost',
  size     = 'md',
  children,
  loading  = false,
  icon,
  iconRight,
  active   = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${VARIANT_CLASS[variant]} ${active && variant === 'ghost' ? 'active' : ''} ${className}`}
      disabled={disabled || loading}
      style={{ ...SIZE_STYLES[size], opacity: disabled && !loading ? 0.45 : 1, cursor: disabled || loading ? 'not-allowed' : 'pointer', ...style }}
      {...props}
    >
      {loading ? (
        <svg width="13" height="13" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
        </svg>
      ) : (
        <>
          {icon      && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children}
          {iconRight && <span style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>}
        </>
      )}
    </button>
  )
}

interface TabGroupProps {
  options:  { label: string; value: string }[]
  value:    string
  onChange: (v: string) => void
  className?: string
}

export function TabGroup({ options, value, onChange, className = '' }: TabGroupProps) {
  return (
    <div className={`cyber-tabs ${className}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={`cyber-tab ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default Button
