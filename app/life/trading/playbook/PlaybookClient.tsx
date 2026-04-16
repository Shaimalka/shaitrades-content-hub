'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Trash2, BookOpen, AlertTriangle, Plus, X } from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'

type Playbook = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt?: string
  rules: string[]
  category?: string
  tags?: string[]
  winRate?: number
  totalTrades?: number
  isActive?: boolean
  notes?: string
  symbol?: string
  timeframe?: string
  session?: string
}

type Trade = {
  id: string
  date: string
  pnl: number
  playbookId?: string | null
  [key: string]: unknown
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  }} />
)

function EmptyState({ icon: Icon, heading, subtext, textMuted }: { icon: React.ElementType; heading: string; subtext: string; textMuted: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, paddingBottom: 64 }}>
      <Icon size={48} style={{ color: textMuted, marginBottom: 16 }} />
      <p style={{ fontFamily: 'Inter, sans-serif', color: textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ fontFamily: 'Inter, sans-serif', color: textMuted, fontSize: 13, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>{subtext}</p>
    </div>
  )
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// PlaybookRules sub-component
function PlaybookRules({
  pb,
  isDark,
  onRulesChange,
}: {
  pb: Playbook
  isDark: boolean
  onRulesChange: (id: string, rules: string[]) => void
}) {
  const [rules, setRules] = useState<string[]>(pb.rules ?? [])
  const [newRule, setNewRule] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textMuted = '#94a3b8'
  const textSecondary = '#475569'
  const inputBg = isDark ? '#0f1117' : '#f8fafc'
  const ruleBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  async function saveRules(updatedRules: string[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/life/trading/playbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pb.id, rules: updatedRules }),
      })
      if (res.ok) { onRulesChange(pb.id, updatedRules) }
    } finally {
      setSaving(false)
    }
  }

  function commitNewRule() {
    const trimmed = newRule.trim()
    if (!trimmed) { setShowInput(false); setNewRule(''); return }
    const updated = [...rules, trimmed]
    setRules(updated)
    setNewRule('')
    setShowInput(false)
    saveRules(updated)
  }

  function deleteRule(idx: number) {
    const updated = rules.filter((_, i) => i !== idx)
    setRules(updated)
    saveRules(updated)
  }
  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          RULES {saving && <span style={{ color: '#60a5fa' }}>saving</span>}
        </p>
        <button
          onClick={() => setShowInput(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, color: textSecondary }}
          title='Add rule'
        >
          <Plus size={11} /> Add Rule
        </button>
      </div>
      {rules.length === 0 && !showInput && (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: textMuted, margin: '0 0 8px' }}>
          No rules yet â add rules to enforce this setup.
        </p>
      )}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rules.map((rule, idx) => (
          <li
            key={idx}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: ruleBg, borderRadius: 6, padding: '7px 10px', position: 'relative' }}
          >
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: textMuted, minWidth: 16, paddingTop: 1 }}>{idx + 1}.</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, flex: 1, lineHeight: 1.4 }}>{rule}</span>
            <button
              onClick={() => deleteRule(idx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: hoveredIdx === idx ? 0.8 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
              title='Delete rule'
            >
              <X size={12} style={{ color: '#ef4444' }} />
            </button>
          </li>
        ))}
      </ol>
      {showInput && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            type='text'
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitNewRule()
              if (e.key === 'Escape') { setShowInput(false); setNewRule('') }
            }}
            onBlur={commitNewRule}
            placeholder='e.g. Wait for 9:30 open'
            style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 10px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, outline: 'none', boxShadow: '0 0 0 2px rgba(96,165,250,0.3)' }}
          />
        </div>
      )}
    </div>
  )
}

