'use client'
import Link from 'next/link'
import { Camera, Music2, Youtube } from 'lucide-react'

const platforms = [
  {
    name: 'Instagram',
    icon: Camera,
    connected: true,
    href: '/instagram',
    description: 'Full analytics dashboard, post analysis, weekly reports',
    stats: '@shaitrades connected',
    accentColor: '#e1306c',
    iconBg: 'rgba(225,48,108,0.08)',
    iconBorder: 'rgba(225,48,108,0.2)',
  },
  {
    name: 'TikTok',
    icon: Music2,
    connected: true,
    href: '/tiktok/analytics',
    description: 'Analytics dashboard — views, growth, best posting times',
    stats: 'Analytics dashboard live',
    accentColor: '#00f2ff',
    iconBg: 'rgba(0,242,255,0.08)',
    iconBorder: 'rgba(0,242,255,0.2)',
  },
  {
    name: 'YouTube',
    icon: Youtube,
    connected: true,
    href: '/youtube',
    description: 'Analytics dashboard — subs, views, top content',
    stats: 'Analytics dashboard live',
    accentColor: '#ff0000',
    iconBg: 'rgba(255,0,0,0.08)',
    iconBorder: 'rgba(255,0,0,0.2)',
  },
]

const lifeSections = [
  { name: 'Trading Journal', color: '#00f2ff' },
  { name: 'Goals', color: '#ff00e5' },
  { name: 'Habits', color: '#00ff88' },
  { name: 'Health', color: '#ffb400' },
  { name: 'Daily Journal', color: '#7c3aed' },
  { name: 'Finance', color: '#00f2ff' },
]

export default function Home() {
  return (
    <div className="cyber-bg-grid min-h-screen" style={{ background: '#060608' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #141420',
        padding: '20px 48px',
        background: '#08080a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '1px solid rgba(0,242,255,0.3)',
            background: 'rgba(0,242,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width='18' height='18' viewBox='0 0 56 56' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M31 14L21 30h9l-5 12 14-18h-9l4-10z' fill='#00f2ff' />
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '1rem',
              color: '#00f2ff', letterSpacing: '0.06em',
              textShadow: '0 0 12px rgba(0,242,255,0.4)',
            }}>TRABITS</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.5rem',
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>TRADE · HABITS · EVOLVE</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }}>

        {/* SELECT PLATFORM */}
        <div style={{ marginBottom: '64px' }}>
          <div className="section-header">// SELECT PLATFORM</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {platforms.map((p) => {
              const Icon = p.icon
              const Tag = p.connected ? Link : 'div'
              return (
                <Tag
                  key={p.name}
                  href={p.href as any}
                  style={{
                    display: 'block',
                    background: '#0e0e14',
                    border: '1px solid #1a1a28',
                    borderRadius: '12px',
                    padding: '24px',
                    textDecoration: 'none',
                    cursor: p.connected ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  className="platform-card"
                >
                  {/* Platform icon + live badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: p.iconBg, border: `1px solid ${p.iconBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color={p.accentColor} />
                    </div>
                    {p.connected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div className="live-dot" />
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
                          color: '#00ff88', letterSpacing: '2px', textTransform: 'uppercase',
                        }}>LIVE</span>
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '17px', color: '#ffffff', marginBottom: '6px' }}>{p.name}</h3>
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                    color: 'rgba(255,255,255,0.3)', marginBottom: '12px', lineHeight: 1.5,
                  }}>{p.description}</p>
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
                    color: 'rgba(255,255,255,0.2)', letterSpacing: '1px',
                  }}>{p.stats}</p>
                </Tag>
              )
            })}
          </div>
        </div>

        {/* LIFE HUB */}
        <div>
          <div className="section-header">// LIFE HUB</div>
          <Link href="/life" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: '#0e0e14',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #1a1a28',
              transition: 'border-color 0.2s',
              position: 'relative',
            }} className="premium-card">
              {/* Gradient top border: cyan to magenta */}
              <div style={{ height: '2px', background: 'linear-gradient(90deg, #00f2ff, #ff00e5)' }} />

              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
                      color: 'rgba(255,255,255,0.2)', letterSpacing: '4px',
                      textTransform: 'uppercase', marginBottom: '10px',
                    }}>PERSONAL COMMAND CENTER</div>
                    <h2 style={{
                      fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '28px',
                      color: '#ffffff', letterSpacing: '-0.01em', margin: '0 0 8px',
                    }}>TRABITS LIFE HUB</h2>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                      color: 'rgba(0,242,255,0.6)', letterSpacing: '4px',
                      textTransform: 'uppercase', margin: 0,
                    }}>TRADE · HABITS · EVOLVE</p>
                  </div>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    border: '1px solid rgba(0,242,255,0.2)',
                    background: 'rgba(0,242,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width='22' height='22' viewBox='0 0 56 56' fill='none'>
                      <path d='M31 14L21 30h9l-5 12 14-18h-9l4-10z' fill='#00f2ff' />
                    </svg>
                  </div>
                </div>

                {/* Section badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {lifeSections.map((s) => (
                    <span key={s.name} style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px', letterSpacing: '1.5px',
                      padding: '4px 10px', borderRadius: '4px',
                      border: `1px solid ${s.color}33`,
                      background: `${s.color}0d`,
                      color: s.color,
                      textTransform: 'uppercase',
                    }}>{s.name}</span>
                  ))}
                </div>

                {/* Enter button */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '8px 18px', borderRadius: '6px',
                  border: '1px solid rgba(0,242,255,0.25)',
                  background: 'rgba(0,242,255,0.06)',
                  color: '#00f2ff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px', letterSpacing: '2px', fontWeight: 600,
                  textTransform: 'uppercase',
                }}>ENTER →</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
