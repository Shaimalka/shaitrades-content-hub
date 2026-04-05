export const metadata = {
  title: 'Journal'
}

'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { NotebookPen, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
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
  Focused: '#00f2ff',
  Anxious: '#ff2d78',
  Motivated: '#00ff88',
  Tired: '#888',
  Grateful: '#ffb400',
  Neutral: '#aaa',
  Proud: '#c084fc',
  Disappointed: '#f97316',
}

const MINDSET_COLORS: Record<TradingMindset, string> = {
  Confident: '#00ff88',
  Cautious: '#ffb400',
  Uncertain: '#888',
  Sharp: '#00f2ff',
  Emotional: '#ff2d78',
}

const MOOD_BORDER: Record<MoodTag, string> = {
  Focused: '#00f2ff',
  Anxious: '#ff2d78',
  Motivated: '#00ff88',
  Tired: '#555',
  Grateful: '#ffb400',
  Neutral: '#666',
  Proud: '#c084fc',
  Disappointed: '#f97316',
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
  return entry.moodTags && entry.moodTags.length > 0 ? entry.moodTags[0] : null
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

function JournalInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)

  const selectedEntry = entries.find((e) => e.date === selectedDate)

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

  // Session auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/life/journal', {
          method: 'GET',
          credentials: 'include',
        })
        if (res.status === 401 || res.redirected) {
          router.push('/login')
          return
        }
        const d = await res.json()
        if (d.data && Array.isArray(d.data)) {
          setEntries(d.data)
        }
      } catch (err) {
        console.error('[journal] auth/fetch error:', err)
        router.push('/login')
      } finally {
        setAuthChecked(true)
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/life/journal', { credentials: 'include' })
      const d = await res.json()
      if (d.data && Array.isArray(d.data)) {
        setEntries(d.data)
      }
    } catch (err) {
      console.error('[journal page] fetchEntries error:', err)
    }
  }, [])

  // Populate forms when selected date changes
  useEffect(() => {
    if (selectedEntry) {
      setMorning({
        morningFocus: selectedEntry.morningFocus || '',
        tradingMindset: selectedEntry.tradingMindset || 'Sharp',
        grateful: selectedEntry.grateful || '',
        intention: selectedEntry.intention || '',
      })
      setEvening({
        hitFocus: selectedEntry.hitFocus ?? null,
        hitFocusNotes: selectedEntry.hitFocusNotes || '',
        bestMoment: selectedEntry.bestMoment || '',
        doDifferently: selectedEntry.doDifferently || '',
        eveningMindsetRating: selectedEntry.eveningMindsetRating ?? 7,
        moodTags: selectedEntry.moodTags || [],
      })
    } else {
      setMorning({ morningFocus: '', tradingMindset: 'Sharp', grateful: '', intention: '' })
      setEvening({
        hitFocus: null,
        hitFocusNotes: '',
        bestMoment: '',
        doDifferently: '',
        eveningMindsetRating: 7,
        moodTags: [],
      })
    }
  }, [selectedEntry, selectedDate])

  async function saveMorning(e: React.FormEvent) {
    e.preventDefault()
    setSaving('morning')
    const entry = { date: selectedDate, ...morning }
    const payload = selectedEntry
      ? { action: 'update', entry: { ...entry, id: selectedEntry.id } }
      : { entry }
    try {
      const res = await fetch('/api/life/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const responseData = await res.json()
      if (responseData.success && responseData.data) {
        setEntries(responseData.data)
      } else {
        await fetchEntries()
      }
      setSaved('morning')
      setTimeout(() => setSaved(null), 3000)
    } catch (err) {
      console.error('[journal page] saveMorning error:', err)
    } finally {
      setSaving(null)
    }
  }

  async function saveEvening(e: React.FormEvent) {
    e.preventDefault()
    setSaving('evening')
    const entry = { date: selectedDate, ...morning, ...evening }
    const payload = selectedEntry
      ? { action: 'update', entry: { ...entry, id: selectedEntry.id } }
      : { entry }
    try {
      const res = await fetch('/api/life/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const responseData = await res.json()
      if (responseData.success && responseData.data) {
        setEntries(responseData.data)
      } else {
        await fetchEntries()
      }
      setSaved('evening')
      setTimeout(() => setSaved(null), 3000)
    } catch (err) {
      console.error('[journal page] saveEvening error:', err)
    } finally {
      setSaving(null)
    }
  }

  function toggleMoodTag(tag: MoodTag) {
    setEvening((e) => ({
      ...e,
      moodTags: e.moodTags.includes(tag)
        ? e.moodTags.filter((t) => t !== tag)
        : [...e.moodTags, tag],
    }))
  }

  const pastEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)

  if (!authChecked || loading) {
    return (
      <div
        className="cyber-bg-grid min-h-screen flex items-center justify-center"
        style={{ background: '#060608' }}
      >
        <div className="text-xs font-mono" style={{ color: '#00f2ff', opacity: 0.6 }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-bg-grid min-h-screen" style={{ background: '#060608' }}>
      <div className="max-w-[900px] mx-auto p-6">

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/life"
              className="text-xs font-mono block mb-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              &#8592; LIFE HUB
            </Link>
            <span
              className="section-header"
              style={{
                fontSize: '10px',
                letterSpacing: '4px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#00f2ff',
                textTransform: 'uppercase',
              }}
            >
              // JOURNAL
            </span>
            <h1
              className="text-2xl font-bold mt-1"
              style={{ color: '#ffffff', fontFamily: 'Georgia, serif' }}
            >
              Daily Journal
            </h1>
          </div>
          <NotebookPen size={32} style={{ color: '#ff00e5', opacity: 0.4 }} />
        </div>

        {/* DATE PICKER */}
        <div className="mb-6">
          <label
            htmlFor="journal-date-picker"
            style={{
              display: 'block',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontVariant: 'small-caps',
              letterSpacing: '2px',
              color: '#00f2ff',
              opacity: 0.7,
              marginBottom: '6px',
            }}
          >
            JOURNALING FOR
          </label>
          <input
            id="journal-date-picker"
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'rgba(0, 242, 255, 0.04)',
              border: '1px solid rgba(0,242,255,0.3)',
              borderRadius: '6px',
              color: '#ffffff',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              padding: '8px 12px',
              outline: 'none',
              cursor: 'pointer',
              colorScheme: 'dark',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#00f2ff'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,242,255,0.15)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,242,255,0.3)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* MORNING ENTRY FORM */}
        <div
          className="premium-card p-5 mb-5"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,242,255,0.15)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.1rem' }}>&#127774;</span>
              <h2
                className="text-sm font-semibold"
                style={{ color: '#ffb400', fontFamily: 'JetBrains Mono, monospace' }}
              >
                MORNING ENTRY
              </h2>
              <span
                className="text-xs font-mono"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {selectedDate}
              </span>
            </div>
            {saved === 'morning' && (
              <span
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  color: '#00ff88',
                  background: 'rgba(0,255,136,0.1)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                &#10003; SAVED
              </span>
            )}
          </div>

          <form onSubmit={saveMorning} className="space-y-4">
            <div>
              <label
                className="text-xs font-mono mb-1.5 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#127919; What is my #1 focus today?
              </label>
              <input
                value={morning.morningFocus}
                onChange={(e) => setMorning((m) => ({ ...m, morningFocus: e.target.value }))}
                className="cyber-input w-full"
                placeholder="e.g. Execute 3 clean ES scalps"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-mono mb-2 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#129504; My trading mindset going in is...
              </label>
              <div className="flex flex-wrap gap-2">
                {MINDSET_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMorning((f) => ({ ...f, tradingMindset: m }))}
                    className="px-3 py-1.5 rounded text-xs font-semibold border transition-all"
                    style={
                      morning.tradingMindset === m
                        ? {
                            background: MINDSET_COLORS[m] + '22',
                            borderColor: MINDSET_COLORS[m],
                            color: MINDSET_COLORS[m],
                            fontFamily: 'JetBrains Mono, monospace',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="text-xs font-mono mb-1.5 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#128591; One thing I am grateful for today...
              </label>
              <input
                value={morning.grateful}
                onChange={(e) => setMorning((m) => ({ ...m, grateful: e.target.value }))}
                className="cyber-input w-full"
                placeholder="e.g. My health, my edge, my discipline"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-mono mb-1.5 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#10024; My intention for today is...
              </label>
              <input
                value={morning.intention}
                onChange={(e) => setMorning((m) => ({ ...m, intention: e.target.value }))}
                className="cyber-input w-full"
                placeholder="e.g. Stay patient. Only A+ setups."
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving === 'morning'}
              className="btn-cyber-primary w-full"
              style={{
                opacity: saving === 'morning' ? 0.6 : 1,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(0,242,255,0.1)',
                border: '1px solid rgba(0,242,255,0.4)',
                color: '#00f2ff',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: saving === 'morning' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saving === 'morning' ? 'Saving...' : 'Save Morning Entry'}
            </button>
          </form>
        </div>

        {/* EVENING ENTRY FORM */}
        <div
          className="premium-card p-5 mb-8"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(192,132,252,0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.1rem' }}>&#127762;</span>
              <h2
                className="text-sm font-semibold"
                style={{ color: '#c084fc', fontFamily: 'JetBrains Mono, monospace' }}
              >
                EVENING ENTRY
              </h2>
              <span
                className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {selectedDate}
              </span>
            </div>
            {saved === 'evening' && (
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  color: '#00ff88',
                  background: 'rgba(0,255,136,0.1)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                &#10003; SAVED
              </span>
            )}
          </div>

          <form onSubmit={saveEvening} className="space-y-4">
            <div>
              <label
                className="text-xs font-mono mb-2 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#127919; Did I hit my #1 focus?
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setEvening((e) => ({ ...e, hitFocus: true }))}
                  className="px-4 py-2 rounded text-xs font-semibold border transition-all"
                  style={
                    evening.hitFocus === true
                      ? {
                          background: 'rgba(0,255,136,0.15)',
                          borderColor: '#00ff88',
                          color: '#00ff88',
                          fontFamily: 'JetBrains Mono, monospace',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }
                  }
                >
                  &#10003; YES
                </button>
                <button
                  type="button"
                  onClick={() => setEvening((e) => ({ ...e, hitFocus: false }))}
                  className="px-4 py-2 rounded text-xs font-semibold border transition-all"
                  style={
                    evening.hitFocus === false
                      ? {
                          background: 'rgba(255,45,120,0.1)',
                          borderColor: '#ff2d78',
                          color: '#ff2d78',
                          fontFamily: 'JetBrains Mono, monospace',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }
                  }
                >
                  &#10005; NO
                </button>
              </div>
              <input
                value={evening.hitFocusNotes}
                onChange={(e) => setEvening((f) => ({ ...f, hitFocusNotes: e.target.value }))}
                className="cyber-input w-full"
                placeholder="Notes on your focus..."
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-mono mb-1.5 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#11088; Best moment of today...
              </label>
              <input
                value={evening.bestMoment}
                onChange={(e) => setEvening((f) => ({ ...f, bestMoment: e.target.value }))}
                className="cyber-input w-full"
                placeholder="e.g. Caught a perfect ES reversal"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-mono mb-1.5 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#128260; What would I do differently?
              </label>
              <input
                value={evening.doDifferently}
                onChange={(e) => setEvening((f) => ({ ...f, doDifferently: e.target.value }))}
                className="cyber-input w-full"
                placeholder="e.g. Took 2 revenge trades after the loss"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <div>
              <label
                className="text-xs font-mono mb-1.5 flex items-center justify-between"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>&#129504; How was my trading mindset today?</span>
                <span style={{ color: '#c084fc' }}>{evening.eveningMindsetRating}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={evening.eveningMindsetRating}
                onChange={(e) =>
                  setEvening((f) => ({ ...f, eveningMindsetRating: parseInt(e.target.value) }))
                }
                className="w-full"
                style={{ accentColor: '#c084fc' }}
              />
              <div
                className="flex justify-between text-xs mt-0.5"
                style={{
                  color: 'var(--text-muted)',
                  opacity: 0.5,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <span>Chaotic</span>
                <span>Locked in</span>
              </div>
            </div>

            <div>
              <label
                className="text-xs font-mono mb-2 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                &#127991; Mood tags
              </label>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleMoodTag(tag)}
                    className="px-3 py-1 rounded text-xs border transition-all"
                    style={
                      evening.moodTags.includes(tag)
                        ? {
                            background: MOOD_COLORS[tag] + '22',
                            borderColor: MOOD_COLORS[tag],
                            color: MOOD_COLORS[tag],
                            fontFamily: 'JetBrains Mono, monospace',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving === 'evening'}
              style={{
                width: '100%',
                opacity: saving === 'evening' ? 0.6 : 1,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(192,132,252,0.1)',
                border: '1px solid rgba(192,132,252,0.4)',
                color: '#c084fc',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: saving === 'evening' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saving === 'evening' ? 'Saving...' : 'Save Evening Entry'}
            </button>
          </form>
        </div>

        {/* PAST ENTRIES */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontSize: '11px',
                letterSpacing: '4px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#00f2ff',
                textTransform: 'uppercase',
              }}
            >
              // PAST ENTRIES &middot;{' '}
              <span style={{ color: '#00ff88' }}>{pastEntries.length} LOGGED</span>
            </h2>
          </div>

          {pastEntries.length === 0 ? (
          <div><EmptyState icon={BookOpen} heading="NO JOURNAL ENTRIES YET" subtext="Your past entries will appear here after you save your first journal." /></div>
        ) : (
            <div className="space-y-2">
              {pastEntries.map((entry) => {
                const primaryMood = getPrimaryMood(entry)
                const borderColor = primaryMood ? MOOD_BORDER[primaryMood] : 'rgba(0,242,255,0.15)'
                const isExpanded = expandedId === entry.id

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `3px solid ${borderColor}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full p-4 flex items-center gap-3 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ minWidth: '150px' }}>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: 'var(--text-secondary)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {formatDate(entry.date)}
                        </span>
                      </div>

                      {entry.tradingMindset ? (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0"
                          style={{
                            color: MINDSET_COLORS[entry.tradingMindset],
                            borderColor: MINDSET_COLORS[entry.tradingMindset] + '55',
                            background: MINDSET_COLORS[entry.tradingMindset] + '11',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {entry.tradingMindset}
                        </span>
                      ) : (
                        <span style={{ minWidth: '60px' }} />
                      )}

                      {primaryMood ? (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0"
                          style={{
                            color: MOOD_COLORS[primaryMood],
                            borderColor: MOOD_COLORS[primaryMood] + '55',
                            background: MOOD_COLORS[primaryMood] + '11',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {primaryMood}
                        </span>
                      ) : (
                        <span style={{ minWidth: '50px' }} />
                      )}

                      <span
                        className="text-xs flex-1 truncate"
                        style={{
                          color: 'var(--text-muted)',
                          minWidth: 0,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {entry.morningFocus
                          ? entry.morningFocus.slice(0, 60) +
                            (entry.morningFocus.length > 60 ? '...' : '')
                          : entry.intention
                          ? entry.intention.slice(0, 60) +
                            (entry.intention.length > 60 ? '...' : '')
                          : <span style={{ opacity: 0.4 }}>No focus logged</span>}
                      </span>

                      {entry.eveningMindsetRating != null && (
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: '#c084fc', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {entry.eveningMindsetRating}/10
                        </span>
                      )}

                      {isExpanded ? (
                        <ChevronUp
                          size={14}
                          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                        />
                      )}
                    </button>

                    {isExpanded && (
                      <div
                        className="px-4 pb-5 border-t"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {entry.morningFocus && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#127919; #1 FOCUS
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {entry.morningFocus}
                              </p>
                            </div>
                          )}
                          {entry.tradingMindset && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#129504; MORNING MINDSET
                              </p>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full border"
                                style={{
                                  color: MINDSET_COLORS[entry.tradingMindset],
                                  borderColor: MINDSET_COLORS[entry.tradingMindset] + '55',
                                  background: MINDSET_COLORS[entry.tradingMindset] + '11',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                {entry.tradingMindset}
                              </span>
                            </div>
                          )}
                          {entry.grateful && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#128591; GRATEFUL FOR
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {entry.grateful}
                              </p>
                            </div>
                          )}
                          {entry.intention && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#10024; INTENTION
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {entry.intention}
                              </p>
                            </div>
                          )}
                          {entry.hitFocus !== undefined && entry.hitFocus !== null && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#9989; HIT FOCUS?
                              </p>
                              <p
                                className="text-sm"
                                style={{ color: entry.hitFocus ? '#00ff88' : '#ff2d78' }}
                              >
                                {entry.hitFocus ? 'YES' : 'NO'}
                                {entry.hitFocusNotes ? ' — ' + entry.hitFocusNotes : ''}
                              </p>
                            </div>
                          )}
                          {entry.bestMoment && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#11088; BEST MOMENT
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {entry.bestMoment}
                              </p>
                            </div>
                          )}
                          {entry.doDifferently && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#128260; DO DIFFERENTLY
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {entry.doDifferently}
                              </p>
                            </div>
                          )}
                          {entry.eveningMindsetRating != null && (
                            <div>
                              <p
                                className="text-xs mb-1"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#129504; EVENING MINDSET RATING
                              </p>
                              <p
                                className="text-sm"
                                style={{ color: '#c084fc', fontFamily: 'JetBrains Mono, monospace' }}
                              >
                                {entry.eveningMindsetRating}/10
                              </p>
                            </div>
                          )}
                          {entry.moodTags && entry.moodTags.length > 0 && (
                            <div>
                              <p
                                className="text-xs mb-2"
                                style={{
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                &#127991; MOOD TAGS
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.moodTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 rounded-full border"
                                    style={{
                                      color: MOOD_COLORS[tag],
                                      borderColor: MOOD_COLORS[tag] + '66',
                                      background: MOOD_COLORS[tag] + '11',
                                      fontFamily: 'JetBrains Mono, monospace',
                                    }}
                                  >
                                    {tag}
                                  </span>
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
    <Suspense
      fallback={
        <div
          className="cyber-bg-grid min-h-screen flex items-center justify-center"
          style={{ background: '#060608' }}
        >
          <div
            className="text-xs"
            style={{ color: '#00f2ff', opacity: 0.6, fontFamily: 'JetBrains Mono, monospace' }}
          >
            Loading...
          </div>
        </div>
      }
    >
      <JournalInner />
    </Suspense>
  )
}
