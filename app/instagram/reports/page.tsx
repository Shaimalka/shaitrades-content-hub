'use client'

import { useState, useEffect } from 'react'
import { FileText, Star, Lightbulb, TrendingUp, Heart, MessageCircle, Sparkles, Trash2 } from 'lucide-react'
import { PostAnalysis } from '@/types'

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-10">
      <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">{'// '}{children}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

export default function WeeklyReportPage() {
  const [analyses, setAnalyses] = useState<PostAnalysis[]>([])
  const [topPost, setTopPost] = useState<PostAnalysis | null>(null)

  useEffect(() => {
    const saved: PostAnalysis[] = JSON.parse(localStorage.getItem('st_weekly_analyses') || '[]')
    setAnalyses(saved)
    if (saved.length > 0) {
      const best = saved.reduce((top, a) => (a.post_likes + a.post_comments) > (top.post_likes + top.post_comments) ? a : top, saved[0])
      setTopPost(best)
    }
  }, [])

  const removeAnalysis = (postId: string) => {
    const updated = analyses.filter(a => a.post_id !== postId)
    setAnalyses(updated)
    localStorage.setItem('st_weekly_analyses', JSON.stringify(updated))
    if (topPost?.post_id === postId) {
      setTopPost(updated.length > 0 ? updated[0] : null)
    }
  }

  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Extract content ideas from all analyses
  const contentIdeas = analyses.slice(0, 3).map(a => ({
    based_on: a.post_caption?.substring(0, 60) + '...',
    tips: a.replicate_tips || [],
    hook: a.hook_text,
    hook_rating: a.hook_rating,
  }))

  // Extract hook templates from top analyses
  const hookTemplates = analyses
    .filter(a => a.hook_rating >= 6)
    .map(a => ({ text: a.hook_text, rating: a.hook_rating }))
    .slice(0, 5)

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Weekly Report</h1>
          <p className="text-gray-500 text-sm mt-1">Week of {weekOf}</p>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-800" />
          <p className="text-gray-400 text-lg font-medium mb-2">No analyses yet</p>
          <p className="text-gray-600 text-sm">Go to the Dashboard, find a post in Top/Bottom Performers, and click <span className="text-cyan-400">Analyze</span> then <span className="text-cyan-400">Add to Weekly Report</span>.</p>
        </div>
      ) : (
        <>
          {/* ═══ TOP PERFORMING POST ═══ */}
          {topPost && (
            <>
              <SectionHeader>TOP PERFORMING POST</SectionHeader>
              <div className="bg-black border border-green-500/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-green-400">Best Post This Week</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 ${topPost.post_type === 'VIDEO' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {topPost.post_type === 'VIDEO' ? 'REEL' : 'POST'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-4 line-clamp-3">{topPost.post_caption}</p>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-900 p-3 text-center">
                    <p className="text-lg font-bold text-pink-400">{topPost.post_likes.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">Likes</p>
                  </div>
                  <div className="bg-gray-900 p-3 text-center">
                    <p className="text-lg font-bold text-blue-400">{topPost.post_comments.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">Comments</p>
                  </div>
                  <div className="bg-gray-900 p-3 text-center">
                    <p className="text-lg font-bold text-cyan-400">{topPost.hook_rating}/10</p>
                    <p className="text-[10px] text-gray-500">Hook Rating</p>
                  </div>
                  <div className="bg-gray-900 p-3 text-center">
                    <p className={`text-lg font-bold ${topPost.vs_average === 'outperformed' ? 'text-green-400' : topPost.vs_average === 'underperformed' ? 'text-red-400' : 'text-amber-400'}`}>
                      {topPost.vs_average}
                    </p>
                    <p className="text-[10px] text-gray-500">vs Average</p>
                  </div>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/20 p-4">
                  <p className="text-xs text-cyan-400 font-mono mb-2">WHY IT WORKED</p>
                  <p className="text-sm text-gray-300">{topPost.content_intelligence}</p>
                </div>
              </div>
            </>
          )}

          {/* ═══ CONTENT IDEAS ═══ */}
          {contentIdeas.length > 0 && (
            <>
              <SectionHeader>3 ACTIONABLE CONTENT IDEAS</SectionHeader>
              <div className="space-y-4">
                {contentIdeas.map((idea, i) => (
                  <div key={i} className="bg-black border border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-white">Idea #{i + 1}</span>
                      <span className="text-xs text-gray-600 ml-2">Based on: {idea.based_on}</span>
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-600 font-mono mb-1">HOOK TO USE</p>
                      <p className="text-sm text-cyan-400">&ldquo;{idea.hook}&rdquo;</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 font-mono mb-1">WHAT TO DO</p>
                      {idea.tips.map((t, j) => (
                        <p key={j} className="text-xs text-gray-400 mb-1">→ {t}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ HOOK TEMPLATES ═══ */}
          {hookTemplates.length > 0 && (
            <>
              <SectionHeader>HOOK TEMPLATES FROM TOP POSTS</SectionHeader>
              <div className="space-y-2">
                {hookTemplates.map((h, i) => (
                  <div key={i} className="bg-black border border-gray-800 p-4 flex items-center gap-4">
                    <span className={`text-xs font-bold px-2 py-0.5 ${h.rating >= 8 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {h.rating}/10
                    </span>
                    <p className="text-sm text-gray-300 flex-1">&ldquo;{h.text}&rdquo;</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ WHAT TO REPLICATE ═══ */}
          <SectionHeader>WHAT TO REPLICATE NEXT WEEK</SectionHeader>
          <div className="bg-black border border-gray-800 p-5">
            <div className="space-y-2">
              {analyses.flatMap(a => a.replicate_tips || []).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 8).map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ALL SAVED ANALYSES ═══ */}
          <SectionHeader>{`ALL SAVED ANALYSES · ${analyses.length} POSTS`}</SectionHeader>
          <div className="space-y-4">
            {analyses.map(a => (
              <div key={a.post_id} className="bg-black border border-gray-800 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className={`text-[10px] px-1.5 py-0.5 ${a.post_type === 'VIDEO' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {a.post_type === 'VIDEO' ? 'REEL' : 'POST'}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(a.post_timestamp).toLocaleDateString()}</span>
                    <span className={`text-xs font-medium ${a.vs_average === 'outperformed' ? 'text-green-400' : a.vs_average === 'underperformed' ? 'text-red-400' : 'text-amber-400'}`}>
                      {a.vs_average}
                    </span>
                  </div>
                  <button onClick={() => removeAnalysis(a.post_id)} className="text-gray-700 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-300 line-clamp-2 mb-3">{a.post_caption}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{a.post_likes.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{a.post_comments.toLocaleString()}</span>
                  <span className="text-cyan-400">Hook: {a.hook_rating}/10</span>
                </div>
                <div className="bg-gray-900 p-3">
                  <p className="text-xs text-gray-400">{a.content_intelligence}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="h-12" />
    </div>
  )
}
