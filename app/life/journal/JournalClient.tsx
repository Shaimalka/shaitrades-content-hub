'use client'
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { NotebookPen, ChevronDown, ChevronUp, BookOpen, X } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/contexts/ThemeContext'

type MoodTag = 'Focused' | 'Anxious' | 'Motivated' | 'Tired' | 'Grateful' | 'Neutral' | 'Proud' | 'Disappointed'
type TradingMindset = 'Confident' | 'Cautious' | 'Uncertain' | 'Sharp' | 'Emotional'
type JournalEntry = {
  id: string; date: string; morningFocus?: string; tradingMindset?: TradingMindset; grateful?: string
  intention?: string; hitFocus?: boolean; hitFocusNotes?: string; bestMoment?: string
  doDifferently?: string; eveningMindsetRating?: number; moodTags?: MoodTag[]; createdAt: string; updatedAt: string
}

const MINDSET_OPTIONS: TradingMindset[] = ['Confident', 'Cautious', 'Uncertain', 'Sharp', 'Emotional']
const MOOD_TAGS: MoodTag[] = ['Focused', 'Anxious', 'Motivated', 'Tired', 'Grateful', 'Neutral', 'Proud', 'Disappointed']

const MOOD_COLORS: Record<MoodTag, string> = {
  Focused: '#2563eb', Anxious: '#ff4d6a', Motivated: '#00c48c', Tired: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
  Grateful: '#f59e0b', Neutral: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), Proud: '#a78bfa', Disappointed: '#f97316',
}

const MINDSET_COLORS: Record<TradingMindset, string> = {
  Confident: '#00c48c', Cautious: '#f59e0b', Uncertain: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), Sharp: '#2563eb', Emotional: '#ff4d6a',
}

const RATING_OPTIONS = [
  { value: '', label: 'ALL RATINGS' }, { value: '5', label: '5 — Excellent' }, { value: '4', label: '4 — Good' },
  { value: '3', label: '3 — Neutral' }, { value: '2', label: '2 — Poor' }, { value: '1', label: '1 — Terrible' },
]

