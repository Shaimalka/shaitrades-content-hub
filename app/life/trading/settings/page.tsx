'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, RefreshCw, Loader2, Settings, Zap } from 'lucide-react'
import Link from 'next/link'

export default function TradovateSettingsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [error, setError] = useState('')
  const [syncResult, setSyncResult] = useState<{ imported: number; total: number } | null>(null)

  useEffect(() => {
    fetch('/api/tradovate/status')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ connected: false, lastSync: null }))
  }, [])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/tradovate/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setStatus({ connected: true, lastSync: null })
      setPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setError(msg)
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setError('')
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult({ imported: data.imported, total: data.total })
      setStatus({ connected: true, lastSync: new Date().toISOString() })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setError(msg)
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = status?.connected

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[700px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/life/trading" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>
            ← TRADING JOURNAL
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Settings size={14} style={{ color: 'var(--neon-cyan)' }} />
            <span className="section-label">TRADING JOURNAL SETTINGS</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>

        {/* Tradovate Connect Card */}
        <div className="cyber-panel p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} style={{ color: '#ffb400' }} />
            <h2 className="text-sm font-semibold font-mono tracking-widest" style={{ color: 'var(--text-primary)' }}>
              CONNECT TRADOVATE
            </h2>
          </div>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Connect your Tradovate account to auto-import trades into your journal.
            Your password is never stored — only the access token.
          </p>

          {/* Status bar */}
          <div className="flex items-center gap-3 mb-5 px-3 py-2.5 rounded-lg" style={{
            background: isConnected ? 'rgba(0,255,136,0.06)' : 'rgba(255,0,229,0.06)',
            border: `1px solid ${isConnected ? 'rgba(0,255,136,0.25)' : 'rgba(255,0,229,0.25)'}`
          }}>
            {isConnected
              ? <CheckCircle size={14} style={{ color: '#00ff88', flexShrink: 0 }} />
              : <XCircle size={14} style={{ color: '#ff00e5', flexShrink: 0 }} />
            }
            <span className="text-xs font-mono" style={{ color: isConnected ? '#00ff88' : '#ff00e5' }}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
            {status?.lastSync && (
              <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                Last sync: {new Date(status.lastSync).toLocaleString()}
              </span>
            )}
          </div>

          {/* Connect form */}
          {!isConnected && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-xs font-mono block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  TRADOVATE USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="cyber-input w-full"
                  placeholder="e.g. APEX_447132 or you@example.com"
                  required
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-xs font-mono block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  TRADOVATE PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="cyber-input w-full"
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-xs font-mono" style={{ color: '#ff00e5' }}>⚠ {error}</p>
              )}
              <button
                type="submit"
                disabled={connecting}
                className="btn-cyber-primary flex items-center gap-2 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {connecting ? 'Connecting...' : 'Connect Account'}
              </button>
            </form>
          )}

          {/* Connected state */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-cyber-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {syncing
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />
                  }
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => {
                    fetch('/api/tradovate/auth', { method: 'DELETE' })
                      .then(() => setStatus({ connected: false, lastSync: null }))
                  }}
                  className="btn-cyber-ghost text-xs"
                  style={{ color: '#ff00e5', borderColor: 'rgba(255,0,229,0.3)' }}
                >
                  Disconnect
                </button>
              </div>
              {syncResult && (
                <div className="px-3 py-2 rounded-lg text-xs font-mono" style={{
                  background: 'rgba(0,242,255,0.06)',
                  border: '1px solid rgba(0,242,255,0.2)',
                  color: '#00f2ff'
                }}>
                  ✓ Imported {syncResult.imported} new trades · {syncResult.total} total
                </div>
              )}
              {error && (
                <p className="text-xs font-mono" style={{ color: '#ff00e5' }}>⚠ {error}</p>
              )}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="cyber-panel p-4">
          <h3 className="text-xs font-mono font-semibold mb-2 tracking-widest" style={{ color: 'var(--text-muted)' }}>
            // HOW IT WORKS
          </h3>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <li>→ Your credentials are sent directly to Tradovate&apos;s live API</li>
            <li>→ Only the access token is stored in Redis (never your password)</li>
            <li>→ Tokens auto-renew after 85 minutes of activity</li>
            <li>→ All accounts under your login are synced automatically</li>
            <li>→ Imported trades are tagged with their account name (e.g. APEX-1234)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
