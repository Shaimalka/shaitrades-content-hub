import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function DashboardPage() {
      const session = await getServerSession(authOptions)
      if (!session) redirect('/login')

  const today = new Date()
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
      const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const quickLinks = [
      { href: '/life/trading', label: 'Trading Journal', color: '#00f2ff', desc: 'Log & review trades' },
      { href: '/life/habits', label: 'Habits', color: '#00ff88', desc: 'Daily habit tracker' },
      { href: '/life/goals', label: 'Goals', color: '#ffb400', desc: 'Track your targets' },
      { href: '/life/journal', label: 'Daily Journal', color: '#c084fc', desc: 'Reflect & write' },
      { href: '/life/health', label: 'Health', color: '#ff6b6b', desc: 'Wellness check-in' },
      { href: '/life/finance', label: 'Finance', color: '#00ff88', desc: 'Net worth tracker' },
      { href: '/life/review', label: 'Weekly Review', color: '#ffb400', desc: 'Sunday debrief' },
      { href: '/content', label: 'Content Hub', color: '#00f2ff', desc: 'Posts & analytics' },
      { href: '/reports', label: 'Reports', color: '#c084fc', desc: 'Performance data' },
      { href: '/life/trading/backtesting', label: 'Backtesting', color: '#ff6b6b', desc: 'Strategy testing' },
      { href: '/tiktok/analytics', label: 'TikTok', color: '#00f2ff', desc: 'Platform analytics' },
      { href: '/youtube', label: 'YouTube', color: '#ff6b6b', desc: 'Channel analytics' },
        ]

  const recentTrades = [
      { symbol: 'NQ', direction: 'LONG', pnl: +320, date: 'Today', result: 'WIN' },
      { symbol: 'ES', direction: 'SHORT', pnl: -145, date: 'Yesterday', result: 'LOSS' },
      { symbol: 'NQ', direction: 'LONG', pnl: +510, date: 'Mon', result: 'WIN' },
      { symbol: 'CL', direction: 'SHORT', pnl: +200, date: 'Mon', result: 'WIN' },
      { symbol: 'ES', direction: 'LONG', pnl: -80, date: 'Sun', result: 'LOSS' },
        ]

  return (
          <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f4ff', fontFamily: 'Inter, sans-serif' }}>
                    <style dangerouslySetInnerHTML={{ __html: `
                            .dash-card {
                                      background: rgba(255,255,255,0.03);
                                                border: 1px solid rgba(0,242,255,0.08);
                                                          border-radius: 12px;
                                                                    padding: 20px;
                                                                              transition: border-color 0.2s, box-shadow 0.2s;
                                                                                      }
                                                                                              .dash-card:hover {
                                                                                                        border-color: rgba(0,242,255,0.18);
                                                                                                                  box-shadow: 0 0 20px rgba(0,242,255,0.06);
                                                                                                                          }
                                                                                                                                  .quick-link {
                                                                                                                                            background: rgba(255,255,255,0.03);
                                                                                                                                                      border: 1px solid rgba(255,255,255,0.07);
                                                                                                                                                                border-radius: 10px;
                                                                                                                                                                          padding: 14px 16px;
                                                                                                                                                                                    text-decoration: none;
                                                                                                                                                                                              transition: all 0.2s;
                                                                                                                                                                                                        display: flex;
                                                                                                                                                                                                                  flex-direction: column;
                                                                                                                                                                                                                            gap: 4px;
                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                            .quick-link:hover {
                                                                                                                                                                                                                                                      background: rgba(255,255,255,0.06);
                                                                                                                                                                                                                                                                border-color: rgba(0,242,255,0.2);
                                                                                                                                                                                                                                                                          transform: translateY(-1px);
                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                          .trade-row {
                                                                                                                                                                                                                                                                                                    display: flex;
                                                                                                                                                                                                                                                                                                              align-items: center;
                                                                                                                                                                                                                                                                                                                        gap: 12px;
                                                                                                                                                                                                                                                                                                                                  padding: 10px 14px;
                                                                                                                                                                                                                                                                                                                                            border-radius: 8px;
                                                                                                                                                                                                                                                                                                                                                      transition: background 0.15s;
                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                      .trade-row:hover {
                                                                                                                                                                                                                                                                                                                                                                                background: rgba(255,255,255,0.03);
                                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                                                .stat-pill {
                                                                                                                                                                                                                                                                                                                                                                                                          display: flex;
                                                                                                                                                                                                                                                                                                                                                                                                                    flex-direction: column;
                                                                                                                                                                                                                                                                                                                                                                                                                              align-items: center;
                                                                                                                                                                                                                                                                                                                                                                                                                                        justify-content: center;
                                                                                                                                                                                                                                                                                                                                                                                                                                                  padding: 20px 16px;
                                                                                                                                                                                                                                                                                                                                                                                                                                                            border-radius: 12px;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      text-align: center;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ` }} />

                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 32px' }}>

                        {/* Header */}
                                <div style={{ marginBottom: '32px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                              <svg width="16" height="16" viewBox="0 0 56 56" fill="none">
                                                                            <path d="M31 14L21 30h9l-5 12 14-18h-9l4-10z" fill="#00f2ff" />
                                                              </svg>svg>
                                                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,242,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase' }}>TRABITS</span>span>
                                              </div>div>
                                          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f4ff', margin: 0, marginBottom: '4px' }}>
                                                      Good morning{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
                                          </h1>h1>
                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', margin: 0 }}>
                                              {dayName.toUpperCase()} &middot; {dateStr}
                                          </p>p>
                                </div>div>
                    
                        {/* Coach Shai Brief */}
                            <div className="dash-card" style={{ marginBottom: '24px', borderColor: 'rgba(0,242,255,0.15)', background: 'rgba(0,242,255,0.03)' }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                                  <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #00f2ff22, #0060ff22)',
                            border: '1px solid rgba(0,242,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Georgia, serif', fontWeight: 700, color: '#00f2ff', fontSize: '1rem',
          }}>S</div>div>
                                                  <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: '#00f2ff', letterSpacing: '1px' }}>COACH SHAI</span>span>
                                                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(0,242,255,0.4)', letterSpacing: '2px', background: 'rgba(0,242,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>DAILY BRIEF</span>span>
                                                                </div>div>
                                                                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
                                                                                Every session is a rep. Your edge is built in the preparation — not the trade itself. Review your plan, respect your stops, and let the market come to you. Small consistent wins compound into something extraordinary.
                                                                </p>p>
                                                                <Link href="/life/trading" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#00f2ff', letterSpacing: '1px', textDecoration: 'none', opacity: 0.7 }}>
                                                                                GO TO JOURNAL &rarr;
                                                                </Link>Link>
                                                  </div>div>
                                      </div>div>
                            </div>div>
                    
                        {/* Stats Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            
                                      <div className="dash-card stat-pill" style={{ borderColor: 'rgba(0,242,255,0.12)' }}>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Win Rate</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, color: '#00f2ff', textShadow: '0 0 16px rgba(0,242,255,0.4)' }}>68%</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', marginTop: '4px' }}>LAST 30 DAYS</div>div>
                                      </div>div>
                            
                                      <div className="dash-card stat-pill" style={{ borderColor: 'rgba(0,255,136,0.12)' }}>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Monthly P&L</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, color: '#00ff88', textShadow: '0 0 16px rgba(0,255,136,0.4)' }}>+$2.4k</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', marginTop: '4px' }}>NET PROFIT</div>div>
                                      </div>div>
                            
                                      <div className="dash-card stat-pill" style={{ borderColor: 'rgba(192,132,252,0.12)' }}>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Trades</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, color: '#c084fc', textShadow: '0 0 16px rgba(192,132,252,0.4)' }}>34</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', marginTop: '4px' }}>THIS MONTH</div>div>
                                      </div>div>
                            
                                      <div className="dash-card stat-pill" style={{ borderColor: 'rgba(255,180,0,0.12)' }}>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Habit Score</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, color: '#ffb400', textShadow: '0 0 16px rgba(255,180,0,0.4)' }}>82</div>div>
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', marginTop: '4px' }}>/ 100 TODAY</div>div>
                                      </div>div>
                            
                            </div>div>
                    
                        {/* Recent Trades + Quick Links */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            
                                {/* Recent Trades */}
                                      <div className="dash-card">
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Trades</span>span>
                                                                <Link href="/life/trading" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#00f2ff', letterSpacing: '1px', textDecoration: 'none', opacity: 0.6 }}>VIEW ALL &rarr;</Link>Link>
                                                  </div>div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                      {recentTrades.map((trade, i) => (
                              <div key={i} className="trade-row">
                                                <div style={{
                                                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                                      background: trade.result === 'WIN' ? '#00ff88' : '#ff4d6d',
                                                      boxShadow: trade.result === 'WIN' ? '0 0 6px #00ff88' : '0 0 6px #ff4d6d',
                              }} />
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#f0f4ff', width: '32px' }}>{trade.symbol}</span>span>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: trade.direction === 'LONG' ? '#00f2ff' : '#c084fc', letterSpacing: '1px', width: '40px' }}>{trade.direction}</span>span>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: trade.pnl >= 0 ? '#00ff88' : '#ff4d6d', marginLeft: 'auto' }}>
                                                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                                                </span>span>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', width: '52px', textAlign: 'right' }}>{trade.date}</span>span>
                              </div>div>
                            ))}
                                                  </div>div>
                                      </div>div>
                            
                                {/* Habit + Goal Summary */}
                                      <div className="dash-card">
                                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Today&apos;s Focus</div>div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                      {[
              { label: 'Morning routine', done: true, color: '#00ff88' },
              { label: 'Pre-market analysis', done: true, color: '#00ff88' },
              { label: 'Trade journal entry', done: false, color: '#ffb400' },
              { label: 'Exercise 30min', done: false, color: '#ffb400' },
              { label: 'Evening review', done: false, color: 'rgba(255,255,255,0.2)' },
                            ].map((item, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                  <div style={{
                                                                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                                                                        border: `1.5px solid ${item.done ? item.color : 'rgba(255,255,255,0.12)'}`,
                                                                        background: item.done ? `${item.color}22` : 'transparent',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                                      {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>svg>}
                                                                  </div>div>
                                                                  <span style={{ fontSize: '0.82rem', color: item.done ? '#f0f4ff' : 'rgba(255,255,255,0.35)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>span>
                                                </div>div>
                                              ))}
                                                  </div>div>
                                                  <Link href="/life/habits" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#ffb400', letterSpacing: '1px', textDecoration: 'none', opacity: 0.7 }}>
                                                                MANAGE HABITS &rarr;
                                                  </Link>Link>
                                      </div>div>
                            
                            </div>div>
                    
                        {/* Quick Links */}
                            <div>
                                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '14px' }}>// QUICK LINKS</div>div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                          {quickLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="quick-link">
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: link.color, letterSpacing: '1px' }}>{link.label}</span>span>
                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{link.desc}</span>span>
                            </Link>Link>
                          ))}
                                      </div>div>
                            </div>div>
                    
                    </div>div>
          </div>div>
        )
}</svg>
