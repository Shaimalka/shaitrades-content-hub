'use client'
import { useState, useEffect, Suspense } from 'react'
import { Target, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Tier = 'yearly' | 'monthly' | 'weekly'
type Category = 'Trading' | 'Content' | 'Health' | 'Finance' | 'Personal'

type Goal = {
  id: string
  title: string
  category: Category
  tier: Tier
  targetValue: number
  currentValue: number
  unit: string
  startDate: string
  deadline: string
  notes: string
  checkins: { id: string; text: string; date: string }[]
  createdAt: string
}

const CATEGORIES: Category[] = ['Trading', 'Content', 'Health', 'Finance', 'Personal']
const TIERS: { key: Tier; label: string }[] = [
  { key: 'yearly', label: 'YEARLY' },
  { key: 'monthly', label: 'MONTHLY' },
  { key: 'weekly', label: 'WEEKLY' },
]

const CAT_COLORS: Record<Category, string> = {
  Trading: '#00f2ff',
  Content: '#ff00e5',
  Health: '#00ff88',
  Finance: '#ffb400',
  Personal: '#a78bfa',
}

function getStatus(pct: number, daysLeft: number | null): { label: string; color: string } {
  if (daysLeft !== null && daysLeft < 0) return { label: 'Overdue', color: '#ff4444' }
  if (pct >= 100) return { label: 'Crushing It', color: '#00ff88' }
  if (daysLeft === null) return { label: 'On Track', color: '#00f2ff' }
  const expectedPct = 50
  if (pct >= expectedPct + 15) return { label: 'Crushing It', color: '#00ff88' }
  if (pct >= expectedPct - 15) return { label: 'On Track', color: '#00f2ff' }
  return { label: 'At Risk', color: '#ffb400' }
}

function EmptyState({ icon: Icon, heading, subtext }: { icon: React.ElementType; heading: string; subtext: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: 'rgba(0,242,255,0.3)', marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#888888', fontSize: 13, letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

function GoalsInner() {
  const searchParams = useSearchParams()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTier, setActiveTier] = useState<Tier>('yearly')
  const [showForm, setShowForm] = useState(false)
  const [checkinGoalId, setCheckinGoalId] = useState<string | null>(null)
  const [checkinText, setCheckinText] = useState('')
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const [form, setForm] = useState({
    title: '',
    category: 'Trading' as Category,
    tier: 'yearly' as Tier,
    targetValue: '',
    unit: '$',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/life/goals')
      .then(r => r.json())
      .then(d => {
        setGoals(d.goals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    const entry = {
      title: form.title,
      category: form.category,
      tier: form.tier,
      targetValue: parseFloat(form.targetValue),
      currentValue: 0,
      unit: form.unit,
      startDate: form.startDate,
      deadline: form.deadline,
      notes: form.notes,
      checkins: [],
    }
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
    setShowForm(false)
    setActiveTier(form.tier)
    setForm({ title: '', category: 'Trading', tier: 'yearly', targetValue: '', unit: '$', startDate: new Date().toISOString().split('T')[0], deadline: '', notes: '' })
  }

  async function updateCurrentValue(goal: Goal, value: number) {
    const updated = { ...goal, currentValue: value }
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entry: updated }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
  }

  async function deleteGoal(id: string) {
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', entry: { id } }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
  }

  async function submitCheckin(goalId: string) {
    if (!checkinText.trim()) return
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newCheckin = { id: Date.now().toString(), text: checkinText.trim(), date: new Date().toISOString().split('T')[0] }
    const updated = { ...goal, checkins: [...(goal.checkins || []), newCheckin] }
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entry: updated }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
    setCheckinGoalId(null)
    setCheckinText('')
  }

  const filteredGoals = goals.filter(g => (g.tier || 'yearly') === activeTier)

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>{'<-'} LIFE HUB</Link>
            <span className="section-header">GOALS</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Goal Tracker</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
            <Plus size={14} /> Add Goal
          </button>
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {TIERS.map(({ key, label }) => {
            const count = goals.filter(g => (g.tier || 'yearly') === key).length
            return (
              <button
                key={key}
                onClick={() => setActiveTier(key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold tracking-widest transition-all duration-200"
                style={activeTier === key ? {
                  background: 'rgba(0,242,255,0.15)',
                  border: '1px solid rgba(0,242,255,0.4)',
                  color: '#00f2ff',
                  boxShadow: '0 0 12px rgba(0,242,255,0.2)',
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--text-muted)',
                }}
              >
                {label}
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{
                    background: activeTier === key ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.08)',
                    color: activeTier === key ? '#00f2ff' : 'var(--text-muted)',
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {showForm && (
          <div className="premium-card p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW GOAL</h3>
            <form onSubmit={submitGoal} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>GOAL TITLE</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Hit 10k monthly profit" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TIER</label>
                <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value as Tier }))} className="cyber-input w-full">
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CATEGORY</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className="cyber-input w-full">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>UNIT</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="cyber-input w-full" placeholder="subscribers, trades..." />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TARGET VALUE</label>
                <input type="number" step="any" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} className="cyber-input w-full" placeholder="10000" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>START DATE</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="cyber-input w-full" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DEADLINE</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="cyber-input w-full" />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES / WHY THIS MATTERS</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="Why this goal matters to you" />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button type="submit" className="btn-cyber-primary">Save Goal</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : filteredGoals.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <Target size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>No {activeTier} goals yet.</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Set your first {activeTier} goal to start tracking progress.</p>
            <button onClick={() => { setForm(f => ({ ...f, tier: activeTier })); setShowForm(true) }} className="btn-cyber-primary">
              Add {activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map(goal => {
              const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0
              const color = CAT_COLORS[goal.category] || '#00f2ff'
              const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null
              const status = getStatus(pct, daysLeft)
              const isCheckingIn = checkinGoalId === goal.id
              const checkins = goal.checkins || []

              return (
                <div key={goal.id} className="premium-card p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="badge-pill text-[10px]" style={{ color, borderColor: color + '50', background: color + '15' }}>{goal.category}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: status.color + '18', border: '1px solid ' + status.color + '40', color: status.color }}>
                          {status.label === 'Crushing It' ? '🚀 ' : status.label === 'On Track' ? '✓ ' : status.label === 'At Risk' ? '⚠ ' : '⏰ '}
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{goal.title}</h3>
                      {goal.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{goal.notes}</p>}
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="ml-2 opacity-30 hover:opacity-70 flex-shrink-0">
                      <Trash2 size={12} style={{ color: '#ff00e5' }} />
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span style={{ color: 'var(--text-muted)' }}>{goal.unit}{(goal.currentValue || 0).toLocaleString()} / {goal.unit}{(goal.targetValue || 0).toLocaleString()}</span>
                      <span style={{ color: '#00f2ff' }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: pct >= 100 ? '#00ff88' : 'linear-gradient(90deg, #00f2ff, #00ff88)' }} />
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CURRENT VALUE</label>
                      <input
                        type="number"
                        step="any"
                        defaultValue={goal.currentValue}
                        onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== goal.currentValue) updateCurrentValue(goal, v) }}
                        className="cyber-input w-full text-xs"
                      />
                    </div>
                    {daysLeft !== null && (
                      <div className="flex-shrink-0 text-center">
                        <div className="text-[10px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>DEADLINE</div>
                        <span className="text-xs font-mono px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{
                          color: daysLeft < 0 ? '#ff4444' : daysLeft < 7 ? '#ff00e5' : daysLeft < 30 ? '#ffb400' : '#00f2ff',
                          background: daysLeft < 0 ? 'rgba(255,68,68,0.1)' : daysLeft < 7 ? 'rgba(255,0,229,0.1)' : daysLeft < 30 ? 'rgba(255,180,0,0.1)' : 'rgba(0,242,255,0.1)',
                          border: '1px solid currentColor',
                        }}>
                          <Clock size={10} />
                          {daysLeft < 0 ? Math.abs(daysLeft) + 'd overdue' : daysLeft === 0 ? 'Due today' : daysLeft + 'd left'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    {isCheckingIn ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={checkinText}
                          onChange={e => setCheckinText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') submitCheckin(goal.id)
                            if (e.key === 'Escape') { setCheckinGoalId(null); setCheckinText('') }
                          }}
                          className="cyber-input flex-1 text-xs"
                          placeholder="What did you do this week toward this goal?"
                        />
                        <button onClick={() => submitCheckin(goal.id)} className="btn-cyber-primary text-xs px-3">Log</button>
                        <button onClick={() => { setCheckinGoalId(null); setCheckinText('') }} className="btn-cyber-ghost text-xs px-3">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCheckinGoalId(goal.id)}
                        className="w-full text-xs font-mono py-2 rounded-lg border transition-all hover:border-cyan-400/50 flex items-center justify-center gap-2"
                        style={{ borderColor: 'rgba(0,242,255,0.2)', color: '#00f2ff', background: 'rgba(0,242,255,0.04)' }}
                      >
                        <CheckCircle size={12} /> Weekly Check-in
                      </button>
                    )}
                  </div>

                  {checkins.length > 0 && (
                    <div className="space-y-1.5 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>RECENT CHECK-INS</p>
                      {[...checkins].reverse().slice(0, 2).map(c => (
                        <div key={c.id} className="flex gap-2 text-xs">
                          <span className="font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{c.date}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
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

      <LifeHubChat
        section="goals"
        apiRoute="/api/life/goals/chat"
        contextData={{
          yearly: goals.filter(g => (g.tier || 'yearly') === 'yearly'),
          monthly: goals.filter(g => g.tier === 'monthly'),
          weekly: goals.filter(g => g.tier === 'weekly'),
          totalGoals: goals.length,
        }}
        systemPrompt="You are Coach Shai, a world-class goals and performance AI. You have access to the user's goals across yearly, monthly, and weekly tiers. Each goal includes: title, category (Trading/Content/Health/Finance/Personal), progress percentage, current vs target values with units, days remaining until deadline, status (Crushing It / On Track / At Risk / Overdue), and weekly check-in notes. Analyze their progress, flag risks, celebrate wins, and give direct, actionable advice. Be sharp, motivating, and honest."
        defaultOpen={chatOpen}
      />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <GoalsInner />
    </Suspense>
  )
}
