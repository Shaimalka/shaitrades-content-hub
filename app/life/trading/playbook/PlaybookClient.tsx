'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Trash2, BookOpen, AlertTriangle } from 'lucide-react'

type Playbook = {
  id: string
  name: string
  description: string
  createdAt: string
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
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(0,242,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
)

function EmptyState({ icon: Icon, heading, subtext }: { icon: React.ElementType; heading: string; subtext: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: 'rgba(0,242,255,0.3)', marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#888888', fontSize: 13, letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

export default function PlaybookPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loadingPb, setLoadingPb] = useState(true)
  const [loadingTrades, setLoadingTrades] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function fetchPlaybooks() {
    fetch('/api/life/trading/playbook')
      .then(r => r.json())
      .then((d: { playbooks: Playbook[] }) => {
        setPlaybooks(d.playbooks || [])
        setLoadingPb(false)
      })
      .catch(() => setLoadingPb(false))
  }

  function fetchTrades() {
    fetch('/api/life/trading')
      .then(r => r.json())
      .then((d: { logs: Trade[] }) => {
        setTrades(d.logs || [])
        setLoadingTrades(false)
      })
      .catch(() => setLoadingTrades(false))
  }

  useEffect(() => {
    fetchPlaybooks()
    fetchTrades()
  }, [])

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
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/life/trading/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save')
      } else {
        setNewName('')
        setNewDesc('')
        fetchPlaybooks()
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
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

  return (
    <div className="cyber-bg-grid min-h-screen" style={{ background: '#060608' }}>
      <div className="max-w-[1100px] mx-auto p-6">

        {/* Header */}
        <div className="mb-10">
          <Link href="/life/trading" className="text-xs font-mono mb-2 block" style={{ color: '#00f2ff', fontFamily: 'JetBrains Mono' }}>
            ← Trading Journal
          </Link>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #fff)', letterSpacing: '0.05em', marginBottom: 4 }}>
            TRADING PLAYBOOK
          </h1>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted, #888)', letterSpacing: '0.05em' }}>
            Define your setups. Know what works.
          </p>
        </div>

        {/* Playbook Stats Grid */}
        <section className="mb-12">
          {loadingPb || loadingTrades ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }' }} />
              <Skeleton height="140px" />
              <Skeleton height="140px" />
            </div>
          ) : playbooks.length === 0 ? (
            <div><EmptyState icon={BookOpen} heading="NO PLAYBOOKS YET" subtext="Create your first playbook below to start tracking your setups." /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {playbooks.map(pb => {
                const s = statsByPlaybook[pb.id]
                const totalTrades = s?.totalTrades ?? 0
                const wins = s?.wins ?? 0
                const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
                const avgPnl = totalTrades > 0 ? (s?.totalPnl ?? 0) / totalTrades : 0
                const bestPnl = s?.bestPnl === -Infinity ? null : s?.bestPnl
                const worstPnl = s?.worstPnl === Infinity ? null : s?.worstPnl
                const hasEnoughData = totalTrades >= 10
                return (
                  <div
                    key={pb.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(0,242,255,0.2)',
                      borderRadius: 16,
                      padding: '22px 22px 18px 22px',
                      backdropFilter: 'blur(12px)',
                      position: 'relative',
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(pb.id, pb.name)}
                      className="absolute top-4 right-4 opacity-25 hover:opacity-70 transition-opacity"
                      title="Delete playbook"
                    >
                      <Trash2 size={13} style={{ color: '#ff00e5' }} />
                    </button>

                    {/* Playbook name */}
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 4, paddingRight: 24 }}>
                      {pb.name}
                    </h2>

                    {pb.description && (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted, #888)', marginBottom: 16, lineHeight: 1.5 }}>
                        {pb.description}
                      </p>
                    )}

                    {totalTrades === 0 ? (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted, #888)', marginTop: pb.description ? 0 : 12 }}>
                        No trades tagged yet
                      </p>
                    ) : !hasEnoughData ? (
                      <div style={{ marginTop: pb.description ? 0 : 12 }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
                          {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <AlertTriangle size={16} style={{ color: '#ff00e5', flexShrink: 0 }} />
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#ff00e5', letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase', margin: 0 }}>
                            Insufficient Data
                          </p>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, maxWidth: 260, lineHeight: 1.5, margin: 0 }}>
                          Tag at least 10 trades to this playbook to see reliable stats.
                        </p>
                      </div>
                    ) : (
                      <div style={{ marginTop: pb.description ? 0 : 12 }}>
                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>TOTAL TRADES</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: '#00f2ff' }}>{totalTrades}</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>WIN RATE</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: '#00f2ff' }}>{winRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>AVG P&L</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: avgPnl >= 0 ? '#00ff88' : '#ff00e5' }}>{avgPnl >= 0 ? '+' : ''}${avgPnl.toFixed(2)}</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>TOTAL P&L</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: (s?.totalPnl ?? 0) >= 0 ? '#00ff88' : '#ff00e5' }}>{(s?.totalPnl ?? 0) >= 0 ? '+' : ''}${(s?.totalPnl ?? 0).toFixed(2)}</p>
                          </div>
                        </div>
                        {/* Best/Worst */}
                        <div className="flex gap-3 mb-4">
                          {bestPnl !== null && (
                            <div className="flex-1 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
                              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>BEST TRADE</p>
                              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#00ff88' }}>+${bestPnl.toFixed(2)}</p>
                            </div>
                          )}
                          {worstPnl !== null && (
                            <div className="flex-1 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,0,229,0.08)', border: '1px solid rgba(255,0,229,0.2)' }}>
                              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>WORST TRADE</p>
                              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#ff00e5' }}>${worstPnl.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                        {/* Win/loss bar */}
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,0,229,0.3)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${winRate}%`, background: '#00ff88', borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#00ff88' }}>{wins}W</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#ff00e5' }}>{totalTrades - wins}L</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Create New Playbook */}
        <section>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 16, letterSpacing: '0.04em' }}>
            Create New Playbook
          </h2>
          <form
            onSubmit={handleAddPlaybook}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: 16,
              padding: '22px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>NAME</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. NQ Opening Drive"
                  required
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid rgba(0,242,255,0.25)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    color: 'var(--text-primary, #fff)',
                    outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#00f2ff' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,242,255,0.25)' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>DESCRIPTION (OPTIONAL)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Short description of this setup"
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid rgba(0,242,255,0.25)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    color: 'var(--text-primary, #fff)',
                    outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#00f2ff' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,242,255,0.25)' }}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving || !newName.trim()}
                  style={{
                    background: 'transparent',
                    border: '1px solid #00f2ff',
                    borderRadius: 8,
                    padding: '8px 20px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#00f2ff',
                    letterSpacing: '0.1em',
                    cursor: saving || !newName.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !newName.trim() ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!saving && newName.trim()) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = '#00f2ff'
                      el.style.color = '#060608'
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'transparent'
                    el.style.color = '#00f2ff'
                  }}
                >
                  {saving ? 'SAVING...' : '+ ADD PLAYBOOK'}
                </button>
              </div>
            </div>
            {error && (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#ff00e5', marginTop: 4 }}>{error}</p>
            )}
          </form>
        </section>

      </div>
    </div>
  )
}
