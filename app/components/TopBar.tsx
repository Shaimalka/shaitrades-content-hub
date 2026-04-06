'use client'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'
import { useState } from 'react'

const PAGE_TITLES: Record<string, string> = {
    '/life': 'Dashboard',
    '/life/trading': 'Trading Journal',
    '/life/trading/playbook': 'Playbook',
    '/life/habits': 'Habits',
    '/life/goals': 'Goals',
    '/life/finance': 'Finance',
    '/life/health': 'Health',
    '/life/journal': 'Journal',
    '/life/review': 'Weekly Review',
}

const USER_INITIALS = 'ST'

interface TopBarProps {
    onMenuClick?: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const pathname = usePathname()
    const { isDark } = useTheme()

  const title = PAGE_TITLES[pathname ?? ''] ?? 'TRABITS'

  const surface = isDark ? '#111118' : '#ffffff'
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    const textColor = isDark ? '#ffffff' : '#0a0a0f'
    const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
    const avatarBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(37,99,235,0.1)'

  return (
        <div style={{
                height: '56px',
                background: surface,
                borderBottom: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                flexShrink: 0,
        }}>
          {/* Left: mobile hamburger + page title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {onMenuClick && (
                    <button
                                  onClick={onMenuClick}
                                  className="topbar-hamburger"
                                  style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: textColor,
                                                  padding: '4px',
                                                  display: 'none',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  borderRadius: '6px',
                                  }}
                                >
                                <Menu size={20} />
                    </button>button>
                        )}
                        <span style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: '16px',
                    fontWeight: 600,
                    color: textColor,
        }}>
                          {title}
                        </span>span>
                </div>div>
        
          {/* Right: bell + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: mutedColor,
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 150ms',
        }}
                                onMouseEnter={e => (e.currentTarget.style.background = avatarBg)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                <Bell size={18} />
                      </button>button>
                      <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    flexShrink: 0,
                    cursor: 'pointer',
        }}>
                        {USER_INITIALS}
                      </div>div>
              </div>div>
        
              <style>{`
                      @media (max-width: 767px) {
                                .topbar-hamburger { display: flex !important; }
                                        }
                                              `}</style>style>
        </div>div>
      )
}</button>
