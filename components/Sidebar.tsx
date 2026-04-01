'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  CalendarDays,
  BarChart2,
  Youtube,
  Camera,
  Music2,
  LineChart,
  Target,
  Flame,
  Heart,
  BookOpen,
  DollarSign,
  Settings,
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
  { href: '/life/trading', label: 'Trading Journal', icon: LineChart, sub: [
    { href: '/life/trading/settings', label: 'Settings', icon: Settings },
  ]},
  { href: '/life/goals', label: 'Goals', icon: Target },
  { href: '/life/habits', label: 'Habits', icon: Flame },
  { href: '/life/health', label: 'Health', icon: Heart },
  { href: '/life/journal', label: 'Daily Journal', icon: BookOpen },
  { href: '/life/finance', label: 'Finance', icon: DollarSign },
  { href: '/life/review', label: 'Weekly Review', icon: BarChart2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { toggleTheme, isDark } = useTheme()

  return (
    <aside style={{
      width: '240px',
      background: '#08080a',
      borderRight: '1px solid rgba(0,242,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,242,255,0.06)' }}>
        <Link href='/' style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '1px solid rgba(0,242,255,0.35)',
            background: 'rgba(0,242,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width='16' height='16' viewBox='0 0 56 56' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M31 14L21 30h9l-5 12 14-18h-9l4-10z' fill='#00f2ff' />
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.88rem',
              color: '#00f2ff', letterSpacing: '0.06em', lineHeight: 1.2,
              textShadow: '0 0 10px rgba(0,242,255,0.4)',
            }}>TRABITS</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.48rem',
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>TRADE · HABITS · EVOLVE</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

        {/* PLATFORMS */}
        <div style={{ padding: '16px 16px 4px' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            color: 'rgba(255,255,255,0.18)', letterSpacing: '4px',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>PLATFORMS</div>

          {/* Instagram */}
          <div style={{ marginBottom: '2px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 8px', marginBottom: '2px',
            }}>
              <Camera size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}>Instagram</span>
              <div className='live-dot' />
            </div>
            {INSTAGRAM_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`} style={{ paddingLeft: '28px' }}>
                <span className='nav-item-icon'><Icon size={13} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <hr className='cyber-divider-dark' style={{ margin: '8px 0' }} />

          {/* TikTok */}
          <div style={{ marginBottom: '2px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 8px', marginBottom: '2px',
            }}>
              <Music2 size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}>TikTok</span>
              <div className='live-dot' />
            </div>
            {TIKTOK_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`} style={{ paddingLeft: '28px' }}>
                <span className='nav-item-icon'><Icon size={13} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <hr className='cyber-divider-dark' style={{ margin: '8px 0' }} />

          {/* YouTube */}
          <div style={{ marginBottom: '2px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 8px', marginBottom: '2px',
            }}>
              <Youtube size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}>YouTube</span>
              <div className='live-dot' />
            </div>
            {YOUTUBE_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item-dark ${pathname === href ? 'active' : ''}`} style={{ paddingLeft: '28px' }}>
                <span className='nav-item-icon'><Icon size={13} strokeWidth={2} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <hr className='cyber-divider-dark' style={{ margin: '4px 0' }} />

        {/* LIFE HUB */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            color: 'rgba(255,255,255,0.18)', letterSpacing: '4px',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>LIFE HUB</div>
          {LIFE_NAV.map(({ href, label, icon: Icon, sub }: any) => (
            <div key={href}>
              <Link href={href} className={`nav-item-dark ${pathname === href || pathname?.startsWith(href + '/') ? 'active' : ''}`}>
                <span className='nav-item-icon'><Icon size={13} strokeWidth={2} /></span>
                <span>{label}</span>
                {href === '/life/review' && (
                  <span style={{ marginLeft: 'auto', fontSize: '8px', fontFamily: 'JetBrains Mono', color: '#ffb400', letterSpacing: '1px' }}>SUN</span>
                )}
              </Link>
              {sub && (pathname === href || sub.some((s: any) => pathname === s.href)) && (
                <div style={{ paddingLeft: '1.5rem' }}>
                  {sub.map((s: any) => (
                    <Link key={s.href} href={s.href} className={`nav-item-dark ${pathname === s.href ? 'active' : ''}`} style={{ fontSize: '0.72rem' }}>
                      <span className='nav-item-icon'><s.icon size={12} strokeWidth={2} /></span>
                      <span>{s.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom profile */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(0,242,255,0.06)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(0,242,255,0.03)',
          border: '1px solid rgba(0,242,255,0.07)',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #00f2ff, #0060ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, color: '#fff',
            fontFamily: 'Montserrat, sans-serif',
          }}>ST</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f0f4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@shaitrades</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>CREATOR ACCOUNT</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid rgba(255,45,120,0.2)', color: 'rgba(255,45,120,0.6)',
            fontSize: '9px', fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '2px', padding: '6px', cursor: 'pointer',
            borderRadius: '6px', transition: 'all 0.2s', textTransform: 'uppercase',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff2d78'; e.currentTarget.style.borderColor = 'rgba(255,45,120,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,45,120,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,45,120,0.2)'; }}
        >
          SIGN OUT
        </button>
      </div>
    </aside>
  )
}
