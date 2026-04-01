'use client'
import { useState, useEffect, Suspense } from 'react'
import { Plus, Trash2, Flame, CheckSquare } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Stack = 'Morning' | 'Trading' | 'Evening'
type Frequency = 'Daily' | 'Weekdays' | 'Custom'

type Habit = {
  id: string
  name: string
  stack: Stack
  intention: string
  twoMinute: string
  whyMatters: string
  frequency: Frequency
  customDays: number[]
  createdAt: string
}

type Completions = Record<string, Record<string, boolean>>
type MissLog = Record<string, Record<string, string>>

const STACKS: { key: Stack; label: string; icon: string; color: string }[] = [
  { key: 'Morning', label: 'MORNING STACK', icon: '🌅', color: '#ffb400' },
  { key: 'Trading', label: 'TRADING STACK', icon: '📈', color: '#00f2ff' },
  { key: 'Evening', label: 'EVENING STACK', icon: '🌙', color: '#a78bfa' },
]

const MISS_REASONS = ['No time', 'Forgot', 'Too tired', 'Chose not to', 'Other']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MISS_KEY = 'life:habits:misslog'

function getLast30Days(): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function getStreak(habitId: string, completions: Completions): number {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (completions[dateStr]?.[habitId]) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function getCompletionRate(habitId: string, completions: Completions, days = 7): number {
  let done = 0
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (completions[d.toISOString().split('T')[0]]?.[habitId]) done++
  }
  return Math.round((done / days) * 100)
}

function getWeakestDay(habitId: string, completions: Completions): string {
  const dayCounts: Record<number, { done: number; total: number }> = {}
  for (let i = 0; i < 7; i++) dayCounts[i] = { done: 0, total: 0 }
  for (let i = 0; i < 28; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    dayCounts[dow].total++
    if (completions[d.toISOString().split('T')[0]]?.[habitId]) dayCounts[dow].done++
  }
  let weakest = 0
  let lowestRate = 2
  for (let day = 0; day < 7; day++) {
    if (dayCounts[day].total === 0) continue
    const rate = dayCounts[day].done / dayCounts[day].total
    if (rate < lowestRate) { lowestRate = rate; weakest = day }
  }
  return DAY_NAMES[weakest]
}

