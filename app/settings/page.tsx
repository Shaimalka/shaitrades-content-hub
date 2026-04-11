'use client'
import React, { useState, useEffect } from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'
import { useSession, signOut } from 'next-auth/react'
import { Sun, Moon, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'

const MARKETS = ['Futures', 'Stocks', 'Forex', 'Crypto', 'Options']
const SESSIONS = ['London', 'New York', 'Asian', 'Overnight']
const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'EST (UTC-5)', value: 'America/New_York' },
  { label: 'CST (UTC-6)', value: 'America/Chicago' },
  { label: 'MST (UTC-7)', value: 'America/Denver' },
  { label: 'PST (UTC-8)', value: 'America/Los_Angeles' },
  { label: 'GMT (UTC+0)', value: 'Europe/London' },
  { label: 'CET (UTC+1)', value: 'Europe/Paris' },
  { label: 'ICT Thailand (UTC+7)', value: 'Asia/Bangkok' },
  { label: 'JST (UTC+9)', value: 'Asia/Tokyo' },
  { label: 'AEST (UTC+10)', value: 'Australia/Sydney' },
  ]

type TradingAccount = {
    id: string
    label: string
    type: 'propfirm' | 'live' | 'paper'
    firm: string
    size: number
}

type Settings = {
    fullName: string
    phone: string
    location: string
    bio: string
    markets: string[]
    tradingSession: string
    timezone: string
}

const DEFAULT_SETTINGS: Settings = {
    fullName: '',
    phone: '',
    location: '',
    bio: '',
    markets: [],
    tradingSession: 'New York',
    timezone: 'America/New_York',
}

const DEFAULT_ACCOUNT: { label: string; type: TradingAccount['type']; firm: string; size: string } = {
    label: '',
    type: 'propfirm',
    firm: '',
    size: '',
}

