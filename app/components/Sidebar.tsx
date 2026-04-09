'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import {
    LayoutDashboard, BarChart2, BookOpen, CheckCircle2,
    Target, DollarSign, Heart, NotebookPen, Sun, Moon, Settings,
    ChevronLeft, ChevronRight, FlaskConical,
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

  const sidebarWidth = collapsed && !isMobile ? '64px' : '240px'

  const SidebarContent = () => React.createElement('div', {
        style: {
                width: sidebarWidth,
                height: '100vh',
                background: '#2563eb',
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
                                                                         borderBottom: '1px solid rgba(255,255,255,0.15)',
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
                                                                                                                 color: '#fff',
                                                                                                                 fontSize: '22px',
                                                                                                                 fontFamily: 'Georgia, serif',
                                                                                                                 fontWeight: 'bold',
                                                                                                   }
                                                                                   }, 'T')
                                                                                   : React.createElement('span', {
                                                                                                 style: {
                                                                                                                 color: '#fff',
                                                                                                                 fontSize: '20px',
                                                                                                                 fontFamily: 'Georgia, serif',
                                                                                                                 fontWeight: 'bold',
                                                                                                                 letterSpacing: '0.05em',
                                                                                                   }
                                                                                   }, 'TRABITS')
                                                                               ),

                                                       // Nav
                                                       React.createElement('nav', { style: { flex: 1, padding: '8px 0' } },
                                                                                 navItems.map((item) => {
                                                                                           const isActive = pathname === item.href
                                                                                           const Icon = item.icon
                                                                                           return React.createElement(React.Fragment, { key: item.href },
                                                                                                                                item.section && !collapsed && !isMobile && React.createElement('div', {
                                                                                                                                              style: {
                                                                                                                                                              color: 'rgba(255,255,255,0.5)',
                                                                                                                                                              fontSize: '10px',
                                                                                                                                                              fontFamily: 'JetBrains Mono, monospace',
                                                                                                                                                              letterSpacing: '0.15em',
                                                                                                                                                              padding: '16px 20px 4px',
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
                                                                                                                                                              padding: collapsed && !isMobile ? '10px 0' : '10px 20px',
                                                                                                                                                              margin: '1px 8px',
                                                                                                                                                              borderRadius: '8px',
                                                                                                                                                              color: '#fff',
                                                                                                                                                              textDecoration: 'none',
                                                                                                                                                              fontSize: '14px',
                                                                                                                                                              fontFamily: 'Inter, sans-serif',
                                                                                                                                                              opacity: isActive ? 1 : 0.75,
                                                                                                                                                              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                                                                                                                                                              borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                                                                                                                                                              transition: 'all 150ms',
                                                                                                                                                }
                                                                                                                                  },
                                                                                                                                                                React.createElement(Icon, { size: 16, color: '#fff' }),
                                                                                                                                                                !collapsed || isMobile ? item.label : null
                                                                                                                                                              )
                                                                                                                              )
                                                                                 })
                                                                               ),

                                                       // Collapse toggle button (desktop only) - polished pill inside sidebar
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
                                                                                                                    background: collapseHover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                                                                                                    border: 'none',
                                                                                                                    borderRadius: '20px',
                                                                                                                    color: '#fff',
                                                                                                                    cursor: 'pointer',
                                                                                                                    fontSize: '13px',
                                                                                                                    fontFamily: 'Inter, sans-serif',
                                                                                                                    transition: 'background 150ms ease',
                                                                                                                    whiteSpace: 'nowrap' as const,
                                                                                                                    overflow: 'hidden' as const,
                                                                                                          }
                                                                                                },
                                                                                                                          collapsed
                                                                                                                            ? React.createElement(ChevronRight, { size: 14, color: '#fff' })
                                                                                                                            : React.createElement(React.Fragment, null,
                                                                                                                                                                React.createElement(ChevronLeft, { size: 14, color: '#fff' }),
                                                                                                                                                                React.createElement('span', { style: { color: '#fff' } }, 'Collapse')
                                                                                                                                                              )
                                                                                                                        )
                                                                                            ),

                                                       // Footer
                                                       React.createElement('div', { style: { padding: '16px', borderTop: '1px solid rgba(255,255,255,0.15)' } },
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
                                                                                                                                                 background: 'rgba(255,255,255,0.1)',
                                                                                                                                                 border: 'none',
                                                                                                                                                 borderRadius: '20px',
                                                                                                                                                 padding: '8px',
                                                                                                                                                 color: '#fff',
                                                                                                                                                 cursor: 'pointer',
                                                                                                                                 }
                                                                                                                 },
                                                                                                                                                   isDark ? React.createElement(Sun, { size: 14, color: '#fff' }) : React.createElement(Moon, { size: 14, color: '#fff' })
                                                                                                                                                 )
                                                                                                               : React.createElement('button', {
                                                                                                                               onClick: toggle,
                                                                                                                               style: {
                                                                                                                                                 flex: 1,
                                                                                                                                                 display: 'flex',
                                                                                                                                                 alignItems: 'center',
                                                                                                                                                 gap: '8px',
                                                                                                                                                 background: 'rgba(255,255,255,0.1)',
                                                                                                                                                 border: 'none',
                                                                                                                                                 borderRadius: '20px',
                                                                                                                                                 padding: '8px 16px',
                                                                                                                                                 color: '#fff',
                                                                                                                                                 cursor: 'pointer',
                                                                                                                                                 fontSize: '13px',
                                                                                                                                 }
                                                                                                                 },
                                                                                                                                                   isDark ? React.createElement(Sun, { size: 14, color: '#fff' }) : React.createElement(Moon, { size: 14, color: '#fff' }),
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
                                                                                                                                       background: 'rgba(255,255,255,0.1)',
                                                                                                                                       border: 'none',
                                                                                                                                       borderRadius: '20px',
                                                                                                                                       padding: '8px 10px',
                                                                                                                                       color: '#fff',
                                                                                                                                       cursor: 'pointer',
                                                                                                                                       flexShrink: 0,
                                                                                                                           }
                                                                                                               },
                                                                                                                                                                       React.createElement(Settings, { size: 14, color: '#fff' })
                                                                                                                                                                     )
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
                                                                                                                                                        background: '#fff',
                                                                                                                                                        display: 'flex',
                                                                                                                                                        alignItems: 'center',
                                                                                                                                                        justifyContent: 'center',
                                                                                                                                                        color: '#2563eb',
                                                                                                                                                        fontSize: '12px',
                                                                                                                                                        fontWeight: 'bold',
                                                                                                                                                        flexShrink: 0,
                                                                                                                                            }
                                                                                                                                }, initials),
                                                                                                                              (!collapsed || isMobile) && React.createElement('div', null,
                                                                                                                                                                                        React.createElement('div', { style: { color: '#fff', fontSize: '13px', fontWeight: 500 } }, session.user.name),
                                                                                                                                                                                        React.createElement('div', { style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px' } }, session.user.email)
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
