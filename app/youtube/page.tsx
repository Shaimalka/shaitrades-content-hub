'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────
interface YouTubeVideo {
  videoId: string
  title: string
  publishedAt: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
}

interface BestPostingTime {
  day: string
  hour: string
  totalViews: number
  videoCount: number
}

interface YouTubeStats {
  channel: {
    subscriberCount: number
    viewCount: number
    videoCount: number
  }
  videos: YouTubeVideo[]
  bestPostingTimes: BestPostingTime[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return days + 'd ago'
  if (days < 30) return Math.floor(days / 7) + 'w ago'
  if (days < 365) return Math.floor(days / 30) + 'mo ago'
  return Math.floor(days / 365) + 'y ago'
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────
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

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accentColor = 'text-white',
  borderColor = 'border-[#1e1e1e]',
}: {
  label: string
  value: string
  sub?: string
  accentColor?: string
  borderColor?: string
}) {
  return (
    <div className={`bg-[#0d0d0d] border p-4 ${borderColor}`}>
      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accentColor}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-1 font-mono">{sub}</p>}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function YouTubeAnalyticsPage() {
  const [data, setData] = useState<YouTubeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [aiInsight, setAiInsight] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/youtube/stats')
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
    fetchStats()
  }, [fetchStats])

  const fetchAiInsight = useCallback(async () => {
    if (!data?.videos?.length) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/youtube/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: data.videos }),
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

  // ── Derived chart data ──────────────────────────────────────────────────
  const topPostsChart = (() => {
    if (!data?.videos?.length) return []
    return [...data.videos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)
      .map((v, i) => ({
        name: '#' + (i + 1),
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        title: v.title.slice(0, 40),
      }))
  })()

  const bestVideo = data?.videos?.length
    ? [...data.videos].sort((a, b) => b.viewCount - a.viewCount)[0]
    : null

  const maxPostingViews = data?.bestPostingTimes?.length
    ? Math.max(...data.bestPostingTimes.map(t => t.totalViews))
    : 1

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-8 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-red-500">&#9654;</span> YouTube Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            UCTLmrF1xrojgShBXXJeOxxw &middot;{' '}
            {lastFetched ? 'Updated ' + lastFetched.toLocaleTimeString() : 'Loading...'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-xs px-4 py-2 border border-[#333] text-gray-400 hover:border-red-500/50 hover:text-white disabled:opacity-40 transition-all font-medium"
        >
          {loading ? 'Fetching...' : '↻ Refresh'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] p-4 h-20 animate-pulse" />
            ))}
          </div>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] h-64 animate-pulse" />
          <p className="text-gray-600 text-xs text-center">Fetching YouTube analytics...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-950/20 border border-red-800/30 p-4">
          <p className="text-red-400 text-sm font-medium">Error: {error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Dashboard */}
      {data && !loading && (
        <div className="space-y-8">

          {/* ── Channel Stats ── */}
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
            // CHANNEL STATS
          </p>
          <div className="grid grid-cols-3 gap-4 -mt-6">
            <StatCard
              label="Subscribers"
              value={fmt(data.channel.subscriberCount)}
              sub="Total subscribers"
              accentColor="text-red-400"
              borderColor="border-red-500/30"
            />
            <StatCard
              label="Total Views"
              value={fmt(data.channel.viewCount)}
              sub="Lifetime channel views"
              accentColor="text-cyan-400"
              borderColor="border-cyan-500/20"
            />
            <StatCard
              label="Videos Published"
              value={fmt(data.channel.videoCount)}
              sub="Total uploads"
              accentColor="text-fuchsia-400"
              borderColor="border-fuchsia-500/20"
            />
          </div>

          {/* ── Best Performing Video ── */}
          {bestVideo && (
            <>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
                // BEST PERFORMING VIDEO
              </p>
              <div className="bg-[#0d0d0d] border border-red-500/30 p-5 -mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-red-400 text-xs font-bold uppercase tracking-widest">
                    #1 Best Performing Video
                  </span>
                </div>
                <div className="flex gap-4">
                  {bestVideo.thumbnailUrl && (
                    <a
                      href={`https://youtube.com/watch?v=${bestVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <div className="relative w-40 aspect-video overflow-hidden bg-[#111] border border-[#222]">
                        <img
                          src={bestVideo.thumbnailUrl}
                          alt="Top video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </a>
                  )}
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <p className="text-white text-base font-semibold leading-snug mb-2">
                        {bestVideo.title}
                      </p>
                      <p className="text-gray-500 text-xs mb-3">
                        Published {timeAgo(bestVideo.publishedAt)} &middot;{' '}
                        {new Date(bestVideo.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-red-400 font-bold">{fmt(bestVideo.viewCount)} views</span>
                        <span className="text-amber-400">👍 {fmt(bestVideo.likeCount)}</span>
                        <span className="text-emerald-400">💬 {fmt(bestVideo.commentCount)}</span>
                      </div>
                    </div>
                    <a
                      href={`https://youtube.com/watch?v=${bestVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-xs px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors w-fit"
                    >
                      Watch on YouTube &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Last 10 Videos ── */}
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
            // LAST 10 VIDEOS
          </p>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5 -mt-6">
            <p className="text-gray-500 text-xs mb-4">Sorted by most recent publish date</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    <th className="text-left text-gray-500 font-medium pb-2 pr-4 w-8">#</th>
                    <th className="text-left text-gray-500 font-medium pb-2 pr-4">Title</th>
                    <th className="text-right text-gray-500 font-medium pb-2 pr-4">Published</th>
                    <th className="text-right text-gray-500 font-medium pb-2 pr-4">Views</th>
                    <th className="text-right text-gray-500 font-medium pb-2 pr-4">Likes</th>
                    <th className="text-right text-gray-500 font-medium pb-2">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {data.videos.map((video, idx) => (
                    <tr
                      key={video.videoId}
                      className="border-b border-[#111] hover:bg-[#111] transition-colors group"
                    >
                      <td className="py-3 pr-4 text-gray-600 font-mono">{idx + 1}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt=""
                              className="w-14 aspect-video object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          )}
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-white transition-colors line-clamp-2 leading-relaxed"
                          >
                            {video.title}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-500 font-mono whitespace-nowrap">
                        {timeAgo(video.publishedAt)}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-white">
                        {fmt(video.viewCount)}
                      </td>
                      <td className="py-3 pr-4 text-right text-amber-400">
                        {fmt(video.likeCount)}
                      </td>
                      <td className="py-3 text-right text-emerald-400">
                        {fmt(video.commentCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Views & Engagement Chart ── */}
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
            // VIEWS &amp; ENGAGEMENT PER VIDEO
          </p>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5 -mt-6">
            <p className="text-gray-500 text-xs mb-4">Sorted by view count (top 10)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPostsChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
                  <Bar dataKey="views" name="Views" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="likes" name="Likes" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="comments" name="Comments" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Best Posting Times ── */}
          {data.bestPostingTimes?.length > 0 && (
            <>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
                // BEST POSTING TIMES
              </p>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5 -mt-6">
                <p className="text-gray-500 text-xs mb-5">
                  Derived from top videos &mdash; day &amp; hour with highest cumulative views
                </p>
                <div className="space-y-3">
                  {data.bestPostingTimes.map((slot, idx) => {
                    const widthPct = maxPostingViews > 0
                      ? Math.round((slot.totalViews / maxPostingViews) * 100)
                      : 0
                    const isTop = idx === 0
                    return (
                      <div key={slot.day + '-' + slot.hour} className="flex items-center gap-4">
                        <div className="w-28 shrink-0 text-right">
                          <span className={`text-xs font-bold ${isTop ? 'text-red-400' : 'text-gray-400'}`}>
                            {slot.day}
                          </span>
                          <span className="text-gray-600 text-xs ml-1">{slot.hour}</span>
                        </div>
                        <div className="flex-1 relative h-6 bg-[#111] border border-[#1e1e1e]">
                          <div
                            className={`h-full transition-all ${isTop ? 'bg-red-500/40' : 'bg-red-500/20'}`}
                            style={{ width: widthPct + '%' }}
                          />
                          <div className={`absolute inset-0 flex items-center px-2 text-[10px] font-mono ${isTop ? 'text-red-300' : 'text-gray-500'}`}>
                            {fmt(slot.totalViews)} views
                            {isTop && <span className="ml-2 text-red-400 font-bold">&larr; BEST</span>}
                          </div>
                        </div>
                        <div className="w-16 text-right text-gray-600 text-[10px] font-mono shrink-0">
                          {slot.videoCount} video{slot.videoCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── AI Weekly Insights ── */}
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
            // AI WEEKLY INSIGHTS
          </p>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5 -mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white text-sm font-bold">AI Weekly Insights</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Powered by Claude &mdash; analyzes top &amp; bottom performers
                </p>
              </div>
              <button
                onClick={fetchAiInsight}
                disabled={aiLoading || !data.videos?.length}
                className="text-xs px-4 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 disabled:opacity-40 transition-all font-medium"
              >
                {aiLoading ? 'Analyzing...' : '✶ Get AI Insight'}
              </button>
            </div>
            {aiError && (
              <p className="text-red-400 text-xs">Error: {aiError}</p>
            )}
            {aiInsight && aiInsight.length > 0 && (
              <div className="bg-[#111] border border-[#222] p-4 space-y-3">
                {aiInsight.map((bullet, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-red-400 font-bold text-sm shrink-0">
                      {i === 0 ? '✅' : i === 1 ? '⚠️' : i === 2 ? '🎯' : '🕐'}
                    </span>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {bullet.replace(/^•s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {!aiInsight && !aiLoading && !aiError && (
              <p className="text-gray-600 text-xs">
                Click &quot;Get AI Insight&quot; to analyze your YouTube performance with Claude.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
