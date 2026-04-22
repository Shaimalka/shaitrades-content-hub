'use client'
import React from 'react'
import Sidebar from '@/app/components/Sidebar'
import TopBar from '@/app/components/TopBar'
import { SessionProvider } from 'next-auth/react'

function LifeLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('trabits-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ collapsed: boolean }>
      setCollapsed(ce.detail.collapsed)
    }
    window.addEventListener('sidebarToggle', handler)
    return () => window.removeEventListener('sidebarToggle', handler)
  }, [])

  const sidebarWidth = collapsed ? '64px' : '240px'

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
            background: 'var(--bg-page)',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .life-sidebar { display: none; }
          .life-content { margin-left: 0 !important; }
        }
      ` }} />
      <div className="life-sidebar">
        <Sidebar />
      </div>
      <div
        className="life-content"
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <TopBar />
        <main style={{
          flex: 1,
          padding: '32px',
          width: '100%',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LifeLayoutInner>{children}</LifeLayoutInner>
    </SessionProvider>
  )
}
