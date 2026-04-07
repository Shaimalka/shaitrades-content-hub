'use client'

import { useState, useEffect, Suspense } from 'react'
import { Plus, Trash2, Flame, CheckSquare, CheckCircle2 } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
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

const STACKS: { key: Stack; label: string; icon: string; color: string }[] = [
  { key: 'Morning', label: 'MORNING STACK', icon: '🌅', color: '#f59e0b' },
  { key: 'Trading', label: 'TRADING STACK', icon: '📈', color: '#2563eb' },
  { key: 'Evening', label: 'EVENING STACK', icon: '🌙', color: '#a78bfa' },
]

const MISS_REASONS = ['No time', 'Forgot', 'Too tired', 'Chose not to', 'Other']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MISS_KEY = 'life:habits:misslog'

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

function HabitsInner() {
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

  const selectStyle = { ...inputStyle, cursor: 'pointer' } as React.CSSProperties

  const cardStyle = {
    background: isDark ? '#111118' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px',
    padding: '20px',
  } as React.CSSProperties

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
      body: JSON.stringify({ action: 'toggle', date, habitId })
    })
    const data = await res.json()
    setCompletions(data.completions || {})
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
      body: JSON.stringify({ entry: { ...form } })
    })
    const data = await res.json()
    setHabits(data.habits || [])
    setShowForm(false)
    setForm({ name: '', stack: 'Morning', intention: '', twoMinute: '', whyMatters: '', frequency: 'Daily', customDays: [] })
  }

  // Bug 2 fix: use DELETE method instead of POST with action:'delete'
  async function deleteHabit(id: string) {
    const res = await fetch(`/api/life/habits?id=${id}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    setHabits(data.habits || [])
  }

  // Bug 3 fix: filter out habits with no name
  const validHabits = habits.filter(h => h.name && h.name.trim() !== '')

  const todayCompleted = validHabits.filter(h => completions[today]?.[h.id]).length
  const dailyScore = validHabits.length === 0 ? null : Math.round((todayCompleted / validHabits.length) * 100)
  const scoreColor = dailyScore === null
    ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')
    : dailyScore >= 80 ? '#00c48c' : dailyScore >= 50 ? '#2563eb' : '#f59e0b'

  // Bug 3 fix: stackHabits filters by stack AND name
  const stackHabits = (stack: Stack) => validHabits.filter(h => (h.stack || 'Morning') === stack)

  return (
    <div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Daily Habit Score */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 24, padding: '32px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isMobile ? '56px' : '72px', fontWeight: 700, color: scoreColor, lineHeight: 1, letterSpacing: '-2px' }}>
            {dailyScore === null ? '--' : `${dailyScore}%`}
          </span>
          <span style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.2em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>
            TODAY'S HABIT SCORE
          </span>
          {dailyScore !== null && (
            <div style={{ marginTop: 16, width: isMobile ? '160px' : '200px', height: 4, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: dailyScore + '%', background: scoreColor, borderRadius: 4, transition: 'width 0.7s ease' }} />
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <Link href="/life" style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← LIFE HUB</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>Habits</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 2 }}>Track your daily habit stacks</p>
          </div>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            {validHabits.length > 0 && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '6px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563eb' }}>
                {todayCompleted}/{validHabits.length} today
              </div>
            )}
            <button onClick={() => setShowWeeklyReview(!showWeeklyReview)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>
              Weekly Review
            </button>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Habit
            </button>
          </div>
        </div>

        {/* Bug 4 fix: Label top section clearly as TODAY'S HABITS */}
        {validHabits.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 16, margin: '0 0 16px 0' }}>TODAY'S HABITS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STACKS.map(({ key, label, icon, color }) => {
                const stackItems = stackHabits(key)
                if (stackItems.length === 0) return null
                return (
                  <div key={key}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color, marginBottom: 6, textTransform: 'uppercase' }}>{icon} {label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {stackItems.map(h => {
                        const done = completions[today]?.[h.id] || false
                        return (
                          <button
                            key={h.id}
                            onClick={() => toggleHabit(h.id, today)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${done ? color + '40' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')}`, background: done ? color + '12' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'), cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                          >
                            {/* Bug 1 fix: checkbox always shows white checkmark on blue fill */}
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${done ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: done ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                              {done && <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                            </div>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: done ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : (isDark ? '#ffffff' : '#0a0a0f'), textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{h.name}</span>
                            {getStreak(h.id, completions) > 0 && (
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
        {showWeeklyReview && validHabits.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>WEEKLY REVIEW</h3>
              <button onClick={() => setShowWeeklyReview(false)} style={{ background: 'none', border: 'none', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {validHabits.map(h => {
                const rate7 = getCompletionRate(h.id, completions, 7)
                const weakDay = getWeakestDay(h.id, completions)
                const streak = getStreak(h.id, completions)
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', borderRadius: 8, background: (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>{h.name}</p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: '2px 0 0 0' }}>Weakest day: {weakDay}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: rate7 >= 80 ? '#00c48c' : rate7 >= 50 ? '#f59e0b' : '#ff4d6a', margin: 0 }}>{rate7}%</p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>7-day rate</p>
                    </div>
                    {streak > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={14} />{streak}</p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>streak</p>
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
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 16 }}>New Habit</h3>
            <form onSubmit={addHabit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>HABIT NAME</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }} onBlur={e => { e.target.style.borderColor = (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'); e.target.style.boxShadow = 'none' }} placeholder="e.g. Morning meditation" required />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>STACK</label>
                <select value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value as Stack }))} style={selectStyle}>
                  <option value="Morning">Morning Stack</option>
                  <option value="Trading">Trading Stack</option>
                  <option value="Evening">Evening Stack</option>
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>IMPLEMENTATION INTENTION</label>
                <input value={form.intention} onChange={e => setForm(f => ({ ...f, intention: e.target.value }))} style={inputStyle} onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }} onBlur={e => { e.target.style.borderColor = (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'); e.target.style.boxShadow = 'none' }} placeholder="I will [habit] at [time] in/at [location]" />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>FREQUENCY</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Frequency }))} style={selectStyle}>
                  <option value="Daily">Daily</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Custom">Custom Days</option>
                </select>
              </div>
              {form.frequency === 'Custom' && (
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CUSTOM DAYS</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {DAY_NAMES.map((d, i) => (
                      <button key={i} type="button" onClick={() => setForm(f => ({ ...f, customDays: f.customDays.includes(i) ? f.customDays.filter(x => x !== i) : [...f.customDays, i] }))} style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '6px 0', borderRadius: 6, background: form.customDays.includes(i) ? 'rgba(37,99,235,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${form.customDays.includes(i) ? 'rgba(37,99,235,0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: form.customDays.includes(i) ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), cursor: 'pointer' }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>2-MINUTE VERSION</label>
                <input value={form.twoMinute} onChange={e => setForm(f => ({ ...f, twoMinute: e.target.value }))} style={inputStyle} onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }} onBlur={e => { e.target.style.borderColor = (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'); e.target.style.boxShadow = 'none' }} placeholder="The 2-minute version of this habit is..." />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>WHY IT MATTERS</label>
                <input value={form.whyMatters} onChange={e => setForm(f => ({ ...f, whyMatters: e.target.value }))} style={inputStyle} onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)' }} onBlur={e => { e.target.style.borderColor = (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'); e.target.style.boxShadow = 'none' }} placeholder="One line — why does this habit matter?" />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', display: 'flex', gap: 10 }}>
                <button type="submit" style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '10px 20px', cursor: 'pointer' }}>Add Habit</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Miss Reason Prompt */}
        {missPrompt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
            <div style={{ ...cardStyle, maxWidth: 360, width: '100%', margin: '0 16px', padding: 24 }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), marginBottom: 4 }}>Why did you skip today?</h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginBottom: 16 }}>{validHabits.find(h => h.id === missPrompt.habitId)?.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {MISS_REASONS.map(reason => (
                  <button key={reason} onClick={() => setMissReason(reason)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 12px', borderRadius: 8, background: missReason === reason ? 'rgba(37,99,235,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'), border: `1px solid ${missReason === reason ? 'rgba(37,99,235,0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: missReason === reason ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), cursor: 'pointer' }}>{reason}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveMissReason} disabled={!missReason} style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, padding: '10px 0', cursor: missReason ? 'pointer' : 'not-allowed', flex: 1, opacity: missReason ? 1 : 0.4 }}>Log It</button>
                <button onClick={() => setMissPrompt(null)} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 0', cursor: 'pointer', flex: 1 }}>Skip</button>
              </div>
            </div>
          </div>
        )}

        {/* Bug 4 fix: Label bottom section as MANAGE HABITS */}
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
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: '0 0 4px 0' }}>MANAGE HABITS</h3>
            {STACKS.map(({ key, label, icon, color }) => {
              const items = stackHabits(key)
              if (items.length === 0) return null
              const isExpanded = expandedStack === key
              const doneCount = items.filter(h => completions[today]?.[h.id]).length
              return (
                <div key={key} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <button onClick={() => setExpandedStack(isExpanded ? null : key)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <div>
                        <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color, margin: 0 }}>{label}</h3>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: '2px 0 0 0' }}>{doneCount}/{items.length} done today</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 4, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: (items.length > 0 ? (doneCount / items.length * 100) : 0) + '%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {items.map(habit => {
                        const streak = getStreak(habit.id, completions)
                        const todayDone = completions[today]?.[habit.id] || false
                        return (
                          <div key={habit.id} style={{ background: (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                              {/* Bug 1 fix: checkbox wired to toggleHabit with white checkmark */}
                              <button
                                onClick={() => toggleHabit(habit.id, today)}
                                style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${todayDone ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: todayDone ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s', marginTop: 2 }}
                              >
                                {todayDone && <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: todayDone ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : (isDark ? '#ffffff' : '#0a0a0f'), textDecoration: todayDone ? 'line-through' : 'none' }}>{habit.name}</span>
                                  {streak > 0 && (
                                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}><Flame size={10} />{streak} day streak</span>
                                  )}
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'), color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>{habit.frequency || 'Daily'}</span>
                                </div>
                                {habit.intention && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 4 }}>{habit.intention}</p>}
                                {habit.whyMatters && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), marginTop: 2 }}>{habit.whyMatters}</p>}
                                {habit.twoMinute && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), marginTop: 2, fontStyle: 'italic' }}>2-min: {habit.twoMinute}</p>}
                              </div>
                              {/* Bug 2 fix: delete button calls deleteHabit correctly */}
                              <button onClick={() => deleteHabit(habit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, flexShrink: 0 }}>
                                <Trash2 size={11} style={{ color: '#ff4d6a' }} />
                              </button>
                            </div>
                            <div>
                              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 6 }}>LAST 30 DAYS</p>
                              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {last30.map(date => {
                                  const done = completions[date]?.[habit.id]
                                  const isToday = date === today
                                  const hasMissReason = missLog[date]?.[habit.id]
                                  return (
                                    <button key={date} onClick={() => toggleHabit(habit.id, date)} title={date + (hasMissReason ? ' — Missed: ' + hasMissReason : '')} style={{ width: 18, height: 18, borderRadius: 3, background: done ? color : hasMissReason ? 'rgba(255,77,106,0.3)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), border: isToday ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', opacity: done ? 1 : 0.7, transition: 'transform 0.1s' }} />
                                  )
                                })}
                              </div>
                            </div>
                            {missLog[today]?.[habit.id] && (
                              <div style={{ marginTop: 8 }}>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.2)', color: '#ff4d6a' }}>Missed: {missLog[today][habit.id]}</span>
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
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(128,128,128,0.5)' }}>Loading...</div></div>}>
      <HabitsInner />
    </Suspense>
  )
}
