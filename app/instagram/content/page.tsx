'use client'

import { useState, useEffect } from 'react'

interface TopPost {
  id: string
  url: string
  type: string
  likesCount: number
  commentsCount: number
  videoViewCount: number
  caption: string
  thumbnailUrl?: string
  timestamp?: string
}

interface ContentContext {
  competitorUsername: string
  followersCount: number
  topPosts: TopPost[]
  analysis?: string
  sentAt: string
}

interface GeneratedIdea {
  ideaNumber: number
  hook: string
  script: string
  cta: string
  contentType: string
  inspiredBy?: string
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// PostThumbnail: shows post number + type + likes
// Instagram CDN blocks cross-origin img requests, so we skip broken images
function PostThumbnail({ post, idx }: { post: TopPost; idx: number }) {
  return (
    <div className="w-14 h-14 bg-[#1a1a1a] border border-[#2a2a2a] flex flex-col items-center justify-center gap-0.5 group-hover:border-[#444] transition-colors">
      <span className="text-gray-500 text-[9px] font-mono">#{idx + 1}</span>
      <span className="text-gray-500 text-[11px]">{post.type === 'Video' ? '▶' : '□'}</span>
      <span className="text-gray-500 text-[8px]">{formatNum(post.likesCount)}♥</span>
    </div>
  )
}

export default function ContentGenPage() {
  const [context, setContext] = useState<ContentContext | null>(null)
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [numIdeas, setNumIdeas] = useState(5)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contentGenContext')
      if (stored) {
        const parsed: ContentContext = JSON.parse(stored)
        setContext(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  const generate = async () => {
    if (!context) return
    setIsGenerating(true)
    setError(null)
    setIdeas([])
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, numIdeas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setIdeas(data.ideas || [])
      if (data.ideas?.length > 0) setExpandedIdea(0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(key)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // fallback
    }
  }

  const clearContext = () => {
    localStorage.removeItem('contentGenContext')
    setContext(null)
    setIdeas([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Content Generator</h2>
          <p className="text-gray-400 text-sm mt-1">AI-powered Hook + Script + CTA for every post idea</p>
        </div>
        {ideas.length > 0 && (
          <span className="text-gray-500 text-xs">{ideas.length} ideas generated</span>
        )}
      </div>

      {context ? (
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white text-sm font-bold">Context: @{context.competitorUsername}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {formatNum(context.followersCount)} followers &middot; {context.topPosts.length} top posts &middot;{' '}
                {new Date(context.sentAt).toLocaleDateString()}
              </p>
            </div>
            <button onClick={clearContext} className="text-gray-600 hover:text-red-400 text-xs transition-colors">
              Clear &times;
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {context.topPosts.slice(0, 10).map((post, idx) => (
              <a
                key={post.id || idx}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 group"
              >
                <PostThumbnail post={post} idx={idx} />
                <p className="text-gray-600 text-[9px] text-center mt-0.5">
                  {formatNum(post.likesCount)}&hearts;
                </p>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Ideas:</span>
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setNumIdeas(n)}
                  className={'text-xs px-2 py-1 font-medium transition-all ' + (numIdeas === n ? 'bg-white text-black' : 'bg-transparent text-gray-400 border border-[#333] hover:border-gray-500')}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={generate}
              disabled={isGenerating}
              className="flex-1 bg-white text-black text-xs font-bold px-4 py-2 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                  Generating {numIdeas} ideas...
                </span>
              ) : ideas.length > 0 ? (
                '⚡ Regenerate'
              ) : (
                '⚡ Generate Content Ideas'
              )}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] p-8 text-center">
          <p className="text-gray-400 text-sm font-medium mb-2">No competitor context loaded</p>
          <p className="text-gray-600 text-xs leading-relaxed">
            Go to{' '}
            <a href="/instagram/competitors" className="text-gray-400 underline hover:text-white transition-colors">
              Competitor Tracker
            </a>
            , analyze a competitor, then click{' '}
            <span className="text-gray-300 font-mono text-[11px] bg-[#1a1a1a] px-1 py-0.5">
              Send Top 10 to Content Generator
            </span>
          </p>
        </div>
      )}

      {ideas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-gray-400 text-xs font-medium uppercase tracking-widest">Generated Ideas</h3>
          {ideas.map((idea, idx) => (
            <div
              key={idx}
              className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] transition-colors"
            >
              <button
                onClick={() => setExpandedIdea(expandedIdea === idx ? null : idx)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600 text-xs font-mono">#{idea.ideaNumber || idx + 1}</span>
                      {idea.contentType && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]">
                          {idea.contentType}
                        </span>
                      )}
                      {idea.inspiredBy && (
                        <span className="text-gray-600 text-[10px]">inspired by: {idea.inspiredBy}</span>
                      )}
                    </div>
                    <p className="text-white text-sm font-bold leading-snug line-clamp-2">{idea.hook}</p>
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0 mt-1">
                    {expandedIdea === idx ? '↑' : '↓'}
                  </span>
                </div>
              </button>

              {expandedIdea === idx && (
                <div className="px-4 pb-4 space-y-4 border-t border-[#1a1a1a] pt-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">Hook</p>
                      <button
                        onClick={() => copyToClipboard(idea.hook, 'hook-' + idx)}
                        className="text-gray-600 hover:text-white text-[10px] transition-colors"
                      >
                        {copiedField === 'hook-' + idx ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#1e1e1e] p-3">
                      <p className="text-white text-sm leading-relaxed font-medium">{idea.hook}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">Script</p>
                      <button
                        onClick={() => copyToClipboard(idea.script, 'script-' + idx)}
                        className="text-gray-600 hover:text-white text-[10px] transition-colors"
                      >
                        {copiedField === 'script-' + idx ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#1e1e1e] p-3">
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{idea.script}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">CTA</p>
                      <button
                        onClick={() => copyToClipboard(idea.cta, 'cta-' + idx)}
                        className="text-gray-600 hover:text-white text-[10px] transition-colors"
                      >
                        {copiedField === 'cta-' + idx ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#1e1e1e] p-3">
                      <p className="text-yellow-400 text-sm leading-relaxed font-medium">{idea.cta}</p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      copyToClipboard(
                        'HOOK:
' + idea.hook + '

SCRIPT:
' + idea.script + '

CTA:
' + idea.cta,
                        'all-' + idx
                      )
                    }
                    className="w-full text-xs py-2 border border-[#333] text-gray-400 hover:border-white hover:text-white transition-all"
                  >
                    {copiedField === 'all-' + idx ? '✓ Copied All' : 'Copy Full Post'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {context && ideas.length === 0 && !isGenerating && (
        <div className="text-center py-12 text-gray-600 text-sm border border-dashed border-[#1e1e1e]">
          Hit &ldquo;Generate Content Ideas&rdquo; to create Hook + Script + CTA for each post
        </div>
      )}
    </div>
  )
}
