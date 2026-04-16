'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { Plus, Trash2, Flame, CheckSquare, CheckCircle2, X } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'

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
type MilestoneCard = { habitId: string; message: string; milestone: number }

const STACKS: { key: Stack; label: string; icon: string; color: string }[] = [
  { key: 'Morning', label: 'MORNING STACK', icon: '🌅', color: '#f59e0b' },
  { key: 'Trading', label: 'TRADING STACK', icon: '📈', color: '#2563eb' },
  { key: 'Evening', label: 'EVENING STACK', icon: '🌙', color: '#a78bfa' },
]
const MISS_REASONS = ['No time', 'Forgot', 'Too tired', 'Chose not to', 'Other']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MISS_KEY = 'life:habits:misslog'
const MILESTONE_DISMISS_KEY = 'life:habits:milestones:dismissed'
const MILESTONES = [1, 3, 7, 14, 21, 30, 50, 66, 100]

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

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
  let weakest = 0, lowestRate = 2
  for (let day = 0; day < 7; day++) {
    if (dayCounts[day].total === 0) continue
    const rate = dayCounts[day].done / dayCounts[day].total
    if (rate < lowestRate) { lowestRate = rate; weakest = day }
  }
  return DAY_NAMES[weakest]
}

function getFireEmoji(streak: number): string {
  if (streak >= 66) return '🔥🔥🔥'
  if (streak >= 30) return '🔥🔥'
  if (streak >= 7) return '🔥'
  return ''
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'rgba(128,128,128,0.12)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
)

