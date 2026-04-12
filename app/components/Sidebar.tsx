'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
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
    Settings,
    ChevronLeft,
    ChevronRight,
    FlaskConical,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

const navItems = [
  { href: '/life', label: 'Dashboard', icon: LayoutDashboard, section: null },
  { href: '/life/trading', label: 'Trading Journal', icon: BarChart2, section: 'TRADING' },
  { href: '/life/trading/playbook', label: 'Playbook', icon: BookOpen, section: null },
  { href: '/life/trading/backtesting', label: 'Backtesting', icon: FlaskConical, section: null },
  { href: '/life/habits', label: 'Habits', icon: CheckCircle2, section: 'LIFE' },
  { href: '/life/goals', label: 'Goals', icon: Target, section: null },
  { href: '/life/finance', label: 'Finance', icon: DollarSign, section: null },
  { href: '/life/health', label: 'Health', icon: Heart, section: null },
  { href: '/life/journal', label: 'Journal', icon: NotebookPen, section: null },
  ]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { isDark, toggle } = useTheme()
    const { data: session } = useSession()
    const [mobileOpen, setMobileOpen] = React.useState(false)
    const [collapsed, setCollapsed] = React.useState(() => {
          if (typeof window === 'undefined') return false
          try {
                  return localStorage.getItem('trabits-sidebar-collapsed') === 'true'
          } catch {
                  return false
          }
    })
    const [isMobile, setIsMobile] = React.useState(false)
    const [collapseHover, setCollapseHover] = React.useState(false)

  React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleToggleCollapse = () => {
        const next = !collapsed
        setCollapsed(next)
        try {
                localStorage.setItem('trabits-sidebar-collapsed', String(next))
        } catch {}
        window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: next } }))
  }

  const initials = session?.user?.name
      ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'T'

  const sidebarWidth = collapsed && !isMobile ? '64px' : '220px'

  const SidebarContent = () => React.createElement('div', {
        style: {
                width: sidebarWidth,
                height: '100vh',
                background: 'var(--bg-sidebar)',
                display: 'flex',
                flexDirection: 'column' as const,
                position: 'fixed' as const,
                top: 0,
                left: 0,
                zIndex: 100,
                overflowY: 'auto' as const,
                overflowX: 'hidden' as const,
                transition: 'width 0.2s ease',
        }
  },
                                                       // Header
                                                       React.createElement('div', {
                                                               style: {
                                                                         padding: collapsed && !isMobile ? '24px 0 16px' : '24px 20px 16px',
                                                                         borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                                         display: 'flex',
                                                                         alignItems: 'center',
                                                                         justifyContent: 'center',
                                                                         position: 'relative' as const,
                                                                         minHeight: '64px',
                                                               }
                                                       },
                                                                                 collapsed && !isMobile
                                                                                   ? React.createElement('span', {
                                                                                               style: {
                                                                                                             color: 'var(--text-white)',
                                                                                                             fontSize: '22px',
                                                                                                             fontFamily: 'var(--font)',
                                                                                                             fontWeight: 700,
                                                                                                             letterSpacing: '0.08em',
                                                                                                 }
                                                                                   }, 'B')
                                                                                   : React.createElement('span', {
                                                                                               style: {
                                                                                                             color: 'var(--text-white)',
                                                                                                             fontSize: '15px',
                                                                                                             fontFamily: 'var(--font)',
                                                                                                             fontWeight: 700,
                                                                                                             letterSpacing: '0.08em',
                                                                                                 }
                                                                                   },
                                                                                                                   React.createElement('span', { style: { color: '#ffffff' } }, 'TRA'),
                                                                                                                   React.createElement('span', { style: { color: 'var(--brand)' } }, 'BITS')
                                                                                                                 )
                                                                               ),

                                                       // Nav
                                                       React.createElement('nav', { style: { flex: 1, padding: '8px 0' } },
                                                                                 navItems.map((item) => {
                                                                                           const isActive = pathname === item.href
                                                                                           const Icon = item.icon
                                                                                           return React.createElement(React.Fragment, { key: item.href },
                                                                                                                                item.section && !collapsed && !isMobile && React.createElement('div', {
                                                                                                                                              style: {
                                                                                                                                                              color: 'rgba(255,255,255,0.35)',
                                                                                                                                                              fontSize: '10px',
                                                                                                                                                              fontWeight: 600,
                                                                                                                                                              letterSpacing: '0.08em',
                                                                                                                                                              padding: '16px 16px 4px',
                                                                                                                                                              textTransform: 'uppercase' as const,
                                                                                                                                                }
                                                                                                                                  }, item.section),
                                                                                                                                React.createElement(Link, {
                                                                                                                                              href: item.href,
                                                                                                                                              title: collapsed && !isMobile ? item.label : undefined,
                                                                                                                                              style: {
                                                                                                                                                              display: 'flex',
                                                                                                                                                              alignItems: 'center',
                                                                                                                                                              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                                                                                                                                                              gap: '10px',
                                                                                                                                                              padding: collapsed && !isMobile ? '10px 0' : '8px 16px',
                                                                                                                                                              margin: '1px 8px',
                                                                                                                                                              borderRadius: 'var(--radius-md)',
                                                                                                                                                              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                                                                                                                                              textDecoration: 'none',
                                                                                                                                                              fontSize: '13px',
                                                                                                                                                              fontWeight: isActive ? 600 : 400,
                                                                                                                                                              fontFamily: 'var(--font)',
                                                                                                                                                              borderLeft: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                                                                                                                                                              background: isActive ? 'rgba(96,165,250,0.12)' : 'transparent',
                                                                                                                                                              transition: 'all 150ms',
                                                                                                                                                }
                                                                                                                                  },
                                                                                                                                                                React.createElement(Icon, { size: 16, color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }),
                                                                                                                                                                !collapsed || isMobile ? item.label : null
                                                                                                                                                              )
                                                                                                                              )
                                                                                 })
                                                                               ),

                                                       // Collapse toggle button (desktop only)
                                                       !isMobile && React.createElement('div', {
                                                               style: {
                                                                         padding: collapsed ? '8px 0' : '8px 12px',
                                                                         borderTop: '1px solid rgba(255,255,255,0.1)',
                                                               }
                                                       },
                                                                                              React.createElement('button', {
                                                                                                        onClick: handleToggleCollapse,
                                                                                                        onMouseEnter: () => setCollapseHover(true),
                                                                                                        onMouseLeave: () => setCollapseHover(false),
                                                                                                        title: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
                                                                                                        style: {
                                                                                                                    width: '100%',
                                                                                                                    display: 'flex',
                                                                                                                    alignItems: 'center',
                                                                                                                    justifyContent: 'center',
                                                                                                                    gap: '6px',
                                                                                                                    padding: '8px 16px',
                                                                                                                    background: collapseHover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                                                                                                                    border: 'none',
                                                                                                                    borderRadius: '20px',
                                                                                                                    color: 'rgba(255,255,255,0.5)',
                                                                                                                    cursor: 'pointer',
                                                                                                                    fontSize: '12px',
                                                                                                                    transition: 'background 150ms ease',
                                                                                                                    whiteSpace: 'nowrap' as const,
                                                                                                                    overflow: 'hidden' as const,
                                                                                                          }
                                                                                                },
                                                                                                                          collapsed
                                                                                                                            ? React.createElement(ChevronRight, { size: 14, color: 'rgba(255,255,255,0.5)' })
                                                                                                                            : React.createElement(React.Fragment, null,
                                                                                                                                                              React.createElement(ChevronLeft, { size: 14, color: 'rgba(255,255,255,0.5)' }),
                                                                                                                                                              React.createElement('span', { style: { color: 'rgba(255,255,255,0.5)' } }, 'Collapse')
                                                                                                                                                            )
                                                                                                                        )
                                                                                            ),

                                                       // Footer
                                                       React.createElement('div', { style: { padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' } },
                                                                                 React.createElement('div', {
                                                                                           style: {
                                                                                                       display: 'flex',
                                                                                                       alignItems: 'center',
                                                                                                       gap: '8px',
                                                                                                       marginBottom: '12px',
                                                                                                       justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                                                                                             }
                                                                                 },
                                                                                                             // Light/Dark toggle
                                                                                                             collapsed && !isMobile
                                                                                                               ? React.createElement('button', {
                                                                                                                             onClick: toggle,
                                                                                                                             title: isDark ? 'Light Mode' : 'Dark Mode',
                                                                                                                             style: {
                                                                                                                                             display: 'flex',
                                                                                                                                             alignItems: 'center',
                                                                                                                                             justifyContent: 'center',
                                                                                                                                             background: 'rgba(255,255,255,0.07)',
                                                                                                                                             border: 'none',
                                                                                                                                             borderRadius: '20px',
                                                                                                                                             padding: '8px',
                                                                                                                                             color: 'rgba(255,255,255,0.5)',
                                                                                                                                             cursor: 'pointer',
                                                                                                                               }
                                                                                                                 },
                                                                                                                                                 isDark
                                                                                                                                                   ? React.createElement(Sun, { size: 14, color: 'rgba(255,255,255,0.5)' })
                                                                                                                                                   : React.createElement(Moon, { size: 14, color: 'rgba(255,255,255,0.5)' })
                                                                                                                                               )
                                                                                                               : React.createElement('button', {
                                                                                                                             onClick: toggle,
                                                                                                                             style: {
                                                                                                                                             flex: 1,
                                                                                                                                             display: 'flex',
                                                                                                                                             alignItems: 'center',
                                                                                                                                             gap: '8px',
                                                                                                                                             background: 'rgba(255,255,255,0.07)',
                                                                                                                                             border: 'none',
                                                                                                                                             borderRadius: '20px',
                                                                                                                                             padding: '8px 16px',
                                                                                                                                             color: 'rgba(255,255,255,0.5)',
                                                                                                                                             cursor: 'pointer',
                                                                                                                                             fontSize: '12px',
                                                                                                                                             fontFamily: 'var(--font)',
                                                                                                                               }
                                                                                                                 },
                                                                                                                                                 isDark
                                                                                                                                                   ? React.createElement(Sun, { size: 14, color: 'rgba(255,255,255,0.5)' })
                                                                                                                                                   : React.createElement(Moon, { size: 14, color: 'rgba(255,255,255,0.5)' }),
                                                                                                                                                 isDark ? 'Light Mode' : 'Dark Mode'
                                                                                                                                               ),
                                                                                                     
                                                                                                             // Settings icon (hide in collapsed)
                                                                                                             (!collapsed || isMobile) && React.createElement('button', {
                                                                                                                         onClick: () => router.push('/settings'),
                                                                                                                         title: 'Settings',
                                                                                                                         style: {
                                                                                                                                       display: 'flex',
                                                                                                                                       alignItems: 'center',
                                                                                                                                       justifyContent: 'center',
                                                                                                                                       background: 'rgba(255,255,255,0.07)',
                                                                                                                                       border: 'none',
                                                                                                                                       borderRadius: '20px',
                                                                                                                                       padding: '8px 10px',
                                                                                                                                       color: 'rgba(255,255,255,0.5)',
                                                                                                                                       cursor: 'pointer',
                                                                                                                                       flexShrink: 0,
                                                                                                                           }
                                                                                                               }, React.createElement(Settings, { size: 14, color: 'rgba(255,255,255,0.5)' }))
                                                                                                           ),

                                                                                 session?.user && React.createElement('div', {
                                                                                           style: {
                                                                                                       display: 'flex',
                                                                                                       alignItems: 'center',
                                                                                                       gap: '10px',
                                                                                                       justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                                                                                             }
                                                                                 },
                                                                                                                              React.createElement('div', {
                                                                                                                                          style: {
                                                                                                                                                        width: '32px',
                                                                                                                                                        height: '32px',
                                                                                                                                                        borderRadius: '50%',
                                                                                                                                                        background: 'var(--brand)',
                                                                                                                                                        display: 'flex',
                                                                                                                                                        alignItems: 'center',
                                                                                                                                                        justifyContent: 'center',
                                                                                                                                                        color: '#0f1117',
                                                                                                                                                        fontSize: '12px',
                                                                                                                                                        fontWeight: 700,
                                                                                                                                                        flexShrink: 0,
                                                                                                                                            }
                                                                                                                                }, initials),
                                                                                                                              (!collapsed || isMobile) && React.createElement('div', null,
                                                                                                                                                                                        React.createElement('div', {
                                                                                                                                                                                                      style: {
                                                                                                                                                                                                                      color: '#ffffff',
                                                                                                                                                                                                                      fontSize: '13px',
                                                                                                                                                                                                                      fontWeight: 600,
                                                                                                                                                                                                                      fontFamily: 'var(--font)',
                                                                                                                                                                                                                    }
                                                                                                                                                                                          }, session.user.name),
                                                                                                                                                                                        React.createElement('div', {
                                                                                                                                                                                                      style: {
                                                                                                                                                                                                                      color: 'rgba(255,255,255,0.4)',
                                                                                                                                                                                                                      fontSize: '11px',
                                                                                                                                                                                                                      fontFamily: 'var(--font)',
                                                                                                                                                                                                                    }
                                                                                                                                                                                          }, session.user.email)
                                                                                                                                                                                      )
                                                                                                                            )
                                                                               )
                                                     )

  return React.createElement(React.Fragment, null,
                                 React.createElement('div', { className: 'life-sidebar' },
                                                           React.createElement(SidebarContent, null)
                                                         )
                               )
}
