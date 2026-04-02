'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { NotebookPen, ChevronDown, ChevronUp } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type MoodTag = 'Focused' | 'Anxious' | 'Motivated' | 'Tired' | 'Grateful' | 'Neutral' | 'Proud' | 'Disappointed'
type TradingMindset = 'Confident' | 'Cautious' | 'Uncertain' | 'Sharp' | 'Emotional'

type JournalEntry = {
  id: string
  date: string
  morningFocus?: string
  tradingMindset?: TradingMindset
  grateful?: string
  intention?: string
  hitFocus?: boolean
  hitFocusNotes?: string
  bestMoment?: string
  doDifferently?: string
  eveningMindsetRating?: number
  moodTags?: MoodTag[]
  createdAt: string
  updatedAt: string
}

const MINDSET_OPTIONS: TradingMindset[] = ['Confident', 'Cautious', 'Uncertain', 'Sharp', 'Emotional']
const MOOD_TAGS: MoodTag[] = ['Focused', 'Anxious', 'Motivated', 'Tired', 'Grateful', 'Neutral', 'Proud', 'Disappointed']
const MOOD_COLORS: Record<MoodTag, string> = {
  Focused: '#00f2ff', Anxious: '#ff2d78', Motivated: '#00ff88', Tired: '#888',
  Grateful: '#ffb400', Neutral: '#aaa', Proud: '#c084fc', Disappointed: '#f97316'
}
const MINDSET_COLORS: Record<TradingMindset, string> = {
  Confident: '#00ff88', Cautious: '#ffb400', Uncertain: '#888', Sharp: '#00f2ff', Emotional: '#ff2d78'
}
const MOOD_BORDER: Record<MoodTag, string> = {
  Focused: '#00f2ff', Anxious: '#ff2d78', Motivated: '#00ff88', Tired: '#555',
  Grateful: '#ffb400', Neutral: '#666', Proud: '#c084fc', Disappointed: '#f97316'
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getPrimaryMood(entry: JournalEntry): MoodTag | null {
  return (entry.moodTags && entry.moodTags.length > 0) ? entry.moodTags[0] : null
}

function JournalInner() {
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)

  const [morning, setMorning] = useState({
    morningFocus: '',
    tradingMindset: 'Sharp' as TradingMindset,
    grateful: '',
    intention: '',
  })
  const [evening, setEvening] = useState({
    hitFocus: null as boolean | null,
    hitFocusNotes: '',
    bestMoment: '',
    doDifferently: '',
    eveningMindsetRating: 7,
    moodTags: [] as MoodTag[],
  })
  const [saving, setSaving] = useState<'morning' | 'evening' | null>(null)
  const [saved, setSaved] = useState<'morning' | 'evening' | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/life/journal')
      const d = await res.json()
      const fetched: JournalEntry[] = Array.isArray(d.data) ? d.data : []
      setEntries(fetched)
    } catch (err) {
      console.error('[journal page] fetchEntries error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (todayEntry) {
      setMorning({
        morningFocus: todayEntry.morningFocus || '',
        tradingMindset: todayEntry.tradingMindset || 'Sharp',
        grateful: todayEntry.grateful || '',
        intention: todayEntry.intention || '',
      })
      setEvening({
        hitFocus: todayEntry.hitFocus ?? null,
        hitFocusNotes: todayEntry.hitFocusNotes || '',
        bestMoment: todayEntry.bestMoment || '',
        doDifferently: todayEntry.doDifferently || '',
        eveningMindsetRating: todayEntry.eveningMindsetRating || 7,
        moodTags: todayEntry.moodTags || [],
      })
    }
  }, [todayEntry])

  async function saveMorning(e: React.FormEvent) {
    e.preventDefault()
    setSaving('morning')
    const entry = { date: today, ...morning }
    const payload = todayEntry
      ? { action: 'update', entry: { ...entry, id: todayEntry.id } }
      : { entry }
    try {
      const res = await fetch('/api/life/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('[journal page] saveMorning API error:', data)
      }
      if (Array.isArray(data.data)) {
        setEntries(data.data)
      } else {
        await fetchEntries()
      }
      setSaved('morning')
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      console.error('[journal page] saveMorning error:', err)
    } finally {
      setSaving(null)
    }
  }

  async function saveEvening(e: React.FormEvent) {
    e.preventDefault()
    setSaving('evening')
    const entry = { date: today, ...morning, ...evening }
    const payload = todayEntry
      ? { action: 'update', entry: { ...entry, id: todayEntry.id } }
      : { entry }
    try {
      const res = await fetch('/api/life/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('[journal page] saveEvening API error:', data)
      }
      if (Array.isArray(data.data)) {
        setEntries(data.data)
      } else {
        await fetchEntries()
      }
      setSaved('evening')
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      console.error('[journal page] saveEvening error:', err)
    } finally {
      setSaving(null)
    }
  }

  function toggleMoodTag(tag: MoodTag) {
    setEvening(e => ({
      ...e,
      moodTags: e.moodTags.includes(tag)
        ? e.moodTags.filter(t => t !== tag)
        : [...e.moodTags, tag]
    }))
  }

  const pastEntries = [...entries]
    .filter(e => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[900px] mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-header">JOURNAL</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Daily Journal</h1>
          </div>
          <NotebookPen size={32} style={{ color: '#ff00e5', opacity: 0.4 }} />
        </div>

        {/* MORNING ENTRY */}
        <div className="premium-card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.1rem' }}>🌅</span>
              <h2 className="text-sm font-mono font-semibold" style={{ color: '#ffb400' }}>MORNING ENTRY</h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{today}</span>
            </div>
            {saved === 'morning' && <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: '#00ff88', background: 'rgba(0,255,136,0.1)' }}>✓ SAVED</span>}
          </div>
          <form onSubmit={saveMorning} className="space-y-4">
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: 'var(--text-muted)' }}>🎯 What is my #1 focus today?</label>
              <input value={morning.morningFocus} onChange={e => setMorning(m => ({ ...m, morningFocus: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Execute 3 clean ES scalps" />
            </div>
            <div>
              <label className="text-xs font-mono mb-2 block" style={{ color: 'var(--text-muted)' }}>📊 My trading mindset going in is...</label>
              <div className="flex flex-wrap gap-2">
                {MINDSET_OPTIONS.map(m => (
                  <button key={m} type="button" onClick={() => setMorning(f => ({ ...f, tradingMindset: m }))}
                    className="px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-all"
                    style={morning.tradingMindset === m
                      ? { background: MINDSET_COLORS[m] + '22', borderColor: MINDSET_COLORS[m], color: MINDSET_COLORS[m] }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-panel)', color: 'var(--text-muted)' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: 'var(--text-muted)' }}>🙏 One thing I am grateful for today...</label>
              <input value={morning.grateful} onChange={e => setMorning(m => ({ ...m, grateful: e.target.value }))} className="cyber-input w-full" placeholder="e.g. My health, my edge, my discipline" />
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: 'var(--text-muted)' }}>✨ My intention for today is...</label>
              <input value={morning.intention} onChange={e => setMorning(m => ({ ...m, intention: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Stay patient. Only A+ setups." />
            </div>
            <button type="submit" disabled={saving === 'morning'} className="btn-cyber-primary w-full" style={{ opacity: saving === 'morning' ? 0.6 : 1 }}>
              {saving === 'morning' ? 'Saving...' : 'Save Morning Entry'}
            </button>
          </form>
        </div>

        {/* EVENING ENTRY */}
        <div className="premium-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.1rem' }}>🌙</span>
              <h2 className="text-sm font-mono font-semibold" style={{ color: '#c084fc' }}>EVENING ENTRY</h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{today}</span>
            </div>
            {saved === 'evening' && <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: '#00ff88', background: 'rgba(0,255,136,0.1)' }}>✓ SAVED</span>}
          </div>
          <form onSubmit={saveEvening} className="space-y-4">
            <div>
              <label className="text-xs font-mono mb-2 block" style={{ color: 'var(--text-muted)' }}>🎯 Did I hit my #1 focus?</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setEvening(e => ({ ...e, hitFocus: true }))}
                  className="px-4 py-2 rounded text-xs font-mono font-semibold border transition-all"
                  style={evening.hitFocus === true
                    ? { background: 'rgba(0,255,136,0.15)', borderColor: '#00ff88', color: '#00ff88' }
                    : { background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-panel)', color: 'var(--text-muted)' }}>✓ YES</button>
                <button type="button" onClick={() => setEvening(e => ({ ...e, hitFocus: false }))}
                  className="px-4 py-2 rounded text-xs font-mono font-semibold border transition-all"
                  style={evening.hitFocus === false
                    ? { background: 'rgba(255,45,120,0.1)', borderColor: '#ff2d78', color: '#ff2d78' }
                    : { background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-panel)', color: 'var(--text-muted)' }}>✗ NO</button>
              </div>
              <input value={evening.hitFocusNotes} onChange={e => setEvening(f => ({ ...f, hitFocusNotes: e.target.value }))} className="cyber-input w-full" placeholder="Notes on your focus..." />
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: 'var(--text-muted)' }}>⭐ Best moment of today...</label>
              <input value={evening.bestMoment} onChange={e => setEvening(f => ({ ...f, bestMoment: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Caught a perfect ES reversal" />
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: 'var(--text-muted)' }}>🔄 What would I do differently?</label>
              <input value={evening.doDifferently} onChange={e => setEvening(f => ({ ...f, doDifferently: e.target.value }))} className="cyber-input w-full" placeholder="e.g. Took 2 revenge trades after the loss" />
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>📊 How was my trading mindset today?</span>
                <span style={{ color: '#c084fc' }}>{evening.eveningMindsetRating}/10</span>
              </label>
              <input type="range" min="1" max="10" value={evening.eveningMindsetRating}
                onChange={e => setEvening(f => ({ ...f, eveningMindsetRating: parseInt(e.target.value) }))} className="w-full" />
              <div className="flex justify-between text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                <span>Chaotic</span><span>Locked in</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-mono mb-2 block" style={{ color: 'var(--text-muted)' }}>🏷️ Mood tags</label>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleMoodTag(tag)}
                    className="px-3 py-1 rounded text-xs font-mono border transition-all"
                    style={evening.moodTags.includes(tag)
                      ? { background: MOOD_COLORS[tag] + '22', borderColor: MOOD_COLORS[tag], color: MOOD_COLORS[tag] }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-panel)', color: 'var(--text-muted)' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving === 'evening'} className="btn-cyber-primary w-full" style={{ opacity: saving === 'evening' ? 0.6 : 1 }}>
              {saving === 'evening' ? 'Saving...' : 'Save Evening Entry'}
            </button>
          </form>
        </div>

        {/* PAST ENTRIES */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header" style={{ fontSize: '11px', letterSpacing: '4px' }}>
              // PAST ENTRIES · <span style={{ color: '#00ff88' }}>{pastEntries.length} LOGGED</span>
            </h2>
          </div>
          {loading ? (
            <div className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading entries...</div>
          ) : pastEntries.length === 0 ? (
            <div className="premium-card p-8 text-center">
              <NotebookPen size={28} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 12px' }} />
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Your journal history will appear here after your first entry
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastEntries.map(entry => {
                const primaryMood = getPrimaryMood(entry)
                const borderColor = primaryMood ? MOOD_BORDER[primaryMood] : 'rgba(0,242,255,0.15)'
                const isExpanded = expandedId === entry.id
                return (
                  <div key={entry.id} className="premium-card overflow-hidden" style={{ borderLeft: `3px solid ${borderColor}` }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left">
                      <div style={{ minWidth: '150px' }}>
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      {entry.tradingMindset ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: MINDSET_COLORS[entry.tradingMindset], borderColor: MINDSET_COLORS[entry.tradingMindset] + '55', background: MINDSET_COLORS[entry.tradingMindset] + '11' }}>
                          {entry.tradingMindset}
                        </span>
                      ) : <span style={{ minWidth: '60px' }} />}
                      {primaryMood ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: MOOD_COLORS[primaryMood], borderColor: MOOD_COLORS[primaryMood] + '55', background: MOOD_COLORS[primaryMood] + '11' }}>
                          {primaryMood}
                        </span>
                      ) : <span style={{ minWidth: '50px' }} />}
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-muted)', minWidth: 0 }}>
                        {entry.morningFocus
                          ? entry.morningFocus.slice(0, 60) + (entry.morningFocus.length > 60 ? '…' : '')
                          : entry.intention
                            ? entry.intention.slice(0, 60) + (entry.intention.length > 60 ? '…' : '')
                            : <span style={{ opacity: 0.4 }}>No focus logged</span>}
                      </span>
                      {entry.eveningMindsetRating != null && (
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: '#c084fc' }}>
                          {entry.eveningMindsetRating}/10
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {entry.morningFocus && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>🎯 #1 FOCUS</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.morningFocus}</p>
                            </div>
                          )}
                          {entry.tradingMindset && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>📊 MORNING MINDSET</p>
                              <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                                style={{ color: MINDSET_COLORS[entry.tradingMindset], borderColor: MINDSET_COLORS[entry.tradingMindset] + '55', background: MINDSET_COLORS[entry.tradingMindset] + '11' }}>
                                {entry.tradingMindset}
                              </span>
                            </div>
                          )}
                          {entry.grateful && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>🙏 GRATEFUL FOR</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.grateful}</p>
                            </div>
                          )}
                          {entry.intention && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>✨ INTENTION</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.intention}</p>
                            </div>
                          )}
                          {entry.hitFocus !== undefined && entry.hitFocus !== null && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>✅ HIT FOCUS?</p>
                              <p className="text-sm" style={{ color: entry.hitFocus ? '#00ff88' : '#ff2d78' }}>
                                {entry.hitFocus ? 'YES' : 'NO'}{entry.hitFocusNotes ? ' — ' + entry.hitFocusNotes : ''}
                              </p>
                            </div>
                          )}
                          {entry.bestMoment && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>⭐ BEST MOMENT</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.bestMoment}</p>
                            </div>
                          )}
                          {entry.doDifferently && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>🔄 DO DIFFERENTLY</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.doDifferently}</p>
                            </div>
                          )}
                          {entry.eveningMindsetRating != null && (
                            <div>
                              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>📊 EVENING MINDSET RATING</p>
                              <p className="text-sm font-mono" style={{ color: '#c084fc' }}>{entry.eveningMindsetRating}/10</p>
                            </div>
                          )}
                          {entry.moodTags && entry.moodTags.length > 0 && (
                            <div>
                              <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>🏷️ MOOD TAGS</p>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.moodTags.map(tag => (
                                  <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded-full border"
                                    style={{ color: MOOD_COLORS[tag], borderColor: MOOD_COLORS[tag] + '66', background: MOOD_COLORS[tag] + '11' }}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <LifeHubChat
        section="journal"
        apiRoute="/api/life/journal/chat"
        contextData={{ entries: entries.slice(-30) }}
        systemPrompt="You are Coach Shai, a mindset AI. Read the last 30 journal entries and spot recurring themes, emotional patterns, and mindset trends. Be insightful and direct."
        defaultOpen={chatOpen}
      />
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="cyber-bg-grid min-h-screen flex items-center justify-center">
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    }>
      <JournalInner />
    </Suspense>
  )
}