function EmptyState({ icon: Icon, heading, subtext, isDark = false }: { icon: React.ElementType; heading: string; subtext: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), marginBottom: 16 }} />
      <p style={{ fontFamily: 'Inter, sans-serif', color: '#94a3b8', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ fontFamily: 'Inter, sans-serif', color: '#94a3b8', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

function HabitsInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const searchParams = useSearchParams()

  const pageBg = isDark ? '#0f1117' : '#f8fafc'
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'

  const inputStyle = {
    background: isDark ? '#0f1117' : '#f8fafc',
    border: `1px solid ${borderColor}`,
    borderRadius: '8px',
    color: textPrimary,
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties

  const selectStyle = { ...inputStyle, cursor: 'pointer' } as React.CSSProperties

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  } as React.CSSProperties

  const labelStyle = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

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
  const [milestoneCards, setMilestoneCards] = useState<Record<string, MilestoneCard>>({})
  const [fetchingMilestone, setFetchingMilestone] = useState<Record<string, boolean>>({})
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

  const getDismissedMilestones = useCallback((): Record<string, number> => {
    try {
      const stored = localStorage.getItem(MILESTONE_DISMISS_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch { return {} }
  }, [])

  const dismissMilestone = useCallback((habitId: string) => {
    setMilestoneCards(prev => {
      const next = { ...prev }
      delete next[habitId]
      return next
    })
    const dismissed = getDismissedMilestones()
    const card = milestoneCards[habitId]
    if (card) {
      dismissed[habitId] = card.milestone
      try { localStorage.setItem(MILESTONE_DISMISS_KEY, JSON.stringify(dismissed)) } catch {}
    }
  }, [milestoneCards, getDismissedMilestones])

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

  useEffect(() => {
    if (loading || habits.length === 0) return
    const dismissed = getDismissedMilestones()
    habits.filter(h => h.name && h.name.trim() !== '').forEach(habit => {
      const streak = getStreak(habit.id, completions)
      if (streak === 0) return
      const currentMilestone = MILESTONES.filter(m => m <= streak).pop() || 0
      if (currentMilestone === 0) return
      const lastDismissed = dismissed[habit.id] || 0
      if (currentMilestone <= lastDismissed) return
      if (milestoneCards[habit.id] || fetchingMilestone[habit.id]) return
      setFetchingMilestone(prev => ({ ...prev, [habit.id]: true }))
      fetch('/api/life/habits/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitName: habit.name, habitId: habit.id, streak }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.message) {
            setMilestoneCards(prev => ({
              ...prev,
              [habit.id]: { habitId: habit.id, message: data.message, milestone: data.milestone },
            }))
          }
          setFetchingMilestone(prev => ({ ...prev, [habit.id]: false }))
        })
        .catch(() => setFetchingMilestone(prev => ({ ...prev, [habit.id]: false })))
    })
  }, [loading, habits, completions]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleHabit(habitId: string, date: string) {
    const wasDone = !!completions[date]?.[habitId]
    setCompletions(prev => {
      const updated = { ...prev, [date]: { ...(prev[date] || {}) } }
      if (updated[date][habitId]) { delete updated[date][habitId] } else { updated[date][habitId] = true }
      return updated
    })
    try {
      const res = await fetch('/api/life/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', date, habitId }),
      })
      const data = await res.json()
      if (data.completions) setCompletions(data.completions)
    } catch {
      setCompletions(prev => {
        const reverted = { ...prev, [date]: { ...(prev[date] || {}) } }
        if (wasDone) { reverted[date][habitId] = true } else { delete reverted[date][habitId] }
        return reverted
      })
    }
    if (wasDone && date === today && currentHour >= 21) setMissPrompt({ habitId, date })
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
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry: { ...form } }),
    })
    const data = await res.json()
    setHabits(data.habits || [])
    setShowForm(false)
    setForm({ name: '', stack: 'Morning', intention: '', twoMinute: '', whyMatters: '', frequency: 'Daily', customDays: [] })
  }

  async function deleteHabit(id: string) {
    setHabits(prev => prev.filter(h => h.id !== id))
    try {
      const res = await fetch(`/api/life/habits?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.habits) setHabits(data.habits)
    } catch {
      fetch('/api/life/habits').then(r => r.json()).then(d => { if (d.habits) setHabits(d.habits) }).catch(() => {})
    }
  }

  const validHabits = habits.filter(h => h.name && h.name.trim() !== '')
  const todayCompleted = validHabits.filter(h => completions[today]?.[h.id]).length
  const dailyScore = validHabits.length === 0 ? null : Math.round((todayCompleted / validHabits.length) * 100)
  const scoreColor = dailyScore === null
    ? '#94a3b8'
    : dailyScore >= 80 ? '#10b981'
    : dailyScore >= 50 ? '#60a5fa'
    : '#f59e0b'
  const stackHabits = (stack: Stack) => validHabits.filter(h => (h.stack || 'Morning') === stack)

  return (
    <div style={{ background: pageBg, minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Page Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0 }}>Habits</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#475569', marginTop: 4, marginBottom: 0 }}>Track your daily habit stacks</p>
          </div>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            {validHabits.length > 0 && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '6px 12px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
                {todayCompleted}/{validHabits.length} today
              </div>
            )}
            <button
              onClick={() => setShowWeeklyReview(!showWeeklyReview)}
              style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}
            >
              Weekly Review
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> New Habit
            </button>
          </div>
        </div>

        {/* Daily Habit Score compact stat card */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, padding: '14px 20px' }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 4 }}>TODAY'S HABIT SCORE</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 32, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {dailyScore === null ? '--' : `${dailyScore}%`}
            </div>
          </div>
          {dailyScore !== null && (
            <div style={{ flex: 1, maxWidth: 200 }}>
              <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: dailyScore + '%', background: scoreColor, borderRadius: 4, transition: 'width 0.7s ease' }} />
              </div>
              <div style={{ ...labelStyle, marginTop: 6, fontSize: 10 }}>{todayCompleted} of {validHabits.length} habits done</div>
            </div>
          )}
        </div>

        {/* TODAY'S HABITS */}
        {validHabits.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>TODAY'S HABITS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STACKS.map(({ key, label, icon, color }) => {
                const stackItems = stackHabits(key)
                if (stackItems.length === 0) return null
                return (
                  <div key={key}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color, marginBottom: 6, textTransform: 'uppercase' }}>{icon} {label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {stackItems.map(h => {
                        const done = completions[today]?.[h.id] || false
                        const streak = getStreak(h.id, completions)
                        const fireEmoji = getFireEmoji(streak)
                        return (
                          <button
                            key={h.id}
                            onClick={() => toggleHabit(h.id, today)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 8,
                              border: `1px solid ${done ? '#60a5fa40' : borderColor}`,
                              background: done ? 'rgba(96,165,250,0.06)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
                              border: `2px solid ${done ? '#60a5fa' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1')}`,
                              background: done ? '#60a5fa' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, transition: 'all 0.15s',
                            }}>
                              {done && <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 700 }}>&#10003;</span>}
                            </div>
                            <span style={{
                              fontFamily: 'Inter, sans-serif', fontSize: 14,
                              color: done ? '#94a3b8' : textPrimary,
                              textDecoration: done ? 'line-through' : 'none', flex: 1,
                            }}>{h.name}</span>
                            {streak > 0 && (
                              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                <Flame size={10} />{streak}d {fireEmoji}
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
        {showWeeklyReview && validHabits.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div style={{ ...labelStyle }}>WEEKLY REVIEW</div>
              <button onClick={() => setShowWeeklyReview(false)} style={{ background: 'none', border: 'none', color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {validHabits.map(h => {
                const rate7 = getCompletionRate(h.id, completions, 7)
                const weakDay = getWeakestDay(h.id, completions)
                const streak = getStreak(h.id, completions)
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{h.name}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', margin: '2px 0 0 0' }}>Weakest day: {weakDay}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: rate7 >= 80 ? '#10b981' : rate7 >= 50 ? '#f59e0b' : '#ef4444', margin: 0 }}>{rate7}%</p>
                      <p style={{ ...labelStyle, margin: 0, fontSize: 10 }}>7-day rate</p>
                    </div>
                    {streak > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={14} />{streak}</p>
                        <p style={{ ...labelStyle, margin: 0, fontSize: 10 }}>streak</p>
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
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>NEW HABIT</div>
            <form onSubmit={addHabit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>HABIT NAME</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none' }}
                  placeholder="e.g. Morning meditation" required />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>STACK</label>
                <select value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value as Stack }))} style={selectStyle}>
                  <option value="Morning">Morning Stack</option>
                  <option value="Trading">Trading Stack</option>
                  <option value="Evening">Evening Stack</option>
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>IMPLEMENTATION INTENTION</label>
                <input value={form.intention} onChange={e => setForm(f => ({ ...f, intention: e.target.value }))} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none' }}
                  placeholder="I will [habit] at [time] in/at [location]" />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>FREQUENCY</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Frequency }))} style={selectStyle}>
                  <option value="Daily">Daily</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Custom">Custom Days</option>
                </select>
              </div>
              {form.frequency === 'Custom' && (
                <div>
                  <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>CUSTOM DAYS</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {DAY_NAMES.map((d, i) => (
                      <button key={i} type="button"
                        onClick={() => setForm(f => ({ ...f, customDays: f.customDays.includes(i) ? f.customDays.filter(x => x !== i) : [...f.customDays, i] }))}
                        style={{
                          flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, padding: '6px 0', borderRadius: 6,
                          background: form.customDays.includes(i) ? 'rgba(37,99,235,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                          border: `1px solid ${form.customDays.includes(i) ? 'rgba(37,99,235,0.5)' : borderColor}`,
                          color: form.customDays.includes(i) ? '#60a5fa' : '#94a3b8',
                          cursor: 'pointer',
                        }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>2-MINUTE VERSION</label>
                <input value={form.twoMinute} onChange={e => setForm(f => ({ ...f, twoMinute: e.target.value }))} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none' }}
                  placeholder="The 2-minute version of this habit is..." />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>WHY IT MATTERS</label>
                <input value={form.whyMatters} onChange={e => setForm(f => ({ ...f, whyMatters: e.target.value }))} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none' }}
                  placeholder="One line — why does this habit matter?" />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', display: 'flex', gap: 10 }}>
                <button type="submit" style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '10px 20px', cursor: 'pointer' }}>Add Habit</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Miss Reason Prompt */}
        {missPrompt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
            <div style={{ ...cardStyle, maxWidth: 360, width: '100%', margin: '0 16px', padding: 24 }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 4 }}>Why did you skip today?</h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#475569', marginBottom: 16 }}>{validHabits.find(h => h.id === missPrompt.habitId)?.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {MISS_REASONS.map(reason => (
                  <button key={reason} onClick={() => setMissReason(reason)} style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 12px', borderRadius: 8,
                    background: missReason === reason ? 'rgba(96,165,250,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    border: `1px solid ${missReason === reason ? 'rgba(96,165,250,0.5)' : borderColor}`,
                    color: missReason === reason ? '#60a5fa' : '#475569',
                    cursor: 'pointer',
                  }}>{reason}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveMissReason} disabled={!missReason} style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '10px 0', cursor: missReason ? 'pointer' : 'not-allowed', flex: 1, opacity: missReason ? 1 : 0.4 }}>Log It</button>
                <button onClick={() => setMissPrompt(null)} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 0', cursor: 'pointer', flex: 1 }}>Skip</button>
              </div>
            </div>
          </div>
        )}

        {/* MANAGE HABITS */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <Skeleton height="50px" />
            <Skeleton height="50px" />
            <Skeleton height="50px" />
            <Skeleton height="50px" />
          </div>
        ) : validHabits.length === 0 ? (
          <EmptyState icon={CheckCircle2} heading="NO HABITS YET" isDark={isDark} subtext="Add your first habit below to start building your streak." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...labelStyle, marginBottom: 4 }}>MANAGE HABITS</div>
            {STACKS.map(({ key, label, icon, color }) => {
              const items = stackHabits(key)
              if (items.length === 0) return null
              const isExpanded = expandedStack === key
              const doneCount = items.filter(h => completions[today]?.[h.id]).length
              return (
                <div key={key} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedStack(isExpanded ? null : key)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <div>
                        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color, margin: 0, textTransform: 'uppercase' }}>{label}</h3>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94a3b8', margin: '2px 0 0 0' }}>{doneCount}/{items.length} done today</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: (items.length > 0 ? (doneCount / items.length * 100) : 0) + '%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#94a3b8' }}>{isExpanded ? '&#9650;' : '&#9660;'}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {items.map(habit => {
                        const streak = getStreak(habit.id, completions)
                        const todayDone = completions[today]?.[habit.id] || false
                        const fireEmoji = getFireEmoji(streak)
                        const isLockedIn = streak >= 66
                        const milestoneCard = milestoneCards[habit.id]
                        return (
                          <div key={habit.id} style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}`, borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                              <button
                                onClick={() => toggleHabit(habit.id, today)}
                                style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${todayDone ? '#60a5fa' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1')}`, background: todayDone ? '#60a5fa' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s', marginTop: 2 }}
                              >
                                {todayDone && <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 700 }}>&#10003;</span>}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: todayDone ? '#94a3b8' : textPrimary, textDecoration: todayDone ? 'line-through' : 'none' }}>{habit.name}</span>
                                  {isLockedIn && (
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', color: '#f59e0b', textTransform: 'uppercase' }}>LOCKED IN &#127942;</span>
                                  )}
                                  {streak > 0 && (
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}><Flame size={10} />{streak}d {fireEmoji}</span>
                                  )}
                                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: '#94a3b8', textTransform: 'uppercase' }}>{habit.frequency || 'Daily'}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
                                  {streak > 0 ? `Day ${streak} · ${Math.max(0, 66 - streak)} days to make it permanent` : 'Start your streak today'}
                                </div>
                                <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', borderRadius: 1, marginTop: 4 }}>
                                  <div style={{ height: 2, width: `${Math.min(100, (streak / 66) * 100)}%`, background: streak >= 66 ? '#10b981' : '#60a5fa', borderRadius: 1, transition: 'width 0.3s ease' }} />
                                </div>
                                {habit.intention && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#475569', marginTop: 4 }}>{habit.intention}</p>}
                                {habit.whyMatters && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{habit.whyMatters}</p>}
                                {habit.twoMinute && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>2-min: {habit.twoMinute}</p>}
                              </div>
                              <button onClick={() => deleteHabit(habit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, flexShrink: 0 }}>
                                <Trash2 size={11} style={{ color: '#ef4444' }} />
                              </button>
                            </div>

                            {/* Coach Shai Milestone Card */}
                            {milestoneCard && (
                              <div style={{ position: 'relative', background: isDark ? 'rgba(96,165,250,0.05)' : 'rgba(37,99,235,0.04)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                                <button onClick={() => dismissMilestone(habit.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}>
                                  <X size={12} />
                                </button>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 6 }}>&#9889; COACH SHAI</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, lineHeight: 1.5, margin: 0, paddingRight: 20 }}>{milestoneCard.message.replace(/**(.*?)**/g, '$1').replace(/*(.*?)*/g, '$1')}</p>
                              </div>
                            )}
                            <div>
                              <p style={{ ...labelStyle, marginBottom: 6 }}>LAST 30 DAYS</p>
                              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {last30.map(date => {
                                  const done = completions[date]?.[habit.id]
                                  const isToday = date === today
                                  const hasMissReason = missLog[date]?.[habit.id]
                                  return (
                                    <button
                                      key={date}
                                      onClick={() => toggleHabit(habit.id, date)}
                                      title={date + (hasMissReason ? ' — Missed: ' + hasMissReason : '')}
                                      style={{
                                        width: 18, height: 18, borderRadius: 3,
                                        background: done ? color : hasMissReason ? 'rgba(239,68,68,0.25)' : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                                        border: isToday ? `1px solid ${color}` : `1px solid ${borderColor}`,
                                        cursor: 'pointer', opacity: done ? 1 : 0.7, transition: 'transform 0.1s',
                                      }}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                            {missLog[today]?.[habit.id] && (
                              <div style={{ marginTop: 8 }}>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', textTransform: 'uppercase' }}>Missed: {missLog[today][habit.id]}</span>
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
          habits: validHabits.map(h => ({
            name: h.name, stack: h.stack, intention: h.intention, whyMatters: h.whyMatters,
            frequency: h.frequency, streak: getStreak(h.id, completions),
            completionRate7d: getCompletionRate(h.id, completions, 7),
            completionRate30d: getCompletionRate(h.id, completions, 30),
            weakestDay: getWeakestDay(h.id, completions),
            todayDone: !!completions[today]?.[h.id],
          })),
          totalHabits: validHabits.length,
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
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>Loading...</div></div>}>
      <HabitsInner />
    </Suspense>
  )
}
