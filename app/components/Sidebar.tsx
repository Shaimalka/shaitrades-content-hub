'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import {
      LayoutDashboard, BarChart2, BookOpen,
      CheckCircle2, Target, DollarSign,
      Heart, NotebookPen, Sun, Moon
} from 'lucide-react'
import { useSession } from 'next-auth/react'

const navItems = [
    { href: '/life', label: 'Dashboard', icon: LayoutDashboard, section: null },
    { href: '/life/trading', label: 'Trading Journal', icon: BarChart2, section: 'TRADING' },
    { href: '/life/trading/playbook', label: 'Playbook', icon: BookOpen, section: null },
    { href: '/life/habits', label: 'Habits', icon: CheckCircle2, section: 'LIFE' },
    { href: '/life/goals', label: 'Goals', icon: Target, section: null },
    { href: '/life/finance', label: 'Finance', icon: DollarSign, section: null },
    { href: '/life/health', label: 'Health', icon: Heart, section: null },
    { href: '/life/journal', label: 'Journal', icon: NotebookPen, section: null },
    ]

export default function Sidebar() {
      const pathname = usePathname()
      const { isDark, toggle } = useTheme()
      const { data: session } = useSession()
      const [mobileOpen, setMobileOpen] = React.useState(false)

  const initials = session?.user?.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : 'T'

  const SidebarContent = () => React.createElement('div', {
          style: {
                    width: '240px',
                    height: '100vh',
                    background: '#2563eb',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    position: 'fixed' as const,
                    top: 0,
                    left: 0,
                    zIndex: 100,
                    overflowY: 'auto' as const,
          }
  },
                                                       React.createElement('div', {
                                                                 style: { padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)' }
                                                       },
                                                                                 React.createElement('span', {
                                                                                             style: { color: '#fff', fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: '0.05em' }
                                                                                 }, 'TRABITS')
                                                                               ),
                                                       React.createElement('nav', { style: { flex: 1, padding: '8px 0' } },
                                                                                 navItems.map((item, i) => {
                                                                                             const isActive = pathname === item.href
                                                                                             const Icon = item.icon
                                                                                             return React.createElement(React.Fragment, { key: item.href },
                                                                                                                                  item.section && React.createElement('div', {
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
                                                                                                                                                  style: {
                                                                                                                                                                    display: 'flex',
                                                                                                                                                                    alignItems: 'center',
                                                                                                                                                                    gap: '10px',
                                                                                                                                                                    padding: '10px 20px',
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
                                                                                                                                                                  item.label
                                                                                                                                                                )
                                                                                                                                )
                                                                                 })
                                                                               ),
                                                       React.createElement('div', {
                                                                 style: { padding: '16px', borderTop: '1px solid rgba(255,255,255,0.15)' }
                                                       },
                                                                                 React.createElement('button', {
                                                                                             onClick: toggle,
                                                                                             style: {
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
                                                                                                           marginBottom: '12px',
                                                                                                           width: '100%',
                                                                                                 }
                                                                                 },
                                                                                                             isDark
                                                                                                               ? React.createElement(Sun, { size: 14, color: '#fff' })
                                                                                                               : React.createElement(Moon, { size: 14, color: '#fff' }),
                                                                                                             isDark ? 'Light Mode' : 'Dark Mode'
                                                                                                           ),
                                                                                 session?.user && React.createElement('div', {
                                                                                             style: { display: 'flex', alignItems: 'center', gap: '10px' }
                                                                                 },
                                                                                                                              React.createElement('div', {
                                                                                                                                            style: {
                                                                                                                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                                                                                                                            background: '#fff', display: 'flex', alignItems: 'center',
                                                                                                                                                            justifyContent: 'center', color: '#2563eb', fontSize: '12px',
                                                                                                                                                            fontWeight: 'bold', flexShrink: 0,
                                                                                                                                                }
                                                                                                                                  }, initials),
                                                                                                                              React.createElement('div', null,
                                                                                                                                                            React.createElement('div', {
                                                                                                                                                                            style: { color: '#fff', fontSize: '13px', fontWeight: 500 }
                                                                                                                                                                }, session.user.name),
                                                                                                                                                            React.createElement('div', {
                                                                                                                                                                            style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px' }
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
