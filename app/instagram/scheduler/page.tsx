'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchedulerDraft {
  id: number
  contentType: string
  hook: string
  script: string
  cta: string
  viralStructure: string
  inspiredBy: string
  originalUrl: string
  status: 'scripted' | 'filmed' | 'ready' | 'posted'
  scheduledDate: string | null   // 'YYYY-MM-DD'
  scheduledTime: string | null   // 'HH:MM'
  caption: string
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  scripted: 'text-gray-400 border-gray-700',
  filmed:   'text-purple-400 border-purple-500/30',
  ready:    'text-cyan-400 border-cyan-500/30',
  posted:   'text-green-400 border-green-500/30',
}

const STATUS_BG: Record<string, string> = {
  scripted: 'bg-transparent',
  filmed:   'bg-purple-500/5',
  ready:    'bg-cyan-500/5',
  posted:   'bg-green-500/5',
}

const TYPE_COLORS: Record<string, string> = {
  Reel:     'text-pink-400',
  Carousel: 'text-cyan-400',
  Story:    'text-purple-400',
  Image:    'text-gray-400',
}

function loadDrafts(): SchedulerDraft[] {
  try { return JSON.parse(localStorage.getItem('schedulerDrafts') || '[]') } catch { return [] }
}
function saveDrafts(d: SchedulerDraft[]) {
  localStorage.setItem('schedulerDrafts', JSON.stringify(d))
}

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
  start.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Main Component ────────────────────────────────────────────────────────────

