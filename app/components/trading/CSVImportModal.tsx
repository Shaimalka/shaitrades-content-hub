'use client'
// CSVImportModal — Tradovate CSV import for TRABITS Trading Journal
import React, { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type ParsedTrade = {
  rowIndex: number
  account: string
  symbol: string
  direction: 'Long' | 'Short'
  contracts: number
  entryPrice: number
  netPnl: number
  commission: number
  date: string
  time: string
  entryTime: string
  exitTime: string
  selected: boolean
}

type ImportState = 'idle' | 'preview' | 'importing' | 'done'

interface Props {
  onClose: () => void
  onImportComplete: () => void
  isDark: boolean
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  const cells: string[] = []
  const flush = () => { cells.push(current.trim()); current = '' }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      flush()
    } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
      if (ch === '\r') i++
      flush()
      if (cells.some(c => c !== '')) rows.push([...cells])
      cells.length = 0
    } else {
      current += ch
    }
  }
  flush()
  if (cells.some(c => c !== '')) rows.push([...cells])
  return rows
}

function parseTradovateDateTime(raw: string): { date: string; time: string } {
  if (!raw) return { date: '', time: '' }
  const clean = raw.replace(/\s+[A-Z]{2,4}$/, '').trim()
  const parts = clean.split(/\s+/)
  const [mm, dd, yyyy] = (parts[0] || '').split('/')
  const date = mm && dd && yyyy ? `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` : ''
  const time = parts[1] ? parts[1].slice(0, 5) : ''
  return { date, time }
}

function mapAccountType(account: string): 'propfirm' | 'live' | 'paper' {
  const u = account.toUpperCase()
  if (u.includes('APEX') || u.includes('TOPSTEP') || u.includes('FTMO') || u.includes('MFF')) return 'propfirm'
  return 'live'
}

function parseTradovateCSV(rows: string[][]): ParsedTrade[] {
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim().toLowerCase())
  const col = (names: string[]) => { for (const n of names) { const i = headers.findIndex(h => h.includes(n)); if (i !== -1) return i } return -1 }
  const iAccount = col(['account'])
  const iContract = col(['contract'])
  const iBuySell = col(['buy/sell', 'side', 'buy sell'])
  const iQty = col(['qty', 'quantity'])
  const iPrice = col(['price'])
  const iCommission = col(['commission', 'fees'])
  const iPnL = col(['p&l', 'pnl', 'realized'])
  const iEntryTime = col(['entry time', 'entrytime', 'open time'])
  const iExitTime = col(['exit time', 'exittime', 'close time'])
  const trades: ParsedTrade[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 3) continue
    const get = (idx: number) => (idx >= 0 ? (row[idx] || '').trim() : '')
    const contract = get(iContract)
    const buySell = get(iBuySell)
    if (!contract && !buySell) continue
    const direction: 'Long' | 'Short' = buySell.toUpperCase().startsWith('B') ? 'Long' : 'Short'
    const { date, time } = parseTradovateDateTime(get(iEntryTime))
    if (!date) continue
    trades.push({
      rowIndex: i, account: get(iAccount), symbol: contract, direction,
      contracts: parseFloat(get(iQty).replace(/,/g, '')) || 1,
      entryPrice: parseFloat(get(iPrice).replace(/,/g, '')) || 0,
      netPnl: parseFloat(get(iPnL).replace(/[$,]/g, '')) || 0,
      commission: parseFloat(get(iCommission).replace(/[$,]/g, '')) || 0,
      date, time, entryTime: get(iEntryTime), exitTime: get(iExitTime), selected: true,
    })
  }
  return trades
}

