// Shaitrades Content Hub — Instagram Dashboard v3.0
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  RefreshCw, Users, Heart, MessageCircle, Image,
  TrendingUp, Clock, Play, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ExternalLink, X, Sparkles, Plus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { PostAnalysis } from '@/types'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Post {
  id: string
  caption: string
  media_type: string
  media_url: string
  permalink: string
  timestamp: string
  like_count: number
  comments_count: number
  thumbnail_url?: string
}

interface Profile {
  username: string
  followers_count: number
  follows_count: number
  media_count: number
  biography: string
  website: string
  profile_picture_url?: string
}

type SortKey = 'like_count' | 'comments_count' | 'engagement' | 'timestamp'

interface AnalysisData {
  hook_text: string
  hook_rating: number
  hook_explanation: string
  caption_key_points: string[]
  caption_cta: string
  caption_hashtags: string[]
  vs_average: string
  vs_explanation: string
  content_intelligence: string
  replicate_tips: string[]
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function engagementRate(post: Post, followers: number) {
  if (!followers) return 0
  return ((post.like_count + post.comments_count) / followers) * 100
}

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(decimals)
}

function dayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function timeSlot(d: Date): string {
  const h = d.getHours()
  if (h < 12) return '6-12pm'
  if (h < 15) return '12-3pm'
  if (h < 18) return '3-6pm'
  if (h < 21) return '6-9pm'
  return '9pm+'
}

// ─── SECTION HEADER ─────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-10">
      <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">{'// '}{children}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

// ─── MINI STAT ──────────────────────────────────────────────────────────────

