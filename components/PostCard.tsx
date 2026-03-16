import { Heart, MessageCircle, ExternalLink } from 'lucide-react'

interface PostCardProps {
  caption: string
  likes: number
  comments: number
  permalink: string
  timestamp: string
  engagement_rate?: number
  media_type?: string
  rank?: number
}

export default function PostCard({ caption, likes, comments, permalink, timestamp, engagement_rate, media_type, rank }: PostCardProps) {
  return (
    <div className="bg-black border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      {rank && (
        <div className="text-xs font-bold text-cyan-400 mb-2">#{rank} Top Post</div>
      )}
      <p className="text-sm text-gray-300 line-clamp-3 mb-3">{caption || '(no caption)'}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" /> {likes?.toLocaleString()}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" /> {comments?.toLocaleString()}</span>
          {engagement_rate && <span className="text-green-400">{engagement_rate.toFixed(2)}% ER</span>}
        </div>
        <div className="flex items-center gap-2">
          {media_type && <span className="bg-gray-900 px-2 py-0.5 text-gray-400">{media_type}</span>}
          <a href={permalink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">{new Date(timestamp).toLocaleDateString()}</p>
    </div>
  )
}