export default function CSVImportModal({ onClose, onImportComplete, isDark }: Props) {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const surface = isDark ? '#111118' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const rowBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { setParseError('Please upload a .csv file'); return }
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSV(text)
        if (rows.length < 2) { setParseError('CSV appears empty or invalid'); return }
        const trades = parseTradovateCSV(rows)
        if (trades.length === 0) { setParseError('No valid trades found. Ensure the file uses Tradovate export format.'); return }
        setParsedTrades(trades)
        setImportState('preview')
      } catch { setParseError('Failed to parse CSV. Check file format.') }
    }
    reader.readAsText(file)
  }, [])
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const toggleRow = (rowIndex: number) => setParsedTrades(prev => prev.map(t => t.rowIndex === rowIndex ? { ...t, selected: !t.selected } : t))
  const toggleAll = () => { const all = parsedTrades.every(t => t.selected); setParsedTrades(prev => prev.map(t => ({ ...t, selected: !all }))) }
  const handleImport = async () => {
    const selected = parsedTrades.filter(t => t.selected)
    if (!selected.length) return
    setImportState('importing')
    setProgress({ current: 0, total: selected.length })
    let imported = 0, skipped = 0
    let existingTrades: Array<{ date: string; symbol?: string; pnl: number }> = []
    try { const r = await fetch('/api/life/trading'); if (r.ok) { const d = await r.json(); existingTrades = d.logs || [] } } catch { /* ok */ }
    for (let i = 0; i < selected.length; i++) {
      const trade = selected[i]
      const isDup = existingTrades.some(e => e.date === trade.date && (e.symbol || '').toLowerCase() === trade.symbol.toLowerCase() && Math.abs(e.pnl - trade.netPnl) < 0.01)
      if (isDup) { skipped++; setDuplicatesSkipped(skipped); setProgress({ current: i + 1, total: selected.length }); continue }
      const exitPrice = trade.direction === 'Long' ? trade.entryPrice + trade.netPnl / Math.max(trade.contracts, 1) : trade.entryPrice - trade.netPnl / Math.max(trade.contracts, 1)
      try {
        const res = await fetch('/api/life/trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import', entry: { date: trade.date, time: trade.time, direction: trade.direction, entryPrice: trade.entryPrice, exitPrice, contracts: trade.contracts, symbol: trade.symbol, accountType: mapAccountType(trade.account), accountName: trade.account || undefined, notes: `Imported from Tradovate CSV. Commission: $${trade.commission.toFixed(2)}`, emotion: 3, playbookId: null } }) })
        if (res.ok) { const d = await res.json(); existingTrades = d.logs || []; imported++; setImportedCount(imported) }
      } catch { /* continue */ }
      setProgress({ current: i + 1, total: selected.length })
    }
    setImportState('done')
    setImportedCount(imported)
    setDuplicatesSkipped(skipped)
  }
  const selectedCount = parsedTrades.filter(t => t.selected).length
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(92vw, 860px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: surface, border: `1px solid ${border}`, borderRadius: 12, zIndex: 1001, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0 }}>Import CSV</h2>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, margin: '2px 0 0', letterSpacing: '0.05em' }}>TRADOVATE FORMAT · APEX TRADER FUNDING COMPATIBLE</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {importState === 'idle' && (
            <div>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? '#00c4ff' : 'rgba(37,99,235,0.4)'}`, borderRadius: 10, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', background: dragOver ? 'rgba(0,196,255,0.04)' : 'rgba(37,99,235,0.04)', transition: 'all 0.15s' }}>
                <Upload size={36} style={{ color: dragOver ? '#00c4ff' : '#2563eb' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>Drop your Tradovate CSV here</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted, margin: '4px 0 0' }}>or click to browse · .csv files only</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileInput} style={{ display: 'none' }} />
              {parseError && (<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 8 }}><AlertCircle size={14} style={{ color: '#ff4d6a', flexShrink: 0 }} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#ff4d6a' }}>{parseError}</span></div>)}
              <div style={{ marginTop: 20 }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Expected columns</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['Account','Contract','Buy/Sell','Qty','Price','Commission','P&L','Entry Time','Exit Time'].map(col => (<span key={col} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}>{col}</span>))}</div>
              </div>
            </div>
          )}
          {importState === 'preview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} style={{ color: '#2563eb' }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: textPrimary, fontWeight: 600 }}>{parsedTrades.length} trade{parsedTrades.length !== 1 ? 's' : ''} found</span>
                  {parsedTrades.length !== selectedCount && (<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted }}>· {selectedCount} selected</span>)}
                </div>
                <button onClick={() => { setParsedTrades([]); setImportState('idle'); setParseError(null) }} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>← Upload different file</button>
              </div>
              <div style={{ border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}`, background: rowBg }}>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: 36 }}><input type="checkbox" checked={parsedTrades.every(t => t.selected)} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563eb' }} /></th>
                        {['Date','Symbol','Dir','Qty','Entry $','P&L','Commission','Account'].map(h => (<th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTrades.map(trade => (
                        <tr key={trade.rowIndex} onClick={() => toggleRow(trade.rowIndex)} style={{ borderBottom: `1px solid ${border}`, background: trade.selected ? 'transparent' : 'rgba(255,77,106,0.03)', opacity: trade.selected ? 1 : 0.4, cursor: 'pointer', transition: 'opacity 0.1s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = rowHover} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = trade.selected ? 'transparent' : 'rgba(255,77,106,0.03)'}>
                          <td style={{ padding: '7px 12px', textAlign: 'center' }}><input type="checkbox" checked={trade.selected} onChange={() => toggleRow(trade.rowIndex)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#2563eb' }} /></td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary, whiteSpace: 'nowrap' }}>{trade.date}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: textPrimary }}>{trade.symbol}</td>
                          <td style={{ padding: '7px 10px' }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 6px', borderRadius: 3, color: trade.direction === 'Long' ? '#2563eb' : '#ff4d6a', background: trade.direction === 'Long' ? 'rgba(37,99,235,0.1)' : 'rgba(255,77,106,0.1)' }}>{trade.direction === 'Long' ? 'L' : 'S'}</span></td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.contracts}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', color: textSecondary }}>{trade.entryPrice.toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: trade.netPnl >= 0 ? '#00c48c' : '#ff4d6a' }}>{trade.netPnl >= 0 ? '+' : ''}${trade.netPnl.toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', color: textMuted }}>${trade.commission.toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trade.account || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {importState === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 0' }}>
              <Loader2 size={32} style={{ color: '#00c4ff', animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: textPrimary, margin: 0 }}>Importing trades...</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: textMuted, margin: '6px 0 0' }}>{progress.current} / {progress.total}</p>
              </div>
              <div style={{ width: '100%', maxWidth: 360, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%', background: 'linear-gradient(90deg, #00c4ff, #2563eb)', borderRadius: 2, transition: 'width 0.3s ease' }} />
              </div>
              {duplicatesSkipped > 0 && (<p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textMuted }}>{duplicatesSkipped} duplicate{duplicatesSkipped !== 1 ? 's' : ''} skipped</p>)}
            </div>
          )}
          {importState === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <CheckCircle size={40} style={{ color: '#00c48c' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0 }}>✅ {importedCount} trade{importedCount !== 1 ? 's' : ''} imported successfully</p>
                {duplicatesSkipped > 0 && (<p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: textMuted, margin: '6px 0 0' }}>{duplicatesSkipped} duplicate{duplicatesSkipped !== 1 ? 's' : ''} skipped</p>)}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: surface }}>
          {importState === 'done' ? (
            <button onClick={() => { onImportComplete(); onClose() }} style={{ padding: '10px 24px', borderRadius: 8, background: '#2563eb', border: 'none', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close &amp; Refresh</button>
          ) : importState === 'preview' ? (
            <>
              <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: textMuted, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleImport} disabled={selectedCount === 0} style={{ padding: '10px 24px', borderRadius: 8, background: selectedCount > 0 ? '#2563eb' : 'rgba(37,99,235,0.3)', border: 'none', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: selectedCount > 0 ? 'pointer' : 'not-allowed' }}>Import {selectedCount} Trade{selectedCount !== 1 ? 's' : ''}</button>
            </>
          ) : importState === 'idle' ? (
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: textMuted, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          ) : null}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}} />
    </>
  )
}
