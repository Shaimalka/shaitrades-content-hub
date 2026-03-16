'use client'

import { useState } from 'react'
import { Users, RefreshCw, TrendingUp, Eye } from 'lucide-react'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'

const DEFAULT_COMPETITORS = [
  'investopedia', 'tradingview', 'thetraderwave',
  'rayner.teo', 'humbledtrader', 'umar.ashraf', 'warrior.trading',
]

export default function CompetitorsPage() {
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [scraped, setScraped] = useState(false)
  const [customUsername, setCustomUsername] = useState('')
  const [competitors, setCompetitors] = useState(DEFAULT_COMPETITORS)

  const scrape = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/competitors/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: competitors }),
      })
      const data = await res.json()
      setPosts(data.posts || [])
      setScraped(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const addCompetitor = () => {
    if (customUsername && !competitors.includes(customUsername)) {
      setCompetitors([...competitors, customUsername.replace('@', '')])
      setCustomUsername('')
    }
  }

  // Group posts by creator
  const byCreator: Record<string, typeof posts> = {}
  posts.forEach((p) => {
    const u = p.username as string
    if (!byCreator[u]) byCreator[u] = []
    byCreator[u].push(p)
  })

  return (
    <div className="p-8">
      <Header
        title="Competitor Intelligence"
        subtitle="Track top trading/finance creators in your niche"
        action={
          <button
            onClick={scrape}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scraping...' : 'Scrape Now'}
          </button>
        }
      />

      {/* Competitor list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Tracked Competitors ({competitors.length})</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {competitors.map((c) => (
            <span key={c} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full">
              @{c}
              <button onClick={() => setCompetitors(competitors.filter(x => x !== c))} className="text-gray-500 hover:text-red-400 ml-1">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customUsername}
            onChange={(e) => setCustomUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
            placeholder="Add competitor (e.g. @username)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <button onClick={addCompetitor} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
            Add
          </button>
        </div>
      </div>

      {!scraped && !loading && (
        <div className="text-center py-20">
          <TrendingUp className="w-14 h-14 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-400 text-lg font-medium mb-2">Ready to spy on competitors?</p>
          <p className="text-gray-500 text-sm mb-6">Click &quot;Scrape Now&quot; to pull their latest posts and analyze performance.</p>
          <button onClick={scrape} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors">
            Start Scraping
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <RefreshCw className="w-10 h-10 mx-auto mb-4 text-cyan-400 animate-spin" />
          <p className="text-gray-400">Scraping {competitors.length} competitor accounts...</p>
          <p className="text-gray-500 text-sm mt-2">This may take 30–60 seconds</p>
        </div>
      )}

      {scraped && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Posts Analyzed</p>
              <p className="text-2xl font-bold text-white">{posts.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Creators Tracked</p>
              <p className="text-2xl font-bold text-white">{Object.keys(byCreator).length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Avg Engagement</p>
              <p className="text-2xl font-bold text-cyan-400">
                {posts.length ? ((posts.reduce((s, p) => s + (p.likes as number || 0), 0) / posts.length)).toFixed(0) : 0}
              </p>
            </div>
          </div>

          {Object.entries(byCreator).map(([username, userPosts]) => (
            <div key={username} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white">@{username}</h3>
                <span className="text-xs text-gray-500">{userPosts.length} posts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userPosts.slice(0, 6).map((post, i) => (
                  <PostCard
                    key={i}
                    caption={post.caption as string}
                    likes={post.likes as number}
                    comments={post.comments as number}
                    permalink={post.permalink as string}
                    timestamp={post.posted_at as string}
                    engagement_rate={post.engagement_rate as number}
                    media_type={post.media_type as string}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
