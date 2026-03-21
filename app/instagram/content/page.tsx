'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/contexts/AccountContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface ViralScript {
    postNumber: number
    competitorUsername: string
    generatedAt: string
    status: 'pending' | 'approved' | 'scheduled'
    originalPost: {
      url: string
      displayUrl: string | null
      type: string
      likesCount: number
      commentsCount: number
      videoViewCount: number
      reconstructedScript: string
      whyViral: string
      engagementMultiplier: string
    }
    shaiRemake: {
      contentType: string
      hook: string
      script: string
      cta: string
      viralStructure: string
      viralProbabilityScore?: number
      captionWithHashtags?: string
    }
}

interface ContentContext {
    competitorUsername: string
    competitorFullName: string
    topPosts: any[]
    analysis: string
    sentAt: string
}

interface GeneratedIdea {
    ideaNumber?: number
    contentType?: string
    inspiredBy?: string
    hook: string
    script: string
    cta: string
}

// ── Content type tab type ────────────────────────────────────────────────────
type ContentTypeTab = 'all' | 'Reel' | 'Carousel' | 'Single Image'
const CONTENT_TYPE_TABS: { key: ContentTypeTab; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'Reel', label: 'Reels', icon: '🎬' },
  { key: 'Carousel', label: 'Carousel', icon: '🖼' },
  { key: 'Single Image', label: 'Posts', icon: '📸' },
  ]

// Gen-style options (for Generate tab)
type GenStyle = 'all' | 'Reel' | 'Carousel' | 'Single Image'
const GEN_STYLE_TABS: { key: GenStyle; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Reel', label: 'Reels' },
  { key: 'Carousel', label: 'Carousel'},
  { key: 'Single Image', label: 'Posts' },
  ]

// ── Time filter type ─────────────────────────────────────────────────────────
type TimeFilter = '30d' | '60d' | 'all'
const TIME_FILTER_TABS: { key: TimeFilter; label: string }[] = [
  { key: '30d', label: '30 Days' },
  { key: '60d', label: '60 Days' },
  { key: 'all', label: 'All Time' },
  ]

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

function loadViralQueue(key: string): ViralScript[] {
    try {
          const s = localStorage.getItem(key)
          const data: ViralScript[] = s ? JSON.parse(s) : []
                return data.sort((a, b) => (b.shaiRemake.viralProbabilityScore ?? 0) - (a.shaiRemake.viralProbabilityScore ?? 0))
    } catch { return [] }
}

function saveViralQueue(key: string, q: ViralScript[]) {
    localStorage.setItem(key, JSON.stringify(q))
}

// normalise content types coming from AI so filtering is reliable
function normaliseType(raw: string): ContentTypeTab {
    const t = (raw || '').toLowerCase()
    if (t.includes('reel') || t.includes('video')) return 'Reel'
    if (t.includes('carousel')) return 'Carousel'
    return 'Single Image'
}

