'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  CalendarDays,
  BarChart2,
  Youtube,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'

const INSTAGRAM_NAV = [
  { href: '/instagram',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/instagram/competitors', label: 'Competitors',   icon: Users },
  { href: '/instagram/reports',     label: 'Weekly Report', icon: FileText },
  { href: '/instagram/content',     label: 'Content Gen',   icon: Sparkles },
  { href: '/instagram/scheduler',   label: 'Scheduler',     icon: CalendarDays },
]

const TIKTOK_NAV = [
  { href: '/tiktok/analytics', label: 'Analytics', icon: BarChart2 },
]

const YOUTUBE_NAV = [
  { href: '/youtube', label: 'Analytics', icon: BarChart2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { toggleTheme, isDark } = useTheme()

  return (
    <aside className="cyber-sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Shaitrades
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 400, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Content Hub
            </div>
          </div>
        </Link>
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>

        {/* Back link */}
        <div style={{ padding: '0.25rem 0.625rem 0.5rem' }}>
          <Link href="/" className="nav-item" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <ChevronLeft size={13} style={{ flexShrink: 0 }} />
            <span>All Platforms</span>
          </Link>
        </div>

        {/* Instagram */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-label">
            <span style={{ fontSize: '1rem' }}>📸</span>
            <span>Instagram</span>
            <div className="live-dot" style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {INSTAGRAM_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
                <span className="nav-item-icon"><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <hr className="cyber-divider" style={{ margin: '0.25rem 0.75rem' }} />

        {/* TikTok */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-label">
            <span style={{ fontSize: '1rem' }}>🎵</span>
            <span>TikTok</span>
            <div className="live-dot" style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {TIKTOK_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
                <span className="nav-item-icon"><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <hr className="cyber-divider" style={{ margin: '0.25rem 0.75rem' }} />

        {/* YouTube */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-label">
            <Youtube size={16} style={{ color: '#ff0000', flexShrink: 0 }} />
            <span>YouTube</span>
            <div className="live-dot" style={{ marginLeft: 'auto' }} />
          </div>
          <nav>
            {YOUTUBE_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
                <span className="nav-item-icon"><Icon size={14} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

      </div>

      {/* Footer */}
      <div className="sidebar-profile">
        {/* Theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', padding: '0.25rem 0' }}>
          <Sun size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <button
            onClick={toggleTheme}
            className={`theme-toggle ${isDark ? 'dark-mode' : ''}`}
            aria-label="Toggle theme"
          />
          <Moon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginLeft: 'auto' }}>
            {isDark ? 'DARK' : 'LIGHT'}
          </span>
        </div>
        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.375rem', borderRadius: '8px', background: 'rgba(0,242,255,0.04)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--neon-cyan), #0060ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 8px rgba(0,242,255,0.3)', fontSize: '0.65rem', fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>
            ST
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @shaitrades
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              CREATOR ACCOUNT
            </div>
          </div>
        </div>
      </div>

    </aside>
  )
}
