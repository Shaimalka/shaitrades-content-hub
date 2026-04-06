'use client'
import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import TopBar from '@/app/components/TopBar'
import { useTheme } from '@/app/contexts/ThemeContext'

function LifeLayoutInner({ children }: { children: React.ReactNode }) {
    const { isDark } = useTheme()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const bg = isDark ? '#0a0a0f' : '#f8f9fc'

  return (
        <div style={{
                display: 'flex',
                minHeight: '100vh',
                background: bg,
        }}>
          {/* Sidebar — desktop fixed, mobile overlay handled inside Sidebar */}
                <Sidebar />

          {/* Main content area */}
                <div style={{
                  flex: 1,
                  marginLeft: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
        }} className="life-main-content">
                        <TopBar />
                        <main style={{
                    flex: 1,
                    padding: '32px',
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    boxSizing: 'border-box',
        }}>
                          {children}
                        </main>main>
                </div>div>
        
              <style>{`
                      @media (max-width: 767px) {
                                .life-main-content {
                                            margin-left: 0 !important;
                                                      }
                                                              }
                                                                    `}</style>style>
        </div>div>
      )
}

export default function LifeLayout({ children }: { children: React.ReactNode }) {
    return <LifeLayoutInner>{children}</LifeLayoutInner>LifeLayoutInner>
      }</div>
