'use client'

import { useState, useEffect, Suspense } from 'react'
import { Target, Plus, Trash2, CheckCircle } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Goal = {
  id: string
  title: string
  category: 'Income' | 'Content' | 'Trading' | 'Personal'
  targetValue: number
  currentValue: number
  deadline: string
  notes: string
  unit?: string
}

type CheckIn = {
  id: string
  text: string
  date: string
}

const CATEGORIES = ['Income', 'Content', 'Trading', 'Personal']
const CAT_COLORS: Record<string, string> = {
  Income: '#00ff88',
  Content: '#ff00e5',
  Trading: '#00f2ff',
  Personal: '#ffb400',
}

function GoalsInner() {
  const searchParams = useSearchParams()
  const [goals, setGoals] = useState<Goal[]>([])
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [checkinText, setCheckinText] = useState('')
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const [form, setForm] = useState({
    title: '', category: 'Income' as Goal['category'],
    targetValue: '', currentValue: '', deadline: '', notes: '', unit: '$',
  })

  useEffect(() => {
    fetch('/api/life/goals').then(r => r.json()).then(d => {
      setGoals(d.goals || [])
      setCheckins(d.checkins || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: { ...form, targetValue: parseFloat(form.targetValue), currentValue: parseFloat(form.currentValue || '0') } }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
    setShowForm(false)
    setForm({ title: '', category: 'Income', targetValue: '', currentValue: '', deadline: '', notes: '', unit: '$' })
  }

  async function updateProgress(goal: Goal, value: number) {
    const updated = { ...goal, currentValue: value }
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', goal: updated }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
  }

  async function deleteGoal(id: string) {
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    const data = await res.json()
    setGoals(data.goals || [])
  }

  async function submitCheckin(e: React.FormEvent) {
    e.preventDefault()
    if (!checkinText.trim()) return
    const res = await fetch('/api/life/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', text: checkinText, date: new Date().toISOString().split('T')[0] }),
    })
    const data = await res.json()
    setCheckins(data.checkins || [])
    setCheckinText('')
  }

  const today = new Date().toISOString().split('T')[0]
  const todayCheckin = checkins.find(c => c.date === today)

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">GOALS</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Goal Tracker</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {/* Daily Check-in */}
        <div className="cyber-panel p-5 mb-6">
          <h3 className="section-label mb-3">DAILY CHECK-IN</h3>
          {todayCheckin ? (
            <div className="flex items-start gap-3">
              <CheckCircle size={16} style={{ color: '#00ff88', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-mono" style={{ color: '#00ff88' }}>TODAY LOGGED</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{todayCheckin.text}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submitCheckin} className="flex gap-3">
              <input value={checkinText} onChange={e => setCheckinText(e.target.value)}
                className="cyber-input flex-1" placeholder="What did you do toward your goals today?" />
              <button type="submit" className="btn-cyber-primary">Log</button>
            </form>
          )}
          {checkins.length > 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>RECENT CHECK-INS</p>
              {[...checkins].reverse().slice(1, 4).map(c => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{c.date}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Goal Form */}
        {showForm && (
          <div className="cyber-panel p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW GOAL</h3>
            <form onSubmit={submitGoal} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>GOAL TITLE</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="cyber-input w-full" placeholder="e.g. Hit $10k monthly income" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CATEGORY</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Goal['category'] }))}
                  className="cyber-input w-full">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>UNIT</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="cyber-input w-full" placeholder="$, %, subs, etc." />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TARGET VALUE</label>
                <input type="number" step="any" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                  className="cyber-input w-full" placeholder="10000" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CURRENT VALUE</label>
                <input type="number" step="any" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                  className="cyber-input w-full" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DEADLINE</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="cyber-input w-full" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="cyber-input w-full" placeholder="Why this goal matters" />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button type="submit" className="btn-cyber-primary">Save Goal</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Goals Grid */}
        {loading ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : goals.length === 0 ? (
          <div className="cyber-panel p-8 text-center">
            <Target size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>No goals set yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-cyber-primary">Add Your First Goal</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0
              const color = CAT_COLORS[goal.category] || '#00f2ff'
              const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null

              return (
                <div key={goal.id} className="cyber-panel p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="badge-pill mb-2 inline-block" style={{ color, borderColor: color + '50', background: color + '15' }}>{goal.category}</span>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{goal.title}</h3>
                      {goal.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{goal.notes}</p>}
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="opacity-30 hover:opacity-70">
                      <Trash2 size={12} style={{ color: '#ff00e5' }} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>{goal.unit}{goal.currentValue.toLocaleString()} / {goal.unit}{goal.targetValue.toLocaleString()}</span>
                      <span style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>

                  {/* Update progress */}
                  <div className="flex items-center gap-2">
                    <input type="number" step="any" defaultValue={goal.currentValue}
                      onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== goal.currentValue) updateProgress(goal, v) }}
                      className="cyber-input flex-1 text-xs" style={{ fontFamily: 'JetBrains Mono' }} />
                    {daysLeft !== null && (
                      <span className="text-xs font-mono px-2 py-1 rounded" style={{
                        color: daysLeft < 7 ? '#ff00e5' : daysLeft < 30 ? '#ffb400' : '#00f2ff',
                        background: daysLeft < 7 ? 'rgba(255,0,229,0.08)' : daysLeft < 30 ? 'rgba(255,180,0,0.08)' : 'rgba(0,242,255,0.08)',
                        border: `1px solid currentColor`,
                      }}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'OVERDUE'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LifeHubChat
        section="goals"
        apiRoute="/api/life/goals/chat"
        contextData={{ goals, checkins }}
        systemPrompt="You are a goals and productivity AI. Analyze goal progress and check-ins."
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
