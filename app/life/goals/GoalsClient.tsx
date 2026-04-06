'use client'
import { useState, useEffect, Suspense } from 'react'
import { Target, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'

type Tier = 'yearly' | 'monthly' | 'weekly'
type Category = 'Trading' | 'Content' | 'Health' | 'Finance' | 'Personal'
type Goal = {
  id: string; title: string; category: Category; tier: Tier; targetValue: number; currentValue: number
  unit: string; startDate: string; deadline: string; notes: string
  checkins: { id: string; text: string; date: string }[]; createdAt: string
}

const CATEGORIES: Category[] = ['Trading', 'Content', 'Health', 'Finance', 'Personal']
const TIERS: { key: Tier; label: string }[] = [
  { key: 'yearly', label: 'YEARLY' }, { key: 'monthly', label: 'MONTHLY' }, { key: 'weekly', label: 'WEEKLY' },
]
const CAT_COLORS: Record<Category, string> = {
  Trading: '#2563eb', Content: '#a78bfa', Health: '#00c48c', Finance: '#f59e0b', Personal: '#06b6d4',
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => { const h = () => setWidth(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return width
}

function getStatus(pct: number, daysLeft: number | null): { label: string; color: string } {
  if (daysLeft !== null && daysLeft < 0) return { label: 'Overdue', color: '#ff4d6a' }
  if (pct >= 100) return { label: 'Completed', color: '#00c48c' }
  if (daysLeft === null) return { label: 'Active', color: '#2563eb' }
  const expectedPct = 50
  if (pct >= expectedPct + 15) return { label: 'Ahead', color: '#00c48c' }
  if (pct >= expectedPct - 15) return { label: 'On Track', color: '#2563eb' }
  return { label: 'At Risk', color: '#f59e0b' }
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'rgba(128,128,128,0.12)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
)

function EmptyState({ icon: Icon, heading, subtext, isDark = false }: { icon: React.ElementType; heading: string; subtext: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: 13, maxWidth: 280, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>{subtext}</p>
    </div>
  )
}

function GoalsInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const searchParams = useSearchParams()
  const inputStyle = {
    background: isDark ? (isDark ? '#1a1a24' : '#f1f4f9') : '#f1f4f9',
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
    color: isDark ? (isDark ? '#ffffff' : '#0a0a0f') : (isDark ? '#0a0a0f' : '#f8f9fc'),
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties
  const cardStyle = {
    background: isDark ? (isDark ? '#111118' : '#ffffff') : (isDark ? '#ffffff' : '#0a0a0f'),
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px',
    padding: '20px',
  } as React.CSSProperties
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTier, setActiveTier] = useState<Tier>('yearly')
  const [showForm, setShowForm] = useState(false)
  const [checkinGoalId, setCheckinGoalId] = useState<string | null>(null)
  const [checkinText, setCheckinText] = useState('')
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [form, setForm] = useState({
    title: '', category: 'Trading' as Category, tier: 'yearly' as Tier,
    targetValue: '', unit: '$', startDate: new Date().toISOString().split('T')[0], deadline: '', notes: '',
  })

  useEffect(() => {
    fetch('/api/life/goals').then(r => r.json()).then(d => { setGoals(d.goals || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    const entry = { title: form.title, category: form.category, tier: form.tier, targetValue: parseFloat(form.targetValue), currentValue: 0, unit: form.unit, startDate: form.startDate, deadline: form.deadline, notes: form.notes, checkins: [] }
    const res = await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry }) })
    const data = await res.json()
    setGoals(data.goals || []); setShowForm(false); setActiveTier(form.tier)
    setForm({ title: '', category: 'Trading', tier: 'yearly', targetValue: '', unit: '$', startDate: new Date().toISOString().split('T')[0], deadline: '', notes: '' })
  }

  async function updateCurrentValue(goal: Goal, value: number) {
    const res = await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', entry: { ...goal, currentValue: value } }) })
    const data = await res.json(); setGoals(data.goals || [])
  }

  async function deleteGoal(id: string) {
    const res = await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', entry: { id } }) })
    const data = await res.json(); setGoals(data.goals || [])
  }

  async function submitCheckin(goalId: string) {
    if (!checkinText.trim()) return
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newCheckin = { id: Date.now().toString(), text: checkinText.trim(), date: new Date().toISOString().split('T')[0] }
    const updated = { ...goal, checkins: [...(goal.checkins || []), newCheckin] }
    const res = await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', entry: updated }) })
    const data = await res.json(); setGoals(data.goals || []); setCheckinGoalId(null); setCheckinText('')
  }

  const filteredGoals = goals.filter(g => (g.tier || 'yearly') === activeTier)
  const focusStyle = { borderColor: 'rgba(37,99,235,0.5)', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }
  const blurStyle = { borderColor: isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)', boxShadow: 'none' }

  return (
    <div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Link href="/life" style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← LIFE HUB</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>Goals</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 2 }}>Track your goals across all horizons</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {/* Tier Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 12, background: (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: '1px solid rgba(255,255,255,0.06)' }}>
          {TIERS.map(({ key, label }) => {
            const count = goals.filter(g => (g.tier || 'yearly') === key).length
            const isActive = activeTier === key
            return (
              <button key={key} onClick={() => setActiveTier(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s', background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent', border: `1px solid ${isActive ? 'rgba(37,99,235,0.4)' : 'transparent'}`, color: isActive ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                {label}
                {count > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '1px 6px', borderRadius: 20, background: isActive ? 'rgba(37,99,235,0.2)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'), color: isActive ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Add Goal Form */}
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 16 }}>New Goal</h3>
            <form onSubmit={submitGoal} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>GOAL TITLE</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Hit 10k monthly profit" required />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TIER</label>
                <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value as Tier }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="yearly">Yearly</option><option value="monthly">Monthly</option><option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>UNIT</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="subscribers, trades..." />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TARGET VALUE</label>
                <input type="number" step="any" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="10000" required />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>START DATE</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>DEADLINE</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>NOTES / WHY THIS MATTERS</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Why this goal matters to you" />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', display: 'flex', gap: 10 }}>
                <button type="submit" style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '10px 20px', cursor: 'pointer' }}>Save Goal</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Goals Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <Skeleton height="80px" /><Skeleton height="80px" /><Skeleton height="80px" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <EmptyState icon={Target} heading="NO GOALS SET YET" isDark={isDark} subtext="Set your first goal below and start making it happen." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {filteredGoals.map(goal => {
              const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0
              const color = CAT_COLORS[goal.category] || '#2563eb'
              const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null
              const status = getStatus(pct, daysLeft)
              const isCheckingIn = checkinGoalId === goal.id
              const checkins = goal.checkins || []
              return (
                <div key={goal.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>{goal.category}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 20, background: status.color + '18', border: `1px solid ${status.color}40`, color: status.color }}>
                          {status.label === 'Completed' ? '✓ ' : status.label === 'At Risk' ? '⚠ ' : status.label === 'Overdue' ? '⏰ ' : ''}{status.label}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0, lineHeight: 1.3 }}>{goal.title}</h3>
                      {goal.notes && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.notes}</p>}
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, marginLeft: 8, flexShrink: 0 }}>
                      <Trash2 size={12} style={{ color: '#ff4d6a' }} />
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginBottom: 6 }}>
                      <span style={{ color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{goal.unit}{(goal.currentValue || 0).toLocaleString()} / {goal.unit}{(goal.targetValue || 0).toLocaleString()}</span>
                      <span style={{ color: '#2563eb' }}>{pct}% complete</span>
                    </div>
                    <div style={{ height: 4, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? '#00c48c' : '#2563eb', borderRadius: 4, transition: 'width 0.7s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>CURRENT VALUE</label>
                      <input type="number" step="any" defaultValue={goal.currentValue}
                        onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== goal.currentValue) updateCurrentValue(goal, v) }}
                        style={{ ...inputStyle, fontSize: '13px' }}
                        onFocus={e => Object.assign(e.target.style, focusStyle)} />
                    </div>
                    {daysLeft !== null && (
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4 }}>DEADLINE</div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4, background: (daysLeft < 0 ? 'rgba(255,77,106,0.1)' : daysLeft < 7 ? 'rgba(245,158,11,0.1)' : 'rgba(37,99,235,0.1)'), border: `1px solid ${daysLeft < 0 ? 'rgba(255,77,106,0.3)' : daysLeft < 7 ? 'rgba(245,158,11,0.3)' : 'rgba(37,99,235,0.3)'}`, color: daysLeft < 0 ? '#ff4d6a' : daysLeft < 7 ? '#f59e0b' : '#2563eb' }}>
                          <Clock size={10} />
                          {daysLeft < 0 ? Math.abs(daysLeft) + 'd overdue' : daysLeft === 0 ? 'Due today' : daysLeft + 'd left'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    {isCheckingIn ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input autoFocus value={checkinText} onChange={e => setCheckinText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') submitCheckin(goal.id); if (e.key === 'Escape') { setCheckinGoalId(null); setCheckinText('') } }}
                          style={{ ...inputStyle, flex: 1, fontSize: '13px' }} onFocus={e => Object.assign(e.target.style, focusStyle)} placeholder="What did you do this week toward this goal?" />
                        <button onClick={() => submitCheckin(goal.id)} style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}>Log</button>
                        <button onClick={() => { setCheckinGoalId(null); setCheckinText('') }} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setCheckinGoalId(goal.id)} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px', borderRadius: 8, background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle size={12} /> Weekly Check-in
                      </button>
                    )}
                  </div>

                  {checkins.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase' }}>RECENT CHECK-INS</p>
                      {[...checkins].reverse().slice(0, 2).map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), flexShrink: 0 }}>{c.date}</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <LifeHubChat section="goals" apiRoute="/api/life/goals/chat"
        contextData={{ yearly: goals.filter(g => (g.tier || 'yearly') === 'yearly'), monthly: goals.filter(g => g.tier === 'monthly'), weekly: goals.filter(g => g.tier === 'weekly'), totalGoals: goals.length }}
        systemPrompt="You are Coach Shai, a world-class goals and performance AI. You have access to the user's goals across yearly, monthly, and weekly tiers. Each goal includes: title, category (Trading/Content/Health/Finance/Personal), progress percentage, current vs target values with units, days remaining until deadline, status (Completed / Ahead / On Track / At Risk / Overdue), and weekly check-in notes. Analyze their progress, flag risks, celebrate wins, and give direct, actionable advice. Be sharp, motivating, and honest."
        defaultOpen={chatOpen} />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>Loading...</div></div>}>
      <GoalsInner />
    </Suspense>
  )
}
