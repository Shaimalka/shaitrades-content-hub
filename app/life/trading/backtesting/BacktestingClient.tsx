'use client'
import React, { useState, useEffect } from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'
import StatCard from '@/app/components/ui/StatCard'
import { Plus, Trash2, FlaskConical, Brain, ChevronRight, ChevronLeft, X } from 'lucide-react'

interface BacktestTrade {
      id: string
      direction: 'Long' | 'Short'
      entryPrice: number
      exitPrice: number
      contracts: number
      netPnl: number
      riskReward: number
      result: 'Win' | 'Loss' | 'BE'
      followedRules: boolean
      notes: string
}

interface BacktestSession {
      id: string
      name: string
      playbookId: string | null
      instrument: string
      dateRange: { from: string; to: string }
      trades: BacktestTrade[]
      coachAnalysis?: string
      createdAt: string
}

interface Playbook {
      id: string
      name: string
}

const INSTRUMENTS = ['NQ1!', 'MNQ1!', 'ES1!', 'MES1!', 'CL1!', 'GC1!', 'RTY1!']
const TICK_VALUES: Record<string, number> = {
      'NQ1!': 5, 'MNQ1!': 0.5, 'ES1!': 12.5, 'MES1!': 1.25,
      'CL1!': 10, 'GC1!': 10, 'RTY1!': 5,
}

function calcPnl(entry: number, exit: number, contracts: number, direction: 'Long' | 'Short', instrument: string): number {
      const tickValue = TICK_VALUES[instrument] || 5
      const ticks = direction === 'Long' ? (exit - entry) / 0.25 : (entry - exit) / 0.25
      return Math.round(ticks * contracts * tickValue * 100) / 100
}

function calcRR(entry: number, exit: number, direction: 'Long' | 'Short'): number {
      if (!entry || !exit) return 0
      const pnl = direction === 'Long' ? exit - entry : entry - exit
      if (pnl <= 0) return 0
      return Math.round((Math.abs(pnl) / Math.abs(entry * 0.002)) * 100) / 100
}

function calcStats(trades: BacktestTrade[]) {
      if (!trades.length) return { totalTrades: 0, winRate: 0, avgRR: 0, profitFactor: 0, totalPnl: 0, ruleAdherence: 0 }
      const wins = trades.filter(t => t.result === 'Win').length
      const winRate = Math.round((wins / trades.length) * 100)
      const avgRR = trades.filter(t => t.riskReward > 0).length > 0
        ? Math.round((trades.reduce((s, t) => s + t.riskReward, 0) / trades.length) * 100) / 100
              : 0
      const grossProfit = trades.filter(t => t.netPnl > 0).reduce((s, t) => s + t.netPnl, 0)
      const grossLoss = Math.abs(trades.filter(t => t.netPnl < 0).reduce((s, t) => s + t.netPnl, 0))
      const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : wins > 0 ? 999 : 0
      const totalPnl = Math.round(trades.reduce((s, t) => s + t.netPnl, 0) * 100) / 100
      const ruleAdherence = Math.round((trades.filter(t => t.followedRules).length / trades.length) * 100)
      return { totalTrades: trades.length, winRate, avgRR, profitFactor, totalPnl, ruleAdherence }
}