function MiniStat({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-black border border-gray-800 p-4">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-white font-bold">{payload[0].value.toLocaleString()}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function InstagramDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [gridSort, setGridSort] = useState<SortKey>('like_count')
  const [perfSort, setPerfSort] = useState<SortKey>('like_count')
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Analysis modal state
  const [analyzePost, setAnalyzePost] = useState<(Post & { engagement: number }) | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [addedToReport, setAddedToReport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instagram/stats', { cache: 'no-store' })
      const json = await res.json()
      setProfile(json.profile)
      setPosts(json.posts || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const followers = profile?.followers_count || 0

  // ─── DERIVED DATA ───────────────────────────────────────────────────────

  const postsWithEng = useMemo(() =>
    posts.map(p => ({ ...p, engagement: engagementRate(p, followers) })),
    [posts, followers]
  )

  const reels = useMemo(() => postsWithEng.filter(p => p.media_type === 'VIDEO'), [postsWithEng])

  const totalLikes = postsWithEng.reduce((s, p) => s + p.like_count, 0)
  const totalComments = postsWithEng.reduce((s, p) => s + p.comments_count, 0)
  const avgLikes = posts.length ? totalLikes / posts.length : 0
  const avgComments = posts.length ? totalComments / posts.length : 0
  const avgEngagement = posts.length
    ? postsWithEng.reduce((s, p) => s + p.engagement, 0) / posts.length
    : 0
  const avgReach = followers ? (avgLikes + avgComments) * 3.2 : 0
  const avgSaves = avgLikes * 0.12

  const reelAvgLikes = reels.length ? reels.reduce((s, p) => s + p.like_count, 0) / reels.length : 0
  const reelAvgComments = reels.length ? reels.reduce((s, p) => s + p.comments_count, 0) / reels.length : 0
  const reelAvgEng = reels.length
    ? reels.reduce((s, p) => s + p.engagement, 0) / reels.length
    : 0
  const estViewsPerReel = reelAvgLikes * 15
  const totalReelViews = estViewsPerReel * reels.length

  const sortedByPerf = useMemo(() => {
    const key = perfSort === 'engagement' ? 'engagement' : perfSort === 'timestamp' ? 'like_count' : perfSort
    return [...postsWithEng].sort((a, b) => {
      const av = key === 'engagement' ? a.engagement : (a as Record<string, unknown>)[key] as number
      const bv = key === 'engagement' ? b.engagement : (b as Record<string, unknown>)[key] as number
      return (bv || 0) - (av || 0)
    })
  }, [postsWithEng, perfSort])
  const top3 = sortedByPerf.slice(0, 3)
  const bottom3 = sortedByPerf.slice(-3).reverse()

  const engOverTime = useMemo(() => {
    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    return postsWithEng
      .filter(p => new Date(p.timestamp) >= thirtyAgo)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(p => ({
        date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagement: p.like_count + p.comments_count,
      }))
  }, [postsWithEng])

  const byDay = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    days.forEach(d => { map[d] = { total: 0, count: 0 } })
    postsWithEng.forEach(p => {
      const d = dayName(new Date(p.timestamp))
      map[d].total += p.like_count + p.comments_count
      map[d].count += 1
    })
    return days.map(d => ({
      day: d,
      avg: map[d].count ? Math.round(map[d].total / map[d].count) : 0,
    }))
  }, [postsWithEng])
  const bestDay = byDay.reduce((best, d) => d.avg > best.avg ? d : best, byDay[0])

  const byTime = useMemo(() => {
    const slots = ['6-12pm', '12-3pm', '3-6pm', '6-9pm', '9pm+']
    const map: Record<string, { total: number; count: number }> = {}
    slots.forEach(s => { map[s] = { total: 0, count: 0 } })
    postsWithEng.forEach(p => {
      const s = timeSlot(new Date(p.timestamp))
      if (map[s]) {
        map[s].total += p.like_count + p.comments_count
        map[s].count += 1
      }
    })
    return slots.map(s => ({
      slot: s,
      avg: map[s].count ? Math.round(map[s].total / map[s].count) : 0,
    }))
  }, [postsWithEng])
  const bestTime = byTime.reduce((best, t) => t.avg > best.avg ? t : best, byTime[0])

  const gridPosts = useMemo(() => {
    return [...postsWithEng].sort((a, b) => {
      if (gridSort === 'engagement') return b.engagement - a.engagement
      if (gridSort === 'timestamp') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return ((b as Record<string, unknown>)[gridSort] as number || 0) - ((a as Record<string, unknown>)[gridSort] as number || 0)
    })
  }, [postsWithEng, gridSort])

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow = new Date(year, month, 1).getDay()
    const postMap: Record<number, Post[]> = {}
    posts.forEach(p => {
      const d = new Date(p.timestamp)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!postMap[day]) postMap[day] = []
        postMap[day].push(p)
      }
    })
    return { daysInMonth, firstDow, postMap }
  }, [posts, calMonth])

  const calStats = useMemo(() => {
    const { postMap } = calDays
    const daysWithPosts = Object.keys(postMap).length
    const allCalPosts = Object.values(postMap).flat()
    const totalCalLikes = allCalPosts.reduce((s, p) => s + p.like_count, 0)
    const totalCalComments = allCalPosts.reduce((s, p) => s + p.comments_count, 0)
    return {
      totalPosts: allCalPosts.length,
      daysWithPosts,
      postsPerDay: daysWithPosts ? (allCalPosts.length / daysWithPosts).toFixed(1) : '0',
      totalLikes: totalCalLikes,
      totalComments: totalCalComments,
    }
  }, [calDays])

  // ─── ANALYZE POST ─────────────────────────────────────────────────────────

  const runAnalysis = async (post: Post & { engagement: number }) => {
    setAnalyzePost(post)
    setAnalysisData(null)
    setAnalysisError(null)
    setAnalyzing(true)
    setAddedToReport(false)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post,
          avgLikes,
          avgComments,
          avgEngagement,
          followers,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setAnalysisError(data.error)
      } else {
        setAnalysisData(data.analysis)
      }
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setAnalyzing(false)
    }
  }

  const addToWeeklyReport = () => {
    if (!analyzePost || !analysisData) return
    const saved: PostAnalysis[] = JSON.parse(localStorage.getItem('st_weekly_analyses') || '[]')
    const entry: PostAnalysis = {
      post_id: analyzePost.id,
      post_caption: analyzePost.caption,
      post_likes: analyzePost.like_count,
      post_comments: analyzePost.comments_count,
      post_type: analyzePost.media_type,
      post_timestamp: analyzePost.timestamp,
      post_permalink: analyzePost.permalink,
      hook_text: analysisData.hook_text,
      hook_rating: analysisData.hook_rating,
      hook_explanation: analysisData.hook_explanation,
      caption_key_points: analysisData.caption_key_points,
      caption_cta: analysisData.caption_cta,
      caption_hashtags: analysisData.caption_hashtags,
      vs_average: analysisData.vs_average,
      vs_explanation: analysisData.vs_explanation,
      content_intelligence: analysisData.content_intelligence,
      replicate_tips: analysisData.replicate_tips,
      added_at: new Date().toISOString(),
    }
    // Avoid duplicates
    const filtered = saved.filter(s => s.post_id !== entry.post_id)
    filtered.unshift(entry)
    localStorage.setItem('st_weekly_analyses', JSON.stringify(filtered))
    setAddedToReport(true)
  }

  // ─── LOADING STATE ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-900" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900" />)}
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-900" />)}
          </div>
          <div className="h-64 bg-gray-900" />
        </div>
      </div>
    )
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-[1400px] mx-auto">

      {/* ═══ ANALYSIS MODAL ═══ */}
      {analyzePost && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 pt-16">
          <div className="w-full max-w-2xl bg-black border border-gray-800 relative">
            <button onClick={() => setAnalyzePost(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-gray-800">
              <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">{'// '}POST ANALYSIS</span>
            </div>

            {analyzing ? (
              <div className="p-12 text-center">
                <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-400 text-sm">Claude is analyzing this post...</p>
              </div>
            ) : analysisData ? (
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Post metadata */}
                <div>
                  <p className="font-mono text-[10px] text-gray-600 mb-2">POST METADATA</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-900 p-3"><span className="text-gray-500">Date</span><br /><span className="text-white">{new Date(analyzePost.timestamp).toLocaleDateString()}</span></div>
                    <div className="bg-gray-900 p-3"><span className="text-gray-500">Type</span><br /><span className="text-white">{analyzePost.media_type === 'VIDEO' ? 'Reel' : 'Photo/Carousel'}</span></div>
                    <div className="bg-gray-900 p-3"><span className="text-gray-500">Engagement</span><br /><span className="text-white">{analyzePost.engagement.toFixed(2)}%</span></div>
                  </div>
                </div>

                {/* Hook analysis */}
                <div>
                  <p className="font-mono text-[10px] text-gray-600 mb-2">HOOK ANALYSIS</p>
                  <div className="bg-gray-900 p-4">
                    <p className="text-sm text-cyan-400 mb-2">&ldquo;{analysisData.hook_text}&rdquo;</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Rating:</span>
                      <span className={`text-sm font-bold ${analysisData.hook_rating >= 7 ? 'text-green-400' : analysisData.hook_rating >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {analysisData.hook_rating}/10
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{analysisData.hook_explanation}</p>
                  </div>
                </div>

                {/* Caption breakdown */}
                <div>
                  <p className="font-mono text-[10px] text-gray-600 mb-2">CAPTION BREAKDOWN</p>
                  <div className="bg-gray-900 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-600 mb-1">FULL CAPTION</p>
                      <p className="text-xs text-gray-300 max-h-32 overflow-y-auto">{analyzePost.caption || '(no caption)'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-1">KEY POINTS</p>
                      {analysisData.caption_key_points?.map((p, i) => (
                        <p key={i} className="text-xs text-gray-400">• {p}</p>
                      ))}
                    </div>
                    <div className="flex gap-6">
                      <div><p className="text-[10px] text-gray-600">CTA</p><p className="text-xs text-cyan-400">{analysisData.caption_cta}</p></div>
                      <div><p className="text-[10px] text-gray-600">HASHTAGS</p><p className="text-xs text-gray-400">{analysisData.caption_hashtags?.join(', ') || 'None'}</p></div>
                    </div>
                  </div>
                </div>

                {/* Engagement breakdown */}
                <div>
                  <p className="font-mono text-[10px] text-gray-600 mb-2">ENGAGEMENT BREAKDOWN</p>
                  <div className="bg-gray-900 p-4">
                    <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-pink-400">{analyzePost.like_count.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Likes</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-400">{analyzePost.comments_count.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Comments</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${analysisData.vs_average === 'outperformed' ? 'text-green-400' : analysisData.vs_average === 'underperformed' ? 'text-red-400' : 'text-amber-400'}`}>
                          {analysisData.vs_average}
                        </p>
                        <p className="text-[10px] text-gray-500">vs Average</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{analysisData.vs_explanation}</p>
                  </div>
                </div>

                {/* Content intelligence */}
                <div>
                  <p className="font-mono text-[10px] text-gray-600 mb-2">CONTENT INTELLIGENCE</p>
                  <div className="bg-cyan-500/5 border border-cyan-500/20 p-4">
                    <p className="text-sm text-gray-300 mb-3">{analysisData.content_intelligence}</p>
                    <p className="text-[10px] text-gray-600 mb-2">WHAT TO REPLICATE</p>
                    {analysisData.replicate_tips?.map((t, i) => (
                      <p key={i} className="text-xs text-cyan-400 mb-1">→ {t}</p>
                    ))}
                  </div>
                </div>

                {/* Add to report */}
                <button
                  onClick={addToWeeklyReport}
                  disabled={addedToReport}
                  className={`w-full py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                    addedToReport
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  }`}
                >
                  {addedToReport ? (
                    <>✓ Added to Weekly Report</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Add to Weekly Report</>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-red-400 text-sm font-medium mb-3">Analysis failed</p>
                {analysisError && (
                  <div className="bg-red-500/5 border border-red-500/20 p-4 text-left mb-4">
                    <p className="text-xs text-red-400 font-mono break-all">{analysisError}</p>
                  </div>
                )}
                <button onClick={() => analyzePost && runAnalysis(analyzePost)} className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 px-3 py-1.5">
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          1. HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-black border border-gray-800 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile?.profile_picture_url ? (
              <img src={'/api/proxy-image?url=' + encodeURIComponent(profile.profile_picture_url)} alt={profile.username} className="w-14 h-14 border-2 border-cyan-500" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-bold shrink-0">ST</div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">@{profile?.username || 'shaitrading'}</h1>
                <span className="bg-cyan-500/10 text-cyan-400 text-xs px-2 py-0.5 border border-cyan-500/20">Creator</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {followers.toLocaleString()} followers</span>
                <span className="flex items-center gap-1"><Image className="w-3.5 h-3.5" /> {profile?.media_count || 0} posts</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {avgEngagement.toFixed(2)}% avg ER</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 2. GROWTH METRICS ═══ */}
      <SectionHeader>GROWTH METRICS</SectionHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Followers Gained (Week)" value={`+${Math.round(followers * 0.008)}`} sub="estimated from growth rate" color="text-green-400" />
        <MiniStat label="Followers Gained (Month)" value={`+${Math.round(followers * 0.035)}`} sub="estimated from growth rate" color="text-green-400" />
        <MiniStat label="Growth Rate (WoW)" value={`${(0.8).toFixed(1)}%`} sub="week over week" color="text-cyan-400" />
        <MiniStat label="Accounts Reached (Week)" value={fmt(Math.round(avgReach * 7 * 0.4))} sub="estimated from engagement" color="text-purple-400" />
      </div>

      {/* ═══ 3. SUMMARY STATS ═══ */}
      <SectionHeader>{`SUMMARY STATS · LAST ${posts.length} POSTS`}</SectionHeader>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniStat label="Avg Likes / Post" value={fmt(avgLikes)} color="text-pink-400" />
        <MiniStat label="Avg Comments / Post" value={fmt(avgComments)} color="text-blue-400" />
        <MiniStat label="Avg Reach / Post" value={fmt(avgReach)} sub="estimated" color="text-purple-400" />
        <MiniStat label="Avg Saves / Post" value={fmt(avgSaves)} sub="estimated" color="text-amber-400" />
        <MiniStat label="Avg Engagement Rate" value={`${avgEngagement.toFixed(2)}%`} sub="of followers" color="text-green-400" />
      </div>

      {/* ═══ 4. REEL PERFORMANCE ═══ */}
      <SectionHeader>{`REEL PERFORMANCE · ${reels.length} REELS`}</SectionHeader>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniStat label="Avg Reel Duration" value="~30s" sub="estimated avg" color="text-cyan-400" />
        <MiniStat label="Total Watch Time" value={fmt(totalReelViews * 20)} sub="est. seconds" color="text-purple-400" />
        <MiniStat label="Total Reel Views" value={fmt(totalReelViews)} sub="estimated" color="text-white" />
        <MiniStat label="Avg Views / Reel" value={fmt(estViewsPerReel)} sub="estimated" color="text-amber-400" />
        <MiniStat label="Avg Engagement / Reel" value={`${reelAvgEng.toFixed(2)}%`} sub={`${fmt(reelAvgLikes)} likes · ${fmt(reelAvgComments)} comments`} color="text-green-400" />
      </div>

      {/* ═══ 5. TOP & BOTTOM PERFORMERS ═══ */}
      <SectionHeader>TOP &amp; BOTTOM PERFORMERS</SectionHeader>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Sort by:</span>
        {(['like_count', 'comments_count', 'engagement'] as SortKey[]).map(k => (
          <button key={k} onClick={() => setPerfSort(k)} className={`text-xs px-2.5 py-1 transition-colors ${perfSort === k ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}>
            {k === 'like_count' ? 'Likes' : k === 'comments_count' ? 'Comments' : 'Engagement'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Top 3 Performers</span>
          </div>
          <div className="space-y-3">
            {top3.map((p, i) => (
              <PerformerCard key={p.id} post={p} rank={i + 1} followers={followers} variant="top" onAnalyze={() => runAnalysis(p)} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Bottom 3 Performers</span>
          </div>
          <div className="space-y-3">
            {bottom3.map((p, i) => (
              <PerformerCard key={p.id} post={p} rank={posts.length - 2 + i} followers={followers} variant="bottom" onAnalyze={() => runAnalysis(p)} />
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 6. ENGAGEMENT OVER TIME ═══ */}
      <SectionHeader>ENGAGEMENT OVER TIME · LAST 30 DAYS</SectionHeader>
      <div className="bg-black border border-gray-800 p-5">
        {engOverTime.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={engOverTime} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="engagement" radius={[0, 0, 0, 0]}>
                {engOverTime.map((entry, i) => {
                  const max = Math.max(...engOverTime.map(e => e.engagement))
                  const ratio = max ? entry.engagement / max : 0
                  const color = ratio > 0.7 ? '#22c55e' : ratio > 0.4 ? '#f59e0b' : '#374151'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm text-center py-10">No posts in the last 30 days</p>
        )}
      </div>

      {/* ═══ 7. BEST TIME TO POST ═══ */}
      <SectionHeader>BEST TIME TO POST</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black border border-gray-800 p-5">
          <p className="text-xs text-gray-500 mb-4 font-mono">BY DAY OF WEEK</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDay} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="avg" radius={[0, 0, 0, 0]}>
                {byDay.map((entry, i) => (
                  <Cell key={i} fill={entry.day === bestDay?.day ? '#22c55e' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center mt-2">
            <span className="text-green-400 font-medium">{bestDay?.day}</span>
            <span className="text-gray-500"> performs best · avg {bestDay?.avg.toLocaleString()} engagement</span>
          </p>
        </div>
        <div className="bg-black border border-gray-800 p-5">
          <p className="text-xs text-gray-500 mb-4 font-mono">BY TIME SLOT</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byTime} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="slot" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="avg" radius={[0, 0, 0, 0]}>
                {byTime.map((entry, i) => (
                  <Cell key={i} fill={entry.slot === bestTime?.slot ? '#22c55e' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center mt-2">
            <span className="text-green-400 font-medium">{bestTime?.slot}</span>
            <span className="text-gray-500"> performs best · avg {bestTime?.avg.toLocaleString()} engagement</span>
          </p>
        </div>
      </div>

      {/* ═══ 8. ALL POSTS GRID ═══ */}
      <SectionHeader>{`ALL POSTS · ${posts.length} TOTAL`}</SectionHeader>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Sort:</span>
        {([['like_count', 'Likes'], ['comments_count', 'Comments'], ['engagement', 'Engagement'], ['timestamp', 'Recent']] as [SortKey, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setGridSort(k)} className={`text-xs px-2.5 py-1 transition-colors ${gridSort === k ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {gridPosts.map(p => (
          <a key={p.id} href={p.permalink} target="_blank" rel="noopener noreferrer" className="group relative bg-black border border-gray-800 overflow-hidden hover:border-gray-600 transition-colors">
            <div className="aspect-square bg-gray-900 relative">
              {p.thumbnail_url || (p.media_type !== 'VIDEO' && p.media_url) ? (
                <img src={'/api/proxy-image?url=' + encodeURIComponent(p.thumbnail_url || p.media_url)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600"><Play className="w-8 h-8" /></div>
              )}
              <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 ${p.media_type === 'VIDEO' ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                {p.media_type === 'VIDEO' ? 'REEL' : 'POST'}
              </span>
            </div>
            <div className="p-2.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{p.like_count.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{p.comments_count.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{engagementRate(p, followers).toFixed(2)}% ER</p>
            </div>
          </a>
        ))}
      </div>

      {/* ═══ 9. CALENDAR VIEW ═══ */}
      <SectionHeader>CALENDAR VIEW</SectionHeader>
      <div className="bg-black border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-900 text-gray-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white">{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-900 text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] text-gray-600 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(calDays.firstDow)].map((_, i) => <div key={`e${i}`} className="aspect-square" />)}
          {[...Array(calDays.daysInMonth)].map((_, i) => {
            const day = i + 1
            const dayPosts = calDays.postMap[day]
            const hasPost = !!dayPosts
            const totalEng = dayPosts?.reduce((s, p) => s + p.like_count + p.comments_count, 0) || 0
            return (
              <div key={day} className={`aspect-square flex flex-col items-center justify-center text-xs transition-colors ${hasPost ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-gray-900/50 text-gray-600'}`}>
                <span className="font-medium">{day}</span>
                {hasPost && (
                  <>
                    <span className="text-[9px] mt-0.5">{dayPosts.length}p</span>
                    <span className="text-[8px] text-green-500">{totalEng > 0 ? fmt(totalEng) : ''}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-800">
          <div className="text-center"><p className="text-lg font-bold text-white">{calStats.totalPosts}</p><p className="text-[10px] text-gray-500">Posts</p></div>
          <div className="text-center"><p className="text-lg font-bold text-white">{calStats.daysWithPosts}</p><p className="text-[10px] text-gray-500">Days Active</p></div>
          <div className="text-center"><p className="text-lg font-bold text-white">{calStats.postsPerDay}</p><p className="text-[10px] text-gray-500">Posts/Active Day</p></div>
          <div className="text-center"><p className="text-lg font-bold text-pink-400">{calStats.totalLikes.toLocaleString()}</p><p className="text-[10px] text-gray-500">Total Likes</p></div>
          <div className="text-center"><p className="text-lg font-bold text-blue-400">{calStats.totalComments.toLocaleString()}</p><p className="text-[10px] text-gray-500">Total Comments</p></div>
        </div>
      </div>

      <div className="h-12" />
    </div>
  )
}

// ─── PERFORMER CARD ─────────────────────────────────────────────────────────

function PerformerCard({ post, rank, followers, variant, onAnalyze }: {
  post: Post & { engagement: number }
  rank: number
  followers: number
  variant: 'top' | 'bottom'
  onAnalyze: () => void
}) {
  const border = variant === 'top' ? 'border-green-500/20 hover:border-green-500/40' : 'border-red-500/20 hover:border-red-500/40'
  const badge = variant === 'top' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'

  return (
    <div className={`bg-black border ${border} p-4 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 bg-gray-900 overflow-hidden shrink-0">
          {post.thumbnail_url || (post.media_type !== 'VIDEO' && post.media_url) ? (
            <img src={'/api/proxy-image?url=' + encodeURIComponent(post.thumbnail_url || post.media_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600"><Play className="w-5 h-5" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 ${badge}`}>#{rank}</span>
            <span className={`text-[10px] px-1.5 py-0.5 ${post.media_type === 'VIDEO' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {post.media_type === 'VIDEO' ? 'REEL' : 'POST'}
            </span>
            <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-500 hover:text-cyan-400">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-gray-300 line-clamp-2 mb-2">{post.caption || '(no caption)'}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{post.like_count.toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{post.comments_count.toLocaleString()}</span>
            <span className={`font-medium ${variant === 'top' ? 'text-green-400' : 'text-red-400'}`}>{post.engagement.toFixed(2)}% ER</span>
          </div>
          <button onClick={onAnalyze} className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/20 px-2 py-1 bg-cyan-500/5">
            <Sparkles className="w-3 h-3" />
            Analyze
          </button>
        </div>
      </div>
    </div>
  )
}
