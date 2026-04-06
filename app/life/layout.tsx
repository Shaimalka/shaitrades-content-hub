'use client'
import { useTheme } from '@/app/contexts/ThemeContext'
import Sidebar from '@/app/components/Sidebar'
import TopBar from '@/app/components/TopBar'
import { SessionProvider } from 'next-auth/react'

function LifeLayoutInner({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme()

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: isDark ? '#0a0a0f' : '#f8f9fc',
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
      <div className="life-content" style={{
        flex: 1,
        marginLeft: '240px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
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
