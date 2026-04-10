'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Trash2, BookOpen, AlertTriangle, Plus, X } from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'
import Button from '@/app/components/ui/Button'

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
}

type Trade = {
    id: string
    date: string
    pnl: number
    playbookId?: string | null
    [key: string]: unknown
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
    <div style={{ width, height, borderRadius, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
  )

function EmptyState({ icon: Icon, heading, subtext, textMuted }: { icon: React.ElementType; heading: string; subtext: string; textMuted: string }) {
    return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
                  <Icon size={48} style={{ color: textMuted, marginBottom: 16 }} />
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', color: textMuted, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
                  <p style={{ color: textMuted, fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
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

// ─── PlaybookRules sub-component ────────────────────────────────────────────
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

  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
    const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
    const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
    const inputBg = isDark ? '#1a1a24' : '#f0f1f5'
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
                if (res.ok) {
                          onRulesChange(pb.id, updatedRules)
                }
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
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                                      RULES {saving && <span style={{ color: '#2563eb' }}>· saving…</span>}
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
                            No rules yet — add rules to enforce this setup.
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
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, minWidth: 16, paddingTop: 1 }}>{idx + 1}.</span>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, flex: 1, lineHeight: 1.4 }}>{rule}</span>
                                <button
                                                onClick={() => deleteRule(idx)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: hoveredIdx === idx ? 0.8 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
                                                title='Delete rule'
                                              >
                                              <X size={12} style={{ color: '#ff4d6a' }} />
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
                                          onKeyDown={e => { if (e.key === 'Enter') commitNewRule(); if (e.key === 'Escape') { setShowInput(false); setNewRule('') } }}
                                          onBlur={commitNewRule}
                                          placeholder='e.g. Wait for 9:30 open'
                                          style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 10px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, outline: 'none', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }}
                                        />
                  </div>
              )}
        </div>
      )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PlaybookPage() {
    const { isDark } = useTheme()
        const isMobile = useWindowWidth() < 768
            const [playbooks, setPlaybooks] = useState<Playbook[]>([])
                const [trades, setTrades] = useState<Trade[]>([])
                    const [loadingPb, setLoadingPb] = useState(true)
                        const [loadingTrades, setLoadingTrades] = useState(true)
                            const [newName, setNewName] = useState('')
                                const [newDesc, setNewDesc] = useState('')
                                    const [saving, setSaving] = useState(false)
                                        const [error, setError] = useState('')
                                          
                                            const bg = isDark ? '#0a0a0f' : '#f8f9fc'
                                                const surface = isDark ? '#111118' : '#ffffff'
                                                    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
                                                        const textPrimary = isDark ? '#ffffff' : '#0a0a0f'
                                                            const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                                                                const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
                                                                    const inputBg = isDark ? '#1a1a24' : '#f8f9fc'
                                                                      
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
                                                  body: JSON.stringify({ name: newName, description: newDesc }),
                                        })
                                                if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save') }
                                        else { setNewName(''); setNewDesc(''); fetchPlaybooks() }
                                } catch { setError('Network error') }
              finally { setSaving(false) }
        }
  
    async function handleDelete(id: string, name: string) {
          if (!window.confirm(`Delete playbook "${name}"? This will not delete tagged trades.`)) return
                try {
                        await fetch('/api/life/trading/playbook', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
                                fetchPlaybooks()
                } catch {}
    }
  
    const inputStyle: React.CSSProperties = {
          width: '100%', background: inputBg, border: `1px solid ${border}`, borderRadius: 8,
          padding: '8px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, outline: 'none',
    }
      
        return (
              <div style={{ minHeight: '100vh', background: bg, padding: isMobile ? '16px' : '32px 24px' }}>
                    <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }' }} />
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    
                      {/* Header */}
                            <div style={{ marginBottom: 40 }}>
                                      <Link href='/life/trading' style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#2563eb', textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                                                  ← Trading Journal
                                      </Link>
                                      <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 24 : 28, fontWeight: 700, color: textPrimary, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                                                  Trading Playbook
                                      </h1>
                                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: textSecondary, margin: 0 }}>
                                                  Define your setups. Know what works.
                                      </p>
                            </div>
                    
                      {/* Playbook Cards */}
                            <section style={{ marginBottom: 48 }}>
                              {loadingPb || loadingTrades ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
                                          <Skeleton height='140px' /><Skeleton height='140px' />
                            </div>
                          ) : playbooks.length === 0 ? (
                            <EmptyState icon={BookOpen} heading='NO PLAYBOOKS YET' subtext='Create your first playbook below to start tracking your setups.' textMuted={textMuted} />
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
                                                                                                                                                                                              const winRateColor = winRate > 50 ? '#00c48c' : winRate < 50 && totalTrades > 0 ? '#ff4d6a' : textMuted
                                                                                                                                                                                                
                                                                                                                                                                                                                return (
                                                                                                                                                                                                                                    <div key={pb.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 24, position: 'relative' }}>
                                                                                                                                                                                                                                                        <button
                                                                                                                                                                                                                                                                                onClick={() => handleDelete(pb.id, pb.name)}
                                                                                                                                                                                                                                                                                title='Delete playbook'
                                                                                                                                                                                                                                                                                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}
                                                                                                                                                                                                                                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
                                                                                                                                                                                                                                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.3'}
                                                                                                                                                                                                                                                                              >
                                                                                                                                                                                                                                                                              <Trash2 size={14} style={{ color: '#ff4d6a' }} />
                                                                                                                                                                                                                                                                            </button>
                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                        <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: textPrimary, margin: '0 0 6px', paddingRight: 28 }}>
                                                                                                                                                                                                                                                                              {pb.name}
                                                                                                                                                                                                                                                                            </h2>
                                                                                                                                                                                                                                                        {pb.description && (
                                                                                                                                                                                                                                                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
                                                                                                                                                                                                                                                                                    {pb.description}
                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                        )}
                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                        {totalTrades === 0 ? (
                                                                                                                                                                                                                                                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textMuted, marginTop: pb.description ? 0 : 12 }}>
                                                                                                                                                                                                                                                                                    No trades tagged yet
                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                          ) : !hasEnoughData ? (
                                                                                                                                                                                                                                                            <div style={{ marginTop: pb.description ? 0 : 12 }}>
                                                                                                                                                                                                                                                                                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary, marginBottom: 12 }}>
                                                                                                                                                                                                                                                                                                              {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}
                                                                                                                                                                                                                                                                                                            </p>
                                                                                                                                                                                                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                                                                                                                                                                                                                                                                              <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                                                                                                                                                                                                                                                                              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                                                                                                                                                                                                                                                                                                                                          Insufficient Data
                                                                                                                                                                                                                                                                                                                                        </p>
                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                    <p style={{ fontFamily: 'Inter, sans-serif', color: textSecondary, fontSize: 12, maxWidth: 260, lineHeight: 1.5, margin: 0 }}>
                                                                                                                                                                                                                                                                                                              Tag at least 10 trades to this playbook to see reliable stats.
                                                                                                                                                                                                                                                                                                            </p>
                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                          ) : (
                                                                                                                                                                                                                                                            <div style={{ marginTop: pb.description ? 0 : 12 }}>
                                                                                                                                                                                                                                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                                                                                                                                                                                                                                                                              <div>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>TOTAL TRADES</p>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>{totalTrades}</p>
                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                              <div>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>WIN RATE</p>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: winRateColor, margin: 0 }}>{winRate.toFixed(1)}%</p>
                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                              <div>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>AVG P&L</p>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: avgPnl >= 0 ? '#00c48c' : '#ff4d6a', margin: 0 }}>{avgPnl >= 0 ? '+' : ''}${avgPnl.toFixed(2)}</p>
                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                              <div>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>TOTAL P&L</p>
                                                                                                                                                                                                                                                                                                                                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: (s?.totalPnl ?? 0) >= 0 ? '#00c48c' : '#ff4d6a', margin: 0 }}>{(s?.totalPnl ?? 0) >= 0 ? '+' : ''}${(s?.totalPnl ?? 0).toFixed(2)}</p>
                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                    {(bestPnl !== null || worstPnl !== null) && (
                                                                                                                                                                                                                                                                                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                                                                                                                                                                                                                                                                                                    {bestPnl !== null && (
                                                                                                                                                                                                                                                                                                                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}>
                                                                                                                                                                                                                                                                                                                                                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>BEST TRADE</p>
                                                                                                                                                                                                                                                                                                                                                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00c48c', margin: 0 }}>+${bestPnl.toFixed(2)}</p>
                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                    )}
                                                                                                                                                                                                                                                                                                                    {worstPnl !== null && (
                                                                                                                                                                                                                                                                                                                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)' }}>
                                                                                                                                                                                                                                                                                                                                                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>WORST TRADE</p>
                                                                                                                                                                                                                                                                                                                                                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#ff4d6a', margin: 0 }}>${worstPnl.toFixed(2)}</p>
                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                    )}
                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                    )}
                                                                                                                                                                                                                                                                                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,77,106,0.2)', overflow: 'hidden' }}>
                                                                                                                                                                                                                                                                                                              <div style={{ height: '100%', width: `${winRate}%`, background: '#00c48c', borderRadius: 3, transition: 'width 0.4s ease' }} />
                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                                                                                                                                                                                                                                                                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#00c48c' }}>{wins}W</span>
                                                                                                                                                                                                                                                                                                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#ff4d6a' }}>{totalTrades - wins}L</span>
                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                        )}
                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                        {/* ── Rules Section ── */}
                                                                                                                                                                                                                                                        <PlaybookRules pb={pb} isDark={isDark} onRulesChange={handleRulesChange} />
                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                  )
                              })}
                            </div>
                                      )}
                            </section>
                    
                      {/* Create New Playbook */}
                            <section>
                                      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600, color: textPrimary, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                                                  Create New Playbook
                                      </h2>
                                      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 24 }}>
                                                  <form onSubmit={handleAddPlaybook} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: 'flex-end' }}>
                                                                <div style={{ flex: 1 }}>
                                                                                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>NAME</label>
                                                                                <input type='text' value={newName} onChange={e => setNewName(e.target.value)} placeholder='e.g. NQ Opening Drive' required style={inputStyle}
                                                                                                    onFocus={e => { (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }}
                                                                                                    onBlur={e => { (e.target as HTMLInputElement).style.boxShadow = 'none' }} />
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</label>
                                                                                <input type='text' value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder='Short description of this setup' style={inputStyle}
                                                                                                    onFocus={e => { (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }}
                                                                                                    onBlur={e => { (e.target as HTMLInputElement).style.boxShadow = 'none' }} />
                                                                </div>
                                                                <div>
                                                                                <Button type='submit' disabled={saving || !newName.trim()}>
                                                                                  {saving ? 'Saving...' : '+ Add Playbook'}
                                                                                </Button>
                                                                </div>
                                                  </form>
                                        {error && (<p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#ff4d6a', marginTop: 8 }}>{error}</p>)}
                                      </div>
                            </section>
                    
                    </div>
              </div>
            )
}