function TradingViewChart({ symbol, isDark }: { symbol: string; isDark: boolean }) {
      const [timeframe, setTimeframe] = useState('15')
      const timeframes = [
          { label: '1m', value: '1' }, { label: '5m', value: '5' }, { label: '15m', value: '15' },
          { label: '1h', value: '60' }, { label: '1D', value: 'D' }
            ]
      const iframeSrc = `https://www.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&hidesidetoolbar=1&symboledit=1&saveimage=0&theme=${isDark ? 'dark' : 'light'}&style=1&timezone=America%2FNew_York&withdateranges=1&locale=en`
      const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
      const cardBg = isDark ? '#0a0f1a' : '#fff'
      return (
              <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}`, background: cardBg }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
                                    <span style={{ color: '#00f2ff', fontWeight: 600, fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{symbol}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {timeframes.map(tf => (
                              <button key={tf.value} onClick={() => setTimeframe(tf.value)} style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', background: timeframe === tf.value ? '#00f2ff' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: timeframe === tf.value ? '#0a0f1a' : isDark ? '#a0aec0' : '#4a5568', transition: 'all 0.15s' }}>
                                  {tf.label}
                              </button>
                            ))}
                                    </div>
                        </div>
                        <iframe
                                    key={`${symbol}-${timeframe}`}
                                    src={iframeSrc}
                                    style={{ width: '100%', height: '420px', border: 'none', display: 'block' }}
                                    allow="fullscreen"
                                    title="TradingView Chart"
                                  />
              </div>
            )
}

export default function BacktestingClient() {
      const { isDark } = useTheme()
      const [sessions, setSessions] = useState<BacktestSession[]>([])
      const [activeSession, setActiveSession] = useState<BacktestSession | null>(null)
      const [playbooks, setPlaybooks] = useState<Playbook[]>([])
      const [loading, setLoading] = useState(true)
      const [showNewSession, setShowNewSession] = useState(false)
      const [analyzing, setAnalyzing] = useState(false)
      const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
      const [newSessionData, setNewSessionData] = useState({ name: '', instrument: 'NQ1!', playbookId: '', dateFrom: '', dateTo: '' })
      const [tradeForm, setTradeForm] = useState({
              direction: 'Long' as 'Long' | 'Short',
              entryPrice: '', exitPrice: '', contracts: '1',
              followedRules: true, notes: '', result: 'Win' as 'Win' | 'Loss' | 'BE',
      })

  const bg = isDark ? '#080c14' : '#f0f4f8'
      const cardBg = isDark ? '#111118' : '#ffffff'
      const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
      const textPrimary = isDark ? '#e2e8f0' : '#1a202c'
      const textMuted = isDark ? '#718096' : '#718096'
      const cyan = '#00f2ff'

  const inputStyle: React.CSSProperties = {
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 12px',
          color: textPrimary, fontSize: '13px', fontFamily: 'JetBrains Mono, monospace',
          width: '100%', outline: 'none',
  }
      const labelStyle: React.CSSProperties = {
              fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase' as const,
              letterSpacing: '0.05em', marginBottom: '4px', display: 'block',
      }

  useEffect(() => { fetchSessions(); fetchPlaybooks() }, [])

  async function fetchSessions() {
          try {
                    const res = await fetch('/api/backtesting')
                    const data = await res.json()
                    if (data.sessions) { setSessions(data.sessions); if (data.sessions.length > 0) setActiveSession(data.sessions[0]) }
          } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function fetchPlaybooks() {
          try {
                    const res = await fetch('/api/life/trading/playbook')
                    const data = await res.json()
                    if (data.playbooks) setPlaybooks(data.playbooks)
          } catch (_e) { /* playbooks optional */ }
  }

  async function createSession() {
          if (!newSessionData.name.trim()) return
          const res = await fetch('/api/backtesting', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'createSession', name: newSessionData.name, instrument: newSessionData.instrument, playbookId: newSessionData.playbookId || null, dateRange: { from: newSessionData.dateFrom, to: newSessionData.dateTo } }),
          })
          const data = await res.json()
          if (data.session) {
                    setSessions(prev => [data.session, ...prev])
                    setActiveSession(data.session)
                    setShowNewSession(false)
                    setNewSessionData({ name: '', instrument: 'NQ1!', playbookId: '', dateFrom: '', dateTo: '' })
          }
  }

  async function deleteSession(sessionId: string) {
          await fetch('/api/backtesting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteSession', sessionId }) })
          const updated = sessions.filter(s => s.id !== sessionId)
          setSessions(updated)
          if (activeSession?.id === sessionId) setActiveSession(updated[0] || null)
  }

  async function addTrade() {
          if (!activeSession || !tradeForm.entryPrice || !tradeForm.exitPrice) return
          const entry = Number(tradeForm.entryPrice), exit = Number(tradeForm.exitPrice), contracts = Number(tradeForm.contracts) || 1
          const netPnl = calcPnl(entry, exit, contracts, tradeForm.direction, activeSession.instrument)
          const riskReward = calcRR(entry, exit, tradeForm.direction)
          const autoResult: 'Win' | 'Loss' | 'BE' = netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'BE'
          const res = await fetch('/api/backtesting', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addTrade', sessionId: activeSession.id, trade: { direction: tradeForm.direction, entryPrice: entry, exitPrice: exit, contracts, netPnl, riskReward, result: tradeForm.result || autoResult, followedRules: tradeForm.followedRules, notes: tradeForm.notes } }),
          })
          const data = await res.json()
          if (data.session) {
                    setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s))
                    setActiveSession(data.session)
                    setTradeForm({ direction: 'Long', entryPrice: '', exitPrice: '', contracts: '1', followedRules: true, notes: '', result: 'Win' })
          }
  }

  async function deleteTrade(tradeId: string) {
          if (!activeSession) return
          const res = await fetch('/api/backtesting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteTrade', sessionId: activeSession.id, tradeId }) })
          const data = await res.json()
          if (data.session) { setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s)); setActiveSession(data.session) }
  }

  async function getAnalysis() {
          if (!activeSession) return
          setAnalyzing(true)
          try {
                    const sessionStats = calcStats(activeSession.trades)
                    const res = await fetch('/api/backtesting/analyze', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sessionId: activeSession.id, sessionStats, trades: activeSession.trades }),
                    })
                    const data = await res.json()
                    if (data.analysis) {
                                const updated = { ...activeSession, coachAnalysis: data.analysis }
                                setActiveSession(updated)
                                setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                    }
          } catch (e) { console.error(e) } finally { setAnalyzing(false) }
  }

  const stats = activeSession ? calcStats(activeSession.trades) : null
      const previewPnl = (tradeForm.entryPrice && tradeForm.exitPrice && activeSession)
        ? calcPnl(Number(tradeForm.entryPrice), Number(tradeForm.exitPrice), Number(tradeForm.contracts) || 1, tradeForm.direction, activeSession.instrument) : null
      const previewRR = (tradeForm.entryPrice && tradeForm.exitPrice)
        ? calcRR(Number(tradeForm.entryPrice), Number(tradeForm.exitPrice), tradeForm.direction) : null

  return (
          <div style={{ minHeight: '100vh', background: bg, color: textPrimary, fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <div style={{ padding: '24px 24px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                              <FlaskConical size={18} color={cyan} />
                                              </div>
                                              <div>
                                                          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textPrimary, margin: 0 }}>Backtesting</h1>
                                                          <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>Replay setups. Measure your edge. Compare with live trading.</p>
                                              </div>
                                          <button onClick={() => setShowNewSession(true)} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '8px', border: 'none', background: cyan, color: '#0a0f1a', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      <Plus size={14} /> New Session
                                          </button>
                                </div>
                    </div>
          
              {showNewSession && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: cardBg, borderRadius: '16px', border: `1px solid ${border}`, padding: '28px', width: '480px', maxWidth: '90vw' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPrimary }}>New Backtest Session</h2>
                                                          <button onClick={() => setShowNewSession(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><X size={18} /></button>
                                            </div>
                                            <div style={{ display: 'grid', gap: '14px' }}>
                                                          <div><label style={labelStyle}>Session Name</label><input style={inputStyle} placeholder="e.g. NQ Opening Range April 2026" value={newSessionData.name} onChange={e => setNewSessionData(p => ({ ...p, name: e.target.value }))} /></div>
                                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                          <div><label style={labelStyle}>Instrument</label><select style={{ ...inputStyle, cursor: 'pointer' }} value={newSessionData.instrument} onChange={e => setNewSessionData(p => ({ ...p, instrument: e.target.value }))}>{INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
                                                                          <div><label style={labelStyle}>Playbook</label><select style={{ ...inputStyle, cursor: 'pointer' }} value={newSessionData.playbookId} onChange={e => setNewSessionData(p => ({ ...p, playbookId: e.target.value }))}><option value="">None</option>{playbooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}</select></div>
                                                          </div>
                                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                          <div><label style={labelStyle}>From Date</label><input type="date" style={inputStyle} value={newSessionData.dateFrom} onChange={e => setNewSessionData(p => ({ ...p, dateFrom: e.target.value }))} /></div>
                                                                          <div><label style={labelStyle}>To Date</label><input type="date" style={inputStyle} value={newSessionData.dateTo} onChange={e => setNewSessionData(p => ({ ...p, dateTo: e.target.value }))} /></div>
                                                          </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                                          <button onClick={() => setShowNewSession(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${border}`, background: 'transparent', color: textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancel</button>
                                                          <button onClick={createSession} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: cyan, color: '#0a0f1a', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Create Session</button>
                                            </div>
                                </div>
                      </div>
                )}
          
                <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: sidebarCollapsed ? '56px 1fr' : '260px 1fr', gap: '16px', transition: 'grid-template-columns 0.2s ease' }}>
                        <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden', height: 'fit-content', minHeight: '200px' }}>
                                  <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
                                      {!sidebarCollapsed && <span style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sessions</span>}
                                              <button onClick={() => setSidebarCollapsed(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, marginLeft: sidebarCollapsed ? 'auto' : undefined, display: 'flex', alignItems: 'center' }}>
                                                  {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                                              </button>
                                  </div>
                            {loading ? <div style={{ padding: '16px', textAlign: 'center', color: textMuted, fontSize: '12px' }}>Loading...</div>
                                  : sessions.length === 0 ? (!sidebarCollapsed && <div style={{ padding: '16px', textAlign: 'center', color: textMuted, fontSize: '12px' }}>No sessions yet.</div>)
                                  : sessions.map(s => (
                                    <div key={s.id} onClick={() => setActiveSession(s)} style={{ padding: sidebarCollapsed ? '12px 8px' : '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${border}`, background: activeSession?.id === s.id ? 'rgba(0,242,255,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                                        {sidebarCollapsed ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeSession?.id === s.id ? cyan : textMuted, margin: '0 auto' }} /> : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: activeSession?.id === s.id ? cyan : textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                                    <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{s.instrument} · {s.trades.length} trades</div>
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, opacity: 0.5, padding: '2px', flexShrink: 0 }}><Trash2 size={12} /></button>
                              </div>
                                                  )}
                                    </div>
                                  ))}
                        </div>
                
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {!activeSession ? (
                          <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${border}`, padding: '48px', textAlign: 'center' }}>
                                        <FlaskConical size={40} color={textMuted} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                        <p style={{ color: textMuted, fontSize: '14px' }}>Select a session or create a new one to start backtesting.</p>
                          </div>
                        ) : (
                          <>
                                        <TradingViewChart symbol={activeSession.instrument} isDark={isDark} />
                          
                              {stats && stats.totalTrades > 0 && (
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                                                                <StatCard label="Trades" value={stats.totalTrades} />
                                                                <StatCard label="Win Rate" value={`${stats.winRate}%`} trend={{ value: stats.winRate, positive: stats.winRate >= 50 }} />
                                                                <StatCard label="Avg R:R" value={stats.avgRR} trend={{ value: stats.avgRR, positive: stats.avgRR >= 1 }} />
                                                                <StatCard label="Prof. Factor" value={stats.profitFactor} trend={{ value: stats.profitFactor, positive: stats.profitFactor >= 1 }} />
                                                                <StatCard label="Net P&L" value={`$${stats.totalPnl.toLocaleString()}`} trend={{ value: stats.totalPnl, positive: stats.totalPnl >= 0 }} />
                                                                <StatCard label="Rule Adh." value={`${stats.ruleAdherence}%`} trend={{ value: stats.ruleAdherence, positive: stats.ruleAdherence >= 70 }} />
                                              </div>
                                        )}
                          
                                        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', alignItems: 'start' }}>
                                                        <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${border}`, padding: '16px' }}>
                                                                          <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Log Trade</div>
                                                                          <div style={{ marginBottom: '12px' }}>
                                                                                              <label style={labelStyle}>Direction</label>
                                                                                              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}` }}>
                                                                                                  {(['Long', 'Short'] as const).map(d => (
                                                      <button key={d} onClick={() => setTradeForm(p => ({ ...p, direction: d }))} style={{ flex: 1, padding: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: tradeForm.direction === d ? (d === 'Long' ? 'rgba(0,242,255,0.15)' : 'rgba(255,80,80,0.15)') : 'transparent', color: tradeForm.direction === d ? (d === 'Long' ? cyan : '#ff5050') : textMuted, transition: 'all 0.15s' }}>
                                                          {d === 'Long' ? '▲' : '▼'} {d}
                                                      </button>
                                                    ))}
                                                                                                  </div>
                                                                          </div>
                                                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                                                                              <div><label style={labelStyle}>Entry</label><input type="number" style={inputStyle} placeholder="0.00" value={tradeForm.entryPrice} onChange={e => setTradeForm(p => ({ ...p, entryPrice: e.target.value }))} /></div>
                                                                                              <div><label style={labelStyle}>Exit</label><input type="number" style={inputStyle} placeholder="0.00" value={tradeForm.exitPrice} onChange={e => setTradeForm(p => ({ ...p, exitPrice: e.target.value }))} /></div>
                                                                          </div>
                                                                          <div style={{ marginBottom: '10px' }}><label style={labelStyle}>Contracts</label><input type="number" style={inputStyle} min="1" value={tradeForm.contracts} onChange={e => setTradeForm(p => ({ ...p, contracts: e.target.value }))} /></div>
                                                            {previewPnl !== null && (
                                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', padding: '8px 10px', borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                                                                        <div><div style={{ ...labelStyle, marginBottom: '2px' }}>Net P&L</div><div style={{ fontSize: '14px', fontWeight: 700, color: previewPnl >= 0 ? '#48bb78' : '#fc8181', fontFamily: 'JetBrains Mono, monospace' }}>${previewPnl.toLocaleString()}</div></div>
                                                                        <div><div style={{ ...labelStyle, marginBottom: '2px' }}>R:R</div><div style={{ fontSize: '14px', fontWeight: 700, color: (previewRR || 0) >= 1 ? '#48bb78' : textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{previewRR ? previewRR.toFixed(2) : '—'}</div></div>
                                                  </div>
                                                                          )}
                                                                          <div style={{ marginBottom: '10px' }}>
                                                                                              <label style={labelStyle}>Result</label>
                                                                                              <div style={{ display: 'flex', gap: '6px' }}>
                                                                                                  {(['Win', 'Loss', 'BE'] as const).map(r => (
                                                      <button key={r} onClick={() => setTradeForm(p => ({ ...p, result: r }))} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${tradeForm.result === r ? (r === 'Win' ? '#48bb78' : r === 'Loss' ? '#fc8181' : '#f6c90e') : border}`, background: tradeForm.result === r ? (r === 'Win' ? 'rgba(72,187,120,0.12)' : r === 'Loss' ? 'rgba(252,129,129,0.12)' : 'rgba(246,201,14,0.12)') : 'transparent', color: tradeForm.result === r ? (r === 'Win' ? '#48bb78' : r === 'Loss' ? '#fc8181' : '#f6c90e') : textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                                                          {r}
                                                      </button>
                                                    ))}
                                                                                                  </div>
                                                                          </div>
                                                                          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setTradeForm(p => ({ ...p, followedRules: !p.followedRules }))}>
                                                                                              <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${tradeForm.followedRules ? cyan : border}`, background: tradeForm.followedRules ? cyan : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                                                                                  {tradeForm.followedRules && <span style={{ color: '#0a0f1a', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                                                                                                  </div>
                                                                                              <span style={{ fontSize: '12px', color: textPrimary }}>Followed Rules</span>
                                                                          </div>
                                                                          <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Notes</label><input style={inputStyle} placeholder="Optional notes..." value={tradeForm.notes} onChange={e => setTradeForm(p => ({ ...p, notes: e.target.value }))} /></div>
                                                                          <button onClick={addTrade} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: cyan, color: '#0a0f1a', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                                              <Plus size={14} /> Add Trade
                                                                          </button>
                                                        </div>
                                        
                                                        <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                                                                          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                              <span style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trade Log</span>
                                                                                              <span style={{ fontSize: '11px', color: textMuted }}>{activeSession.trades.length} trades</span>
                                                                          </div>
                                                            {activeSession.trades.length === 0 ? (
                                                  <div style={{ padding: '32px', textAlign: 'center', color: textMuted, fontSize: '13px' }}>No trades yet. Log your first trade.</div>
                                                ) : (
                                                  <div style={{ overflowX: 'auto' }}>
                                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                                                <thead><tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                                                                                                    {['#', 'Dir', 'Entry', 'Exit', 'P&L', 'R:R', 'Result', 'Rules', 'Notes', ''].map(h => (
                                                                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: textMuted, fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                                                                                ))}
                                                                                                    </tr></thead>
                                                                                                <tbody>
                                                                                                    {activeSession.trades.map((t, i) => {
                                                                                  const rc = t.result === 'Win' ? '#48bb78' : t.result === 'Loss' ? '#fc8181' : '#f6c90e'
                                                                                                                  return (
                                                                                                                                                    <tr key={t.id} style={{ background: t.result === 'Win' ? 'rgba(72,187,120,0.05)' : t.result === 'Loss' ? 'rgba(252,129,129,0.05)' : 'rgba(246,201,14,0.05)', borderBottom: `1px solid ${border}` }}>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', color: textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: t.direction === 'Long' ? cyan : '#ff5050', fontFamily: 'JetBrains Mono, monospace' }}>{t.direction === 'Long' ? '▲' : '▼'} {t.direction}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary }}>{t.entryPrice.toLocaleString()}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', color: textPrimary }}>{t.exitPrice.toLocaleString()}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: t.netPnl >= 0 ? '#48bb78' : '#fc8181' }}>${t.netPnl.toLocaleString()}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', color: textMuted }}>{t.riskReward > 0 ? t.riskReward.toFixed(2) : '—'}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: `${rc}20`, color: rc, fontWeight: 700, fontSize: '11px' }}>{t.result}</span></td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}><span style={{ color: t.followedRules ? '#48bb78' : '#fc8181', fontSize: '14px' }}>{t.followedRules ? '✓' : '✗'}</span></td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px', color: textMuted, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes || '—'}</td>
                                                                                                                                                                                    <td style={{ padding: '8px 10px' }}><button onClick={() => deleteTrade(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, opacity: 0.5, padding: '2px' }}><Trash2 size={12} /></button></td>
                                                                                                                                                        </tr>
                                                                                                                                                  )
                                                                                                        })}
                                                                                                    </tbody>
                                                                        </table>
                                                  </div>
                                                                          )}
                                                        </div>
                                        </div>
                          
                                        <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                                                        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                                    <Brain size={14} color={cyan} />
                                                                                                  </div>
                                                                                              <span style={{ fontSize: '13px', fontWeight: 700, color: textPrimary }}>Coach Shai Analysis</span>
                                                                          </div>
                                                            {activeSession.trades.length >= 5 && (
                                                  <button onClick={getAnalysis} disabled={analyzing} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: analyzing ? 'rgba(0,242,255,0.3)' : cyan, color: '#0a0f1a', fontWeight: 700, fontSize: '12px', cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Brain size={12} /> {analyzing ? 'Analyzing...' : 'Get Analysis'}
                                                  </button>
                                                                          )}
                                                        </div>
                                                        <div style={{ padding: '16px' }}>
                                                            {activeSession.trades.length < 5
                                                                                    ? <p style={{ color: textMuted, fontSize: '13px', margin: 0 }}>Log at least 5 trades to unlock Coach Shai analysis comparing your backtest vs live performance.</p>
                                                                            : activeSession.coachAnalysis
                                                                              ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px', color: textPrimary }}>{activeSession.coachAnalysis}</div>
                                                                              : <p style={{ color: textMuted, fontSize: '13px', margin: 0 }}>Click "Get Analysis" to receive personalized insights from Coach Shai comparing your backtest results to live trading performance.</p>
                                                            }
                                                        </div>
                                        </div>
                          </>>
                        )}
                        </div>
                </div>
          </div>
        )
}</></div>