// ── Time filter helper ───────────────────────────────────────────────────────
function isWithinTimeFilter(script: ViralScript, tf: TimeFilter): boolean {
    if (tf === 'all') return true
    const days = tf === '30d' ? 30 : 60
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ts = script.generatedAt
    if (ts) return new Date(ts) >= cutoff
    return true
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ContentPage() {
    const router = useRouter()
    const { storageKey } = useAccount()

  // ── Viral Queue state ──
  const [queue, setQueue] = useState<ViralScript[]>([])
    const [activeTab, setActiveTab] = useState<'viral' | 'generate'>('viral')
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
    const [contentTypeTab, setContentTypeTab] = useState<ContentTypeTab>('all')
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
    const [expandedId, setExpandedId] = useState<number | null>(null)

  // ── Find New Content state ──
  const [finding, setFinding] = useState(false)
    const [findSummary, setFindSummary] = useState<string | null>(null)

  // ── Generate state ──
  const [context, setContext] = useState<ContentContext | null>(null)
    const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
    const [loading, setLoading] = useState(false)
    const [count, setCount] = useState(5)
    const [genStyle, setGenStyle] = useState<GenStyle>('Reel')

  // ── Load on mount ──
  useEffect(() => {
        setQueue(loadViralQueue(storageKey('viralScriptsQueue')))
        try {
                const saved = localStorage.getItem(storageKey('contentGenContext'))
                if (saved) setContext(JSON.parse(saved))
        } catch {}
        const onFocus = () => setQueue(loadViralQueue(storageKey('viralScriptsQueue')))
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
  }, [])

  // ── Viral Queue actions ──
  const approveScript = (idx: number) => {
        const updated = queue.map((item, i) => i === idx ? { ...item, status: 'approved' as const } : item)
        setQueue(updated)
        saveViralQueue(storageKey('viralScriptsQueue'), updated)
  }

  const rejectScript = (idx: number) => {
        const updated = queue.filter((_, i) => i !== idx)
        setQueue(updated)
        saveViralQueue(storageKey('viralScriptsQueue'), updated)
  }

  const sendToScheduler = (script: ViralScript) => {
        try {
                const existing: any[] = JSON.parse(localStorage.getItem(storageKey('schedulerDrafts')) || '[]')
                const draft = {
                          id: Date.now() + Math.random(),
                          contentType: script.shaiRemake.contentType,
                          hook: script.shaiRemake.hook,
                          script: script.shaiRemake.script,
                          cta: script.shaiRemake.cta,
                          viralStructure: script.shaiRemake.viralStructure,
                          inspiredBy: script.competitorUsername,
                          originalUrl: script.originalPost.url,
                          status: 'scripted',
                          scheduledDate: null,
                          scheduledTime: '23:00',
                          caption: script.shaiRemake.captionWithHashtags || '',
                          createdAt: new Date().toISOString(),
                }
                existing.push(draft)
                localStorage.setItem(storageKey('schedulerDrafts'), JSON.stringify(existing))
                const updated = queue.map(item => item === script ? { ...item, status: 'scheduled' as const } : item)
                setQueue(updated)
                saveViralQueue(storageKey('viralScriptsQueue'), updated)
                router.push('/instagram/scheduler')
        } catch (e) { console.error(e) }
  }

  const clearScheduled = () => {
        const updated = queue.filter(s => s.status !== 'scheduled')
        setQueue(updated)
        saveViralQueue(storageKey('viralScriptsQueue'), updated)
  }

  // ── Find New Content ──────────────────────────────────────────────────────
  const findNewContent = async () => {
        setFinding(true)
        setFindSummary(null)
        try {
                const raw = localStorage.getItem(storageKey('trackedCompetitors'))
                const competitors: any[] = raw ? JSON.parse(raw) : []
                        if (competitors.length === 0) {
                                  setFindSummary('No tracked competitors found.')
                                  return
                        }
                const existingUrls = new Set(queue.map(s => s.originalPost.url))
                let cutoffDate: Date | null = null
                if (timeFilter === '30d') { cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 30) }
                else if (timeFilter === '60d') { cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 60) }

          let totalNewScripts = 0
                let competitorsWithNew = 0
                const allNewScripts: ViralScript[] = []

                        for (const competitor of competitors) {
                                  const username = competitor.username || competitor.handle || competitor
                                  try {
                                              const scrapeRes = await fetch('/api/competitors/scrape', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ handles: [username] }),
                                              })
                                              if (!scrapeRes.ok) continue
                                              const scrapeData = await scrapeRes.json()
                                              const posts: any[] = scrapeData.posts || scrapeData.topPosts || []
                                                          const newPosts = posts.filter((post: any) => {
                                                                        const postUrl = post.url || post.shortCode
                                                                        if (existingUrls.has(postUrl)) return false
                                                                        if (cutoffDate && post.timestamp) return new Date(post.timestamp) >= cutoffDate
                                                                        return true
                                                          })
                                              if (newPosts.length === 0) continue
                                              const viralRes = await fetch('/api/competitors/viral-scripts', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ username, posts: newPosts }),
                                              })
                                              if (!viralRes.ok) continue
                                              const viralData = await viralRes.json()
                                              const newScripts: ViralScript[] = (viralData.scripts || viralData.viralScripts || []).map(
                                                            (s: any) => ({ ...s, status: 'pending' as const, generatedAt: new Date().toISOString() })
                                                          )
                                              if (newScripts.length > 0) {
                                                            allNewScripts.push(...newScripts)
                                                            competitorsWithNew++
                                                            totalNewScripts += newScripts.length
                                              }
                                  } catch { }
                        }

          if (allNewScripts.length > 0) {
                    const updatedQueue = [...queue, ...allNewScripts]
                    setQueue(updatedQueue)
                    saveViralQueue(storageKey('viralScriptsQueue'), updatedQueue)
                    setFindSummary(`Found ${totalNewScripts} new script${totalNewScripts !== 1 ? 's' : ''} from ${competitorsWithNew} competitor${competitorsWithNew !== 1 ? 's' : ''}`)
          } else {
                    setFindSummary('No new content found.')
          }
        } catch (e) {
                console.error(e)
                setFindSummary('Error scanning for new content.')
        } finally {
                setFinding(false)
        }
  }

  // ── Generate actions ──
  const generate = async () => {
        if (!context) return
        setLoading(true)
        setIdeas([])
        try {
                const res = await fetch('/api/content/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ context, numIdeas: count, contentType: genStyle === 'all' ? undefined : genStyle }),
                })
                const data = await res.json()
                if (data.ideas) setIdeas(data.ideas)
        } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const sendIdeaToScheduler = (idea: GeneratedIdea) => {
        try {
                const existing: any[] = JSON.parse(localStorage.getItem(storageKey('schedulerDrafts')) || '[]')
                const draft = {
                          id: Date.now() + Math.random(),
                          contentType: idea.contentType || genStyle || 'Reel',
                          hook: idea.hook,
                          script: idea.script,
                          cta: idea.cta,
                          viralStructure: idea.inspiredBy || '',
                          inspiredBy: context?.competitorUsername || '',
                          originalUrl: '',
                          status: 'scripted',
                          scheduledDate: null,
                          scheduledTime: '23:00',
                          caption: '',
                          createdAt: new Date().toISOString(),
                }
                existing.push(draft)
                localStorage.setItem(storageKey('schedulerDrafts'), JSON.stringify(existing))
                router.push('/instagram/scheduler')
        } catch (e) { console.error(e) }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  // ── Derived counts ──
  const pendingCount = queue.filter(s => s.status === 'pending').length
    const approvedCount = queue.filter(s => s.status === 'approved').length
    const scheduledCount = queue.filter(s => s.status === 'scheduled').length

  // ── Filtered + sorted queue ──
  const filteredQueue = queue
      .filter(s => {
              const timeOk = isWithinTimeFilter(s, timeFilter)
              const statusOk = filter === 'all' ? true : s.status === filter
              const typeOk = contentTypeTab === 'all' ? true : normaliseType(s.shaiRemake.contentType) === contentTypeTab
              return timeOk && statusOk && typeOk
      })
      .sort((a, b) => (b.shaiRemake.viralProbabilityScore ?? 0) - (a.shaiRemake.viralProbabilityScore ?? 0))

  const typeCount = (key: ContentTypeTab) => {
        const timeFiltered = queue.filter(s => isWithinTimeFilter(s, timeFilter))
        return key === 'all' ? timeFiltered.length : timeFiltered.filter(s => normaliseType(s.shaiRemake.contentType) === key).length
  }

  return (
        <div className="space-y-6 p-6 max-w-4xl">
          {/* ── Top header ── */}
              <div className="flex items-center justify-between">
                      <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Content Generator</h1>h1>
                                <p className="text-gray-500 text-sm mt-0.5">AI-powered hooks, scripts, and CTAs</p>p>
                      </div>div>
                      <div className="flex gap-1">
                        {(['viral', 'generate'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                                      className={`text-xs px-4 py-1.5 font-medium transition-all ${activeTab === tab ? 'bg-white text-black' : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                        {tab === 'viral' ? `🔥 Viral Queue${queue.length > 0 ? ' (' + queue.length + ')' : ''}` : '⚡ Generate'}
                      </button>button>
                    ))}
                      </div>div>
              </div>div>
        
          {/* ══ VIRAL QUEUE TAB ══════════════════════════════════════════════════ */}
          {activeTab === 'viral' && (
                  <div className="space-y-4">
                    {/* ── Time Filter + Find New Content row ── */}
                            <div className="flex items-center justify-between gap-3">
                                        <div className="flex gap-1">
                                          {TIME_FILTER_TABS.map(({ key, label }) => (
                                    <button key={key} onClick={() => setTimeFilter(key)}
                                                        className={`text-xs px-3 py-1.5 font-medium transition-all ${timeFilter === key ? 'bg-white text-black' : 'text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                                      {label}
                                    </button>button>
                                  ))}
                                        </div>div>
                                        <div className="flex items-center gap-2">
                                          {findSummary && <span className="text-[10px] text-gray-500">{findSummary}</span>span>}
                                                      <button onClick={findNewContent} disabled={finding}
                                                                        className="text-xs px-3 py-1.5 border border-[#333] text-gray-400 hover:border-white hover:text-white disabled:opacity-50 transition-all">
                                                        {finding ? '⏳ Scanning...' : '🔍 Find New Content'}
                                                      </button>button>
                                        </div>div>
                            </div>div>
                  
                    {/* ── Content Type Filter Tabs ── */}
                            <div className="flex gap-1 border-b border-[#1a1a1a] pb-0">
                              {CONTENT_TYPE_TABS.map(({ key, label, icon }) => (
                                  <button key={key} onClick={() => setContentTypeTab(key)}
                                                    className={`flex items-center gap-1.5 text-xs px-4 py-2 font-medium border-b-2 transition-all -mb-px ${contentTypeTab === key ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                                  <span>{icon}</span>span>
                                                  <span>{label}</span>span>
                                                  <span className="text-[9px] text-gray-600 ml-0.5">{typeCount(key)}</span>span>
                                  </button>button>
                                ))}
                            </div>div>
                  
                    {queue.length === 0 ? (
                                <div className="border border-dashed border-[#222] p-12 text-center">
                                              <p className="text-gray-600 text-sm mb-3">No viral scripts yet.</p>p>
                                              <p className="text-gray-700 text-xs mb-4">
                                                              Go to <strong className="text-gray-500">Competitors</strong>strong>, pick a tracked account, and click{' '}
                                                              <strong className="text-gray-500">🔥 Extract 10 Viral Scripts</strong>strong>.
                                              </p>p>
                                              <button onClick={() => router.push('/instagram/competitors')}
                                                                className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
                                                              → Go to Competitors
                                              </button>button>
                                </div>div>
                              ) : (
                                <>
                                              <div className="flex items-center justify-between">
                                                              <div className="flex gap-3 text-xs text-gray-500">
                                                                                <span className="text-white font-bold">{pendingCount}</span>span> pending ·{' '}
                                                                                <span className="text-green-400 font-bold">{approvedCount}</span>span> approved ·{' '}
                                                                                <span className="text-cyan-400 font-bold">{scheduledCount}</span>span> scheduled
                                                              </div>div>
                                                              <div className="flex items-center gap-2">
                                                                {scheduledCount > 0 && (
                                                      <button onClick={clearScheduled} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                                                                            clear scheduled
                                                      </button>button>
                                                                                )}
                                                                {(['all', 'pending', 'approved'] as const).map(f => (
                                                      <button key={f} onClick={() => setFilter(f)}
                                                                              className={`text-xs px-2.5 py-1 transition-all ${filter === f ? 'bg-white text-black font-medium' : 'text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                                                        {f}
                                                      </button>button>
                                                    ))}
                                                              </div>div>
                                              </div>div>
                                
                                  {filteredQueue.length === 0 && (
                                                  <div className="border border-dashed border-[#222] p-8 text-center">
                                                                    <p className="text-gray-600 text-sm">No {contentTypeTab === 'all' ? '' : contentTypeTab + ' '}scripts match this filter.</p>p>
                                                  </div>div>
                                              )}
                                
                                              <div className="space-y-3">
                                                {filteredQueue.map((script) => {
                                                    const realIdx = queue.indexOf(script)
                                                                        const isExpanded = expandedId === realIdx
                                                                                            const statusColor = script.status === 'scheduled' ? 'text-cyan-400 border-cyan-400/30' : script.status === 'approved' ? 'text-green-400 border-green-400/30' : 'text-gray-500 border-[#333]'
                                                                                                                const normType = normaliseType(script.shaiRemake.contentType)
                                                                                                                                    const typeColor = normType === 'Reel' ? 'text-pink-400' : normType === 'Carousel' ? 'text-cyan-400' : 'text-gray-400'
                                                                                                                                                        return (
                                                                                                                                                                              <div key={realIdx} className={`bg-[#0d0d0d] border ${script.status === 'scheduled' ? 'border-cyan-500/20' : script.status === 'approved' ? 'border-green-500/20' : 'border-[#1e1e1e]'} transition-colors`}>
                                                                                                                                                                                                    <div className="p-4">
                                                                                                                                                                                                                            <div className="flex items-start justify-between gap-3">
                                                                                                                                                                                                                                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                                                                                                                                                                                                                                  {script.originalPost.displayUrl ? (
                                                                                                                                                                                                              <img src={'/api/proxy-image?url=' + encodeURIComponent(script.originalPost.displayUrl)} alt="" className="w-12 h-12 object-cover flex-shrink-0 opacity-70" />
                                                                                                                                                                                                            ) : (
                                                                                                                                                                                                              <div className="w-12 h-12 bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center text-gray-700 text-xs">
                                                                                                                                                                                                                                              {script.originalPost.type === 'Video' ? '▶' : '🖼'}
                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                                                                  )}
                                                                                                                                                                                                                                                                                  <div className="flex-1 min-w-0">
                                                                                                                                                                                                                                                                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                                                                                                                                                                                                                                                                                                <span className={`text-[10px] font-semibold ${typeColor}`}>
                                                                                                                                                                                                                                                                                                                                                                                  {normType === 'Reel' ? '🎬' : normType === 'Carousel' ? '🖼' : '📸'} {normType}
                                                                                                                                                                                                                                                                                                                                                                                </span>span>
                                                                                                                                                                                                                                                                                                                                                <span className={`text-[10px] px-1.5 py-0.5 border ${statusColor}`}>{script.status}</span>span>
                                                                                                                                                                                                                                                                                                                                                <span className="text-gray-600 text-[10px]">@{script.competitorUsername}</span>span>
                                                                                                                                                                                                                                                                                                                                                <span className="text-gray-700 text-[10px]">{script.originalPost.engagementMultiplier} avg</span>span>
                                                                                                                                                                                                                                                                                                                                                {script.shaiRemake.viralProbabilityScore !== undefined && (
                                                                                                                                                                                                                  <span className={`text-[10px] px-1.5 py-0.5 font-bold ${script.shaiRemake.viralProbabilityScore >= 70 ? 'bg-green-500/20 text-green-400' : script.shaiRemake.viralProbabilityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                                                                                                                                                                                                                      🔥 {script.shaiRemake.viralProbabilityScore}/100
                                                                                                                                                                                                                                                    </span>span>
                                                                                                                                                                                                                                                                                                                                                )}
                                                                                                                                                                                                                                                                                                                                              </div>div>
                                                                                                                                                                                                                                                                                                                <p className="text-white text-sm font-medium leading-tight truncate">{script.shaiRemake.hook}</p>p>
                                                                                                                                                                                                                                                                                                                <p className="text-gray-600 text-xs mt-0.5">{script.shaiRemake.viralStructure}</p>p>
                                                                                                                                                                                                                                                                                                              </div>div>
                                                                                                                                                                                                                                                                                </div>div>
                                                                                                                                                                                                                                                      <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                                                                                                                                                                                                  <button onClick={() => setExpandedId(isExpanded ? null : realIdx)} className="text-xs text-gray-600 hover:text-white transition-colors px-2 py-1">
                                                                                                                                                                                                                                                                                                                {isExpanded ? '↑' : '↓'}
                                                                                                                                                                                                                                                                                                              </button>button>
                                                                                                                                                                                                                                                                                  <a href={script.originalPost.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 hover:text-white transition-colors px-2 py-1">↗</a>a>
                                                                                                                                                                                                                                                                                </div>div>
                                                                                                                                                                                                                                                    </div>div>
                                                                                                                                                                                                                            <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a] text-xs text-gray-600">
                                                                                                                                                                                                                                                      <span>♥ {fmt(script.originalPost.likesCount)}</span>span>
                                                                                                                                                                                                                                                      <span>💬 {fmt(script.originalPost.commentsCount)}</span>span>
                                                                                                                                                                                                                                                      {script.originalPost.videoViewCount > 0 && <span>▶ {fmt(script.originalPost.videoViewCount)}</span>span>}
                                                                                                                                                                                                                                                      <span className="ml-auto text-gray-700 italic truncate max-w-[200px]">{script.originalPost.whyViral}</span>span>
                                                                                                                                                                                                                                                    </div>div>
                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                {isExpanded && (
                                                                                                                                                                                                        <div className="border-t border-[#1a1a1a] divide-y divide-[#1a1a1a]">
                                                                                                                                                                                                                                  <div className="p-4">
                                                                                                                                                                                                                                                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">📹 Original Post Script (reconstructed)</p>p>
                                                                                                                                                                                                                                                              <p className="text-gray-500 text-xs leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a]">{script.originalPost.reconstructedScript}</p>p>
                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                  <div className="p-4">
                                                                                                                                                                                                                                                              <div className="flex items-center justify-between mb-2">
                                                                                                                                                                                                                                                                                            <p className="text-[10px] text-gray-600 uppercase tracking-widest">🪝 Hook</p>p>
                                                                                                                                                                                                                                                                                            <button onClick={() => copy(script.shaiRemake.hook)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                                                                                              <p className="text-white text-sm font-medium bg-[#080808] p-3 border border-[#1a1a1a]">{script.shaiRemake.hook}</p>p>
                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                  <div className="p-4">
                                                                                                                                                                                                                                                              <div className="flex items-center justify-between mb-2">
                                                                                                                                                                                                                                                                                            <p className="text-[10px] text-gray-600 uppercase tracking-widest">📝 Full Script</p>p>
                                                                                                                                                                                                                                                                                            <button onClick={() => copy(script.shaiRemake.script)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                                                                                              <div className="text-gray-300 text-sm leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a] whitespace-pre-wrap max-h-64 overflow-y-auto">{script.shaiRemake.script}</div>div>
                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                  <div className="p-4">
                                                                                                                                                                                                                                                              <div className="flex items-center justify-between mb-2">
                                                                                                                                                                                                                                                                                            <p className="text-[10px] text-gray-600 uppercase tracking-widest">🎯 CTA</p>p>
                                                                                                                                                                                                                                                                                            <button onClick={() => copy(script.shaiRemake.cta)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                                                                                              <p className="text-gray-300 text-sm bg-[#080808] p-3 border border-[#1a1a1a]">{script.shaiRemake.cta}</p>p>
                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                  <div className="p-4 flex gap-2">
                                                                                                                                                                                                                                                              <button onClick={() => copy(`${script.shaiRemake.hook}\n\n${script.shaiRemake.script}\n\n${script.shaiRemake.cta}`)}
                                                                                                                                                                                                                                                                                              className="flex-1 py-2 border border-[#333] text-gray-400 hover:border-gray-500 hover:text-white text-xs transition-all">
                                                                                                                                                                                                                                                                                            Copy Full Script
                                                                                                                                                                                                                                                                                          </button>button>
                                                                                                                                                                                                                                                              {script.status === 'pending' && (
                                                                                                                                                                                                                                        <>
                                                                                                                                                                                                                                                                        <button onClick={() => rejectScript(realIdx)} className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 text-xs transition-all">✕ Skip</button>button>
                                                                                                                                                                                                                                                                        <button onClick={() => approveScript(realIdx)} className="px-4 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all">✓ Approve</button>button>
                                                                                                                                                                                                                                                                      </>>
                                                                                                                                                                                                                                      )}
                                                                                                                                                                                                                                                              {script.status === 'approved' && (
                                                                                                                                                                                                                                        <button onClick={() => sendToScheduler(script)} className="px-6 py-2 bg-cyan-500 text-black hover:bg-cyan-400 text-xs font-bold transition-all">→ Schedule</button>button>
                                                                                                                                                                                                                                                              )}
                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                </div>div>
                                                                                                                                                                                                    )}
                                                                                                                                                                                </div>div>
                                                                                                                                                                            )
                                                })}
                                              </div>div>
                                </>>
                              )}
                  </div>div>
              )}
        
          {/* ══ GENERATE TAB ═════════════════════════════════════════════════════ */}
          {activeTab === 'generate' && (
                  <div className="space-y-4">
                            <div className="flex gap-1 border-b border-[#1a1a1a] pb-0">
                              {GEN_STYLE_TABS.map(({ key, label }) => (
                                  <button key={key} onClick={() => setGenStyle(key)}
                                                    className={`text-xs px-4 py-2 font-medium border-b-2 transition-all -mb-px ${genStyle === key ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                    {label}
                                  </button>button>
                                ))}
                            </div>div>
                  
                    {context ? (
                                <div className="bg-[#111] border border-[#222] p-4">
                                              <div className="flex items-start justify-between mb-3">
                                                              <div>
                                                                                <p className="text-white font-semibold text-sm">@{context.competitorUsername}</p>p>
                                                                                <p className="text-gray-500 text-xs">{context.topPosts.length} posts loaded · sent {new Date(context.sentAt).toLocaleDateString()}</p>p>
                                                              </div>div>
                                                              <button onClick={() => { localStorage.removeItem(storageKey('contentGenContext')); setContext(null); setIdeas([]) }}
                                                                                  className="text-gray-700 hover:text-red-400 text-xs transition-colors">Clear ×</button>button>
                                              </div>div>
                                              <div className="flex items-center gap-3 mt-3">
                                                              <span className="text-gray-500 text-xs">Ideas:</span>span>
                                                {[3, 5, 10].map(n => (
                                                    <button key={n} onClick={() => setCount(n)}
                                                                          className={`w-9 h-7 text-xs font-medium transition-all ${count === n ? 'bg-white text-black' : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                                                      {n}
                                                    </button>button>
                                                  ))}
                                                              <button onClick={generate} disabled={loading}
                                                                                  className="flex-1 py-1.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black text-xs font-bold transition-all">
                                                                {loading ? 'Generating...' : `⚡ Generate ${genStyle === 'all' ? '' : genStyle + ' '}Ideas`}
                                                              </button>button>
                                              </div>div>
                                              <p className="text-gray-700 text-[10px] mt-2">
                                                              Generating: <span className="text-gray-400">{genStyle === 'all' ? 'All formats' : genStyle}</span>span>
                                                {' '}— switch the tab above to change format
                                              </p>p>
                                </div>div>
                              ) : (
                                <div className="border border-dashed border-[#222] p-10 text-center">
                                              <p className="text-gray-600 text-sm mb-3">No competitor context loaded.</p>p>
                                              <p className="text-gray-700 text-xs mb-4">
                                                              Go to Competitors → click <strong className="text-gray-500">"Send to Content Gen"</strong>strong> on any analyzed competitor.
                                              </p>p>
                                              <button onClick={() => router.push('/instagram/competitors')}
                                                                className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
                                                              → Go to Competitors
                                              </button>button>
                                </div>div>
                            )}
                  
                    {ideas.length > 0 && (
                                <div className="space-y-3">
                                              <p className="text-gray-600 text-[10px] uppercase tracking-widest">{ideas.length} generated ideas</p>p>
                                  {ideas.map((idea, i) => (
                                                  <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e]">
                                                                    <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3">
                                                                                        <span className="text-gray-600 text-xs">#{i + 1}</span>span>
                                                                                        <span className="text-[10px] text-gray-500 border border-[#333] px-1.5 py-0.5">{idea.contentType || genStyle || 'Reel'}</span>span>
                                                                                        <span className="text-gray-600 text-xs truncate">{idea.inspiredBy}</span>span>
                                                                    </div>div>
                                                                    <div className="p-4 space-y-3">
                                                                                        <div>
                                                                                                              <div className="flex justify-between mb-1">
                                                                                                                                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">Hook</span>span>
                                                                                                                                      <button onClick={() => copy(idea.hook)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                </div>div>
                                                                                                              <p className="text-white text-sm font-medium bg-[#080808] p-3 border border-[#1a1a1a]">{idea.hook}</p>p>
                                                                                          </div>div>
                                                                                        <div>
                                                                                                              <div className="flex justify-between mb-1">
                                                                                                                                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">Script</span>span>
                                                                                                                                      <button onClick={() => copy(idea.script)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                </div>div>
                                                                                                              <div className="text-gray-300 text-sm leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a] whitespace-pre-wrap max-h-48 overflow-y-auto">{idea.script}</div>div>
                                                                                          </div>div>
                                                                                        <div>
                                                                                                              <div className="flex justify-between mb-1">
                                                                                                                                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">CTA</span>span>
                                                                                                                                      <button onClick={() => copy(idea.cta)} className="text-[10px] text-gray-700 hover:text-white">copy</button>button>
                                                                                                                </div>div>
                                                                                                              <p className="text-gray-300 text-sm bg-[#080808] p-3 border border-[#1a1a1a]">{idea.cta}</p>p>
                                                                                          </div>div>
                                                                                        <div className="flex gap-2 pt-1">
                                                                                                              <button onClick={() => copy(`${idea.hook}\n\n${idea.script}\n\n${idea.cta}`)}
                                                                                                                                        className="flex-1 py-2 border border-[#333] text-gray-500 hover:border-gray-500 hover:text-white text-xs transition-all">
                                                                                                                                      Copy Full
                                                                                                                </button>button>
                                                                                                              <button onClick={() => sendIdeaToScheduler(idea)}
                                                                                                                                        className="px-6 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all">
                                                                                                                                      → Schedule
                                                                                                                </button>button>
                                                                                          </div>div>
                                                                    </div>div>
                                                  </div>div>
                                                ))}
                                </div>div>
                            )}
                  </div>div>
              )}
        </div>div>
      )
}</></></div>