function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function SettingsPage() {
    const { isDark, toggle } = useTheme()
    const { data: session } = useSession()

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')
    const [pwMsg, setPwMsg] = useState(false)

  const [accounts, setAccounts] = useState<TradingAccount[]>([])
    const [newAccount, setNewAccount] = useState(DEFAULT_ACCOUNT)
    const [accountsLoading, setAccountsLoading] = useState(true)

  const bg = isDark ? '#0f1117' : '#f8f8f6'
    const card = isDark ? '#1a1f2e' : '#ffffff'
    const border = isDark ? 'rgba(255,255,255,0.08)' : '#e8e8e2'
    const text = isDark ? '#ffffff' : '#0f1117'
    const muted = '#aaaaaa'
    const inputBg = isDark ? '#1a1f2e' : '#ffffff'
    const blue = '#60a5fa'

  useEffect(() => {
        async function load() {
                try {
                          const res = await fetch('/api/settings')
                          const data = await res.json()
                          if (data.settings) {
                                      const s = data.settings
                                      setSettings({
                                                    fullName: s.fullName || '',
                                                    phone: s.phone || '',
                                                    location: s.location || '',
                                                    bio: s.bio || '',
                                                    markets: s.markets || [],
                                                    tradingSession: s.tradingSession || 'New York',
                                                    timezone: s.timezone || 'America/New_York',
                                      })
                          }
                } catch {}
                setLoading(false)
        }
        load()
  }, [])

  useEffect(() => {
        async function loadAccounts() {
                try {
                          const res = await fetch('/api/trading-accounts')
                          const data = await res.json()
                          if (Array.isArray(data.accounts)) setAccounts(data.accounts)
                } catch {}
                setAccountsLoading(false)
        }
        loadAccounts()
  }, [])

  async function save() {
        setSaving(true)
        try {
                await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(settings),
                })
                await fetch('/api/trading-accounts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ accounts }),
                })
                setToast('Saved!')
                setTimeout(() => setToast(''), 3000)
        } catch {
                setToast('Save failed')
                setTimeout(() => setToast(''), 3000)
        } finally {
                setSaving(false)
        }
  }

  function toggleMarket(m: string) {
        setSettings(prev => ({
                ...prev,
                markets: prev.markets.includes(m) ? prev.markets.filter(x => x !== m) : [...prev.markets, m],
        }))
  }

  function addAccount() {
        if (!newAccount.label.trim() || !newAccount.firm.trim() || !newAccount.size) return
        const acc: TradingAccount = {
                id: Date.now().toString(),
                label: newAccount.label.trim(),
                type: newAccount.type,
                firm: newAccount.firm.trim(),
                size: Number(newAccount.size),
        }
        setAccounts(prev => [...prev, acc])
        setNewAccount(DEFAULT_ACCOUNT)
  }

  function removeAccount(id: string) {
        setAccounts(prev => prev.filter(a => a.id !== id))
  }

  const totalCapital = accounts.reduce((s, a) => s + a.size, 0)
    const propCapital = accounts.filter(a => a.type === 'propfirm').reduce((s, a) => s + a.size, 0)
    const liveCapital = accounts.filter(a => a.type === 'live').reduce((s, a) => s + a.size, 0)
    const propCount = accounts.filter(a => a.type === 'propfirm').length
    const liveCount = accounts.filter(a => a.type === 'live').length

  const sectionLabel: React.CSSProperties = {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: muted,
        textTransform: 'uppercase',
        marginBottom: 12,
  }

  const inputStyle: React.CSSProperties = {
        width: '100%',
        background: inputBg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: '10px 12px',
        color: text,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        outline: 'none',
        boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
        fontSize: 11,
        color: muted,
        fontFamily: 'Inter, sans-serif',
        marginBottom: 6,
        display: 'block',
  }

  const typeBadgeStyle = (type: TradingAccount['type']): React.CSSProperties => ({
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: 99,
        background: type === 'propfirm' ? 'rgba(37,99,235,0.15)' : type === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
        color: type === 'propfirm' ? '#2563eb' : type === 'live' ? '#10b981' : '#f59e0b',
        textTransform: 'uppercase',
  })

  if (loading) return <div style={{ padding: 40, color: text, fontFamily: 'Inter, sans-serif' }}>Loading...</div>

      return (
        <div style={{ minHeight: '100vh', background: bg, padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
          {/* Back button */}
                <div style={{ marginBottom: 20 }}>
                          <Link href="/life" style={{
                    color: blue,
                    fontSize: 13,
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
        }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                    >
                                    ← Dashboard
                          </Link>
                </div>
        
          {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Settings size={20} color={blue} />
                                <h1 style={{ fontSize: 22, fontWeight: 700, color: text, margin: 0 }}>Settings</h1>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 6 }}>
                                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                        {session?.user?.email && (
                      <span style={{ fontSize: 12, color: muted }}>{session.user.email}</span>
                                )}
                      </div>
              </div>
        
              <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
              
                {/* Profile */}
                      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
                                <p style={sectionLabel}>PROFILE</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                          <label style={labelStyle}>Full Name</label>
                                                          <input style={inputStyle} value={settings.fullName} onChange={e => setSettings(p => ({ ...p, fullName: e.target.value }))} placeholder="Your name" />
                                            </div>
                                            <div>
                                                          <label style={labelStyle}>Phone</label>
                                                          <input style={inputStyle} value={settings.phone} onChange={e => setSettings(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" />
                                            </div>
                                            <div>
                                                          <label style={labelStyle}>Location</label>
                                                          <input style={inputStyle} value={settings.location} onChange={e => setSettings(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                          <label style={labelStyle}>Email</label>
                                                          <input
                                                            style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', background: isDark ? '#0f1117' : '#f1f5f9' }}
                                                            value={session?.user?.email || ''}
                                                            readOnly
                                                            disabled
                                                            placeholder="your@email.com"
                                                          />
                                                          <p style={{ fontSize: 11, color: muted, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>Managed by your login provider</p>
                                            </div>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                            <label style={labelStyle}>Bio</label>
                                            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={settings.bio} onChange={e => setSettings(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." />
                                </div>
                      </div>
              
                {/* Trading Preferences */}
                      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
                                <p style={sectionLabel}>TRADING PREFERENCES</p>
                                <div style={{ marginBottom: 16 }}>
                                            <label style={labelStyle}>Markets</label>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                              {MARKETS.map(m => (
                          <button key={m} onClick={() => toggleMarket(m)} style={{
                                              padding: '6px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                              background: settings.markets.includes(m) ? blue : 'transparent',
                                              color: settings.markets.includes(m) ? '#fff' : muted,
                                              border: `1px solid ${settings.markets.includes(m) ? blue : border}`,
                          }}>
                            {m}
                          </button>
                        ))}
                                            </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                          <label style={labelStyle}>Trading Session</label>
                                                          <select style={inputStyle} value={settings.tradingSession} onChange={e => setSettings(p => ({ ...p, tradingSession: e.target.value }))}>
                                                            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                          </select>
                                            </div>
                                            <div>
                                                          <label style={labelStyle}>Timezone</label>
                                                          <select style={inputStyle} value={settings.timezone} onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))}>
                                                            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                                                          </select>
                                            </div>
                                </div>
                      </div>
              
                {/* Trading Capital */}
                      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
                                <p style={sectionLabel}>TRADING CAPITAL</p>
                      
                        {/* Accounts list */}
                        {accountsLoading ? (
                      <p style={{ fontSize: 13, color: muted }}>Loading accounts...</p>
                    ) : accounts.length === 0 ? (
                      <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>No accounts added yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {accounts.map(acc => (
                                        <div key={acc.id} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            background: inputBg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px',
                                        }}>
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                                                              <span style={{ fontSize: 13, color: text, fontWeight: 500 }}>{acc.label}</span>
                                                                              <span style={typeBadgeStyle(acc.type)}>{acc.type === 'propfirm' ? 'Prop' : acc.type === 'live' ? 'Live' : 'Paper'}</span>
                                                                              <span style={{ fontSize: 12, color: muted }}>{acc.firm}</span>
                                                          </div>
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                              <span style={{ fontSize: 14, fontWeight: 600, color: text, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(acc.size)}</span>
                                                                              <button onClick={() => removeAccount(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, display: 'flex', alignItems: 'center' }}>
                                                                                                    <Trash2 size={14} />
                                                                              </button>
                                                          </div>
                                        </div>
                                      ))}
                      </div>
                                )}
                      
                        {/* Add account form */}
                                <div style={{ background: isDark ? '#0f1117' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: 16 }}>
                                            <p style={{ ...sectionLabel, marginBottom: 14 }}>ADD ACCOUNT</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                          <div>
                                                                          <label style={labelStyle}>Label</label>
                                                                          <input style={inputStyle} value={newAccount.label} onChange={e => setNewAccount(p => ({ ...p, label: e.target.value }))} placeholder="e.g. APEX 50K Account 1" />
                                                          </div>
                                                          <div>
                                                                          <label style={labelStyle}>Firm</label>
                                                                          <input style={inputStyle} value={newAccount.firm} onChange={e => setNewAccount(p => ({ ...p, firm: e.target.value }))} placeholder="e.g. APEX Funding, Topstep" />
                                                          </div>
                                                          <div>
                                                                          <label style={labelStyle}>Size ($)</label>
                                                                          <input style={inputStyle} type="number" value={newAccount.size} onChange={e => setNewAccount(p => ({ ...p, size: e.target.value }))} placeholder="e.g. 50000" min={0} />
                                                          </div>
                                                          <div>
                                                                          <label style={labelStyle}>Type</label>
                                                                          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                                                                            {(['propfirm', 'live', 'paper'] as const).map(t => (
                              <button key={t} onClick={() => setNewAccount(p => ({ ...p, type: t }))} style={{
                                                      padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                                      background: newAccount.type === t ? (t === 'propfirm' ? 'rgba(37,99,235,0.2)' : t === 'live' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)') : 'transparent',
                                                      color: newAccount.type === t ? (t === 'propfirm' ? '#2563eb' : t === 'live' ? '#10b981' : '#f59e0b') : muted,
                                                      border: `1px solid ${newAccount.type === t ? (t === 'propfirm' ? '#2563eb' : t === 'live' ? '#10b981' : '#f59e0b') : border}`,
                                                      fontWeight: newAccount.type === t ? 600 : 400,
                              }}>
                                {t === 'propfirm' ? 'Prop Firm' : t === 'live' ? 'Live' : 'Paper'}
                              </button>
                            ))}
                                                                          </div>
                                                          </div>
                                            </div>
                                            <button onClick={addAccount} style={{
                        marginTop: 12, padding: '8px 18px', background: blue, color: '#ffffff', border: 'none', borderRadius: '6px',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
                                                          + Add Account
                                            </button>
                                </div>
                      
                        {/* Capital totals */}
                        {accounts.length > 0 && (
                      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ padding: '16px 20px', background: isDark ? '#0a0a1a' : '#eff6ff', border: `1px solid ${isDark ? '#1e2d5a' : '#bfdbfe'}`, borderRadius: 10 }}>
                                                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: blue, margin: '0 0 6px' }}>TOTAL CAPITAL</p>
                                                    <p style={{ fontSize: 28, fontWeight: 700, color: blue, fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>{fmt(totalCapital)}</p>
                                                    <p style={{ fontSize: 11, color: isDark ? '#93bbfc' : '#3b82f6', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
                                                      {accounts.length} account{accounts.length !== 1 ? 's' : ''} — {propCount} prop firm, {liveCount} live
                                                    </p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                    <div style={{ padding: '12px 16px', background: isDark ? '#0a1a12' : '#f0fdf4', border: `1px solid ${isDark ? '#1a3a26' : '#bbf7d0'}`, borderRadius: 10 }}>
                                                                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#10b981', margin: '0 0 4px' }}>PROP FIRM CAPITAL</p>
                                                                      <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>{fmt(propCapital)}</p>
                                                    </div>
                                                    <div style={{ padding: '12px 16px', background: isDark ? '#1a1500' : '#fffbeb', border: `1px solid ${isDark ? '#3a2d00' : '#fde68a'}`, borderRadius: 10 }}>
                                                                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#f59e0b', margin: '0 0 4px' }}>LIVE CAPITAL</p>
                                                                      <p style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>{fmt(liveCapital)}</p>
                                                    </div>
                                    </div>
                      </div>
                                )}
                      </div>
              
                {/* Account */}
                      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
                                <p style={sectionLabel}>ACCOUNT</p>
                        {session?.user?.email && (
                      <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>Signed in as <span style={{ color: text }}>{session.user.email}</span></p>
                                )}
                                <div style={{ display: 'flex', gap: 10 }}>
                                            <button onClick={() => { setPwMsg(true); setTimeout(() => setPwMsg(false), 3000) }} style={{
                        padding: '8px 16px', background: 'transparent', border: `1px solid ${border}`, borderRadius: '6px',
                        fontSize: 13, color: '#555555', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
                                                          Change Password
                                            </button>
                                            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
                        padding: '8px 16px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px',
                        fontSize: 13, color: '#ef4444', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
                                                          Sign Out
                                            </button>
                                </div>
                        {pwMsg && <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>Password reset link sent to your email.</p>}
                      </div>
              
                {/* Save */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button onClick={save} disabled={saving} style={{
                      padding: '10px 28px', background: blue, color: '#ffffff', border: 'none', borderRadius: '6px',
                      fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      fontFamily: 'Inter, sans-serif',
        }}>
                                  {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                        {toast && <span style={{ fontSize: 13, color: toast === 'Saved!' ? '#10b981' : '#ef4444', fontFamily: 'Inter, sans-serif' }}>{toast}</span>}
                      </div>
              </div>
        </div>
      )
}
