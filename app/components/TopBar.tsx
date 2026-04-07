'use client'
import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import { Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'

const pageTitles: Record<string, string> = {
        '/life': 'Dashboard',
        '/life/trading': 'Trading Journal',
        '/life/trading/playbook': 'Playbook',
        '/life/habits': 'Habits',
        '/life/goals': 'Goals',
        '/life/finance': 'Finance',
        '/life/health': 'Health',
        '/life/journal': 'Journal',
        '/settings': 'Settings',
}

export default function TopBar() {
        const pathname = usePathname()
        const router = useRouter()
        const { isDark } = useTheme()
        const { data: session } = useSession()
        const [hovered, setHovered] = React.useState(false)

  const surface = isDark ? '#111118' : '#ffffff'
        const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
        const text = isDark ? '#ffffff' : '#0a0a0f'
        const textMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  const title = pageTitles[pathname] || 'TRABITS'

  const initials = session?.user?.name
          ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : 'T'

  return React.createElement('div', {
            style: {
                        height: '56px', background: surface, borderBottom: `1px solid ${border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 24px', position: 'sticky' as const, top: 0, zIndex: 50,
            }
  },
                                 React.createElement('span', {
                                             style: { color: text, fontSize: '16px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }
                                 }, title),
                                 React.createElement('div', {
                                             style: { display: 'flex', alignItems: 'center', gap: '16px' }
                                 },
                                                           React.createElement(Bell, { size: 18, color: textMuted }),
                                                           React.createElement('div', {
                                                                         onClick: () => router.push('/settings'),
                                                                         onMouseEnter: () => setHovered(true),
                                                                         onMouseLeave: () => setHovered(false),
                                                                         style: {
                                                                                         width: '32px', height: '32px', borderRadius: '50%',
                                                                                         background: hovered ? '#1d4ed8' : '#2563eb',
                                                                                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                         color: '#fff', fontSize: '12px', fontWeight: 'bold',
                                                                                         cursor: 'pointer',
                                                                                         transform: hovered ? 'scale(1.08)' : 'scale(1)',
                                                                                         transition: 'background 0.15s, transform 0.15s',
                                                                                         boxShadow: hovered ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
                                                                         }
                                                           }, initials)
                                                         )
                               )
}
