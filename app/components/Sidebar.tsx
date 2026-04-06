'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
    LayoutDashboard,
    BarChart2,
    BookOpen,
    CheckCircle2,
    Target,
    DollarSign,
    Heart,
    NotebookPen,
    Sun,
    Moon,
    X,
    Menu,
    Bell,
} from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'

const NAV_SECTIONS = [
  {
        label: null,
        items: [
          { href: '/life', label: 'Dashboard', icon: LayoutDashboard },
              ],
  },
  {
        label: 'TRADING',
        items: [
          { href: '/life/trading', label: 'Trading Journal', icon: BarChart2 },
          { href: '/life/trading/playbook', label: 'Playbook', icon: BookOpen },
              ],
  },
  {
        label: 'LIFE',
        items: [
          { href: '/life/habits', label: 'Habits', icon: CheckCircle2 },
          { href: '/life/goals', label: 'Goals', icon: Target },
          { href: '/life/finance', label: 'Finance', icon: DollarSign },
          { href: '/life/health', label: 'Health', icon: Heart },
          { href: '/life/journal', label: 'Journal', icon: NotebookPen },
              ],
  },
  ]

const USER_INITIALS = 'ST'
const USER_NAME = 'Shaimalka'
const USER_EMAIL = 'shailoop1@gmail.com'

interface SidebarContentProps {
    onClose?: () => void
}

function SidebarContent({ onClose }: SidebarContentProps) {
    const pathname = usePathname()
    const { isDark, toggle } = useTheme()

  return (
        <div style={{
                width: '240px',
                background: '#2563eb',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                position: 'relative',
                flexShrink: 0,
        }}>
          {/* Close button (mobile only) */}
          {onClose && (
                  <button
                              onClick={onClose}
                              style={{
                                            position: 'absolute',
                                            top: '16px',
                                            right: '16px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#fff',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                            <X size={18} />
                  </button>button>
              )}
        
          {/* Logo area */}
              <div style={{ padding: '24px 24px 0' }}>
                      <Link href="/life" style={{ textDecoration: 'none' }}>
                                <span style={{
                      fontFamily: "'Georgia', serif",
                      fontWeight: 700,
                      fontSize: '20px',
                      color: '#ffffff',
                      letterSpacing: '0.05em',
        }}>TRABITS</span>span>
                      </Link>Link>
              </div>div>
        
          {/* Divider */}
              <div style={{
                  margin: '16px 24px 8px',
                  height: '1px',
                  background: 'rgba(255,255,255,0.15)',
        }} />
        
          {/* Nav */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {NAV_SECTIONS.map((section, si) => (
                    <div key={si}>
                      {section.label && (
                                    <div style={{
                                                      fontFamily: "'JetBrains Mono', monospace",
                                                      fontSize: '10px',
                                                      color: '#ffffff',
                                                      opacity: 0.5,
                                                      letterSpacing: '0.15em',
                                                      textTransform: 'uppercase',
                                                      padding: '8px 20px',
                                                      marginTop: '8px',
                                    }}>
                                      {section.label}
                                    </div>div>
                                )}
                      {section.items.map(({ href, label, icon: Icon }) => {
                                    const isActive = pathname === href || (href !== '/life' && pathname?.startsWith(href))
                                                    return (
                                                                      <Link
                                                                                          key={href}
                                                                                          href={href}
                                                                                          style={{
                                                                                                                display: 'flex',
                                                                                                                alignItems: 'center',
                                                                                                                gap: '10px',
                                                                                                                padding: '10px 20px',
                                                                                                                borderRadius: '8px',
                                                                                                                margin: '2px 8px',
                                                                                                                textDecoration: 'none',
                                                                                                                color: '#ffffff',
                                                                                                                fontSize: '14px',
                                                                                                                fontFamily: "'Inter', -apple-system, sans-serif",
                                                                                                                opacity: isActive ? 1 : 0.75,
                                                                                                                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                                                                                                                borderLeft: isActive ? '3px solid #ffffff' : '3px solid transparent',
                                                                                                                transition: 'all 150ms',
                                                                                            }}
                                                                                          onMouseEnter={e => {
                                                                                                                if (!isActive) {
                                                                                                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                                                                                                                                                                e.currentTarget.style.opacity = '1'
                                                                                                                  }
                                                                                            }}
                                                                                          onMouseLeave={e => {
                                                                                                                if (!isActive) {
                                                                                                                                        e.currentTarget.style.background = 'transparent'
                                                                                                                                                                e.currentTarget.style.opacity = '0.75'
                                                                                                                  }
                                                                                            }}
                                                                                        >
                                                                                        <Icon size={16} color="#ffffff" />
                                                                                        <span>{label}</span>span>
                                                                      </Link>Link>
                                                                    )
                      })}
                    </div>div>
                  ))}
              </div>div>
        
          {/* Bottom section */}
              <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {/* Theme toggle */}
                      <button
                                  onClick={toggle}
                                  style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 14px',
                                                borderRadius: '20px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                fontFamily: "'Inter', -apple-system, sans-serif",
                                                marginBottom: '12px',
                                                transition: 'background 150ms',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                >
                        {isDark ? <Sun size={15} /> : <Moon size={15} />}
                                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>span>
                      </button>button>
              
                {/* User info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      flexShrink: 0,
        }}>
                                  {USER_INITIALS}
                                </div>div>
                                <div style={{ minWidth: 0 }}>
                                            <div style={{
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
        }}>{USER_NAME}</div>div>
                                            <div style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '11px',
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
        }}>{USER_EMAIL}</div>div>
                                </div>div>
                      </div>div>
              </div>div>
        </div>div>
      )
}

export default function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false)
      
        return (
              <>
                {/* Desktop sidebar */}
                    <div style={{ display: 'none' }} className="sidebar-desktop">
                            <div style={{
                          position: 'fixed',
                          left: 0,
                          top: 0,
                          zIndex: 40,
                          display: 'block',
              }}>
                                      <SidebarContent />
                            </div>div>
                    </div>div>
              
                {/* Mobile hamburger */}
                    <button
                              onClick={() => setMobileOpen(true)}
                              className="sidebar-hamburger"
                              style={{
                                          position: 'fixed',
                                          top: '16px',
                                          left: '16px',
                                          zIndex: 50,
                                          background: '#2563eb',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '8px',
                                          cursor: 'pointer',
                                          color: '#ffffff',
                                          display: 'none',
                              }}
                            >
                            <Menu size={20} />
                    </button>button>
              
                {/* Mobile overlay */}
                {mobileOpen && (
                        <div
                                    style={{
                                                  position: 'fixed',
                                                  inset: 0,
                                                  zIndex: 60,
                                                  display: 'flex',
                                    }}
                                  >
                                  <div
                                                onClick={() => setMobileOpen(false)}
                                                style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                background: 'rgba(0,0,0,0.5)',
                                                }}
                                              />
                                  <div style={{ position: 'relative', zIndex: 1 }}>
                                              <SidebarContent onClose={() => setMobileOpen(false)} />
                                  </div>div>
                        </div>div>
                    )}
              
                    <style>{`
                            @media (min-width: 768px) {
                                      .sidebar-desktop { display: block !important; }
                                                .sidebar-hamburger { display: none !important; }
                                                        }
                                                                @media (max-width: 767px) {
                                                                          .sidebar-desktop { display: none !important; }
                                                                                    .sidebar-hamburger { display: flex !important; }
                                                                                            }
                                                                                                  `}</style>style>
              </>>
            )
}</></button>
