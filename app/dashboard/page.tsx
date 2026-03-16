'use client'

import { useEffect, useState } from 'react'
import { Users, Heart, Image, RefreshCw, BarChart3 } from 'lucide-react'
import StatCard from '@/components/StatCard'
import PostCard from '@/components/PostCard'
import Header from '@/components/Header'

interface DashboardData {
  profile: {
    username: string
    followers_count: number
    follows_count: number
    media_count: number
    biography: string
    website: string
    profile_picture_url?: string
  } | null
  posts: Array<{
    id: string
    caption: string
    media_type: string
    permalink: string
    timestamp: string
    like_count: number
    comments_count: number
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instagram/stats')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalEngagement = data?.posts.reduce((s, p) => s + (p.like_count || 0) + (p.comments_count || 0), 0) || 0
  const avgEngagement = data?.posts.length ? (totalEngagement / data.posts.length).toFixed(0) : '0'

  return (
    <div className="p-8">
      <Header
        title="Dashboard"
        subtitle="Your Instagram performance at a glance"
        action={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Followers" value={data?.profile?.followers_count?.toLocaleString() || '—'} icon={Users} color="cyan" />
          <StatCard label="Following" value={data?.profile?.follows_count?.toLocaleString() || '—'} icon={Users} color="purple" />
          <StatCard label="Total Posts" value={data?.profile?.media_count?.toLocaleString() || '—'} icon={Image} color="orange" />
          <StatCard label="Avg Engagement" value={Number(avgEngagement).toLocaleString()} icon={Heart} color="pink" />
        </div>
      )}

      {data?.profile && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
              ST
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">@{data.profile.username}</h2>
              <p className="text-gray-400 text-sm">{data.profile.biography}</p>
              <a href={data.profile.website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline">
                {data.profile.website}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-36" />
          ))}
        </div>
      ) : data?.posts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.posts.map((post, i) => (
            <PostCard
              key={post.id}
              caption={post.caption}
              likes={post.like_count}
              comments={post.comments_count}
              permalink={post.permalink}
              timestamp={post.timestamp}
              media_type={post.media_type}
              rank={i + 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No posts found. Your Instagram data will appear here.</p>
        </div>
      )}
    </div>
  )
}
