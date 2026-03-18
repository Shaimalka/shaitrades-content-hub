'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function loadViralQueue(): ViralScript[] {
  try {
    const s = localStorage.getItem('viralScriptsQueue')
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

function saveViralQueue(q: ViralScript[]) {
  localStorage.setItem('viralScriptsQueue', JSON.stringify(q))
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const router = useRouter()

  // ── Viral Queue tab state ──
  const [queue, setQueue] = useState<ViralScript[]>([])
  const [activeTab, setActiveTab] = useState<'viral' | 'generate'>('viral')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // ── Classic Content Gen state ──
  const [context, setContext] = useState<ContentContext | null>(null)
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(5)

  // ── Load on mount ──
  useEffect(() => {
    setQueue(loadViralQueue())
    try {
      const saved = localStorage.getItem('contentGenContext')
      if (saved) setContext(JSON.parse(saved))
    } catch {}
  }, [])

  // ── Viral Queue actions ──
  const approveScript = (idx: number) => {
    const updated = queue.map((item, i) =>
      i === idx ? { ...item, status: 'approved' as const } : item
    )
    setQueue(updated)
    saveViralQueue(updated)
  }

  const rejectScript = (idx: number) => {
    const updated = queue.filter((_, i) => i !== idx)
    setQueue(updated)
    saveViralQueue(updated)
  }

  const sendToScheduler = (script: ViralScript) => {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem('schedulerDrafts') || '[]')
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
      localStorage.setItem('schedulerDrafts', JSON.stringify(existing))

      // Mark as scheduled in queue
      const updated = queue.map(item =>
        item === script ? { ...item, status: 'scheduled' as const } : item
      )
      setQueue(updated)
      saveViralQueue(updated)

      router.push('/instagram/scheduler')
    } catch (e) {
      console.error(e)
    }
  }

  const clearApproved = () => {
    const updated = queue.filter(s => s.status !== 'scheduled')
    setQueue(updated)
    saveViralQueue(updated)
  }

  // ── Classic Gen actions ──
  const generate = async () => {
    if (!context) return
    setLoading(true)
    setIdeas([])
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, numIdeas: count }),
      })
      const data = await res.json()
      if (data.ideas) setIdeas(data.ideas)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sendIdeaToScheduler = (idea: GeneratedIdea) => {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem('schedulerDrafts') || '[]')
      const draft = {
        id: Date.now() + Math.random(),
        contentType: idea.contentType || 'Reel',
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
      localStorage.setItem('schedulerDrafts', JSON.stringify(existing))
      router.push('/instagram/scheduler')
    } catch (e) { console.error(e) }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  // ── Filtered queue ──
  const filteredQueue = queue.filter(s =>
    filter === 'all' ? true : s.status === filter
  )

  const pendingCount = queue.filter(s => s.status === 'pending').length
  const approvedCount = queue.filter(s => s.status === 'approved').length
  const scheduledCount = queue.filter(s => s.status === 'scheduled').length

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Content Generator</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-powered hooks, scripts, and CTAs</p>
        </div>
        <div className="flex gap-1">
          {(['viral', 'generate'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-1.5 font-medium transition-all ${activeTab === tab ? 'bg-white text-black' : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'}`}>
              {tab === 'viral' ? `🔥 Viral Queue${queue.length > 0 ? ' (' + queue.length + ')' : ''}` : '⚡ Generate'}
            </button>
          ))}
        </div>
      </div>

      {/* ── VIRAL QUEUE TAB ── */}
      {activeTab === 'viral' && (
        <div className="space-y-4">

          {queue.length === 0 ? (
            <div className="border border-dashed border-[#222] p-12 text-center">
              <p className="text-gray-600 text-sm mb-3">No viral scripts yet.</p>
              <p className="text-gray-700 text-xs mb-4">Go to <strong className="text-gray-500">Competitors</strong>, pick a tracked account, and click <strong className="text-gray-500">🔥 Extract 10 Viral Scripts</strong>.</p>
              <button onClick={() => router.push('/instagram/competitors')}
                className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
                → Go to Competitors
              </button>
            </div>
          ) : (
            <>
              {/* Stats + Filters */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="text-white font-bold">{pendingCount}</span> pending ·
                  <span className="text-green-400 font-bold">{approvedCount}</span> approved ·
                  <span className="text-cyan-400 font-bold">{scheduledCount}</span> scheduled
                </div>
                <div className="flex items-center gap-2">
                  {scheduledCount > 0 && (
                    <button onClick={clearApproved} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                      clear scheduled
                    </button>
                  )}
                  {(['all', 'pending', 'approved'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`text-xs px-2.5 py-1 transition-all ${filter === f ? 'bg-white text-black font-medium' : 'text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Script Cards */}
              <div className="space-y-3">
                {filteredQueue.map((script, idx) => {
                  const realIdx = queue.indexOf(script)
                  const isExpanded = expandedId === realIdx
                  const statusColor = script.status === 'scheduled' ? 'text-cyan-400 border-cyan-400/30' :
                    script.status === 'approved' ? 'text-green-400 border-green-400/30' :
                    'text-gray-500 border-[#333]'

                  return (
                    <div key={realIdx} className={`bg-[#0d0d0d] border ${script.status === 'scheduled' ? 'border-cyan-500/20' : script.status === 'approved' ? 'border-green-500/20' : 'border-[#1e1e1e]'} transition-colors`}>
                      {/* Card Header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Post thumbnail */}
                            {script.originalPost.displayUrl ? (
                              <img src={'/api/proxy-image?url=' + encodeURIComponent(script.originalPost.displayUrl)}
                                alt="" className="w-12 h-12 object-cover flex-shrink-0 opacity-70" />
                            ) : (
                              <div className="w-12 h-12 bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center text-gray-700 text-xs">
                                {script.originalPost.type === 'Video' ? '▶' : '🖼'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-600 text-xs">#{script.postNumber}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 border ${statusColor}`}>{script.status}</span>
                                <span className="text-gray-600 text-[10px]">@{script.competitorUsername}</span>
                                <span className="text-gray-700 text-[10px]">{script.originalPost.engagementMultiplier} avg</span>
                  {script.shaiRemake.viralProbabilityScore !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold ${script.shaiRemake.viralProbabilityScore >= 70 ? 'bg-green-500/20 text-green-400' : script.shaiRemake.viralProbabilityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      🔥 {script.shaiRemake.viralProbabilityScore}/100
                    </span>
                  )}
                              </div>
                              <p className="text-white text-sm font-medium leading-tight truncate">{script.shaiRemake.hook}</p>
                              <p className="text-gray-600 text-xs mt-0.5">{script.shaiRemake.contentType} · {script.shaiRemake.viralStructure}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setExpandedId(isExpanded ? null : realIdx)}
                              className="text-xs text-gray-600 hover:text-white transition-colors px-2 py-1">
                              {isExpanded ? '↑' : '↓'}
                            </button>
                            <a href={script.originalPost.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-gray-700 hover:text-white transition-colors px-2 py-1">↗</a>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a] text-xs text-gray-600">
                          <span>♥ {fmt(script.originalPost.likesCount)}</span>
                          <span>💬 {fmt(script.originalPost.commentsCount)}</span>
                          {script.originalPost.videoViewCount > 0 && <span>▶ {fmt(script.originalPost.videoViewCount)}</span>}
                          <span className="ml-auto text-gray-700 italic truncate max-w-[200px]">{script.originalPost.whyViral}</span>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-[#1a1a1a] divide-y divide-[#1a1a1a]">
                          {/* Original reconstructed script */}
                          <div className="p-4">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">📹 Original Post Script (reconstructed)</p>
                            <p className="text-gray-500 text-xs leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a]">
                              {script.originalPost.reconstructedScript}
                            </p>
                          </div>

                          {/* Shai's Hook */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest">🪝 Shai's Hook</p>
                              <button onClick={() => copy(script.shaiRemake.hook)} className="text-[10px] text-gray-700 hover:text-white">copy</button>
                            </div>
                            <p className="text-white text-sm font-medium bg-[#080808] p-3 border border-[#1a1a1a]">{script.shaiRemake.hook}</p>
                          </div>

                          {/* Shai's Script */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest">📝 Full Script</p>
                              <button onClick={() => copy(script.shaiRemake.script)} className="text-[10px] text-gray-700 hover:text-white">copy</button>
                            </div>
                            <div className="text-gray-300 text-sm leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a] whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {script.shaiRemake.script}
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest">🎯 CTA</p>
                              <button onClick={() => copy(script.shaiRemake.cta)} className="text-[10px] text-gray-700 hover:text-white">copy</button>
                            </div>
                            <p className="text-gray-300 text-sm bg-[#080808] p-3 border border-[#1a1a1a]">{script.shaiRemake.cta}</p>
                          </div>

                          {/* Actions */}
                          <div className="p-4 flex gap-2">
                            <button onClick={() => copy(`${script.shaiRemake.hook}\n\n${script.shaiRemake.script}\n\n${script.shaiRemake.cta}`)}
                              className="flex-1 py-2 border border-[#333] text-gray-400 hover:border-gray-500 hover:text-white text-xs transition-all">
                              Copy Full Script
                            </button>
                            {script.status === 'pending' && (
                              <>
                                <button onClick={() => rejectScript(realIdx)}
                                  className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 text-xs transition-all">
                                  ✕ Skip
                                </button>
                                <button onClick={() => approveScript(realIdx)}
                                  className="px-4 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all">
                                  ✓ Approve
                                </button>
                              </>
                            )}
                            {script.status === 'approved' && (
                              <button onClick={() => sendToScheduler(script)}
                                className="px-6 py-2 bg-cyan-500 text-black hover:bg-cyan-400 text-xs font-bold transition-all">
                                → Schedule
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── GENERATE TAB ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          {context ? (
            <div className="bg-[#111] border border-[#222] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">@{context.competitorUsername}</p>
                  <p className="text-gray-500 text-xs">{context.topPosts.length} posts loaded · sent {new Date(context.sentAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => { localStorage.removeItem('contentGenContext'); setContext(null); setIdeas([]) }}
                  className="text-gray-700 hover:text-red-400 text-xs transition-colors">Clear ×</button>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-gray-500 text-xs">Ideas:</span>
                {[3, 5, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`w-9 h-7 text-xs font-medium transition-all ${count === n ? 'bg-white text-black' : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'}`}>
                    {n}
                  </button>
                ))}
                <button onClick={generate} disabled={loading}
                  className="flex-1 py-1.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black text-xs font-bold transition-all">
                  {loading ? 'Generating...' : '⚡ Generate Ideas'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#222] p-10 text-center">
              <p className="text-gray-600 text-sm mb-3">No competitor context loaded.</p>
              <p className="text-gray-700 text-xs mb-4">Go to Competitors → click <strong className="text-gray-500">"Send to Content Gen"</strong> on any analyzed competitor.</p>
              <button onClick={() => router.push('/instagram/competitors')}
                className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all">
                → Go to Competitors
              </button>
            </div>
          )}

          {ideas.length > 0 && (
            <div className="space-y-3">
              <p className="text-gray-600 text-[10px] uppercase tracking-widest">{ideas.length} generated ideas</p>
              {ideas.map((idea, i) => (
                <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e]">
                  <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3">
                    <span className="text-gray-600 text-xs">#{i + 1}</span>
                    <span className="text-[10px] text-gray-500 border border-[#333] px-1.5 py-0.5">{idea.contentType || 'Reel'}</span>
                    <span className="text-gray-600 text-xs truncate">{idea.inspiredBy}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-600 uppercase tracking-widest">Hook</span><button onClick={() => copy(idea.hook)} className="text-[10px] text-gray-700 hover:text-white">copy</button></div>
                      <p className="text-white text-sm font-medium bg-[#080808] p-3 border border-[#1a1a1a]">{idea.hook}</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-600 uppercase tracking-widest">Script</span><button onClick={() => copy(idea.script)} className="text-[10px] text-gray-700 hover:text-white">copy</button></div>
                      <div className="text-gray-300 text-sm leading-relaxed bg-[#080808] p-3 border border-[#1a1a1a] whitespace-pre-wrap max-h-48 overflow-y-auto">{idea.script}</div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-600 uppercase tracking-widest">CTA</span><button onClick={() => copy(idea.cta)} className="text-[10px] text-gray-700 hover:text-white">copy</button></div>
                      <p className="text-gray-300 text-sm bg-[#080808] p-3 border border-[#1a1a1a]">{idea.cta}</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => copy(`${idea.hook}\n\n${idea.script}\n\n${idea.cta}`)}
                        className="flex-1 py-2 border border-[#333] text-gray-500 hover:border-gray-500 hover:text-white text-xs transition-all">
                        Copy Full
                      </button>
                      <button onClick={() => sendIdeaToScheduler(idea)}
                        className="px-6 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all">
                        → Schedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
