'use client'
import React, { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'
import { Bell } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

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
  const [hovered, setHovered] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  const surface = 'var(--bg-page)'
  const border = 'var(--border)'
  const text = isDark ? '#ffffff' : '#0a0a0f'
  const textMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  const title = pageTitles[pathname] || 'TRABITS'

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email
    ? session.user.email[0].toUpperCase()
    : '?'

  useEffect(() => {
    function handleClickOutsideBell(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideBell)
    return () => document.removeEventListener('mousedown', handleClickOutsideBell)
  }, [])

  useEffect(() => {
    function handleClickOutsideAvatar(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideAvatar)
    return () => document.removeEventListener('mousedown', handleClickOutsideAvatar)
  }, [])

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
      React.createElement('div', {
        ref: bellRef,
        style: { position: 'relative', display: 'inline-block' }
      },
        React.createElement(Bell, {
          size: 18,
          color: textMuted,
          style: { cursor: 'pointer' },
          onClick: () => setShowNotifications(prev => !prev)
        }),
        showNotifications && React.createElement('div', {
          style: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
            minWidth: '260px',
            padding: '20px',
            zIndex: 50,
          }
        },
          React.createElement('div', {
            style: { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }
          }, 'Notifications'),
          React.createElement('div', {
            style: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }
          }, 'No notifications yet')
        )
      ),
      React.createElement('div', {
        ref: avatarRef,
        style: { position: 'relative', cursor: 'pointer' }
      },
        React.createElement('div', {
          onClick: () => setShowUserMenu(prev => !prev),
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
        }, initials),
        showUserMenu && React.createElement('div', {
          style: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            minWidth: '180px',
            padding: '8px',
            zIndex: 50,
          }
        },
          React.createElement('div', {
            onClick: () => router.push('/settings'),
            style: {
              fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
              padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
              display: 'block', width: '100%',
            },
            onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-page)'
            },
            onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent'
            }
          }, 'Profile'),
          React.createElement('div', {
            onClick: () => router.push('/settings'),
            style: {
              fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
              padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
              display: 'block', width: '100%',
            },
            onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-page)'
            },
            onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent'
            }
          }, 'Settings'),
          React.createElement('div', {
            onClick: () => signOut(),
            style: {
              fontSize: '13px', fontWeight: 500, color: '#ef4444',
              padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
              display: 'block', width: '100%',
            },
            onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-page)'
            },
            onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent'
            }
          }, 'Log out')
        )
      )
    )
  )
}
