'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface TopPost {
  id: string
  url: string
  displayUrl: string | null
  likesCount: number
  commentsCount: number
  caption: string
  type: string
}

interface ContentContext {
  username: string
  followersCount: number
  topPosts: TopPost[]
  savedAt: string
}

interface GeneratedIdea {
  hook: string
  script: string
  cta: string
  inspiredBy: string
  format: string
}

export default function ContentPage() {
  const [context, setContext] = useState<ContentContext | null>(null)
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(3)
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('contentContext')
      if (saved) setContext(JSON.parse(saved))
    } catch (e) {
      console.error(e)
    }
  }, [])

  const generate = async () => {
    if (!context) return
    setLoading(true)
    setIdeas([])
    try {
      const res = await fetch('/api/instagram/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, count }),
      })
      const data = await res.json()
      if (data.ideas) setIdeas(data.ideas)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const fmt = (n: number) => {
    if (!n) return '0'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Generator</h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered Hook + Script + CTA for every post idea</p>
        </div>
        {ideas.length > 0 && (
          <span className="text-gray-500 text-sm">{ideas.length} ideas generated</span>
        )}
      </div>

      {context ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-semibold">Context: @{context.username}</p>
              <p className="text-gray-400 text-sm">
                {fmt(context.followersCount)} followers · {context.topPosts.length} top posts loaded · {new Date(context.savedAt).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => { localStorage.removeItem('contentContext'); setContext(null); setIdeas([]) }}
              className="text-gray-500 hover:text-red-400 text-sm">Clear ×</button>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {context.topPosts.map((post, i) => (
              <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 w-16 h-16 bg-gray-700 rounded-lg overflow-hidden relative group">
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs text-center p-1">
                  <div className="text-lg">{post.type === 'Video' ? '🎬' : '🖼️'}</div>
                  <div className="text-gray-300 font-medium">{fmt(post.likesCount)}♥</div>
                </div>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Ideas:</span>
            {[3, 5, 10].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`w-10 h-8 rounded text-sm font-medium ${count === n ? 'bg-white text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {n}
              </button>
            ))}
            <button onClick={generate} disabled={loading}
              className="flex-1 py-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-black rounded-lg font-medium text-sm">
              {loading ? 'Generating...' : '⚡ Regenerate'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-3">No competitor context loaded yet.</p>
          <button onClick={() => router.push('/instagram/competitors')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            Go to Competitors tab
          </button>
        </div>
      )}

      {ideas.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Generated Ideas</p>
          {ideas.map((idea, i) => (
            <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-3">
                <span className="text-gray-500 text-sm">#{i + 1}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">Reel</span>
                <span className="text-gray-500 text-xs">{idea.inspiredBy}</span>
              </div>
              <div className="px-5 py-3">
                <p className="text-white font-semibold text-sm">{idea.hook}</p>
              </div>

              <div className="border-t border-gray-700">
                <div className="px-5 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">🪝 Hook</span>
                  <button onClick={() => copy(idea.hook)} className="text-xs text-gray-500 hover:text-white">Copy</button>
                </div>
                <div className="px-5 pb-3">
                  <p className="text-gray-300 text-sm bg-gray-900 rounded-lg p-3">{idea.hook}</p>
                </div>
              </div>

              <div className="border-t border-gray-700">
                <div className="px-5 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">📝 Script</span>
                  <button onClick={() => copy(idea.script)} className="text-xs text-gray-500 hover:text-white">Copy</button>
                </div>
                <div className="px-5 pb-3">
                  <div className="text-gray-300 text-sm bg-gray-900 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{idea.script}</div>
                </div>
              </div>

              <div className="border-t border-gray-700">
                <div className="px-5 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">🎯 CTA</span>
                  <button onClick={() => copy(idea.cta)} className="text-xs text-gray-500 hover:text-white">Copy</button>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-gray-300 text-sm bg-gray-900 rounded-lg p-3">{idea.cta}</p>
                </div>
              </div>

              <div className="px-5 pb-4">
                <button onClick={() => copy(`${idea.hook}\n\n${idea.script}\n\n${idea.cta}`)}
                  className="w-full py-2 border border-gray-600 hover:border-white text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
                  Copy Full Post
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
