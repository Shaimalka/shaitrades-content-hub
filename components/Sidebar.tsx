'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, FileText, Sparkles, CalendarDays,
  BarChart2, Youtube, ChevronLeft, Sun, Moon, BookOpen,
  Target, Activity, Heart, NotebookPen, Wallet, Settings,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'

const INSTAGRAM_NAV = [
  { href: '/instagram', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instagram/competitors', label: 'Competitors', icon: Users },
  { href: '/instagram/reports', label: 'Weekly Report', icon: FileText },
  { href: '/instagram/content', label: 'Content Gen', icon: Sparkles },
  { href: '/instagram/scheduler', label: 'Scheduler', icon: CalendarDays },
]

const TIKTOK_NAV = [
  { href: '/tiktok/analytics', label: 'Analytics', icon: BarChart2 },
]

const YOUTUBE_NAV = [
  { href: '/youtube', label: 'Analytics', icon: BarChart2 },
]

const LIFE_NAV = [
  { href: '/life/trading', label: 'Trading Journal', icon: BookOpen, sub: [
    { href: '/life/trading/settings', label: 'Settings', icon: Settings },
  ]},
  { href: '/life/goals', label: 'Goals', icon: Target },
  { href: '/life/habits', label: 'Habits', icon: Activity },
  { href: '/life/health', label: 'Health', icon: Heart },
  { href: '/life/journal', label: 'Daily Journal', icon: NotebookPen },
  { href: '/life/finance', label: 'Finance', icon: Wallet },
  { href: '/life/review', label: 'Weekly Review', icon: BarChart2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { toggleTheme, isDark } = useTheme()

  return (
    <aside className='cyber-sidebar-dark'>
      <div className='sidebar-logo-dark'>
        <Link href='/' style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width='26' height='26' viewBox='0 0 56 56' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ filter: 'drop-shadow(0 0 4px rgba(0,242,255,0.5))' }}>
              <circle cx='28' cy='28' r='26' stroke='#00f2ff' strokeWidth='2.5' fill='none' />
              <path d='M31 14L21 30h9l-5 12 14-18h-9l4-10z' fill='#00f2ff' />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.92rem', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              <span style={{ color: '#ffffff' }}>SHAI</span>
              <span style={{ color: '#00f2ff', textShadow: '0 0 10px rgba(0,242,255,0.5)' }}>HUB</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 400, fontSize: '0.52rem', color: 'rgba(240,244,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              TRADE · LIVE · EVOLVE
            </div>
          </div>
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        <div style={{ padding: '0.25rem 0.625rem 0.5rem' }}>
          <Link href='/' className='nav-item-dark' style={{ fontSize: '0.72rem' }}>
            <ChevronLeft size={13} style={{ flexShrink: 0 }} />
            <span>All Platforms</span>
          </Link>
        </div>

        <div className='sidebar-nav-section'>
          <div className='sidebar-section-label-dark'>
            <span style={{ fontSize: '1rem' }}>📸</span><span>Instagram</span>
            <div className='live-dot' style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {INSTAGRAM_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`}>
                <span className='nav-item-icon'><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <hr className='cyber-divider-dark' style={{ margin: '0.25rem 0.75rem' }} />

        <div className='sidebar-nav-section'>
          <div className='sidebar-section-label-dark'>
            <span style={{ fontSize: '1rem' }}>🎵</span><span>TikTok</span>
            <div className='live-dot' style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {TIKTOK_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`}>
                <span className='nav-item-icon'><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <hr className='cyber-divider-dark' style={{ margin: '0.25rem 0.75rem' }} />

        <div className='sidebar-nav-section'>
          <div className='sidebar-section-label-dark'>
            <Youtube size={16} style={{ color: '#ff0000', flexShrink: 0 }} /><span>YouTube</span>
            <div className='live-dot' style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {YOUTUBE_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`}>
                <span className='nav-item-icon'><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <hr className='cyber-divider-dark' style={{ margin: '0.25rem 0.75rem' }} />

        <div className='sidebar-nav-section'>
          <div className='sidebar-section-label-dark'>
            <span style={{ fontSize: '1rem' }}>⚡</span><span>Life Hub</span>
          </div>
          <nav>
            {LIFE_NAV.map(({ href, label, icon: Icon, sub }: any) => (
              <div key={href}>
                <Link href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`}>
                  <span className='nav-item-icon'><Icon size={14} strokeWidth={2} /></span>
                  <span>{label}</span>
                  {href === '/life/review' && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.55rem', fontFamily: 'JetBrains Mono', color: '#ffb400' }}>SUN</span>
                  )}
                </Link>
                {sub && (pathname === href || sub.some((s: any) => pathname === s.href)) && (
                  <div style={{ paddingLeft: '1.5rem' }}>
                    {sub.map((s: any) => (
                      <Link key={s.href} href={s.href} className={`nav-item-dark ${pathname === s.href ? 'active' : ''}`} style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                        <span className='nav-item-icon'><s.icon size={12} strokeWidth={2} /></span>
                        <span>{s.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className='sidebar-profile-dark'>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', padding: '0.25rem 0' }}>
          <Sun size={12} style={{ color: 'rgba(240,244,255,0.35)', flexShrink: 0 }} />
          <button
            onClick={toggleTheme}
            className={`theme-toggle ${isDark ? 'dark-mode' : ''}`}
            aria-label='Toggle theme'
          />
          <Moon size={12} style={{ color: 'rgba(240,244,255,0.35)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'rgba(240,244,255,0.35)', letterSpacing: '0.06em', marginLeft: 'auto' }}>{isDark ? 'DARK' : 'LIGHT'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.375rem', borderRadius: '8px', background: 'rgba(0,242,255,0.04)', border: '1px solid rgba(0,242,255,0.08)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #00f2ff, #0060ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 8px rgba(0,242,255,0.3)', fontSize: '0.65rem', fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>ST</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f0f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@shaitrades</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'rgba(240,244,255,0.35)', letterSpacing: '0.06em' }}>CREATOR ACCOUNT</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: '1px solid rgba(255,45,120,0.25)', color: '#ff2d78', fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', padding: '0.4rem', cursor: 'pointer', opacity: 0.75, transition: 'opacity 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.75' }}
        >
          SIGN OUT
        </button>
      </div>
    </aside>
  )
}
