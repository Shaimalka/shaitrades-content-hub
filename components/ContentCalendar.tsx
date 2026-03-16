'use client'

import { CalendarPost } from '@/types'
import clsx from 'clsx'

const statusColors: Record<string, string> = {
  planned: 'bg-gray-700 text-gray-300',
  scripted: 'bg-blue-500/20 text-blue-300',
  filmed: 'bg-purple-500/20 text-purple-300',
  posted: 'bg-green-500/20 text-green-300',
}

const typeColors: Record<string, string> = {
  Reel: 'text-pink-400',
  Carousel: 'text-cyan-400',
  Story: 'text-purple-400',
}

export default function ContentCalendar({ posts }: { posts: CalendarPost[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {posts.map((post, i) => (
        <div key={i} className="bg-black border border-gray-800 p-3 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">{post.date}</span>
            <span className={clsx('text-xs font-medium', typeColors[post.content_type] || 'text-gray-400')}>
              {post.content_type}
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-1">{post.topic}</p>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{post.hook}</p>
          <span className={clsx('text-xs px-2 py-0.5', statusColors[post.status])}>
            {post.status}
          </span>
        </div>
      ))}
    </div>
  )
}
