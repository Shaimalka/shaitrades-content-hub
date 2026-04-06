'use client'
import { useTheme } from '@/app/contexts/ThemeContext'
import Sidebar from '@/app/components/Sidebar'
import TopBar from '@/app/components/TopBar'

function LifeLayoutInner({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme()

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: isDark ? '#0a0a0f' : '#f8f9fc',
    }}>
      <style>
        @media (max-width: 768px) {
          .life-sidebar { display: none; }
          .life-content { margin-left: 0 !important; }
        }
      }</style>
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
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return <LifeLayoutInner>{children}</LifeLayoutInner>
}
