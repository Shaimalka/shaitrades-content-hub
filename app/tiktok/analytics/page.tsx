'use client'
import { useEffect, useState, useCallback } from 'react'
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
    BarChart, Bar, CartesianGrid, Legend,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TikTokPost {
    id: string
    url: string
    caption: string
    likesCount: number
    commentsCount: number
    videoViewCount: number
    shareCount: number
    timestamp: string | null
    displayUrl: string | null
}

interface AnalyticsData {
    username: string
    followersCount: number
    likesCount: number
    videoCount: number
    posts: TikTokPost[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number): string {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12am'
    if (i < 12) return i + 'am'
    if (i === 12) return '12pm'
    return (i - 12) + 'pm'
})

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
          <div className="bg-[#111] border border-[#333] px-3 py-2 text-xs">
                <p className="text-gray-400 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
                  ))}
          </div>
        )
}
  
  // ── Engagement Tooltip ─────────────────────────────────────────────────────────
const EngagementTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
        return (
              <div className="bg-[#111] border border-[#333] px-3 py-2 text-xs">
                    <p className="text-gray-400 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
                      ))}
              </div>
            )
}
  
  // ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-4">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{label}</p>
                <p className="text-white text-2xl font-bold">{value}</p>
            {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
          </div>
        )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TikTokAnalyticsPage() {
    const HANDLE = 'shaitrader'
        const [data, setData] = useState<AnalyticsData | null>(null)
            const [loading, setLoading] = useState(true)
                const [error, setError] = useState<string | null>(null)
                    const [lastFetched, setLastFetched] = useState<Date | null>(null)
                        const [aiInsight, setAiInsight] = useState<string[] | null>(null)
                            const [aiLoading, setAiLoading] = useState(false)
                                const [aiError, setAiError] = useState<string | null>(null)
                                  
                                    const fetchAnalytics = useCallback(async (handle: string) => {
                                          setLoading(true)
                                                setError(null)
                                                      try {
                                                              const res = await fetch('/api/tiktok/analytics', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ username: handle }),
                                                              })
                                                                      const json = await res.json()
                                                                              if (!res.ok) throw new Error(json.error || 'Fetch failed')
                                                                                      setData(json)
                                                                                              setLastFetched(new Date())
                                                        } catch (e: any) {
                                                              setError(e.message)
                                                      } finally {
                                                              setLoading(false)
                                                      }
                                    }, [])
                                      
                                        useEffect(() => {
                                              fetchAnalytics(HANDLE)
                                        }, [fetchAnalytics])
                                          
                                            const fetchAiInsight = useCallback(async () => {
                                                  if (!data?.posts?.length) return
                                                        setAiLoading(true)
                                                              setAiError(null)
                                                                    try {
                                                                            const res = await fetch('/api/tiktok/insight', {
                                                                                      method: 'POST',
                                                                                      headers: { 'Content-Type': 'application/json' },
                                                                                      body: JSON.stringify({ posts: data.posts }),
                                                                            })
                                                                                    const json = await res.json()
                                                                                            if (!res.ok) throw new Error(json.error || 'AI fetch failed')
                                                                                                    setAiInsight(json.bullets || [])
                                                                      } catch (e: any) {
                                                                            setAiError(e.message)
                                                                    } finally {
                                                                            setAiLoading(false)
                                                                    }
                                            }, [data])
                                              
                                                // ── Derived chart data ────────────────────────────────────────────────────
    // 1. Follower growth proxy: cumulative engagement over time
    const growthData = (() => {
          if (!data?.posts.length) return []
                const sorted = [...data.posts]
                        .filter(p => p.timestamp)
                        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
                      let cumViews = 0
                            return sorted.map(p => {
                                    cumViews += p.videoViewCount
                                            return {
                                                      date: new Date(p.timestamp!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                                      views: cumViews,
                                                      likes: p.likesCount,
                                            }
                            })
    })()
      
        // 2. Top 10 posts by views for bar chart
    const topPostsChart = (() => {
          if (!data?.posts.length) return []
                return [...data.posts]
                        .sort((a, b) => b.videoViewCount - a.videoViewCount)
                        .slice(0, 10)
                        .map((p, i) => ({
                                  name: '#' + (i + 1),
                                  views: p.videoViewCount,
                                  likes: p.likesCount,
                                  comments: p.commentsCount,
                                  caption: p.caption?.slice(0, 40) || '(no caption)',
                                  url: p.url,
                        }))
    })()
      
        // 3. Engagement rate per post (top 10 by views)
    const engagementChart = (() => {
          if (!data?.posts.length) return []
                return [...data.posts]
                        .sort((a, b) => b.videoViewCount - a.videoViewCount)
                        .slice(0, 10)
                        .map((p, i) => ({
                                  name: '#' + (i + 1),
                                  engagement: p.videoViewCount > 0
                                              ? parseFloat(((p.likesCount + p.commentsCount) / p.videoViewCount * 100).toFixed(1))
                                              : 0,
                        }))
    })()
      
        // 4. Best posting times heatmap
    const heatmapData = (() => {
          if (!data?.posts.length) return { grid: [], max: 1 }
                const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
                      data.posts.forEach(p => {
                              if (!p.timestamp) return
                                      const d = new Date(p.timestamp)
                                              grid[d.getDay()][d.getHours()] += p.videoViewCount || 1
                      })
                            const max = Math.max(...grid.flat()) || 1
                                  return { grid, max }
    })()
      
        // 5. Top 8 videos for thumbnail grid
    const topVideos = data?.posts
          ? [...data.posts].sort((a, b) => b.videoViewCount - a.videoViewCount).slice(0, 8)
          : []
      
        // 6. Best performing video (#1 by views)
        const bestVideo = data?.posts?.length
              ? [...data.posts].sort((a, b) => b.videoViewCount - a.videoViewCount)[0]
              : null
          
            // 7. Growth rate: followers / days since first post
    const growthRate = (() => {
          if (!data?.posts?.length || !data.followersCount) return null
                const withTimestamp = data.posts.filter(p => p.timestamp)
                      if (!withTimestamp.length) return null
                            const oldest = withTimestamp.reduce((a, b) =>
                                    new Date(a.timestamp!).getTime() < new Date(b.timestamp!).getTime() ? a : b
                                  )
                                  const daysSinceFirst = Math.max(1,
                                                                        Math.floor((Date.now() - new Date(oldest.timestamp!).getTime()) / (1000 * 60 * 60 * 24))
                                                                      )
                                        return (data.followersCount / daysSinceFirst).toFixed(1)
    })()
      
        // ── Render ────────────────────────────────────────────────────────────────
    return (
          <div className="p-6 space-y-8 max-w-6xl">
            {/* Header */}
                <div className="flex items-center justify-between">
                        <div>
                                  <h1 className="text-white text-xl font-bold tracking-tight">TikTok Analytics</h1>
                                  <p className="text-gray-500 text-sm mt-1">
                                              @{HANDLE} · {lastFetched ? 'Updated ' + lastFetched.toLocaleTimeString() : 'Loading...'}
                                  </p>
                        </div>
                        <button
                                    onClick={() => fetchAnalytics(HANDLE)}
                                    disabled={loading}
                                    className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white disabled:opacity-40 transition-all font-medium"
                                  >
                          {loading ? 'Scraping TikTok...' : '↻ Refresh'}
                        </button>
                </div>
          
            {/* Loading state */}
            {loading && (
                    <div className="space-y-4">
                              <div className="grid grid-cols-4 gap-4">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] p-4 h-20 animate-pulse" />
                                  ))}
                              </div>
                              <div className="bg-[#0d0d0d] border border-[#1e1e1e] h-64 animate-pulse" />
                              <p className="text-gray-600 text-xs text-center">Scraping @{HANDLE} TikTok... this takes ~2-3 min</p>
                    </div>
                )}
          
            {/* Error state */}
            {error && !loading && (
                    <div className="bg-red-950/20 border border-red-800/30 p-4">
                              <p className="text-red-400 text-sm font-medium">Error: {error}</p>
                              <button
                                            onClick={() => fetchAnalytics(HANDLE)}
                                            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                                          >
                                          Try again
                              </button>
                    </div>
                )}
          
            {/* Dashboard */}
            {data && !loading && (
                    <div className="space-y-8">
                    
                      {/* ── Profile Stats ── */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                          <StatCard
                                                          label="Followers"
                                                          value={fmt(data.followersCount)}
                                                          sub="@shaitrader"
                                                        />
                                          <StatCard
                                                          label="Total Likes"
                                                          value={fmt(data.likesCount)}
                                                          sub="Across all videos"
                                                        />
                                          <StatCard
                                                          label="Total Videos"
                                                          value={fmt(data.videoCount)}
                                                          sub={data.posts.length + ' scraped'}
                                                        />
                                          <StatCard
                                                          label="Growth Rate"
                                                          value={growthRate ? '+' + growthRate + '/day' : 'N/A'}
                                                          sub="followers (estimated)"
                                                        />
                              </div>
                    
                      {/* ── Best Performing Video Card ── */}
                      {bestVideo && (
                                  <div className="bg-[#0d0d0d] border border-cyan-500/30 p-5">
                                                <div className="flex items-center gap-2 mb-4">
                                                                <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">#1 Best Performing Video</span>
                                                </div>
                                                <div className="flex gap-4">
                                                  {bestVideo.displayUrl && (
                                                      <a href={bestVideo.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                                          <div className="relative w-24 aspect-[9/16] overflow-hidden bg-[#111]">
                                                                                                <img
                                                                                                                          src={'/api/proxy-image?url=' + encodeURIComponent(bestVideo.displayUrl)}
                                                                                                                          alt="Top video thumbnail"
                                                                                                                          className="w-full h-full object-cover"
                                                                                                                        />
                                                                          </div>
                                                      </a>
                                                                )}
                                                                <div className="flex flex-col justify-between flex-1">
                                                                                  <div>
                                                                                                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                                                                                        {(bestVideo.caption || '(no caption)').slice(0, 100)}{bestVideo.caption?.length > 100 ? '...' : ''}
                                                                                                        </p>
                                                                                                      <div className="flex gap-4 text-xs">
                                                                                                                            <span className="text-cyan-400 font-bold">{fmt(bestVideo.videoViewCount)} views</span>
                                                                                                                            <span className="text-amber-400">♥ {fmt(bestVideo.likesCount)}</span>
                                                                                                                            <span className="text-emerald-400">💬 {fmt(bestVideo.commentsCount)}</span>
                                                                                                        </div>
                                                                                    </div>
                                                                                  <a
                                                                                                        href={bestVideo.url}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="mt-3 inline-flex text-xs px-3 py-1.5 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors w-fit"
                                                                                                      >
                                                                                                      Watch on TikTok →
                                                                                    </a>
                                                                </div>
                                                </div>
                                  </div>
                              )}
                    
                      {/* ── Views & Engagement bar chart ── */}
                              <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5">
                                          <h2 className="text-white text-sm font-bold mb-1">Views & Engagement per Post</h2>
                                          <p className="text-gray-500 text-xs mb-4">Top 10 posts by views</p>
                                          <div className="h-64">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                                        <BarChart data={topPostsChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                                                                          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                                                                          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                                                          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                                                                                          <Tooltip content={<DarkTooltip />} />
                                                                                          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
                                                                                          <Bar dataKey="views" name="Views" fill="#06b6d4" radius={[2, 2, 0, 0]} maxBarSize={40} />
                                                                                          <Bar dataKey="likes" name="Likes" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={40} />
                                                                                          <Bar dataKey="comments" name="Comments" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={40} />
                                                                        </BarChart>
                                                        </ResponsiveContainer>
                                          </div>
                              </div>
                    
                      {/* ── Engagement Rate per Video ── */}
                              <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5">
                                          <h2 className="text-white text-sm font-bold mb-1">Engagement Rate per Video</h2>
                                          <p className="text-gray-500 text-xs mb-4">((likes + comments) / views × 100) — top 10 posts</p>
                                          <div className="h-52">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                                        <BarChart data={engagementChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                                                                          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                                                                          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                                                          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v + '%'} />
                                                                                          <Tooltip content={<EngagementTooltip />} />
                                                                                          <Bar dataKey="engagement" name="Engagement Rate" fill="#a78bfa" radius={[2, 2, 0, 0]} maxBarSize={40} />
                                                                        </BarChart>
                                                        </ResponsiveContainer>
                                          </div>
                              </div>
                    
                      {/* ── Cumulative views growth line chart ── */}
                      {growthData.length > 1 && (
                                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5">
                                                <h2 className="text-white text-sm font-bold mb-1">Cumulative Views Over Time</h2>
                                                <p className="text-gray-500 text-xs mb-4">Based on post publish dates (proxy for account growth)</p>
                                                <div className="h-52">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                                  <LineChart data={growthData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                                                                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                                                                                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                                                                                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                                                                                                      <Tooltip content={<DarkTooltip />} />
                                                                                                      <Line
                                                                                                                              type="monotone"
                                                                                                                              dataKey="views"
                                                                                                                              name="Cumulative Views"
                                                                                                                              stroke="#06b6d4"
                                                                                                                              strokeWidth={2}
                                                                                                                              dot={false}
                                                                                                                              activeDot={{ r: 4, fill: '#06b6d4' }}
                                                                                                                            />
                                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                </div>
                                  </div>
                              )}
                    
                      {/* ── Top videos grid ── */}
                              <div>
                                          <h2 className="text-white text-sm font-bold mb-1">Top Performing Videos</h2>
                                          <p className="text-gray-500 text-xs mb-4">Sorted by views</p>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {topVideos.map((post, idx) => (
                                      <a
                                                          key={post.id || idx}
                                                          href={post.url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] transition-colors group"
                                                        >
                                                        <div className="relative aspect-[9/16] bg-[#111] overflow-hidden">
                                                          {post.displayUrl ? (
                                                                                <img
                                                                                                          src={'/api/proxy-image?url=' + encodeURIComponent(post.displayUrl)}
                                                                                                          alt=""
                                                                                                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                                                                        />
                                                                              ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">▶</div>
                                                                            )}
                                                                            <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5">
                                                                                                  #{idx + 1}
                                                                            </div>
                                                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                                                                  <p className="text-white text-[10px] font-bold">{fmt(post.videoViewCount)} views</p>
                                                                            </div>
                                                        </div>
                                                        <div className="p-2">
                                                                            <p className="text-gray-300 text-[10px] leading-relaxed line-clamp-2 mb-2">
                                                                              {post.caption || '(no caption)'}
                                                                            </p>
                                                                            <div className="flex gap-2 text-[9px] text-gray-600">
                                                                                                  <span>♥ {fmt(post.likesCount)}</span>
                                                                                                  <span>💬 {fmt(post.commentsCount)}</span>
                                                                            </div>
                                                        </div>
                                      </a>
                                    ))}
                                          </div>
                              </div>
                    
                      {/* ── Best posting times heatmap ── */}
                              <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5">
                                          <h2 className="text-white text-sm font-bold mb-1">Best Posting Times</h2>
                                          <p className="text-gray-500 text-xs mb-4">Day × hour heatmap — intensity based on total views at that time slot</p>
                                          <div className="overflow-x-auto">
                                                        <div className="min-w-[640px]">
                                                                        <div className="flex mb-1">
                                                                                          <div className="w-10 shrink-0" />
                                                                          {[0,3,6,9,12,15,18,21].map(h => (
                                          <div key={h} className="flex-1 text-center text-[8px] text-gray-600">
                                            {HOURS[h]}
                                          </div>
                                        ))}
                                                                        </div>
                                                          {DAYS.map((day, d) => (
                                        <div key={day} className="flex mb-0.5 items-center">
                                                            <div className="w-10 shrink-0 text-[10px] text-gray-500 pr-1 text-right">{day}</div>
                                          {Array.from({ length: 24 }, (_, h) => {
                                                                const val = heatmapData.grid[d]?.[h] || 0
                                                                                        const intensity = heatmapData.max > 0 ? val / heatmapData.max : 0
                                                                                                                const alpha = Math.min(1, intensity * 1.2)
                                                                                                                                        const bg = val > 0 ? 'rgba(6,182,212,' + alpha.toFixed(2) + ')' : '#111'
                                                                                                                                                                return (
                                                                                                                                                                                          <div
                                                                                                                                                                                                                      key={h}
                                                                                                                                                                                                                      className="flex-1 h-5 mx-px rounded-sm transition-colors"
                                                                                                                                                                                                                      style={{ backgroundColor: bg }}
                                                                                                                                                                                                                      title={day + ' ' + HOURS[h] + ': ' + fmt(val) + ' views'}
                                                                                                                                                                                                                    />
                                                                                                                                                                                        )
                                          })}
                                        </div>
                                      ))}
                                                                        <div className="flex items-center gap-2 mt-3 justify-end">
                                                                                          <span className="text-[9px] text-gray-600">Less</span>
                                                                          {[0.1, 0.3, 0.5, 0.7, 1.0].map(v => (
                                          <div
                                                                  key={v}
                                                                  className="w-4 h-4 rounded-sm"
                                                                  style={{ backgroundColor: 'rgba(6,182,212,' + v + ')' }}
                                                                />
                                        ))}
                                                                                          <span className="text-[9px] text-gray-600">More</span>
                                                                        </div>
                                                        </div>
                                          </div>
                              </div>
                    
                      {/* ── AI Weekly Insight ── */}
                              <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5">
                                          <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                                        <h2 className="text-white text-sm font-bold">AI Weekly Insight</h2>
                                                                        <p className="text-gray-500 text-xs mt-0.5">Powered by Claude — analyzes your last 7 days of posts</p>
                                                        </div>
                                                        <button
                                                                          onClick={fetchAiInsight}
                                                                          disabled={aiLoading}
                                                                          className="text-xs px-4 py-2 border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400 disabled:opacity-40 transition-all font-medium"
                                                                        >
                                                          {aiLoading ? 'Analyzing...' : '✦ Get AI Insight'}
                                                        </button>
                                          </div>
                              
                                {aiError && (
                                    <p className="text-red-400 text-xs">Error: {aiError}</p>
                                          )}
                              
                                {aiInsight && aiInsight.length > 0 && (
                                    <div className="bg-[#111] border border-[#222] p-4 space-y-3">
                                      {aiInsight.map((bullet, i) => (
                                                        <div key={i} className="flex gap-3">
                                                                            <span className="text-purple-400 font-bold text-sm shrink-0">
                                                                              {i === 0 ? '✅' : i === 1 ? '⚠️' : '🎯'}
                                                                            </span>
                                                                            <p className="text-gray-300 text-sm leading-relaxed">{bullet.replace(/^•\s*/, '')}</p>
                                                        </div>
                                                      ))}
                                    </div>
                                          )}
                              
                                {!aiInsight && !aiLoading && !aiError && (
                                    <p className="text-gray-600 text-xs">Click "Get AI Insight" to analyze your recent posts with Claude.</p>
                                          )}
                              </div>
                    
                    </div>
                )}
          </div>
        )
}</div>