function HabitsInner() {
  const searchParams = useSearchParams()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completions>({})
  const [missLog, setMissLog] = useState<MissLog>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [missPrompt, setMissPrompt] = useState<{ habitId: string; date: string } | null>(null)
  const [missReason, setMissReason] = useState('')
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [expandedStack, setExpandedStack] = useState<Stack | null>(null)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)

  const [form, setForm] = useState({
    name: '',
    stack: 'Morning' as Stack,
    intention: '',
    twoMinute: '',
    whyMatters: '',
    frequency: 'Daily' as Frequency,
    customDays: [] as number[],
  })

  const today = new Date().toISOString().split('T')[0]
  const last30 = getLast30Days()
  const currentHour = new Date().getHours()

  useEffect(() => {
    fetch('/api/life/habits')
      .then(r => r.json())
      .then(d => {
        setHabits(d.habits || [])
        setCompletions(d.completions || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))

    try {
      const stored = localStorage.getItem(MISS_KEY)
      if (stored) setMissLog(JSON.parse(stored))
    } catch {}
  }, [])

  async function toggleHabit(habitId: string, date: string) {
    const wasDone = completions[date]?.[habitId]
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', date, habitId }),
    })
    const data = await res.json()
    setCompletions(data.completions || {})

    if (wasDone && date === today && currentHour >= 21) {
      setMissPrompt({ habitId, date })
    }
  }

  function saveMissReason() {
    if (!missPrompt || !missReason) return
    const updated = { ...missLog }
    if (!updated[missPrompt.date]) updated[missPrompt.date] = {}
    updated[missPrompt.date][missPrompt.habitId] = missReason
    setMissLog(updated)
    try { localStorage.setItem(MISS_KEY, JSON.stringify(updated)) } catch {}
    setMissPrompt(null)
    setMissReason('')
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const entry = { ...form }
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    })
    const data = await res.json()
    setHabits(data.habits || [])
    setShowForm(false)
    setForm({ name: '', stack: 'Morning', intention: '', twoMinute: '', whyMatters: '', frequency: 'Daily', customDays: [] })
  }

  async function deleteHabit(id: string) {
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', entry: { id } }),
    })
    const data = await res.json()
    setHabits(data.habits || [])
  }

  const todayHabits = habits
  const todayCompleted = todayHabits.filter(h => completions[today]?.[h.id]).length

  const stackHabits = (stack: Stack) => habits.filter(h => (h.stack || 'Morning') === stack)

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>{'<-'} LIFE HUB</Link>
            <span className="section-header">HABITS</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Habit Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            {habits.length > 0 && (
              <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)', color: '#00f2ff' }}>
                {todayCompleted}/{habits.length} today
              </div>
            )}
            <button onClick={() => setShowWeeklyReview(!showWeeklyReview)} className="btn-cyber-ghost text-xs flex items-center gap-1">
              Weekly Review
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
              <Plus size={14} /> New Habit
            </button>
          </div>
        </div>

        {/* Today's Stack — Daily View */}
        {habits.length > 0 && (
          <div className="premium-card p-5 mb-6">
            <h3 className="section-header mb-4">TODAY'S STACK</h3>
            <div className="space-y-2">
              {STACKS.map(({ key, label, icon, color }) => {
                const stackItems = stackHabits(key)
                if (stackItems.length === 0) return null
                return (
                  <div key={key}>
                    <p className="text-[10px] font-mono mb-1.5 flex items-center gap-1" style={{ color }}>
                      {icon} {label}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {stackItems.map(h => {
                        const done = completions[today]?.[h.id] || false
                        return (
                          <button
                            key={h.id}
                            onClick={() => toggleHabit(h.id, today)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left"
                            style={{
                              background: done ? color + '12' : 'rgba(255,255,255,0.03)',
                              borderColor: done ? color + '60' : 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all" style={{
                              borderColor: done ? color : 'rgba(255,255,255,0.2)',
                              background: done ? color + '30' : 'transparent',
                            }}>
                              {done && <span style={{ color, fontSize: 10 }}>✓</span>}
                            </div>
                            <span className="text-xs flex-1" style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                              {h.name}
                            </span>
                            {getStreak(h.id, completions) > 0 && (
                              <span className="text-[10px] font-mono flex items-center gap-0.5" style={{ color: '#ff6b35' }}>
                                <Flame size={10} />{getStreak(h.id, completions)}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly Review */}
        {showWeeklyReview && habits.length > 0 && (
          <div className="premium-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-header">WEEKLY REVIEW</h3>
              <button onClick={() => setShowWeeklyReview(false)} className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Close</button>
            </div>
            <div className="space-y-3">
              {habits.map(h => {
                const rate7 = getCompletionRate(h.id, completions, 7)
                const weakDay = getWeakestDay(h.id, completions)
                const streak = getStreak(h.id, completions)
                return (
                  <div key={h.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Weakest day: {weakDay}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold font-mono" style={{ color: rate7 >= 80 ? '#00ff88' : rate7 >= 50 ? '#ffb400' : '#ff4444' }}>{rate7}%</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>7-day rate</p>
                    </div>
                    {streak > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold font-mono flex items-center gap-1" style={{ color: '#ff6b35' }}><Flame size={14} />{streak}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>streak</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add Habit Form */}
        {showForm && (
          <div className="premium-card p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW HABIT</h3>
            <form onSubmit={addHabit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>HABIT NAME</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Morning meditation" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>STACK</label>
                <select value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value as Stack }))} className="cyber-input w-full">
                  <option value="Morning">Morning Stack</option>
                  <option value="Trading">Trading Stack</option>
                  <option value="Evening">Evening Stack</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>IMPLEMENTATION INTENTION</label>
                <input value={form.intention} onChange={e => setForm(f => ({ ...f, intention: e.target.value }))} className="cyber-input w-full" placeholder='I will [habit] at [time] in/at [location]' />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>FREQUENCY</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Frequency }))} className="cyber-input w-full">
                  <option value="Daily">Daily</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Custom">Custom Days</option>
                </select>
              </div>
              {form.frequency === 'Custom' && (
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>CUSTOM DAYS</label>
                  <div className="flex gap-1">
                    {DAY_NAMES.map((d, i) => (
                      <button key={i} type="button" onClick={() => setForm(f => ({
                        ...f,
                        customDays: f.customDays.includes(i) ? f.customDays.filter(x => x !== i) : [...f.customDays, i]
                      }))} className="flex-1 text-[10px] font-mono py-1.5 rounded transition-all" style={{
                        background: form.customDays.includes(i) ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid ' + (form.customDays.includes(i) ? 'rgba(0,242,255,0.5)' : 'rgba(255,255,255,0.1)'),
                        color: form.customDays.includes(i) ? '#00f2ff' : 'var(--text-muted)',
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>2-MINUTE VERSION</label>
                <input value={form.twoMinute} onChange={e => setForm(f => ({ ...f, twoMinute: e.target.value }))} className="cyber-input w-full" placeholder="The 2-minute version of this habit is..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>WHY IT MATTERS</label>
                <input value={form.whyMatters} onChange={e => setForm(f => ({ ...f, whyMatters: e.target.value }))} className="cyber-input w-full" placeholder="One line — why does this habit matter?" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-cyber-primary">Add Habit</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Miss Reason Prompt */}
        {missPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="premium-card p-6 max-w-sm w-full mx-4">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Why did you skip today?</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{habits.find(h => h.id === missPrompt.habitId)?.name}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MISS_REASONS.map(reason => (
                  <button key={reason} onClick={() => setMissReason(reason)} className="text-xs py-2 rounded-lg border transition-all" style={{
                    background: missReason === reason ? 'rgba(0,242,255,0.15)' : 'rgba(255,255,255,0.04)',
                    borderColor: missReason === reason ? 'rgba(0,242,255,0.5)' : 'rgba(255,255,255,0.08)',
                    color: missReason === reason ? '#00f2ff' : 'var(--text-secondary)',
                  }}>{reason}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveMissReason} disabled={!missReason} className="btn-cyber-primary flex-1 disabled:opacity-40">Log It</button>
                <button onClick={() => setMissPrompt(null)} className="btn-cyber-ghost flex-1">Skip</button>
              </div>
            </div>
          </div>
        )}

        {/* Habit Stacks */}
        {loading ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : habits.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <CheckSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>No habits created yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-cyber-primary">Create Your First Habit</button>
          </div>
        ) : (
          <div className="space-y-4">
            {STACKS.map(({ key, label, icon, color }) => {
              const items = stackHabits(key)
              if (items.length === 0) return null
              const isExpanded = expandedStack !== key
              return (
                <div key={key} className="premium-card overflow-hidden">
                  <button
                    onClick={() => setExpandedStack(expandedStack === key ? null : key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <h3 className="text-xs font-mono font-bold tracking-widest" style={{ color }}>{label}</h3>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {items.filter(h => completions[today]?.[h.id]).length}/{items.length} done today
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: items.length > 0 ? (items.filter(h => completions[today]?.[h.id]).length / items.length * 100) + '%' : '0%',
                          background: color,
                        }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {expandedStack === key ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {expandedStack === key && (
                    <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      {items.map(habit => {
                        const streak = getStreak(habit.id, completions)
                        const todayDone = completions[today]?.[habit.id] || false

                        return (
                          <div key={habit.id} className="rounded-xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-start gap-3 mb-3">
                              <button
                                onClick={() => toggleHabit(habit.id, today)}
                                className="w-7 h-7 flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all duration-200 mt-0.5"
                                style={{
                                  borderColor: todayDone ? color : 'rgba(255,255,255,0.2)',
                                  background: todayDone ? color + '25' : 'transparent',
                                }}
                              >
                                {todayDone && <span style={{ color, fontSize: 12 }}>✓</span>}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold" style={{ color: todayDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: todayDone ? 'line-through' : 'none' }}>
                                    {habit.name}
                                  </span>
                                  {streak > 0 && (
                                    <span className="text-xs font-mono flex items-center gap-0.5" style={{ color: '#ff6b35' }}>
                                      <Flame size={11} />{streak}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                    {habit.frequency || 'Daily'}
                                  </span>
                                </div>
                                {habit.intention && (
                                  <p className="text-[10px] mt-1" style={{ color: '#00f2ff', opacity: 0.7 }}>
                                    {habit.intention}
                                  </p>
                                )}
                                {habit.whyMatters && (
                                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {habit.whyMatters}
                                  </p>
                                )}
                                {habit.twoMinute && (
                                  <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                                    2-min: {habit.twoMinute}
                                  </p>
                                )}
                              </div>
                              <button onClick={() => deleteHabit(habit.id)} className="opacity-30 hover:opacity-70 flex-shrink-0">
                                <Trash2 size={11} style={{ color: '#ff00e5' }} />
                              </button>
                            </div>

                            {/* 30-day heatmap */}
                            <div>
                              <p className="text-[10px] font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>LAST 30 DAYS</p>
                              <div className="flex gap-0.5 flex-wrap">
                                {last30.map(date => {
                                  const done = completions[date]?.[habit.id]
                                  const isToday = date === today
                                  const hasMissReason = missLog[date]?.[habit.id]
                                  return (
                                    <button
                                      key={date}
                                      onClick={() => toggleHabit(habit.id, date)}
                                      title={date + (hasMissReason ? ' — Missed: ' + hasMissReason : '')}
                                      className="w-5 h-5 rounded-sm transition-all hover:scale-110 relative"
                                      style={{
                                        background: done ? color : hasMissReason ? 'rgba(255,68,68,0.3)' : 'rgba(255,255,255,0.05)',
                                        border: isToday ? '1px solid ' + color : '1px solid rgba(255,255,255,0.06)',
                                        opacity: done ? 1 : 0.7,
                                      }}
                                    />
                                  )
                                })}
                              </div>
                            </div>

                            {/* Miss reason if exists for today */}
                            {missLog[today]?.[habit.id] && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff6b6b' }}>
                                  Missed: {missLog[today][habit.id]}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LifeHubChat
        section="habits"
        apiRoute="/api/life/habits/chat"
        contextData={{
          habits: habits.map(h => ({
            name: h.name,
            stack: h.stack,
            intention: h.intention,
            whyMatters: h.whyMatters,
            frequency: h.frequency,
            streak: getStreak(h.id, completions),
            completionRate7d: getCompletionRate(h.id, completions, 7),
            completionRate30d: getCompletionRate(h.id, completions, 30),
            weakestDay: getWeakestDay(h.id, completions),
            todayDone: !!completions[today]?.[h.id],
          })),
          totalHabits: habits.length,
          todayCompleted,
          missLog,
        }}
        systemPrompt="You are Coach Shai, a behavioral science-based habit AI. You have access to the user's habit stacks (Morning, Trading, Evening), each habit's implementation intention, why it matters, current streak, 7-day and 30-day completion rates, weakest day of week, today's status, and miss reason logs. Analyze patterns, celebrate streaks, identify skip patterns, and give sharp, science-backed advice to improve consistency. Reference specific habits and data when coaching."
        defaultOpen={chatOpen}
      />
    </div>
  )
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <HabitsInner />
    </Suspense>
  )
}
