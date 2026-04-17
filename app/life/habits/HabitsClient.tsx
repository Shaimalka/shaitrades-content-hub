'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { Plus, Trash2, Flame, CheckCircle2, X, Settings } from 'lucide-react'
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
  { key: 'Morning', label: 'Morning Stack', icon: '🌅', color: '#f59e0b' },
  { key: 'Trading', label: 'Trading Stack', icon: '📈', color: '#2563eb' },
  { key: 'Evening', label: 'Evening Stack', icon: '🌙', color: '#a78bfa' },
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
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)
  const [milestoneCards, setMilestoneCards] = useState<Record<string, MilestoneCard>>({})
  const [fetchingMilestone, setFetchingMilestone] = useState<Record<string, boolean>>({})
  const [editModeHabit, setEditModeHabit] = useState<string | null>(null)
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
      if (updated[date][habitId]) {
        delete updated[date][habitId]
      } else {
        updated[date][habitId] = true
      }
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
  const stackHabits = (stack: Stack) => validHabits.filter(h => (h.stack || 'Morning') === stack)

  const firstMilestoneCard = Object.values(milestoneCards)[0] || null
  const todayInsight = firstMilestoneCard
    ? firstMilestoneCard.message.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    : dailyScore !== null
      ? dailyScore >= 80
        ? `You're on fire today — ${todayCompleted} of ${validHabits.length} habits locked. Consistency like this builds the identity you're after.`
        : dailyScore >= 50
          ? `Solid progress — ${todayCompleted} done. Even partial wins compound. Finish the day strong.`
          : `Every habit skipped is a vote against the identity you want. You still have time today to flip the script.`
      : 'Add habits and start tracking to unlock your daily brief.'

  return (
    <div style={{ background: pageBg, minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0 }}>Habits</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#475569', marginTop: 4, marginBottom: 0 }}>Track your daily habit stacks</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowWeeklyReview(!showWeeklyReview)}
              style={{ background: 'transparent', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: isDark ? '#f9fafb' : '#0f172a', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
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

        {/* Today's Progress Bar */}
        {validHabits.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, fontWeight: 500 }}>
                {todayCompleted} of {validHabits.length} habits done today
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                {dailyScore}%
              </span>
            </div>
            <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${dailyScore ?? 0}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {/* Weekly Review */}
        {showWeeklyReview && validHabits.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
          <div style={{ ...cardStyle, marginBottom: 20 }}>
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
                        style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, padding: '6px 0', borderRadius: 6, background: form.customDays.includes(i) ? 'rgba(37,99,235,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${form.customDays.includes(i) ? 'rgba(37,99,235,0.5)' : borderColor}`, color: form.customDays.includes(i) ? '#60a5fa' : '#94a3b8', cursor: 'pointer' }}>{d}</button>
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
                  <button key={reason} onClick={() => setMissReason(reason)}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 12px', borderRadius: 8, background: missReason === reason ? 'rgba(96,165,250,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${missReason === reason ? 'rgba(96,165,250,0.5)' : borderColor}`, color: missReason === reason ? '#60a5fa' : '#475569', cursor: 'pointer' }}>
                    {reason}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveMissReason} disabled={!missReason}
                  style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '10px 0', cursor: missReason ? 'pointer' : 'not-allowed', flex: 1, opacity: missReason ? 1 : 0.4 }}>
                  Log It
                </button>
                <button onClick={() => setMissPrompt(null)}
                  style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 0', cursor: 'pointer', flex: 1 }}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <Skeleton height="50px" /><Skeleton height="50px" /><Skeleton height="50px" />
          </div>
        ) : validHabits.length === 0 ? (
          <EmptyState icon={CheckCircle2} heading="NO HABITS YET" isDark={isDark} subtext="Add your first habit above to start building your streak." />
        ) : (
          <>
            {/* Today's Habits */}
            <div style={{ ...cardStyle, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ ...labelStyle }}>TODAY'S HABITS</div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94a3b8' }}>{todayCompleted}/{validHabits.length} done</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {STACKS.map(({ key, label, icon, color }) => {
                  const stackItems = stackHabits(key)
                  if (stackItems.length === 0) return null
                  return (
                    <div key={key}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color, marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: `1px solid ${borderColor}` }}>
                        <span>{icon}</span> {label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stackItems.map(h => {
                          const done = completions[today]?.[h.id] || false
                          const streak = getStreak(h.id, completions)
                          const isEditing = editModeHabit === h.id
                          return (
                            <div key={h.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${done ? '#60a5fa40' : borderColor}`, background: done ? 'rgba(96,165,250,0.06)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'), transition: 'all 0.15s' }}>
                                <button
                                  onClick={() => toggleHabit(h.id, today)}
                                  style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${done ? '#60a5fa' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1')}`, background: done ? '#60a5fa' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
                                >
                                  {done && <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 700 }}>&#10003;</span>}
                                </button>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: done ? '#94a3b8' : textPrimary, textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{h.name}</span>
                                {streak > 0 && (
                                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', flexShrink: 0 }}>
                                    {streak}d 🔥
                                  </span>
                                )}
                                <button
                                  onClick={() => setEditModeHabit(isEditing ? null : h.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center' }}
                                >
                                  <Settings size={12} style={{ color: isDark ? '#94a3b8' : '#475569' }} />
                                </button>
                              </div>
                              {isEditing && (
                                <div style={{ marginTop: 6, padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => { deleteHabit(h.id); setEditModeHabit(null) }}
                                    style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
                                  >
                                    <Trash2 size={10} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Coach Shai Card */}
            <div style={{ background: isDark ? '#0f1117' : '#f8fafc', borderLeft: '3px solid #60a5fa', borderRadius: 12, padding: '18px 20px', marginBottom: 20, border: `1px solid ${borderColor}`, borderLeftColor: '#60a5fa', borderLeftWidth: 3 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60a5fa', marginBottom: 10 }}>
                🧠 COACH SHAI
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: textPrimary, lineHeight: 1.6, margin: 0 }}>{todayInsight}</p>
              {firstMilestoneCard && (
                <button onClick={() => dismissMilestone(firstMilestoneCard.habitId)}
                  style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#475569', padding: 0 }}>
                  Dismiss ×
                </button>
              )}
            </div>

            {/* 66-Day Lock-In */}
            {validHabits.filter(h => getStreak(h.id, completions) < 66).length > 0 && (
              <div style={{ ...cardStyle }}>
                <div style={{ ...labelStyle, marginBottom: 16 }}>66-DAY LOCK-IN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {validHabits
                    .filter(h => getStreak(h.id, completions) < 66)
                    .sort((a, b) => getStreak(b.id, completions) - getStreak(a.id, completions))
                    .map(h => {
                      const streak = getStreak(h.id, completions)
                      const pct = Math.min(100, Math.round((streak / 66) * 100))
                      return (
                        <div key={h.id}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: textPrimary }}>{h.name}</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Day {streak} / 66</span>
                          </div>
                          <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: pct + '%', background: streak >= 30 ? '#10b981' : '#60a5fa', borderRadius: 3, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