// Tag Badge component
function TagBadge({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: '#60a5fa',
      background: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(96,165,250,0.1)',
      border: '1px solid rgba(96,165,250,0.25)',
      borderRadius: 4, padding: '2px 7px',
    }}>
      {label}
    </span>
  )
}
// Main Page
export default function PlaybookPage() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768

  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loadingPb, setLoadingPb] = useState(true)
  const [loadingTrades, setLoadingTrades] = useState(true)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSymbol, setNewSymbol] = useState('')
  const [newTimeframe, setNewTimeframe] = useState('')
  const [newSession, setNewSession] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, string>>({})

  const createFormRef = useRef<HTMLDivElement>(null)

  const bg = isDark ? '#0f1117' : '#f8fafc'
  const surface = isDark ? '#1a1f2e' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'
  const textSecondary = '#475569'
  const textMuted = '#94a3b8'
  const inputBg = isDark ? '#0f1117' : '#f8fafc'

  const cardStyle: React.CSSProperties = {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: inputBg,
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
  }

  function fetchPlaybooks() {
    fetch('/api/life/trading/playbook')
      .then(r => r.json())
      .then((d: { playbooks: Playbook[] }) => { setPlaybooks(d.playbooks || []); setLoadingPb(false) })
      .catch(() => setLoadingPb(false))
  }

  function fetchTrades() {
    fetch('/api/life/trading')
      .then(r => r.json())
      .then((d: { logs: Trade[] }) => { setTrades(d.logs || []); setLoadingTrades(false) })
      .catch(() => setLoadingTrades(false))
  }

  useEffect(() => { fetchPlaybooks(); fetchTrades() }, [])

  function handleRulesChange(id: string, rules: string[]) {
    setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, rules } : p))
  }

  const statsByPlaybook = useMemo(() => {
    const map: Record<string, { totalTrades: number; wins: number; totalPnl: number; bestPnl: number; worstPnl: number }> = {}
    for (const t of trades) {
      if (!t.playbookId) continue
      if (!map[t.playbookId]) map[t.playbookId] = { totalTrades: 0, wins: 0, totalPnl: 0, bestPnl: -Infinity, worstPnl: Infinity }
      const s = map[t.playbookId]
      s.totalTrades++
      if (t.pnl > 0) s.wins++
      s.totalPnl += t.pnl
      if (t.pnl > s.bestPnl) s.bestPnl = t.pnl
      if (t.pnl < s.worstPnl) s.worstPnl = t.pnl
    }
    return map
  }, [trades])

  async function handleAddPlaybook(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/life/trading/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          symbol: newSymbol || undefined,
          timeframe: newTimeframe || undefined,
          session: newSession || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json(); setError(d.error || 'Failed to save')
      } else {
        setNewName(''); setNewDesc(''); setNewSymbol(''); setNewTimeframe(''); setNewSession('')
        fetchPlaybooks()
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function analyzePlaybook(pb: Playbook) {
    const s = statsByPlaybook[pb.id]
    if (!s || s.totalTrades < 10) return
    setAnalyzing(pb.id)

    const taggedTrades = trades.filter(t => t.playbookId === pb.id)
    const wins = taggedTrades.filter(t => t.pnl > 0)
    const losses = taggedTrades.filter(t => t.pnl < 0)
    const winRate = ((wins.length / taggedTrades.length) * 100).toFixed(1)
    const avgWin = wins.length > 0 ? (wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(2) : '0'
    const avgLoss = losses.length > 0 ? (Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)).toFixed(2) : '0'
    const totalPnl = taggedTrades.reduce((s, t) => s + t.pnl, 0).toFixed(2)

    const tradeDetails = taggedTrades.map(t =>
      `Date: ${t.date}, Time: ${(t.time as string) || 'N/A'}, Direction: ${(t.direction as string) || 'N/A'}, P&L: ${t.pnl}, Session: ${(t.session as string) || 'N/A'}, Emotion: ${(t.emotion as string) || 'N/A'}, Notes: ${(t.notes as string) || 'none'}`
    ).join('\n')

    const prompt = `You are Coach Shai — an elite trading coach with deep knowledge of professional traders including Larry Williams (COT analysis, volatility stops, risk 10-15% on futures, seasonal patterns), Mark Douglas (Trading in the Zone — probabilities, no attachment, consistency through process), ICT/Michael Huddleston (kill zones, avoid first 15min NY open, institutional order flow), and Van Tharp (position sizing is everything, think in R-multiples).

A trader is using the "${pb.name}" playbook setup.

Symbol: ${pb.symbol || 'Not specified'}
Timeframe: ${pb.timeframe || 'Not specified'}
Session: ${pb.session || 'Not specified'}
Rules: ${pb.rules?.join(', ') || 'No rules defined'}

PERFORMANCE DATA:
Total Trades: ${taggedTrades.length}
Win Rate: ${winRate}%
Avg Win: ${avgWin}
Avg Loss: ${avgLoss}
Total P&L: ${totalPnl}

TRADE HISTORY:
${tradeDetails}

Analyze this trader's performance on this specific setup. Be direct, specific, and actionable. Reference specific elite trader principles where relevant (e.g. "Larry Williams recommends...", "As Mark Douglas teaches...", "ICT warns against...").

Structure your response as:

🟢 WHAT'S WORKING
[2-3 specific observations about what is going well]

🔴 WHAT'S HURTING YOU
[2-3 specific patterns that are costing money]

⚡ COACH SHAI'S VERDICT
[1-2 sentences of direct actionable advice referencing elite trader principles]

Keep the total response under 300 words. Be specific to their actual trade data, not generic.`

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] })
      })
      const data = await response.json()
      const text = data.response || data.message || 'Analysis unavailable'
      setAnalyses(prev => ({ ...prev, [pb.id]: text }))
    } catch {
      setAnalyses(prev => ({ ...prev, [pb.id]: 'Analysis failed. Please try again.' }))
    } finally {
      setAnalyzing(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete playbook "${name}"? This will not delete tagged trades.`)) return
    try {
      await fetch('/api/life/trading/playbook', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchPlaybooks()
    } catch {}
  }

  function scrollToCreateForm() {
    createFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div style={{ minHeight: '100vh', background: bg, padding: isMobile ? '16px' : '32px 24px' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }' }} />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: textPrimary, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Trading Playbook
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textSecondary, margin: 0 }}>
              Define your setups. Know what works.
            </p>
          </div>
          <button
            onClick={scrollToCreateForm}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2563eb', color: '#ffffff',
              border: 'none', borderRadius: 8,
              padding: '9px 16px',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <Plus size={14} /> New Playbook
          </button>
        </div>

        {/* Playbook Cards */}
        <section style={{ marginBottom: 48 }}>
          {loadingPb || loadingTrades ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
              <Skeleton height='180px' borderRadius='12px' />
              <Skeleton height='180px' borderRadius='12px' />
            </div>
          ) : playbooks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              heading='NO PLAYBOOKS YET'
              subtext='Create your first playbook to start tracking your setups.'
              textMuted={textMuted}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
              {playbooks.map(pb => {
                const s = statsByPlaybook[pb.id]
                const totalTrades = s?.totalTrades ?? 0
                const wins = s?.wins ?? 0
                const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
                const avgPnl = totalTrades > 0 ? (s?.totalPnl ?? 0) / totalTrades : 0
                const bestPnl = s?.bestPnl === -Infinity ? null : s?.bestPnl
                const worstPnl = s?.worstPnl === Infinity ? null : s?.worstPnl
                const hasEnoughData = totalTrades >= 10
                const winRateColor = winRate > 50 ? '#10b981' : winRate < 50 && totalTrades > 0 ? '#ef4444' : textMuted

                return (
                  <div
                    key={pb.id}
                    style={{
                      ...cardStyle,
                      borderLeft: '3px solid #60a5fa',
                      position: 'relative',
                    }}
                  >
                    <button
                      onClick={() => handleDelete(pb.id, pb.name)}
                      title='Delete playbook'
                      style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.3'}
                    >
                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                    </button>

                    <div style={{ marginBottom: 10, paddingRight: 28 }}>
                      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: textPrimary, margin: '0 0 8px' }}>
                        {pb.name}
                      </h2>
                      {(pb.symbol || pb.timeframe || pb.session) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {pb.symbol && <TagBadge label={pb.symbol} isDark={isDark} />}
                          {pb.timeframe && <TagBadge label={pb.timeframe} isDark={isDark} />}
                          {pb.session && <TagBadge label={pb.session} isDark={isDark} />}
                        </div>
                      )}
                      {pb.description && (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                          {pb.description}
                        </p>
                      )}
                    </div>
                    {totalTrades === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted, marginTop: 8 }}>
                        No trades tagged yet
                      </p>
                    ) : !hasEnoughData ? (
                      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                            Insufficient Data
                          </p>
                        </div>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#475569', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                          Tag {10 - totalTrades} more {10 - totalTrades === 1 ? 'trade' : 'trades'} to unlock analysis
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                          <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${textMuted}` }}>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>Total Trades</p>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>{totalTrades}</p>
                          </div>
                          <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${winRateColor}` }}>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>Win Rate</p>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: winRateColor, margin: 0 }}>{winRate.toFixed(1)}%</p>
                          </div>
                          <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${avgPnl >= 0 ? '#10b981' : '#ef4444'}` }}>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>Avg P&L</p>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: avgPnl >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>{avgPnl >= 0 ? '+' : ''}${avgPnl.toFixed(2)}</p>
                          </div>
                          <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${(s?.totalPnl ?? 0) >= 0 ? '#10b981' : '#ef4444'}` }}>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>Total P&L</p>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: (s?.totalPnl ?? 0) >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>{(s?.totalPnl ?? 0) >= 0 ? '+' : ''}${(s?.totalPnl ?? 0).toFixed(2)}</p>
                          </div>
                        </div>
                        {(bestPnl !== null || worstPnl !== null) && (
                          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                            {bestPnl !== null && (
                              <div style={{ flex: 1, padding: '8px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 3 }}>Best Trade</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>+${bestPnl.toFixed(2)}</p>
                              </div>
                            )}
                            {worstPnl !== null && (
                              <div style={{ flex: 1, padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 3 }}>Worst Trade</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#ef4444', margin: 0 }}>${worstPnl.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(239,68,68,0.2)', overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${winRate}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: '#10b981' }}>{wins}W</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: '#ef4444' }}>{totalTrades - wins}L</span>
                        </div>
                      </>
                    )}
                    {hasEnoughData && (
            <div style={{ marginTop: 16 }}>
              {!analyses[pb.id] ? (
                <button
                  onClick={() => analyzePlaybook(pb)}
                  disabled={analyzing === pb.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: analyzing === pb.id ? 'rgba(96,165,250,0.1)' : 'rgba(96,165,250,0.08)',
                    border: '1px solid rgba(96,165,250,0.3)',
                    borderRadius: 8, padding: '10px 16px', cursor: analyzing === pb.id ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                    color: '#60a5fa', width: '100%', justifyContent: 'center'
                  }}
                >
                  🧠 {analyzing === pb.id ? 'Coach Shai is analyzing...' : 'Analyze with Coach Shai'}
                </button>
              ) : (
                <div style={{
                  background: isDark ? '#0f1117' : '#f8fafc',
                  border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: 8, padding: '14px 16px', marginTop: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#60a5fa' }}>🧠 COACH SHAI ANALYSIS</span>
                    <button
                      onClick={() => setAnalyses(prev => { const n = {...prev}; delete n[pb.id]; return n })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}
                    >
                      Re-analyze
                    </button>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: isDark ? '#f9fafb' : '#0f172a', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {analyses[pb.id]}
                  </div>
                </div>
              )}
            </div>
          )}
          <PlaybookRules pb={pb} isDark={isDark} onRulesChange={handleRulesChange} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
        {/* Create Form */}
        <section ref={createFormRef}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              Create New Playbook
            </h2>
            <form onSubmit={handleAddPlaybook}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, display: 'block', marginBottom: 6 }}>Name</label>
                  <input
                    type='text'
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder='e.g. NQ Opening Drive'
                    required
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(96,165,250,0.3)'; (e.target as HTMLInputElement).style.borderColor = '#60a5fa' }}
                    onBlur={e => { (e.target as HTMLInputElement).style.boxShadow = 'none'; (e.target as HTMLInputElement).style.borderColor = border }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                  <input
                    type='text'
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder='Short description of this setup'
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(96,165,250,0.3)'; (e.target as HTMLInputElement).style.borderColor = '#60a5fa' }}
                    onBlur={e => { (e.target as HTMLInputElement).style.boxShadow = 'none'; (e.target as HTMLInputElement).style.borderColor = border }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, display: 'block', marginBottom: 6 }}>Symbol</label>
                  <input
                    type='text'
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder='e.g. NQ, ES, CL'
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(96,165,250,0.3)'; (e.target as HTMLInputElement).style.borderColor = '#60a5fa' }}
                    onBlur={e => { (e.target as HTMLInputElement).style.boxShadow = 'none'; (e.target as HTMLInputElement).style.borderColor = border }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, display: 'block', marginBottom: 6 }}>Timeframe</label>
                  <select
                    value={newTimeframe}
                    onChange={e => setNewTimeframe(e.target.value)}
                    style={selectStyle}
                    onFocus={e => { (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 2px rgba(96,165,250,0.3)'; (e.target as HTMLSelectElement).style.borderColor = '#60a5fa' }}
                    onBlur={e => { (e.target as HTMLSelectElement).style.boxShadow = 'none'; (e.target as HTMLSelectElement).style.borderColor = border }}
                  >
                    <option value=''>Select timeframe</option>
                    <option value='1m'>1m</option>
                    <option value='2m'>2m</option>
                    <option value='5m'>5m</option>
                    <option value='15m'>15m</option>
                    <option value='30m'>30m</option>
                    <option value='1h'>1h</option>
                    <option value='4h'>4h</option>
                    <option value='Daily'>Daily</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, display: 'block', marginBottom: 6 }}>Session</label>
                  <select
                    value={newSession}
                    onChange={e => setNewSession(e.target.value)}
                    style={selectStyle}
                    onFocus={e => { (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 2px rgba(96,165,250,0.3)'; (e.target as HTMLSelectElement).style.borderColor = '#60a5fa' }}
                    onBlur={e => { (e.target as HTMLSelectElement).style.boxShadow = 'none'; (e.target as HTMLSelectElement).style.borderColor = border }}
                  >
                    <option value=''>Select session</option>
                    <option value='London'>London</option>
                    <option value='NY Open'>NY Open</option>
                    <option value='NY Afternoon'>NY Afternoon</option>
                    <option value='Asia'>Asia</option>
                    <option value='All Day'>All Day</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type='submit'
                  disabled={saving || !newName.trim()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: saving || !newName.trim() ? (isDark ? '#374151' : '#d1d5db') : '#2563eb',
                    color: saving || !newName.trim() ? '#94a3b8' : '#ffffff',
                    border: 'none', borderRadius: 8,
                    padding: '9px 18px',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                    cursor: saving || !newName.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Plus size={14} /> {saving ? 'Saving...' : 'Add Playbook'}
                </button>
                {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}
              </div>
            </form>
          </div>
        </section>

      </div>
    </div>
  )
}
