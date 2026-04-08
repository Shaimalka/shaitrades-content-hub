'use client'
import { useState, useEffect, Suspense } from 'react'
import { Target, Plus, Trash2, CheckCircle, Clock, DollarSign, Hash, Check } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'

type Tier = 'yearly' | 'monthly' | 'weekly'
type Category = 'Trading' | 'Content' | 'Health' | 'Finance' | 'Personal'
type GoalType = 'money' | 'yesno' | 'numeric'

type Goal = {
  id: string; title: string; category: Category; tier: Tier; targetValue: number; currentValue: number
  unit: string; startDate: string; deadline: string; notes: string
  checkins: { id: string; text: string; date: string }[]; createdAt: string
  type?: GoalType; currentProgress?: number; completed?: boolean
}

const CATEGORIES: Category[] = ['Trading', 'Content', 'Health', 'Finance', 'Personal']
const TIERS: { key: Tier; label: string }[] = [
  { key: 'yearly', label: 'YEARLY' },
  { key: 'monthly', label: 'MONTHLY' },
  { key: 'weekly', label: 'WEEKLY' },
]
const GOAL_TYPES: { key: GoalType; emoji: string; label: string; desc: string }[] = [
  { key: 'money', emoji: '\u{1F4B0}', label: 'Money', desc: 'e.g. Save $10,000' },
  { key: 'yesno', emoji: '\u2705', label: 'Yes / No', desc: 'e.g. Get funded' },
  { key: 'numeric', emoji: '\u{1F522}', label: 'Numeric', desc: 'e.g. Trade 100 days' },
]
const CAT_COLORS: Record<Category, string> = {
  Trading: '#2563eb', Content: '#a78bfa', Health: '#00c48c', Finance: '#f59e0b', Personal: '#06b6d4',
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h)
  }, [])
  return width
}

function getGoalType(g: Goal): GoalType {
  return g.type || 'numeric'
}

function getProgress(g: Goal): number {
  const t = getGoalType(g)
  if (t === 'yesno') return g.completed ? 100 : 0
  const current = g.currentProgress !== undefined ? g.currentProgress : (g.currentValue || 0)
  return g.targetValue > 0 ? Math.min(100, Math.round((current / g.targetValue) * 100)) : 0
}