function formatDate(dateStr: string) {
  try { return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  catch { return dateStr }
}

function getPrimaryMood(entry: JournalEntry): MoodTag | null {
  return entry.moodTags && entry.moodTags.length > 0 ? entry.moodTags[0] : null
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'rgba(128,128,128,0.12)', animation: 'shimmer 1.5s infinite' }} />
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

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => { const h = () => setWidth(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return width
}

function JournalInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputStyle = {
    background: isDark ? (isDark ? '#1a1a24' : '#f1f4f9') : '#f1f4f9',
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px', color: isDark ? (isDark ? '#ffffff' : '#0a0a0f') : (isDark ? '#0a0a0f' : '#f8f9fc'),
    fontFamily: 'Inter, sans-serif', fontSize: '13px', padding: '8px 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box' as const,
  }
  const cardStyle = {
    background: isDark ? (isDark ? '#111118' : '#ffffff') : (isDark ? '#ffffff' : '#0a0a0f'),
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px', padding: '20px',
  }
  const focusStyle = { borderColor: 'rgba(37,99,235,0.5)', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }
  const blurStyle = { borderColor: isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)', boxShadow: 'none' }
  const labelStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500 as const,
    color: isDark ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : 'rgba(0,0,0,0.5)',
    textTransform: 'uppercase' as const, letterSpacing: '0.1em',
    display: 'block' as const, marginBottom: '6px',
  }
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterMood, setFilterMood] = useState('')
  const today = new Date().toLocaleDateString('en-CA')
  const [selectedDate, setSelectedDate] = useState(today)
  const selectedEntry = entries.find((e) => e.date === selectedDate)
  const [morning, setMorning] = useState({ morningFocus: '', tradingMindset: 'Sharp' as TradingMindset, grateful: '', intention: '' })
  const [evening, setEvening] = useState({ hitFocus: null as boolean | null, hitFocusNotes: '', bestMoment: '', doDifferently: '', eveningMindsetRating: 7, moodTags: [] as MoodTag[] })
  const [saving, setSaving] = useState<'morning' | 'evening' | null>(null)
  const [saved, setSaved] = useState<'morning' | 'evening' | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/life/journal', { method: 'GET', credentials: 'include' })
        if (res.status === 401 || res.redirected) { router.push('/login'); return }
        const d = await res.json()
        if (d.data && Array.isArray(d.data)) setEntries(d.data)
      } catch (err) { console.error('[journal] auth/fetch error:', err); router.push('/login') }
      finally { setAuthChecked(true); setLoading(false) }
    }
    checkAuth()
  }, [router])

  const fetchEntries = useCallback(async () => {
    try { const res = await fetch('/api/life/journal', { credentials: 'include' }); const d = await res.json(); if (d.data && Array.isArray(d.data)) setEntries(d.data) } catch (err) { console.error('[journal page] fetchEntries error:', err) }
  }, [])

  useEffect(() => {
    if (selectedEntry) {
      setMorning({ morningFocus: selectedEntry.morningFocus || '', tradingMindset: selectedEntry.tradingMindset || 'Sharp', grateful: selectedEntry.grateful || '', intention: selectedEntry.intention || '' })
      setEvening({ hitFocus: selectedEntry.hitFocus ?? null, hitFocusNotes: selectedEntry.hitFocusNotes || '', bestMoment: selectedEntry.bestMoment || '', doDifferently: selectedEntry.doDifferently || '', eveningMindsetRating: selectedEntry.eveningMindsetRating ?? 7, moodTags: selectedEntry.moodTags || [] })
    } else {
      setMorning({ morningFocus: '', tradingMindset: 'Sharp', grateful: '', intention: '' })
      setEvening({ hitFocus: null, hitFocusNotes: '', bestMoment: '', doDifferently: '', eveningMindsetRating: 7, moodTags: [] })
    }
  }, [selectedEntry, selectedDate])

  async function saveMorning(e: React.FormEvent) {
    e.preventDefault(); setSaving('morning')
    const entry = { date: selectedDate, ...morning }
    const payload = selectedEntry ? { action: 'update', entry: { ...entry, id: selectedEntry.id } } : { entry }
    try {
      const res = await fetch('/api/life/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
      const responseData = await res.json()
      if (responseData.success && responseData.data) setEntries(responseData.data); else await fetchEntries()
      setSaved('morning'); setTimeout(() => setSaved(null), 3000)
    } catch (err) { console.error('[journal page] saveMorning error:', err) } finally { setSaving(null) }
  }

  async function saveEvening(e: React.FormEvent) {
    e.preventDefault(); setSaving('evening')
    const entry = { date: selectedDate, ...morning, ...evening }
    const payload = selectedEntry ? { action: 'update', entry: { ...entry, id: selectedEntry.id } } : { entry }
    try {
      const res = await fetch('/api/life/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
      const responseData = await res.json()
      if (responseData.success && responseData.data) setEntries(responseData.data); else await fetchEntries()
      setSaved('evening'); setTimeout(() => setSaved(null), 3000)
    } catch (err) { console.error('[journal page] saveEvening error:', err) } finally { setSaving(null) }
  }

  function toggleMoodTag(tag: MoodTag) {
    setEvening((e) => ({ ...e, moodTags: e.moodTags.includes(tag) ? e.moodTags.filter((t) => t !== tag) : [...e.moodTags, tag] }))
  }

  const allPastEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)
  const availableMoodTags = useMemo(() => { const tagSet = new Set<string>(); entries.forEach((e) => { e.moodTags?.forEach((t) => tagSet.add(t)) }); return Array.from(tagSet).sort() }, [entries])

  const filteredEntries = useMemo(() => {
    return allPastEntries.filter((entry) => {
      if (searchText.trim()) { const q = searchText.toLowerCase(); const fields = [entry.morningFocus, entry.tradingMindset, entry.grateful, entry.intention, entry.bestMoment, entry.doDifferently, entry.hitFocusNotes]; if (!fields.some((f) => f && f.toLowerCase().includes(q))) return false }
      if (filterRating) { if (entry.eveningMindsetRating !== parseInt(filterRating)) return false }
      if (filterMood) { if (!entry.moodTags || !entry.moodTags.includes(filterMood as MoodTag)) return false }
      return true
    })
  }, [allPastEntries, searchText, filterRating, filterMood])

  if (!authChecked || loading) {
    return (
      <div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh' }}>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
        <div className="max-w-[900px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ marginBottom: 32 }}><Skeleton height="40px" width="200px" /></div>
          <div style={{ ...cardStyle, marginBottom: 20 }}><Skeleton height="120px" /></div>
          <div style={{ ...cardStyle }}><Skeleton height="120px" /></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[900px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 12 }}>
          <div>
            <Link href="/life" style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← LIFE HUB</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>Daily Journal</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 2 }}>Morning intentions · Evening reflection</p>
          </div>
          <NotebookPen size={32} style={{ color: '#a78bfa', opacity: 0.4, flexShrink: 0 }} />
        </div>

        {/* Date Picker */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ ...labelStyle }}>JOURNALING FOR</label>
          <input id="journal-date-picker" type="date" value={selectedDate} max={today} onChange={(e) => setSelectedDate(e.target.value)}
            style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', colorScheme: 'dark', fontFamily: 'JetBrains Mono, monospace' }}
            onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} />
        </div>

        {/* Morning Entry */}
        <div style={{ ...cardStyle, marginBottom: 20, borderColor: 'rgba(245,158,11,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>☀️</span>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#f59e0b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MORNING ENTRY</h2>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>{selectedDate}</span>
            </div>
            {saved === 'morning' && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,196,140,0.1)', color: '#00c48c' }}>✓ SAVED</span>}
          </div>
          <form onSubmit={saveMorning} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>🎯 What is my #1 focus today?</label>
              <input value={morning.morningFocus} onChange={(e) => setMorning((m) => ({ ...m, morningFocus: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Execute 3 clean ES scalps" />
            </div>
            <div>
              <label style={labelStyle}>🧠 My trading mindset going in is...</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MINDSET_OPTIONS.map((m) => (
                  <button key={m} type="button" onClick={() => setMorning((f) => ({ ...f, tradingMindset: m }))}
                    style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', background: morning.tradingMindset === m ? MINDSET_COLORS[m] + '22' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${morning.tradingMindset === m ? MINDSET_COLORS[m] : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: morning.tradingMindset === m ? MINDSET_COLORS[m] : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>🙏 One thing I am grateful for today...</label>
              <input value={morning.grateful} onChange={(e) => setMorning((m) => ({ ...m, grateful: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. My health, my edge, my discipline" />
            </div>
            <div>
              <label style={labelStyle}>✨ My intention for today is...</label>
              <input value={morning.intention} onChange={(e) => setMorning((m) => ({ ...m, intention: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Stay patient. Only A+ setups." />
            </div>
            <button type="submit" disabled={saving === 'morning'}
              style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, padding: '10px', cursor: saving === 'morning' ? 'not-allowed' : 'pointer', opacity: saving === 'morning' ? 0.6 : 1, transition: 'all 0.2s' }}>
              {saving === 'morning' ? 'Saving...' : 'Save Morning Entry'}
            </button>
          </form>
        </div>

        {/* Evening Entry */}
        <div style={{ ...cardStyle, marginBottom: 32, borderColor: 'rgba(167,139,250,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>🌙</span>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#a78bfa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>EVENING ENTRY</h2>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>{selectedDate}</span>
            </div>
            {saved === 'evening' && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,196,140,0.1)', color: '#00c48c' }}>✓ SAVED</span>}
          </div>
          <form onSubmit={saveEvening} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>🎯 Did I hit my #1 focus?</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button type="button" onClick={() => setEvening((e) => ({ ...e, hitFocus: true }))}
                  style={{ padding: '8px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: evening.hitFocus === true ? 'rgba(0,196,140,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${evening.hitFocus === true ? '#00c48c' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: evening.hitFocus === true ? '#00c48c' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                  ✓ YES
                </button>
                <button type="button" onClick={() => setEvening((e) => ({ ...e, hitFocus: false }))}
                  style={{ padding: '8px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: evening.hitFocus === false ? 'rgba(255,77,106,0.1)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${evening.hitFocus === false ? '#ff4d6a' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: evening.hitFocus === false ? '#ff4d6a' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                  ✗ NO
                </button>
              </div>
              <input value={evening.hitFocusNotes} onChange={(e) => setEvening((f) => ({ ...f, hitFocusNotes: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="Notes on your focus..." />
            </div>
            <div>
              <label style={labelStyle}>⭐ Best moment of today...</label>
              <input value={evening.bestMoment} onChange={(e) => setEvening((f) => ({ ...f, bestMoment: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Caught a perfect ES reversal" />
            </div>
            <div>
              <label style={labelStyle}>🔄 What would I do differently?</label>
              <input value={evening.doDifferently} onChange={(e) => setEvening((f) => ({ ...f, doDifferently: e.target.value }))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="e.g. Took 2 revenge trades after the loss" />
            </div>
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🧠 How was my trading mindset today?</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#a78bfa' }}>{evening.eveningMindsetRating}/10</span>
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} type="button" onClick={() => setEvening(f => ({ ...f, eveningMindsetRating: v }))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: evening.eveningMindsetRating === v ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'), border: `1px solid ${evening.eveningMindsetRating === v ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')}`, color: evening.eveningMindsetRating === v ? (isDark ? '#ffffff' : '#0a0a0f') : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 4 }}>
                <span>Chaotic</span><span>Locked in</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>🏷️ Mood tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MOOD_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleMoodTag(tag)}
                    style={{ padding: '6px 12px', borderRadius: 20, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', background: evening.moodTags.includes(tag) ? 'rgba(37,99,235,0.1)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${evening.moodTags.includes(tag) ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`, color: evening.moodTags.includes(tag) ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving === 'evening'}
              style={{ background: '#2563eb', border: 'none', borderRadius: 8, color: (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, padding: '10px', cursor: saving === 'evening' ? 'not-allowed' : 'pointer', opacity: saving === 'evening' ? 0.6 : 1, transition: 'all 0.2s' }}>
              {saving === 'evening' ? 'Saving...' : 'Save Evening Entry'}
            </button>
          </form>
        </div>

        {/* Past Entries */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>
              PAST ENTRIES · <span style={{ color: '#00c48c' }}>{allPastEntries.length} LOGGED</span>
            </h2>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="SEARCH ENTRIES..."
                style={{ ...inputStyle, paddingRight: searchText ? '32px' : '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} />
              {searchText && (
                <button onClick={() => setSearchText('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)}
              style={{ ...inputStyle, width: isMobile ? '100%' : 160, cursor: 'pointer', colorScheme: 'dark', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
              onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)}>
              {RATING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)}
              style={{ ...inputStyle, width: isMobile ? '100%' : 150, cursor: 'pointer', colorScheme: 'dark', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
              onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)}>
              <option value="">ALL MOODS</option>
              {availableMoodTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>

          {(searchText || filterRating || filterMood) && (
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 10 }}>
              SHOWING {filteredEntries.length} OF {allPastEntries.length} ENTRIES
            </p>
          )}

          {allPastEntries.length === 0 ? (
            <EmptyState icon={BookOpen} heading="NO JOURNAL ENTRIES YET" isDark={isDark} subtext="Your past entries will appear here after you save your first journal." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState icon={BookOpen} heading="NO ENTRIES MATCH YOUR SEARCH" isDark={isDark} subtext="Try adjusting your search or filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEntries.map((entry) => {
                const primaryMood = getPrimaryMood(entry)
                const isExpanded = expandedId === entry.id
                const moodColor = primaryMood ? MOOD_COLORS[primaryMood] : 'rgba(37,99,235,0.4)'
                return (
                  <div key={entry.id} style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${moodColor}`, borderRadius: 10, overflow: 'hidden' }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ minWidth: 150 }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)') }}>{formatDate(entry.date)}</span>
                      </div>
                      {entry.tradingMindset ? (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${MINDSET_COLORS[entry.tradingMindset]}55`, background: MINDSET_COLORS[entry.tradingMindset] + '11', color: MINDSET_COLORS[entry.tradingMindset], flexShrink: 0 }}>{entry.tradingMindset}</span>
                      ) : <span style={{ minWidth: 60 }} />}
                      {primaryMood ? (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${MOOD_COLORS[primaryMood]}55`, background: MOOD_COLORS[primaryMood] + '11', color: MOOD_COLORS[primaryMood], flexShrink: 0 }}>{primaryMood}</span>
                      ) : <span style={{ minWidth: 50 }} />}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {entry.morningFocus ? entry.morningFocus.slice(0, 60) + (entry.morningFocus.length > 60 ? '...' : '') : entry.intention ? entry.intention.slice(0, 60) + (entry.intention.length > 60 ? '...' : '') : <span style={{ opacity: 0.4 }}>No focus logged</span>}
                      </span>
                      {entry.eveningMindsetRating != null && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#a78bfa', flexShrink: 0 }}>{entry.eveningMindsetRating}/5</span>}
                      {isExpanded ? <ChevronUp size={14} style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), flexShrink: 0 }} />}
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                          {entry.morningFocus && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>🎯 #1 FOCUS</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{entry.morningFocus}</p></div>}
                          {entry.tradingMindset && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>🧠 MORNING MINDSET</p><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: `1px solid ${MINDSET_COLORS[entry.tradingMindset]}55`, background: MINDSET_COLORS[entry.tradingMindset] + '11', color: MINDSET_COLORS[entry.tradingMindset] }}>{entry.tradingMindset}</span></div>}
                          {entry.grateful && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>🙏 GRATEFUL FOR</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{entry.grateful}</p></div>}
                          {entry.intention && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>✨ INTENTION</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{entry.intention}</p></div>}
                          {entry.hitFocus !== undefined && entry.hitFocus !== null && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>✅ HIT FOCUS?</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: entry.hitFocus ? '#00c48c' : '#ff4d6a' }}>{entry.hitFocus ? 'YES' : 'NO'}{entry.hitFocusNotes ? ' — ' + entry.hitFocusNotes : ''}</p></div>}
                          {entry.bestMoment && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>⭐ BEST MOMENT</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{entry.bestMoment}</p></div>}
                          {entry.doDifferently && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>🔄 DO DIFFERENTLY</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? '#ffffff' : '#0a0a0f') }}>{entry.doDifferently}</p></div>}
                          {entry.eveningMindsetRating != null && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 4, textTransform: 'uppercase' }}>🧠 EVENING MINDSET</p><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#a78bfa' }}>{entry.eveningMindsetRating}/5</p></div>}
                          {entry.moodTags && entry.moodTags.length > 0 && (
                            <div>
                              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 8, textTransform: 'uppercase' }}>🏷️ MOOD TAGS</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {entry.moodTags.map((tag) => (
                                  <span key={tag} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${MOOD_COLORS[tag]}66`, background: MOOD_COLORS[tag] + '11', color: MOOD_COLORS[tag] }}>{tag}</span>
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
      <LifeHubChat section="journal" apiRoute="/api/life/journal/chat" contextData={{ entries: entries.slice(-30) }} systemPrompt="You are Coach Shai, a mindset AI. Read the last 30 journal entries and spot recurring themes, emotional patterns, and mindset trends. Be insightful and direct." defaultOpen={chatOpen} />
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>Loading...</div></div>}>
      <JournalInner />
    </Suspense>
  )
}
