'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  shortCode: string
  type: string
  likesCount: number
  commentsCount: number
  videoViewCount: number
  timestamp: string
  caption: string
  url: string
  displayUrl: string
  hashtags: string[]
}

interface PostAnalysis {
  postId: string
  hookStyle: string
  captionLength: string
  hashtagUsage: string
  postingTime: string
  format: string
  engagementRate: string
  whyItWorked: string[]
}

interface CompetitorData {
  username: string
  fullName: string
  followersCount: number
  followingCount: number
  postsCount: number
  biography: string
  profilePicUrl: string
  isVerified: boolean
  posts: Post[]
  scrapedAt: string
  analysis?: string
  postAnalyses?: PostAnalysis[]
  isAnalyzing?: boolean
  isLoading?: boolean
  error?: string
}

interface RisingAccount {
  username: string
  estimatedFollowers: number
  niche: string
  whyGrowing: string
  contentFormula: string
  growthRate: 'slow' | 'moderate' | 'fast' | 'explosive'
  weakness: string
}

type TimeFilter = '30d' | '60d' | 'all'

const GROWTH_COLORS: Record<string, string> = {
  slow: '#6b7280',
  moderate: '#3b82f6',
  fast: '#10b981',
  explosive: '#f59e0b',
}

const GROWTH_LABELS: Record<string, string> = {
  slow: '🐢 Slow',
  moderate: '📈 Moderate',
  fast: '🚀 Fast',
  explosive: '💥 Explosive',
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function filterPostsByTime(posts: Post[], filter: TimeFilter): Post[] {
  if (filter === 'all') return posts
  const now = Date.now()
  const days = filter === '30d' ? 30 : 60
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return posts.filter(p => {
    if (!p.timestamp) return false
    return new Date(p.timestamp).getTime() >= cutoff
  })
}

export default function CompetitorTracker() {
  const router = useRouter()
  const [competitors, setCompetitors] = useState<CompetitorData[]>([])
  const [inputValue, setInputValue] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [risingAccounts, setRisingAccounts] = useState<RisingAccount[]>([])
  const [loadingRising, setLoadingRising] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const scrapeCompetitor = async (username: string) => {
    const clean = username.replace('@', '').trim().toLowerCase()
    if (!clean) return
    if (competitors.find(c => c.username === clean)) return

    const placeholder: CompetitorData = {
      username: clean,
      fullName: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      biography: '',
      profilePicUrl: '',
      isVerified: false,
      posts: [],
      scrapedAt: '',
      isLoading: true,
    }
    setCompetitors(prev => [placeholder, ...prev])

    try {
      const res = await fetch('/api/competitors/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: [clean] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scrape failed')

      setCompetitors(prev =>
        prev.map(c => (c.username === clean ? (() => {
          const comp = data.competitors?.[0]
          if (!comp) return { ...c, isLoading: false, error: 'No posts found. Account may be private or rate-limited.' }
          return { ...comp, username: clean, posts: comp.allPosts || comp.topPosts || [], isLoading: false }
        })() : c))
      )
    } catch (err: any) {
      setCompetitors(prev =>
        prev.map(c => c.username === clean ? { ...c, isLoading: false, error: err.message } : c)
      )
    }
  }

  const handleSingleAdd = () => {
    if (!inputValue.trim()) return
    scrapeCompetitor(inputValue)
    setInputValue('')
  }

  const handleBulkAdd = () => {
    const usernames = bulkInput.split(/[\n,]+/).map(u => u.trim()).filter(Boolean)
    usernames.forEach(u => scrapeCompetitor(u))
    setBulkInput('')
  }

  const analyzeCompetitor = async (username: string) => {
    const competitor = competitors.find(c => c.username === username)
    if (!competitor) return

    setCompetitors(prev => prev.map(c => (c.username === username ? { ...c, isAnalyzing: true } : c)))

    try {
      const res = await fetch('/api/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor, posts: competitor.posts }),
      })
      const data = await res.json()

      setCompetitors(prev =>
        prev.map(c =>
          c.username === username
            ? { ...c, isAnalyzing: false, analysis: data.analysis, postAnalyses: data.postAnalyses }
            : c
        )
      )
      setExpandedCard(username)
    } catch (err) {
      setCompetitors(prev => prev.map(c => (c.username === username ? { ...c, isAnalyzing: false } : c)))
    }
  }

  const removeCompetitor = (username: string) => {
    setCompetitors(prev => prev.filter(c => c.username !== username))
    if (expandedCard === username) setExpandedCard(null)
  }

  const sendTopPostsToContentGen = (comp: CompetitorData) => {
    const filtered = filterPostsByTime(comp.posts, timeFilter)
    const top10 = [...filtered]
      .sort((a, b) => (b.likesCount + b.commentsCount * 2) - (a.likesCount + a.commentsCount * 2))
      .slice(0, 10)
    const payload = {
      competitorUsername: comp.username,
      competitorFullName: comp.fullName,
      topPosts: top10,
      analysis: comp.analysis || '',
      sentAt: new Date().toISOString(),
    }
    localStorage.setItem('contentGenContext', JSON.stringify(payload))
    router.push('/instagram/content')
  }

  const loadRisingAccounts = async () => {
    setLoadingRising(true)
    try {
      const res = await fetch('/api/competitors/rising', { method: 'POST' })
      const data = await res.json()
      setRisingAccounts(data.accounts || [])
    } catch { }
    finally { setLoadingRising(false) }
  }

  const renderAnalysis = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-white font-bold mt-4 mb-1 text-sm">{line.replace(/\*\*/g, '')}</p>
      }
      if (line.match(/^\d+\.\s\*\*/)) {
        const content = line.replace(/^\d+\.\s\*\*/, '').replace(/\*\*/, '')
        return <p key={i} className="text-white font-bold mt-4 mb-1 text-sm">{content}</p>
      }
      if (line.startsWith('-')) {
        return <p key={i} className="text-gray-300 text-sm pl-3 leading-relaxed">{line}</p>
      }
      if (line.startsWith('#')) {
        return <p key={i} className="text-white font-bold mt-4 mb-1 text-sm">{line.replace(/^#+\s*/, '')}</p>
      }
      if (line.trim()) {
        return <p key={i} className="text-gray-300 text-sm leading-relaxed">{line}</p>
      }
      return <br key={i} />
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Competitor Intelligence</h2>
          <p className="text-gray-400 text-sm mt-1">Scrape, analyze, and outmaneuver your competition</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Filter */}
          <div className="flex gap-1">
            {(['30d', '60d', 'all'] as TimeFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`text-xs px-2.5 py-1 font-medium transition-all ${
                  timeFilter === f
                    ? 'bg-white text-black'
                    : 'bg-transparent text-gray-500 border border-[#333] hover:border-gray-500'
                }`}
              >
                {f === '30d' ? '30 Days' : f === '60d' ? '60 Days' : 'Lifetime'}
              </button>
            ))}
          </div>
          <span className="text-gray-500 text-xs">{competitors.length} tracked</span>
        </div>
      </div>

      {/* Add Competitors */}
      <div className="bg-[#111] border border-[#222] rounded-none p-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('single')}
            className={`text-xs px-3 py-1.5 font-medium transition-all ${
              mode === 'single' ? 'bg-white text-black' : 'bg-transparent text-gray-400 border border-[#333] hover:border-gray-500'
            }`}
          >Single Handle</button>
          <button
            onClick={() => setMode('bulk')}
            className={`text-xs px-3 py-1.5 font-medium transition-all ${
              mode === 'bulk' ? 'bg-white text-black' : 'bg-transparent text-gray-400 border border-[#333] hover:border-gray-500'
            }`}
          >Paste List</button>
        </div>

        {mode === 'single' ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSingleAdd()}
              placeholder="@competitor_handle"
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-gray-500 rounded-none"
            />
            <button onClick={handleSingleAdd} className="bg-white text-black text-xs font-bold px-4 py-2 hover:bg-gray-200 transition-colors">
              TRACK
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder={"Paste handles separated by commas or new lines\n@handle1, @handle2\n@handle3"}
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-gray-500 rounded-none resize-none"
            />
            <button onClick={handleBulkAdd} className="bg-white text-black text-xs font-bold px-4 py-2 hover:bg-gray-200 transition-colors">
              TRACK ALL
            </button>
          </div>
        )}
      </div>

      {/* Competitor Cards */}
      {competitors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-gray-400 text-xs font-medium uppercase tracking-widest">Tracked Competitors</h3>

          {competitors.map(comp => {
            const filteredPosts = filterPostsByTime(comp.posts, timeFilter)
            const avgEng = filteredPosts.length > 0
              ? filteredPosts.reduce((s, p) => s + p.likesCount + p.commentsCount, 0) / filteredPosts.length
              : 0
            const topPosts = [...filteredPosts].sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
            const outperformers = topPosts.filter(p => (p.likesCount + p.commentsCount) > avgEng * 1.5)

            return (
              <div key={comp.username} className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] transition-colors">
                <div className="p-4">
                  {comp.isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1a1a1a] animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[#1a1a1a] animate-pulse w-32" />
                        <div className="h-2 bg-[#1a1a1a] animate-pulse w-48" />
                      </div>
                      <div className="text-gray-600 text-xs">Scraping...</div>
                    </div>
                  ) : comp.error ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">@{comp.username}</p>
                        <p className="text-red-400 text-xs mt-1">{comp.error}</p>
                      </div>
                      <button onClick={() => removeCompetitor(comp.username)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">Remove</button>
                    </div>
                  ) : (
                    <>
                      {/* Card Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {comp.profilePicUrl ? (
                            <img src={comp.profilePicUrl} alt={comp.username} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                              <span className="text-gray-500 text-sm">{comp.username[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <a href={`https://instagram.com/${comp.username}`} target="_blank" rel="noopener noreferrer"
                                className="text-white text-sm font-bold hover:text-gray-300 transition-colors">
                                @{comp.username}
                              </a>
                              {comp.isVerified && <span className="text-blue-400 text-xs">✓</span>}
                            </div>
                            {comp.fullName && <p className="text-gray-500 text-xs">{comp.fullName}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {comp.analysis && (
                            <button
                              onClick={() => sendTopPostsToContentGen(comp)}
                              className="text-xs px-3 py-1.5 border border-[#333] text-cyan-400 hover:border-cyan-400 font-medium transition-all"
                              title="Send top 10 posts to Content Generator"
                            >
                              ✦ Send to Content Gen
                            </button>
                          )}
                          <button
                            onClick={() => analyzeCompetitor(comp.username)}
                            disabled={comp.isAnalyzing || comp.posts.length === 0}
                            className="text-xs px-3 py-1.5 bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            {comp.isAnalyzing ? 'Analyzing...' : comp.analysis ? 'Re-Analyze' : '🔍 Analyze'}
                          </button>
                          <button
                            onClick={() => removeCompetitor(comp.username)}
                            className="text-gray-600 hover:text-red-400 text-xs transition-colors px-2"
                          >✕</button>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a]">
                        <div className="text-center">
                          <p className="text-white text-sm font-bold">{comp.followersCount > 0 ? formatNum(comp.followersCount) : '—'}</p>
                          <p className="text-gray-600 text-xs">Followers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white text-sm font-bold">{formatNum(filteredPosts.length)}</p>
                          <p className="text-gray-600 text-xs">Posts</p>
                        </div>
                        {filteredPosts.length > 0 && (
                          <>
                            <div className="text-center">
                              <p className="text-white text-sm font-bold">
                                {formatNum(Math.round(filteredPosts.reduce((s, p) => s + p.likesCount, 0) / filteredPosts.length))}
                              </p>
                              <p className="text-gray-600 text-xs">Avg Likes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-white text-sm font-bold">
                                {formatNum(Math.round(filteredPosts.reduce((s, p) => s + p.commentsCount, 0) / filteredPosts.length))}
                              </p>
                              <p className="text-gray-600 text-xs">Avg Cmts</p>
                            </div>
                          </>
                        )}
                        {timeFilter !== 'all' && (
                          <div className="ml-auto">
                            <span className="text-[10px] text-gray-600 border border-[#222] px-2 py-0.5">
                              {timeFilter === '30d' ? 'Last 30 Days' : 'Last 60 Days'} · {filteredPosts.length} posts
                            </span>
                          </div>
                        )}
                      </div>

                      {comp.biography && (
                        <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">{comp.biography}</p>
                      )}

                      {/* Top Posts Preview */}
                      {topPosts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Top Posts</p>
                            <button
                              onClick={() => setExpandedCard(expandedCard === comp.username ? null : comp.username)}
                              className="text-gray-600 hover:text-white text-xs transition-colors"
                            >
                              {expandedCard === comp.username ? 'Collapse ↑' : 'Expand ↓'}
                            </button>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {topPosts.slice(0, 6).map((post, idx) => (
                              <a key={post.id || idx} href={post.url} target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0 relative group">
                                <div className="w-16 h-16 bg-[#1a1a1a] overflow-hidden">
                                  {post.displayUrl ? (
                                    <img src={`/api/proxy-image?url=${encodeURIComponent(post.displayUrl)}`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">
                                      {post.type === 'Video' ? '▶' : '📷'}
                                    </div>
                                  )}
                                  {idx === 0 && (
                                    <div className="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-[8px] font-bold px-0.5">#1</div>
                                  )}
                                  {outperformers.includes(post) && idx > 0 && (
                                    <div className="absolute top-0.5 left-0.5 bg-green-500 text-black text-[8px] font-bold px-0.5">↑</div>
                                  )}
                                </div>
                                <p className="text-gray-600 text-[9px] text-center mt-0.5">{formatNum(post.likesCount)}♥</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded Section */}
                      {expandedCard === comp.username && (
                        <div className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-6">

                          {/* All Posts Table */}
                          <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                              All Posts Performance {timeFilter !== 'all' ? `(${timeFilter === '30d' ? 'Last 30 Days' : 'Last 60 Days'})` : ''}
                            </p>
                            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                              {topPosts.map((post, idx) => {
                                const isOutperformer = outperformers.includes(post)
                                return (
                                  <div key={post.id || idx} className={`flex items-center gap-3 px-3 py-2 transition-colors ${isOutperformer ? 'bg-green-950/20 border-l-2 border-green-500' : 'bg-[#111] hover:bg-[#161616]'}`}>
                                    <span className="text-gray-700 text-xs w-4">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-300 text-xs truncate">
                                        {post.caption?.slice(0, 60) || '(no caption)'}
                                        {(post.caption?.length || 0) > 60 ? '...' : ''}
                                      </p>
                                      <p className="text-gray-600 text-[10px] mt-0.5">
                                        {post.type} · {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                                        {isOutperformer && <span className="ml-2 text-green-500">↑ outperformer</span>}
                                      </p>
                                    </div>
                                    <div className="flex gap-3 text-right flex-shrink-0">
                                      <div>
                                        <p className="text-white text-xs font-medium">{formatNum(post.likesCount)}</p>
                                        <p className="text-gray-600 text-[9px]">likes</p>
                                      </div>
                                      <div>
                                        <p className="text-white text-xs font-medium">{formatNum(post.commentsCount)}</p>
                                        <p className="text-gray-600 text-[9px]">cmts</p>
                                      </div>
                                      {post.videoViewCount > 0 && (
                                        <div>
                                          <p className="text-white text-xs font-medium">{formatNum(post.videoViewCount)}</p>
                                          <p className="text-gray-600 text-[9px]">views</p>
                                        </div>
                                      )}
                                      <a href={post.url} target="_blank" rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-white text-xs transition-colors"
                                        onClick={e => e.stopPropagation()}>↗</a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Deep Post Analysis - Outperformers */}
                          {comp.postAnalyses && comp.postAnalyses.length > 0 && (
                            <div>
                              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
                                🔬 Why These Posts Outperformed
                              </p>
                              <div className="space-y-3">
                                {comp.postAnalyses.map((pa, i) => {
                                  const post = comp.posts.find(p => p.id === pa.postId || p.shortCode === pa.postId)
                                  return (
                                    <div key={i} className="bg-[#0a0a0a] border border-green-500/20 p-3">
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="text-green-500 text-xs font-bold shrink-0">Post #{i + 1}</span>
                                        {post && (
                                          <p className="text-gray-400 text-xs truncate">{post.caption?.slice(0, 60) || '(no caption)'}...</p>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div className="bg-[#111] p-2">
                                          <p className="text-gray-600 text-[9px] uppercase">Hook Style</p>
                                          <p className="text-gray-300 text-xs mt-0.5">{pa.hookStyle}</p>
                                        </div>
                                        <div className="bg-[#111] p-2">
                                          <p className="text-gray-600 text-[9px] uppercase">Format</p>
                                          <p className="text-gray-300 text-xs mt-0.5">{pa.format}</p>
                                        </div>
                                        <div className="bg-[#111] p-2">
                                          <p className="text-gray-600 text-[9px] uppercase">Caption Length</p>
                                          <p className="text-gray-300 text-xs mt-0.5">{pa.captionLength}</p>
                                        </div>
                                        <div className="bg-[#111] p-2">
                                          <p className="text-gray-600 text-[9px] uppercase">Posting Time</p>
                                          <p className="text-gray-300 text-xs mt-0.5">{pa.postingTime}</p>
                                        </div>
                                      </div>
                                      <div className="bg-[#111] p-2 mb-2">
                                        <p className="text-gray-600 text-[9px] uppercase">Hashtag Usage</p>
                                        <p className="text-gray-300 text-xs mt-0.5">{pa.hashtagUsage}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 text-[9px] uppercase mb-1">Why It Worked</p>
                                        {pa.whyItWorked.map((reason, j) => (
                                          <p key={j} className="text-gray-300 text-xs pl-2 leading-relaxed">· {reason}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Overall AI Analysis */}
                          {comp.analysis && (
                            <div>
                              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">🧠 AI Analysis</p>
                              <div className="bg-[#0a0a0a] border border-[#1e1e1e] p-4 space-y-1">
                                {renderAnalysis(comp.analysis)}
                              </div>
                            </div>
                          )}

                          {/* Send to Content Gen Button */}
                          {comp.analysis && (
                            <button
                              onClick={() => sendTopPostsToContentGen(comp)}
                              className="w-full py-2.5 border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-all"
                            >
                              ✦ Send Top 10 Posts to Content Generator
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rising Accounts Section */}
      <div className="border-t border-[#1a1a1a] pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white text-sm font-bold">📡 Who is Coming Up</h3>
            <p className="text-gray-500 text-xs mt-0.5">Trading accounts growing fast right now</p>
          </div>
          <button
            onClick={loadRisingAccounts}
            disabled={loadingRising}
            className="text-xs px-4 py-2 border border-[#333] text-gray-300 hover:border-white hover:text-white disabled:opacity-40 transition-all font-medium"
          >
            {loadingRising ? 'Scanning...' : risingAccounts.length ? 'Refresh' : 'Scan Niche'}
          </button>
        </div>

        {loadingRising && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] p-4 space-y-2">
                <div className="h-3 bg-[#1a1a1a] animate-pulse w-24" />
                <div className="h-2 bg-[#1a1a1a] animate-pulse w-full" />
                <div className="h-2 bg-[#1a1a1a] animate-pulse w-3/4" />
              </div>
            ))}
          </div>
        )}

        {risingAccounts.length > 0 && !loadingRising && (
          <div className="grid grid-cols-1 gap-3">
            {risingAccounts.map((acc, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-bold">@{acc.username}</span>
                      <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{
                        backgroundColor: GROWTH_COLORS[acc.growthRate] + '22',
                        color: GROWTH_COLORS[acc.growthRate],
                        border: `1px solid ${GROWTH_COLORS[acc.growthRate]}44`,
                      }}>
                        {GROWTH_LABELS[acc.growthRate]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gray-500 text-xs">{formatNum(acc.estimatedFollowers)} followers</span>
                      <span className="text-gray-700 text-xs">·</span>
                      <span className="text-gray-500 text-xs">{acc.niche}</span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed mb-1"><span className="text-gray-600">Why growing: </span>{acc.whyGrowing}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mb-1"><span className="text-gray-600">Formula: </span>{acc.contentFormula}</p>
                    <p className="text-gray-500 text-xs leading-relaxed"><span className="text-gray-700">Weakness: </span>{acc.weakness}</p>
                  </div>
                  <button
                    onClick={() => { setInputValue(acc.username); setMode('single'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="ml-3 flex-shrink-0 text-xs px-3 py-1.5 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all"
                  >
                    Track →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {risingAccounts.length === 0 && !loadingRising && (
          <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-[#1e1e1e]">
            Hit "Scan Niche" to discover who is growing in the trading space
          </div>
        )}
      </div>
    </div>
  )
}
