'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, RefreshCw, Loader2, Zap, Upload, FileText, X, Download, Plus, Trash2, Building2, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/app/contexts/ThemeContext'

type CSVRow = Record<string, string>

type TradingAccount = {
  id: string
  name: string
  type: 'live' | 'propfirm' | 'paper'
  broker: string
  accountNumber: string
  startingBalance: number
  createdAt: string
  isActive?: boolean
}


const PROP_FIRM_BROKERS = [
  'APEX Funding',
  'Topstep',
  'FTMO',
  'MyForexFunds',
  'The Funded Trader',
  'E8 Funding',
  'True Forex Funds',
  'Other',
]

const ACCOUNT_TYPE_LABELS: Record<TradingAccount['type'], string> = {
  live: 'Live',
  propfirm: 'Prop Firm',
  paper: 'Paper',
}

const ACCOUNT_TYPE_COLORS: Record<TradingAccount['type'], { bg: string; text: string; border: string }> = {
  live:     { bg: 'rgba(0,196,140,0.1)',  text: '#00c48c', border: 'rgba(0,196,140,0.3)' },
  propfirm: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  paper:    { bg: 'rgba(37,99,235,0.1)',  text: '#2563eb', border: 'rgba(37,99,235,0.3)' },
}

function TypeBadge({ type, isDark }: { type: TradingAccount['type']; isDark: boolean }) {
  void isDark
  const c = ACCOUNT_TYPE_COLORS[type]
  return (
    <span style={{
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {ACCOUNT_TYPE_LABELS[type]}
    </span>
  )
}

function SectionHeader({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <h2 style={{
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: 600,
      color: isDark ? '#ffffff' : '#0a0a0f',
      margin: '0 0 16px 0',
    }}>
      {children}
    </h2>
  )
}

export default function TradingSettingsPage() {
  const { isDark } = useTheme()

  // ─── Theme-aware style helpers ────────────────────────────────────────────
  const bg      = isDark ? '#0a0a0f' : '#f8f9fc'
  const surface = isDark ? '#111118' : '#ffffff'
  const border  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textMuted   = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const textSubtle  = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'

  const cardStyle: React.CSSProperties = {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  }

  const inputStyle: React.CSSProperties = {
    background: isDark ? '#1a1a24' : '#f1f4f9',
    border: `1px solid ${border}`,
    borderRadius: 8,
    color: textPrimary,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 600,
    color: textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: 6,
  }

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(37,99,235,0.5)'
    e.target.style.boxShadow   = '0 0 0 2px rgba(37,99,235,0.3)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = border
    e.target.style.boxShadow   = 'none'
  }

  // ─── Tradovate live connect state ─────────────────────────────────────────
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [status, setStatus]         = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [tvError, setTvError]       = useState('')
  const [syncResult, setSyncResult] = useState<{ imported: number; total: number } | null>(null)

  // ─── Account management state ─────────────────────────────────────────────
  const [accounts, setAccounts]         = useState<TradingAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [addError, setAddError]         = useState('')
  const [addLoading, setAddLoading]     = useState(false)
  const [newAccount, setNewAccount]     = useState({
    name: '',
    type: 'propfirm' as TradingAccount['type'],
    broker: 'APEX Funding',
    accountNumber: '',
    startingBalance: '',
  })

  // ─── CSV Import state ──────────────────────────────────────────────────────
  const [csvFile, setCsvFile]         = useState<File | null>(null)
  const [csvRows, setCsvRows]         = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders]   = useState<string[]>([])
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Danger Zone state ────────────────────────────────────────────────────
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing]         = useState(false)
  const [clearDone, setClearDone]       = useState(false)

  useEffect(() => {
    fetch('/api/tradovate/status')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ connected: false, lastSync: null }))
    fetch('/api/life/trading/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || []); setAccountsLoading(false) })
      .catch(() => setAccountsLoading(false))
  }, [])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setConnecting(true)
    setTvError('')
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
      setTvError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setTvError('')
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult({ imported: data.imported, total: data.total })
      setStatus({ connected: true, lastSync: new Date().toISOString() })
    } catch (err: unknown) {
      setTvError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')
    try {
      const res = await fetch('/api/life/trading/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccount.name,
          type: newAccount.type,
          broker: newAccount.broker,
          accountNumber: newAccount.accountNumber,
          startingBalance: parseFloat(newAccount.startingBalance) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add account')
      setAccounts(data.accounts || [])
      setShowAddForm(false)
      setNewAccount({ name: '', type: 'propfirm', broker: 'APEX Funding', accountNumber: '', startingBalance: '' })
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add account')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleDeleteAccount(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id))
    try {
      const res = await fetch(`/api/life/trading/accounts?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.accounts) setAccounts(data.accounts)
    } catch {
      fetch('/api/life/trading/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || [])).catch(() => {})
    }
  }

  async function handleSetActive(id: string) {
    setAccounts(prev => prev.map(a => ({ ...a, isActive: a.id === id })))
    try {
      await fetch('/api/life/trading/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      fetch('/api/life/trading/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || [])).catch(() => {})
    }
  }

  // ─── CSV helpers ──────────────────────────────────────────────────────────
  function parseCSVPreview(text: string): { headers: string[]; rows: CSVRow[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const delimiter = lines[0].includes('	') ? '	' : ','
    const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, '').trim())
    const rows: CSVRow[] = []
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const vals = splitLine(lines[i], delimiter)
      const row: CSVRow = {}
      headers.forEach((h, idx) => { row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim() })
      rows.push(row)
    }
    return { headers, rows }
  }

  function splitLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === delimiter && !inQ) { result.push(cur); cur = '' }
      else { cur += ch }
    }
    result.push(cur)
    return result
  }

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { setImportError('Please select a .csv file'); return }
    setCsvFile(file)
    setImportResult(null)
    setImportError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSVPreview(text)
      setCsvHeaders(headers)
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clearCSV() {
    setCsvFile(null); setCsvRows([]); setCsvHeaders([])
    setImportResult(null); setImportError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    if (!csvFile) return
    setImporting(true); setImportError(''); setImportResult(null)
    try {
      const text = await csvFile.text()
      const res = await fetch('/api/tradovate/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportResult(data)
      clearCSV()
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function handleClearTrades() {
    setClearing(true)
    try {
      const res = await fetch('/api/life/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearAll' }),
      })
      if (res.ok) { setClearDone(true); setClearConfirm(false) }
    } catch {
      // ignore
    } finally {
      setClearing(false)
    }
  }

  const isConnected = status?.connected
  const brokerOptions = newAccount.type === 'live' ? ['Tradovate'] : newAccount.type === 'paper' ? ['Manual'] : PROP_FIRM_BROKERS

  return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/life/trading"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: textSubtle,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
            }}
          >
            ← Trading Journal
          </Link>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 600,
            color: textPrimary,
            margin: 0,
          }}>
            Trading Settings
          </h1>
        </div>

        {/* ── Account Management ────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={16} color="#2563eb" />
              <SectionHeader isDark={isDark}>Account Management</SectionHeader>
            </div>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setAddError('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#2563eb', border: 'none', borderRadius: 8,
                color: '#ffffff', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: 500, padding: '7px 14px', cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              Add Account
            </button>
          </div>

          {/* Add Account Form */}
          {showAddForm && (
            <form onSubmit={handleAddAccount} style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: 20,
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Account Name</label>
                <input
                  value={newAccount.name}
                  onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))}
                  style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}
                  placeholder="e.g. My APEX 50K"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Account Type</label>
                <select
                  value={newAccount.type}
                  onChange={e => {
                    const t = e.target.value as TradingAccount['type']
                    const defaultBroker = t === 'live' ? 'Tradovate' : t === 'paper' ? 'Manual' : 'APEX Funding'
                    setNewAccount(a => ({ ...a, type: t, broker: defaultBroker }))
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={inputFocus} onBlur={inputBlur}
                >
                  <option value="live">Live Account</option>
                  <option value="propfirm">Prop Firm</option>
                  <option value="paper">Paper Trading</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Broker</label>
                <select
                  value={newAccount.broker}
                  onChange={e => setNewAccount(a => ({ ...a, broker: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={inputFocus} onBlur={inputBlur}
                >
                  {brokerOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Account Number <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  value={newAccount.accountNumber}
                  onChange={e => setNewAccount(a => ({ ...a, accountNumber: e.target.value }))}
                  style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}
                  placeholder="e.g. APEX-447132"
                />
              </div>
              <div>
                <label style={labelStyle}>Starting Balance ($)</label>
                <input
                  type="number"
                  value={newAccount.startingBalance}
                  onChange={e => setNewAccount(a => ({ ...a, startingBalance: e.target.value }))}
                  style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}
                  placeholder="50000"
                  min="0"
                />
              </div>
              {addError && (
                <p style={{ gridColumn: '1 / -1', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>
                  {addError}
                </p>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    background: '#2563eb', border: 'none', borderRadius: 8,
                    color: '#ffffff', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, fontWeight: 500, padding: '9px 20px',
                    cursor: addLoading ? 'not-allowed' : 'pointer',
                    opacity: addLoading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {addLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {addLoading ? 'Saving...' : '+ Add Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddError('') }}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${border}`,
                    borderRadius: 8, color: textMuted,
                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                    padding: '9px 20px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Accounts list */}
          {accountsLoading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: textSubtle, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 10, border: `1px dashed ${border}` }}>
              <BookOpen size={28} style={{ color: textSubtle, margin: '0 auto 10px' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textMuted, margin: 0 }}>No accounts yet. Add your first account above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accounts.map(acc => (
                <div key={acc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 10,
                  background: acc.isActive ? (isDark ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.04)') : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${acc.isActive ? 'rgba(37,99,235,0.3)' : border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }} onClick={() => handleSetActive(acc.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: textPrimary }}>{acc.name}</span>
                      <TypeBadge type={acc.type} isDark={isDark} />
                      {acc.isActive && (
                        <span style={{
                          fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                          border: '1px solid rgba(37,99,235,0.3)',
                        }}>Active</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted }}>{acc.broker}</span>
                      {acc.accountNumber && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle }}>{acc.accountNumber}</span>}
                      {acc.startingBalance > 0 && (
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted }}>
                          ${acc.startingBalance.toLocaleString()} starting
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteAccount(acc.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: textSubtle, borderRadius: 6, flexShrink: 0 }}
                    title="Delete account"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {accounts.length > 0 && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle, marginTop: 10, marginBottom: 0 }}>
              Click an account to set it as active.
            </p>
          )}
        </div>

        {/* ── Live Account (Tradovate) ───────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Zap size={16} color="#f59e0b" />
            <SectionHeader isDark={isDark}>Live Account — Tradovate Connection</SectionHeader>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted, marginBottom: 16, marginTop: -8 }}>
            Connect your Tradovate account to auto-sync trades. Your password is never stored — only the access token.
          </p>

          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8, marginBottom: 20,
            background: isConnected ? 'rgba(0,196,140,0.06)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
            border: `1px solid ${isConnected ? 'rgba(0,196,140,0.25)' : border}`,
          }}>
            {isConnected
              ? <CheckCircle size={14} color="#00c48c" />
              : <XCircle size={14} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: isConnected ? '#00c48c' : textMuted }}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
            {status?.lastSync && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle, marginLeft: 'auto' }}>
                Last sync: {new Date(status.lastSync).toLocaleString()}
              </span>
            )}
          </div>

          {!isConnected && (
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Tradovate Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}
                  placeholder="e.g. APEX_447132 or you@example.com"
                  required autoComplete="username" autoCapitalize="off"
                />
              </div>
              <div>
                <label style={labelStyle}>Tradovate Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}
                  placeholder="••••••••••"
                  required autoComplete="current-password"
                />
              </div>
              {tvError && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>{tvError}</p>}
              <div>
                <button
                  type="submit"
                  disabled={connecting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#2563eb', border: 'none', borderRadius: 8,
                    color: '#ffffff', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, fontWeight: 500, padding: '9px 18px',
                    cursor: connecting ? 'not-allowed' : 'pointer',
                    opacity: connecting ? 0.6 : 1,
                  }}
                >
                  {connecting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  {connecting ? 'Connecting...' : 'Connect Account'}
                </button>
              </div>
            </form>
          )}

          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#2563eb', border: 'none', borderRadius: 8,
                  color: '#ffffff', fontFamily: 'Inter, sans-serif',
                  fontSize: 13, fontWeight: 500, padding: '9px 18px',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  opacity: syncing ? 0.6 : 1,
                }}
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={() => {
                  fetch('/api/tradovate/auth', { method: 'DELETE' })
                    .then(() => setStatus({ connected: false, lastSync: null }))
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                  color: '#ef4444', fontFamily: 'Inter, sans-serif',
                  fontSize: 13, padding: '9px 18px', cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
              {syncResult && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#00c48c' }}>
                  ✓ {syncResult.imported} new · {syncResult.total} total
                </span>
              )}
              {tvError && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ef4444' }}>{tvError}</span>}
            </div>
          )}
        </div>

        {/* ── Import Trade History ───────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Upload size={16} color="#2563eb" />
              <SectionHeader isDark={isDark}>Import Trade History</SectionHeader>
            </div>
            <a
              href="https://tradovatehelp.zendesk.com/hc/en-us/articles/360045012192"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#2563eb', textDecoration: 'none' }}
            >
              <Download size={12} /> How to export
            </a>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted, marginBottom: 20, marginTop: 0 }}>
            Export from Tradovate: <span style={{ color: textPrimary, fontWeight: 500 }}>Account → History → Export CSV</span>
          </p>

          {!csvFile && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#2563eb' : border}`,
                borderRadius: 10,
                background: dragOver ? 'rgba(37,99,235,0.05)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                padding: '32px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <FileText size={28} color={dragOver ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: dragOver ? '#2563eb' : textMuted, margin: 0, textAlign: 'center' }}>
                Drag & drop your CSV here
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle, margin: 0 }}>
                or <span style={{ color: '#2563eb', textDecoration: 'underline' }}>browse file</span>
              </p>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}

          {csvFile && csvRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${border}`,
              }}>
                <FileText size={14} color="#2563eb" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, flex: 1 }}>{csvFile.name}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle }}>({(csvFile.size / 1024).toFixed(1)} KB)</span>
                <button onClick={clearCSV} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSubtle, display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: textSubtle, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview — first 5 rows</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                  <thead>
                    <tr>
                      {csvHeaders.map(h => (
                        <th key={h} style={{ padding: '4px 8px', textAlign: 'left', color: '#2563eb', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent' }}>
                        {csvHeaders.map(h => (
                          <td key={h} style={{ padding: '4px 8px', color: textMuted, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importError && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>{importError}</p>}
              <div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#2563eb', border: 'none', borderRadius: 8,
                    color: '#ffffff', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, fontWeight: 500, padding: '9px 18px',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.6 : 1,
                  }}
                >
                  {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {importing ? 'Importing...' : 'Import Trades'}
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginTop: 8,
              background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.25)',
            }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#00c48c', margin: '0 0 4px' }}>✓ Import complete</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted, margin: 0 }}>
                {importResult.imported} new trades added · {importResult.skipped} skipped · {importResult.total} total
              </p>
            </div>
          )}

          {!csvFile && !importResult && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textSubtle, marginTop: 12, marginBottom: 0 }}>
              Only .csv files are accepted. Open trades (zero PnL) are skipped automatically.
            </p>
          )}
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={16} color="#ef4444" />
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#ef4444', margin: 0 }}>Danger Zone</h2>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 10,
            background: isDark ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.03)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 2px' }}>Clear All Trades</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted, margin: 0 }}>
                Permanently delete all trade entries from your journal. This cannot be undone.
              </p>
            </div>
            {!clearConfirm ? (
              <button
                onClick={() => setClearConfirm(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, color: '#ef4444',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                  padding: '8px 16px', cursor: 'pointer', flexShrink: 0, marginLeft: 16,
                }}
              >
                <TrendingUp size={13} style={{ transform: 'rotate(180deg)' }} />
                Clear Trades
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#ef4444' }}>Are you sure?</span>
                <button
                  onClick={handleClearTrades}
                  disabled={clearing}
                  style={{
                    background: '#ef4444', border: 'none', borderRadius: 8,
                    color: '#ffffff', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, fontWeight: 500, padding: '7px 14px', cursor: 'pointer',
                    opacity: clearing ? 0.6 : 1,
                  }}
                >
                  {clearing ? 'Clearing...' : 'Yes, clear all'}
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  style={{
                    background: 'transparent', border: `1px solid ${border}`,
                    borderRadius: 8, color: textMuted,
                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                    padding: '7px 14px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {clearDone && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#00c48c', marginTop: 10, marginBottom: 0 }}>
              ✓ All trades cleared.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
