'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, RefreshCw, Loader2, Settings, Zap, Upload, FileText, X, Download } from 'lucide-react'
import Link from 'next/link'

// ─── Tradovate CSV column types ────────────────────────────────────────────────
type CSVRow = Record<string, string>

export default function TradovateSettingsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null)
  const [error, setError] = useState('')
  const [syncResult, setSyncResult] = useState<{ imported: number; total: number } | null>(null)

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ─── CSV parsing helper ────────────────────────────────────────────────────
  function parseCSVPreview(text: string): { headers: string[]; rows: CSVRow[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, '').trim())
    const rows: CSVRow[] = []
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const vals = splitLine(lines[i], delimiter)
      const row: CSVRow = {}
      headers.forEach((h, idx) => {
        row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim()
      })
      rows.push(row)
    }
    return { headers, rows }
  }

  function splitLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === delimiter && !inQ) { result.push(cur); cur = '' }
      else { cur += ch }
    }
    result.push(cur)
    return result
  }

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportError('Please select a .csv file')
      return
    }
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
    setCsvFile(null)
    setCsvRows([])
    setCsvHeaders([])
    setImportResult(null)
    setImportError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    if (!csvFile) return
    setImporting(true)
    setImportError('')
    setImportResult(null)
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
      const msg = err instanceof Error ? err.message : 'Import failed'
      setImportError(msg)
    } finally {
      setImporting(false)
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

        {/* ─── IMPORT TRADE HISTORY ──────────────────────────────────────────── */}
        <div className="cyber-panel p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Upload size={14} style={{ color: '#00f2ff' }} />
              <h2 className="text-sm font-semibold font-mono tracking-widest" style={{ color: 'var(--text-primary)' }}>
                IMPORT TRADE HISTORY
              </h2>
            </div>
            <a
              href="https://tradovatehelp.zendesk.com/hc/en-us/articles/360045012192"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: 'var(--neon-cyan)' }}
            >
              <Download size={11} />
              How to export CSV
            </a>
          </div>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Export your trade history from Tradovate: <span style={{ color: 'var(--text-primary)' }}>Account → History → Export CSV</span>
          </p>

          {/* Drop zone */}
          {!csvFile && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragOver ? '#00f2ff' : 'rgba(0,242,255,0.25)'}`,
                background: dragOver ? 'rgba(0,242,255,0.06)' : 'rgba(0,242,255,0.02)',
                padding: '32px 24px',
                minHeight: '120px',
              }}
            >
              <FileText size={28} style={{ color: dragOver ? '#00f2ff' : 'rgba(0,242,255,0.4)' }} />
              <div className="text-center">
                <p className="text-sm font-mono" style={{ color: dragOver ? '#00f2ff' : 'var(--text-muted)' }}>
                  Drag &amp; drop your CSV here
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  or{' '}
                  <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}>Browse File</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          )}

          {/* File selected + preview */}
          {csvFile && csvRows.length > 0 && (
            <div className="space-y-4">
              {/* File badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
                background: 'rgba(0,242,255,0.06)',
                border: '1px solid rgba(0,242,255,0.2)',
              }}>
                <FileText size={13} style={{ color: '#00f2ff' }} />
                <span className="text-xs font-mono" style={{ color: '#00f2ff' }}>{csvFile.name}</span>
                <span className="text-xs font-mono ml-1" style={{ color: 'var(--text-muted)' }}>
                  ({(csvFile.size / 1024).toFixed(1)} KB)
                </span>
                <button onClick={clearCSV} className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              </div>

              {/* Preview table */}
              <div>
                <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                  PREVIEW (first 5 rows)
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}>
                    <thead>
                      <tr>
                        {csvHeaders.map(h => (
                          <th key={h} style={{
                            padding: '4px 8px',
                            textAlign: 'left',
                            color: 'var(--neon-cyan)',
                            borderBottom: '1px solid rgba(0,242,255,0.2)',
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          {csvHeaders.map(h => (
                            <td key={h} style={{
                              padding: '4px 8px',
                              color: 'var(--text-muted)',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              whiteSpace: 'nowrap',
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importError && (
                <p className="text-xs font-mono" style={{ color: '#ff00e5' }}>⚠ {importError}</p>
              )}

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-cyber-primary flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {importing ? 'Importing...' : `Import Trades`}
              </button>
            </div>
          )}

          {/* Success result */}
          {importResult && (
            <div className="mt-4 px-3 py-3 rounded-lg text-xs font-mono space-y-1" style={{
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.25)',
              color: '#00ff88'
            }}>
              <p>✓ Import complete</p>
              <p style={{ color: 'var(--text-muted)' }}>
                {importResult.imported} new trades added · {importResult.skipped} skipped (duplicates / open) · {importResult.total} total in journal
              </p>
            </div>
          )}

          {!csvFile && !importResult && (
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Only .csv files are accepted. Open trades (zero PnL) are skipped automatically.
            </p>
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