export default function SchedulerPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<SchedulerDraft[]>([])
  const [view, setView] = useState<'week' | 'list'>('week')
  const [weekBase, setWeekBase] = useState(new Date())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | SchedulerDraft['status']>('all')

  useEffect(() => {
    setDrafts(loadDrafts())
  }, [])

  const weekDays = getWeekDays(weekBase)
  const today = toISO(new Date())

  // ── CRUD ──
  const updateDraft = (id: number, changes: Partial<SchedulerDraft>) => {
    const updated = drafts.map(d => d.id === id ? { ...d, ...changes } : d)
    setDrafts(updated)
    saveDrafts(updated)
  }

  const deleteDraft = (id: number) => {
    const updated = drafts.filter(d => d.id !== id)
    setDrafts(updated)
    saveDrafts(updated)
    if (editingId === id) setEditingId(null)
    if (expandedId === id) setExpandedId(null)
  }

  const cycleStatus = (draft: SchedulerDraft) => {
    const cycle: SchedulerDraft['status'][] = ['scripted', 'filmed', 'ready', 'posted']
    const next = cycle[(cycle.indexOf(draft.status) + 1) % cycle.length]
    updateDraft(draft.id, { status: next })
  }

  const filteredDrafts = drafts.filter(d =>
    filterStatus === 'all' ? true : d.status === filterStatus
  )

  const unscheduled = drafts.filter(d => !d.scheduledDate)
  const scheduled = drafts.filter(d => !!d.scheduledDate)

  // ── Stats ──
  const counts = {
    scripted: drafts.filter(d => d.status === 'scripted').length,
    filmed:   drafts.filter(d => d.status === 'filmed').length,
    ready:    drafts.filter(d => d.status === 'ready').length,
    posted:   drafts.filter(d => d.status === 'posted').length,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit Panel
  // ─────────────────────────────────────────────────────────────────────────────
  const EditPanel = ({ draft }: { draft: SchedulerDraft }) => {
    const [local, setLocal] = useState({ ...draft, scheduledTime: draft.scheduledTime || '23:00' })
    const save = () => { updateDraft(draft.id, local); setEditingId(null) }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4">
        <div className="bg-[#0a0a0a] border border-[#2a2a2a] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] sticky top-0 bg-[#0a0a0a]">
            <h3 className="text-white text-sm font-bold">Edit Post</h3>
            <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-white text-sm">✕</button>
          </div>
          <div className="p-4 space-y-4">
            {/* Type + Status */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Content Type</label>
                <select value={local.contentType}
                  onChange={e => setLocal({ ...local, contentType: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500">
                  {['Reel', 'Carousel', 'Story', 'Single Image'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Status</label>
                <select value={local.status}
                  onChange={e => setLocal({ ...local, status: e.target.value as any })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500">
                  {['scripted', 'filmed', 'ready', 'posted'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* Date + Time */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Scheduled Date</label>
                <input type="date" value={local.scheduledDate || ''}
                  onChange={e => setLocal({ ...local, scheduledDate: e.target.value ? e.target.value : '' })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500" />
              </div>
              <div className="w-32">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Time</label>
                <input type="time" value={local.scheduledTime || ''}
                  onChange={e => setLocal({ ...local, scheduledTime: e.target.value ? e.target.value : '' })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500" />
              </div>
            </div>
            {/* Hook */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Hook</label>
              <input type="text" value={local.hook}
                onChange={e => setLocal({ ...local, hook: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500" />
            </div>
            {/* Script */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Script</label>
              <textarea value={local.script} rows={8}
                onChange={e => setLocal({ ...local, script: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500 resize-none" />
            </div>
            {/* CTA */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">CTA</label>
              <input type="text" value={local.cta}
                onChange={e => setLocal({ ...local, cta: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500" />
            </div>
            {/* Caption */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Caption (for posting)</label>
              <textarea value={local.caption || ''} rows={4}
                onChange={e => setLocal({ ...local, caption: e.target.value })}
                placeholder="Write your Instagram caption here..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 focus:outline-none focus:border-gray-500 resize-none placeholder-gray-700" />
            </div>
          </div>
          <div className="flex gap-2 p-4 border-t border-[#1a1a1a] sticky bottom-0 bg-[#0a0a0a]">
            <button onClick={() => { deleteDraft(draft.id); setEditingId(null) }}
              className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 text-xs transition-all">
              Delete
            </button>
            <button onClick={() => setEditingId(null)}
              className="flex-1 py-2 border border-[#333] text-gray-400 hover:border-gray-500 text-xs transition-all">
              Cancel
            </button>
            <button onClick={save}
              className="flex-1 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Draft Card (used in both list + week view)
  // ─────────────────────────────────────────────────────────────────────────────
  const DraftCard = ({ draft, compact = false }: { draft: SchedulerDraft, compact?: boolean }) => (
    <div className={`border ${STATUS_BG[draft.status]} ${STATUS_COLORS[draft.status].split(' ')[1]} transition-colors`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-medium ${TYPE_COLORS[draft.contentType] || 'text-gray-400'}`}>{draft.contentType}</span>
              <button onClick={() => cycleStatus(draft)}
                className={`text-[9px] border px-1.5 py-0.5 transition-all ${STATUS_COLORS[draft.status]}`}>
                {draft.status}
              </button>
              {draft.scheduledTime && <span className="text-[9px] text-gray-600">{draft.scheduledTime}</span>}
            </div>
            <p className="text-white text-xs font-medium leading-tight truncate">{draft.hook}</p>
            {!compact && draft.viralStructure && (
              <p className="text-gray-600 text-[10px] mt-0.5 truncate">{draft.viralStructure}</p>
            )}
            {!compact && draft.inspiredBy && (
              <p className="text-gray-700 text-[10px]">via @{draft.inspiredBy}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={() => setEditingId(draft.id)}
              className="text-[10px] text-gray-600 hover:text-white px-1.5 py-1 border border-transparent hover:border-[#333] transition-all">
              ✎
            </button>
          </div>
        </div>
        {!compact && (
          <div>
            <button onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
              className="text-[10px] text-gray-700 hover:text-gray-400 mt-2">
              {expandedId === draft.id ? '▲ hide script' : '▼ view script'}
            </button>
            {expandedId === draft.id && (
              <div className="mt-2 space-y-2 border-t border-[#1a1a1a] pt-2">
                <div className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto bg-[#080808] p-2 border border-[#1a1a1a]">{draft.script}</div>
                <div className="text-gray-500 text-xs bg-[#080808] p-2 border border-[#1a1a1a]">{draft.cta}</div>
                {draft.originalUrl && (
                  <a href={draft.originalUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-gray-700 hover:text-white block">
                    View original post ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Edit Panel */}
      {editingId !== null && (
        <EditPanel draft={drafts.find(d => d.id === editingId)!} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Post Scheduler</h1>
          <p className="text-gray-500 text-sm mt-0.5">Plan, script, film, post — all in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/instagram/content')}
            className="text-xs px-3 py-1.5 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
            + From Content Gen
          </button>
          <div className="flex gap-1">
            {(['week', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 font-medium transition-all ${view === v ? 'bg-white text-black' : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                {v === 'week' ? '📅 Week' : '☰ List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {([['scripted', counts.scripted, 'text-gray-400'], ['filmed', counts.filmed, 'text-purple-400'], ['ready', counts.ready, 'text-cyan-400'], ['posted', counts.posted, 'text-green-400']] as const).map(([label, count, color]) => (
          <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-gray-600 text-xs uppercase tracking-widest mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* No drafts state */}
      {drafts.length === 0 && (
        <div className="border border-dashed border-[#222] p-16 text-center">
          <p className="text-gray-600 text-sm mb-2">No posts in your scheduler yet.</p>
          <p className="text-gray-700 text-xs mb-5">Generate viral scripts → approve them → click "Schedule" to add them here.</p>
          <button onClick={() => router.push('/instagram/content')}
            className="text-xs px-5 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
            → Go to Content Gen
          </button>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && drafts.length > 0 && (
        <div className="space-y-4">
          {/* Week nav */}
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }}
              className="text-xs text-gray-600 hover:text-white px-2 py-1 border border-[#333] hover:border-gray-500 transition-all">
              ← Prev
            </button>
            <span className="text-gray-400 text-xs flex-1 text-center">
              Week of {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekBase(new Date())}
              className="text-xs text-gray-600 hover:text-white px-2 py-1 border border-[#333] hover:border-gray-500 transition-all">
              Today
            </button>
            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }}
              className="text-xs text-gray-600 hover:text-white px-2 py-1 border border-[#333] hover:border-gray-500 transition-all">
              Next →
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const iso = toISO(day)
              const dayPosts = scheduled.filter(d => d.scheduledDate === iso)
              const isToday = iso === today
              return (
                <div key={iso} className={`min-h-[120px] border ${isToday ? 'border-white/20 bg-white/5' : 'border-[#1a1a1a]'}`}>
                  <div className={`px-2 py-1.5 border-b ${isToday ? 'border-white/20' : 'border-[#1a1a1a]'} flex items-center justify-between`}>
                    <span className={`text-[10px] font-medium ${isToday ? 'text-white' : 'text-gray-600'}`}>{DAY_LABELS[i]}</span>
                    <span className={`text-[10px] ${isToday ? 'text-white font-bold' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    {dayPosts.map(post => (
                      <div key={post.id} onClick={() => setEditingId(post.id)}
                        className={`cursor-pointer p-1.5 border ${STATUS_BG[post.status]} ${STATUS_COLORS[post.status].split(' ')[1]} hover:opacity-80 transition-all`}>
                        <p className={`text-[9px] font-medium ${TYPE_COLORS[post.contentType] || 'text-gray-400'} mb-0.5`}>{post.contentType}</p>
                        <p className="text-[10px] text-white leading-tight line-clamp-2">{post.hook}</p>
                        {post.scheduledTime && <p className="text-[9px] text-gray-600 mt-0.5">{post.scheduledTime}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unscheduled drafts */}
          {unscheduled.length > 0 && (
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-2">Unscheduled Drafts ({unscheduled.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unscheduled.map(draft => (
                  <DraftCard key={draft.id} draft={draft} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && drafts.length > 0 && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            {(['all', 'scripted', 'filmed', 'ready', 'posted'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`text-xs px-2.5 py-1 transition-all ${filterStatus === f ? 'bg-white text-black font-medium' : 'text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                {f}
              </button>
            ))}
            <span className="ml-auto text-gray-600 text-xs">{filteredDrafts.length} posts</span>
          </div>

          {/* Sorted by date */}
          {filteredDrafts
            .slice()
            .sort((a, b) => {
              if (!a.scheduledDate && !b.scheduledDate) return 0
              if (!a.scheduledDate) return 1
              if (!b.scheduledDate) return -1
              return a.scheduledDate.localeCompare(b.scheduledDate)
            })
            .map(draft => (
              <div key={draft.id} className="space-y-0">
                {draft.scheduledDate && (
                  <p className="text-[10px] text-gray-700 mb-1">
                    {new Date(draft.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {draft.scheduledTime && <span className="ml-2">{draft.scheduledTime}</span>}
                  </p>
                )}
                <DraftCard draft={draft} />
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
