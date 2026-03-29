'use client'

import { useState, useEffect, Suspense } from 'react'
import { CheckSquare, Plus, Trash2, Flame } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Habit = {
  id: string
  name: string
  emoji: string
  frequency: 'daily' | 'weekly'
  createdAt: string
}

type Completions = Record<string, Record<string, boolean>>

function getLast30Days(): string[] {
  const days = []
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

function HabitsInner() {
  const searchParams = useSearchParams()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completions>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [form, setForm] = useState({ name: '', emoji: '✅', frequency: 'daily' as 'daily' | 'weekly' })

  const today = new Date().toISOString().split('T')[0]
  const last30 = getLast30Days()

  useEffect(() => {
    fetch('/api/life/habits').then(r => r.json()).then(d => {
      setHabits(d.habits || [])
      setCompletions(d.completions || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function toggleHabit(habitId: string, date: string) {
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', date, habitId }),
    })
    const data = await res.json()
    setCompletions(data.completions || {})
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setHabits(data.habits || [])
    setShowForm(false)
    setForm({ name: '', emoji: '✅', frequency: 'daily' })
  }

  async function deleteHabit(id: string) {
    const res = await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    const data = await res.json()
    setHabits(data.habits || [])
  }

  const todayCompleted = habits.filter(h => completions[today]?.[h.id]).length
  const EMOJIS = ['✅', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '💊']

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1000px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">HABITS</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Habit Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            {habits.length > 0 && (
              <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)', color: '#00f2ff' }}>
                {todayCompleted}/{habits.length} today
              </div>
            )}
            <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
              <Plus size={14} /> New Habit
            </button>
          </div>
        </div>

        {/* Add Habit Form */}
        {showForm && (
          <div className="cyber-panel p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW HABIT</h3>
            <form onSubmit={addHabit} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>EMOJI</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className={`w-8 h-8 text-sm rounded transition-all ${form.emoji === e ? 'ring-1 ring-cyan-400 bg-cyan-400/10' : 'opacity-50 hover:opacity-80'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>HABIT NAME</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="cyber-input w-full" placeholder="e.g. Morning workout" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>FREQUENCY</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as 'daily' | 'weekly' }))}
                  className="cyber-input">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <button type="submit" className="btn-cyber-primary">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : habits.length === 0 ? (
          <div className="cyber-panel p-8 text-center">
            <CheckSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>No habits created yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-cyber-primary">Create Your First Habit</button>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map(habit => {
              const streak = getStreak(habit.id, completions)
              const todayDone = completions[today]?.[habit.id] || false
              const weekRate = (() => {
                let done = 0
                for (let i = 0; i < 7; i++) {
                  const d = new Date(); d.setDate(d.getDate() - i)
                  if (completions[d.toISOString().split('T')[0]]?.[habit.id]) done++
                }
                return Math.round((done / 7) * 100)
              })()

              return (
                <div key={habit.id} className="cyber-panel p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={() => toggleHabit(habit.id, today)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${todayDone ? 'border-green-400 bg-green-400/20' : 'border-gray-600 hover:border-cyan-400'}`}
                    >
                      {todayDone ? <span className="text-green-400">✓</span> : null}
                    </button>
                    <span className="text-xl">{habit.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${todayDone ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--text-primary)' }}>
                        {habit.name}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {habit.frequency} · {weekRate}% this week
                      </p>
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1 text-xs font-mono" style={{ color: '#00ff88' }}>
                        <Flame size={12} />{streak}
                      </div>
                    )}
                    <button onClick={() => deleteHabit(habit.id)} className="opacity-30 hover:opacity-70">
                      <Trash2 size={12} style={{ color: '#ff00e5' }} />
                    </button>
                  </div>

                  {/* 30-day heatmap */}
                  <div className="flex gap-0.5 flex-wrap">
                    {last30.map(date => {
                      const done = completions[date]?.[habit.id]
                      return (
                        <button
                          key={date}
                          onClick={() => toggleHabit(habit.id, date)}
                          title={date}
                          className="w-5 h-5 rounded-sm transition-all hover:scale-110"
                          style={{
                            background: done ? '#00f2ff' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${done ? 'rgba(0,242,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LifeHubChat
        section="habits"
        apiRoute="/api/life/habits/chat"
        contextData={{ habits, completions }}
        systemPrompt="You are a habit tracking AI. Analyze consistency and streaks."
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