function formatMoney(n: number) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k'
  return '$' + n.toLocaleString()
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
    background: isDark ? '#1a1a24' : '#f1f4f9',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
    color: isDark ? '#ffffff' : '#0a0a0f',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties

  const cardStyle = {
    background: isDark ? '#111118' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px',
    padding: '20px',
  } as React.CSSProperties

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTier, setActiveTier] = useState<Tier>('yearly')
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null)
  const [progressInput, setProgressInput] = useState('')

  const [form, setForm] = useState({
    title: '',
    category: 'Trading' as Category,
    tier: 'yearly' as Tier,
    goalType: 'numeric' as GoalType,
    targetValue: '',
    unit: 'trades',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    notes: '',
  })

  const focusStyle = { borderColor: 'rgba(0,242,255,0.5)', boxShadow: '0 0 0 2px rgba(0,242,255,0.2)' }
  const blurStyle = { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', boxShadow: 'none' }

  useEffect(() => {
    fetch('/api/life/goals').then(r => r.json()).then(d => {
      setGoals(d.goals || []); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    const isYesNo = form.goalType === 'yesno'
    const isMoney = form.goalType === 'money'
    const entry = {
      title: form.title,
      category: form.category,
      tier: form.tier,
      type: form.goalType,
      targetValue: isYesNo ? 1 : parseFloat(form.targetValue) || 0,
      currentValue: 0,
      currentProgress: 0,
      unit: isMoney ? '$' : form.unit,
      startDate: form.startDate,
      deadline: form.deadline,
      notes: form.notes,
      completed: false,
      checkins: []
    }
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    })
    const data = await res.json()
    setGoals(data.goals || []); setShowForm(false); setActiveTier(form.tier)
    setForm({ title: '', category: 'Trading', tier: 'yearly', goalType: 'numeric', targetValue: '', unit: 'trades', startDate: new Date().toISOString().split('T')[0], deadline: '', notes: '' })
  }

  async function addProgress(goal: Goal, delta: number) {
    const currentProg = goal.currentProgress !== undefined ? goal.currentProgress : (goal.currentValue || 0)
    const newProg = Math.max(0, currentProg + delta)
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entry: { ...goal, currentProgress: newProg, currentValue: newProg } })
    })
    const data = await res.json(); setGoals(data.goals || [])
    setProgressGoalId(null); setProgressInput('')
  }

  async function toggleComplete(goal: Goal) {
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entry: { ...goal, completed: !goal.completed } })
    })
    const data = await res.json(); setGoals(data.goals || [])
  }

  async function deleteGoal(id: string) {
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', entry: { id } })
    })
    const data = await res.json(); setGoals(data.goals || [])
  }

  const filteredGoals = goals.filter(g => (g.tier || 'yearly') === activeTier)

  const typeToggleBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const typeToggleBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'

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
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#00f2ff', border: 'none', borderRadius: 8, color: '#0a0a0f', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {/* Tier Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 12, background: (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
          {TIERS.map(({ key, label }) => {
            const count = goals.filter(g => (g.tier || 'yearly') === key).length
            const isActive = activeTier === key
            return (
              <button key={key} onClick={() => setActiveTier(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.15s', background: isActive ? 'rgba(0,242,255,0.1)' : 'transparent', border: `1px solid ${isActive ? 'rgba(0,242,255,0.35)' : 'transparent'}`, color: isActive ? '#00f2ff' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                {label}
                {count > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '1px 6px', borderRadius: 20, background: isActive ? 'rgba(0,242,255,0.15)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'), color: isActive ? '#00f2ff' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Add Goal Form */}
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 24, borderColor: isDark ? 'rgba(0,242,255,0.15)' : 'rgba(0,150,180,0.15)' }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 16 }}>New Goal</h3>

            {/* Goal Type Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>GOAL TYPE</label>
              <div style={{ display: 'flex', gap: 8, padding: 4, borderRadius: 10, background: typeToggleBg, border: `1px solid ${typeToggleBorder}` }}>
                {GOAL_TYPES.map(({ key, emoji, label, desc }) => {
                  const isActive = form.goalType === key
                  return (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, goalType: key, unit: key === 'money' ? '$' : key === 'numeric' ? f.unit || 'trades' : '' }))}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: isActive ? 'rgba(0,242,255,0.12)' : 'transparent', border: `1px solid ${isActive ? 'rgba(0,242,255,0.4)' : 'transparent'}`, color: isActive ? '#00f2ff' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)') }}>
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>{label}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', textAlign: 'center' }}>{desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <form onSubmit={submitGoal} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>GOAL TITLE</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder={form.goalType === 'money' ? 'e.g. Save $10,000' : form.goalType === 'yesno' ? 'e.g. Get funded by prop firm' : 'e.g. Trade 100 days'} required />
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

              {form.goalType === 'money' && (
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TARGET AMOUNT</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#00f2ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, pointerEvents: 'none' }}>$</span>
                    <input type="number" step="any" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} style={{ ...inputStyle, paddingLeft: 24 }} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="10000" required />
                  </div>
                </div>
              )}

              {form.goalType === 'numeric' && (
                <>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TARGET NUMBER</label>
                    <input type="number" step="any" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="100" required />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>UNIT LABEL</label>
                    <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="trades, days, books..." />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>START DATE</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TARGET DATE</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
                <p style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>When do you want to achieve this by?</p>
              </div>

              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>NOTES / WHY THIS MATTERS</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Why this goal matters to you" />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', display: 'flex', gap: 10 }}>
                <button type="submit" style={{ background: '#00f2ff', border: 'none', borderRadius: 8, color: '#0a0a0f', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '10px 20px', cursor: 'pointer' }}>Save Goal</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'}`, borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Goals Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <Skeleton height="120px" /><Skeleton height="120px" /><Skeleton height="120px" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <EmptyState icon={Target} heading="NO GOALS SET YET" isDark={isDark} subtext="Set your first goal and start tracking progress." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {filteredGoals.map(goal => {
              const gtype = getGoalType(goal)
              const pct = getProgress(goal)
              const currentProg = goal.currentProgress !== undefined ? goal.currentProgress : (goal.currentValue || 0)
              const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null
              const isAddingProgress = progressGoalId === goal.id
              const typeInfo = GOAL_TYPES.find(t => t.key === gtype)!

              const typeBadgeColor = gtype === 'money' ? '#f59e0b' : gtype === 'yesno' ? '#00c48c' : '#00f2ff'

              return (
                <div key={goal.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>{goal.category}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: typeBadgeColor + '15', border: `1px solid ${typeBadgeColor}35`, color: typeBadgeColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11 }}>{typeInfo.emoji}</span>{typeInfo.label}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0, lineHeight: 1.3 }}>{goal.title}</h3>
                      {goal.notes && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'), marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.notes}</p>}
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, flexShrink: 0, padding: 2 }} title="Delete goal">
                      <Trash2 size={13} style={{ color: '#ff4d6a' }} />
                    </button>
                  </div>

                  {/* Target Date row */}
                  {daysLeft !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} style={{ color: daysLeft < 0 ? '#ff4d6a' : daysLeft < 7 ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'), flexShrink: 0 }} />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: daysLeft < 0 ? '#ff4d6a' : daysLeft < 7 ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)') }}>
                        {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {daysLeft < 0 ? `${Math.abs(daysLeft)} days ago (missed)` : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
                      </span>
                    </div>
                  )}

                  {/* Progress section based on type */}
                  {gtype === 'yesno' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => toggleComplete(goal)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: `1px solid ${goal.completed ? 'rgba(0,196,140,0.4)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)')}`, background: goal.completed ? 'rgba(0,196,140,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: goal.completed ? '#00c48c' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'), transition: 'all 0.2s' }}>
                        {goal.completed
                          ? <><Check size={14} /><span>Done!</span></>
                          : <><div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}` }} /><span>Mark Complete</span></>
                        }
                      </button>
                      {goal.completed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00c48c', background: 'rgba(0,196,140,0.1)', padding: '3px 8px', borderRadius: 20 }}>✓ ACHIEVED</span>}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginBottom: 6 }}>
                        <span style={{ color: (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)') }}>
                          {gtype === 'money'
                            ? `${formatMoney(currentProg)} / ${formatMoney(goal.targetValue)}`
                            : `${currentProg.toLocaleString()} / ${goal.targetValue.toLocaleString()} ${goal.unit || ''}`
                          }
                        </span>
                        <span style={{ color: '#00f2ff', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? '#00c48c' : '#00f2ff', borderRadius: 4, transition: 'width 0.7s ease', boxShadow: pct > 0 ? '0 0 8px rgba(0,242,255,0.4)' : 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Quick add progress (money + numeric only) */}
                  {gtype !== 'yesno' && (
                    <div>
                      {isAddingProgress ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            {gtype === 'money' && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#00f2ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, pointerEvents: 'none' }}>+$</span>}
                            {gtype !== 'money' && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#00f2ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, pointerEvents: 'none' }}>+</span>}
                            <input autoFocus type="number" step="any" value={progressInput} onChange={e => setProgressInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(progressInput); if (!isNaN(v)) addProgress(goal, v) } if (e.key === 'Escape') { setProgressGoalId(null); setProgressInput('') } }}
                              style={{ ...inputStyle, fontSize: '13px', paddingLeft: 28 }} onFocus={e => Object.assign(e.target.style, focusStyle)} placeholder="amount to add" />
                          </div>
                          <button onClick={() => { const v = parseFloat(progressInput); if (!isNaN(v)) addProgress(goal, v) }} style={{ background: '#00f2ff', border: 'none', borderRadius: 8, color: '#0a0a0f', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}>Add</button>
                          <button onClick={() => { setProgressGoalId(null); setProgressInput('') }} style={{ background: 'transparent', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 12px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setProgressGoalId(goal.id); setProgressInput('') }} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, padding: '7px', borderRadius: 8, background: 'rgba(0,242,255,0.04)', border: '1px solid rgba(0,242,255,0.18)', color: '#00f2ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <Plus size={12} /> Add Progress
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <LifeHubChat section="goals" apiRoute="/api/life/goals/chat" contextData={{ yearly: goals.filter(g => (g.tier || 'yearly') === 'yearly'), monthly: goals.filter(g => g.tier === 'monthly'), weekly: goals.filter(g => g.tier === 'weekly'), totalGoals: goals.length }} systemPrompt="You are Coach Shai, a world-class goals and performance AI. Analyze the user's goals, flag risks, celebrate wins, and give direct, actionable advice." defaultOpen={chatOpen} />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(128,128,128,0.5)' }}>Loading...</div></div>}>
      <GoalsInner />
    </Suspense>
  )
}
