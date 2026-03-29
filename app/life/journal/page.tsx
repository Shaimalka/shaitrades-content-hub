'use client'

import { useState, useEffect, Suspense } from 'react'
import { BookOpen, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type JournalEntry = {
  id: string
  date: string
  morningFocus: string
  eveningLearning: string
  freeWrite: string
  mood: 'Focused' | 'Anxious' | 'Motivated' | 'Tired' | 'Grateful'
  createdAt: string
  updatedAt?: string
}

const MOODS = ['Focused', 'Anxious', 'Motivated', 'Tired', 'Grateful'] as const
const MOOD_COLORS: Record<string, string> = {
  Focused: '#00f2ff',
  Anxious: '#ff00e5',
  Motivated: '#00ff88',
  Tired: '#ffb400',
  Grateful: '#ff88ff',
}
const MOOD_EMOJIS: Record<string, string> = {
  Focused: '🎯',
  Anxious: '😰',
  Motivated: '🚀',
  Tired: '😴',
  Grateful: '🙏',
}

function JournalInner() {
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)

  const [form, setForm] = useState({
    date: today,
    morningFocus: '',
    eveningLearning: '',
    freeWrite: '',
    mood: 'Focused' as JournalEntry['mood'],
  })

  useEffect(() => {
    fetch('/api/life/journal').then(r => r.json()).then(d => {
      setEntries(d.entries || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (todayEntry) {
      setForm({
        date: todayEntry.date,
        morningFocus: todayEntry.morningFocus || '',
        eveningLearning: todayEntry.eveningLearning || '',
        freeWrite: todayEntry.freeWrite || '',
        mood: todayEntry.mood || 'Focused',
      })
    }
  }, [todayEntry?.id])

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/life/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry: { ...form, id: todayEntry?.id } }),
    })
    const data = await res.json()
    setEntries(data.entries || [])
  }

  const pastEntries = entries.filter(e => e.date !== today).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[900px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">DAILY JOURNAL</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Journal</h1>
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {entries.length} entries
          </div>
        </div>

        {/* Today's Entry */}
        <div className="cyber-panel p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-label">TODAY · {today}</h3>
            {todayEntry && (
              <span className="badge-pill" style={{ color: MOOD_COLORS[todayEntry.mood], borderColor: MOOD_COLORS[todayEntry.mood] + '40', background: MOOD_COLORS[todayEntry.mood] + '12' }}>
                {MOOD_EMOJIS[todayEntry.mood]} {todayEntry.mood}
              </span>
            )}
          </div>

          <form onSubmit={saveEntry} className="space-y-4">
            {/* Mood */}
            <div>
              <label className="text-xs font-mono mb-2 block" style={{ color: 'var(--text-muted)' }}>MOOD TAG</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(mood => (
                  <button key={mood} type="button"
                    onClick={() => setForm(f => ({ ...f, mood }))}
                    className="px-3 py-1.5 text-xs font-mono font-semibold rounded-full transition-all"
                    style={{
                      color: form.mood === mood ? MOOD_COLORS[mood] : 'var(--text-muted)',
                      borderColor: form.mood === mood ? MOOD_COLORS[mood] + '60' : 'var(--border-subtle)',
                      background: form.mood === mood ? MOOD_COLORS[mood] + '15' : 'transparent',
                      border: '1px solid',
                    }}>
                    {MOOD_EMOJIS[mood]} {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Morning Focus */}
            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>
                🌅 MORNING — What's my #1 focus today?
              </label>
              <input value={form.morningFocus} onChange={e => setForm(f => ({ ...f, morningFocus: e.target.value }))}
                className="cyber-input w-full" placeholder="My #1 focus today is..." />
            </div>

            {/* Evening Learning */}
            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>
                🌙 EVENING — What did I learn today?
              </label>
              <input value={form.eveningLearning} onChange={e => setForm(f => ({ ...f, eveningLearning: e.target.value }))}
                className="cyber-input w-full" placeholder="Today I learned..." />
            </div>

            {/* Free Write */}
            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>
                ✍️ FREE WRITE
              </label>
              <textarea value={form.freeWrite} onChange={e => setForm(f => ({ ...f, freeWrite: e.target.value }))}
                className="cyber-input w-full h-32 resize-none" placeholder="Write anything on your mind..." />
            </div>

            <button type="submit" className="btn-cyber-primary">
              {todayEntry ? 'Update Entry' : 'Save Entry'}
            </button>
          </form>
        </div>

        {/* Past Entries */}
        {pastEntries.length > 0 && (
          <div>
            <h3 className="section-label mb-4">PAST ENTRIES</h3>
            <div className="space-y-2">
              {pastEntries.map(entry => {
                const isExpanded = expanded === entry.id
                const preview = entry.morningFocus || entry.freeWrite || entry.eveningLearning || ''
                return (
                  <div key={entry.id} className="cyber-panel overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{entry.date}</span>
                        <span className="badge-pill text-[10px]" style={{ color: MOOD_COLORS[entry.mood], borderColor: MOOD_COLORS[entry.mood] + '40', background: MOOD_COLORS[entry.mood] + '12' }}>
                          {MOOD_EMOJIS[entry.mood]} {entry.mood}
                        </span>
                        <span className="text-xs truncate max-w-[300px]" style={{ color: 'var(--text-secondary)' }}>
                          {preview.slice(0, 80)}{preview.length > 80 ? '...' : ''}
                        </span>
                      </div>
                      {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        {entry.morningFocus && (
                          <div className="pt-3">
                            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>🌅 FOCUS</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.morningFocus}</p>
                          </div>
                        )}
                        {entry.eveningLearning && (
                          <div>
                            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>🌙 LEARNED</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.eveningLearning}</p>
                          </div>
                        )}
                        {entry.freeWrite && (
                          <div>
                            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>✍️ FREE WRITE</p>
                            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{entry.freeWrite}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading && <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>}
      </div>

      <LifeHubChat
        section="journal"
        apiRoute="/api/life/journal/chat"
        contextData={{ entries: entries.slice(-30) }}
        systemPrompt="You are a personal journal AI. Analyze themes, emotions, and patterns in journal entries."
        defaultOpen={chatOpen}
      />
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <JournalInner />
    </Suspense>
  )
}
