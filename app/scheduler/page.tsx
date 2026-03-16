'use client'

import { useState } from 'react'
import { Upload, Send, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import Header from '@/components/Header'

export default function SchedulerPage() {
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<'idle' | 'generating' | 'posting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const generateCaption = async () => {
    if (!topic) return
    setStatus('generating')
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'caption', topic, hook: '' }),
      })
      const data = await res.json()
      setCaption(data.caption || '')
      setStatus('idle')
    } catch {
      setStatus('idle')
    }
  }

  const post = async () => {
    if (!imageUrl || !caption) return
    setStatus('posting')
    try {
      const res = await fetch('/api/scheduler/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setMessage('Posted successfully to Instagram!')
        setImageUrl('')
        setCaption('')
        setTopic('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to post')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="p-8">
      <Header title="Post Scheduler" subtitle="Draft, approve, and post directly to @shaitrades" />

      <div className="max-w-2xl space-y-6">
        {/* Image URL */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" /> Media URL
          </h3>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://... (public image or video URL)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Preview" className="mt-3 rounded-lg max-h-48 object-cover" onError={() => {}} />
          )}
        </div>

        {/* AI Caption Generator */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> AI Caption
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What&apos;s this post about?"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={generateCaption}
              disabled={!topic || status === 'generating'}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {status === 'generating' ? 'Writing...' : 'Generate'}
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption will appear here, or write your own..."
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">{caption.length} characters</span>
            {caption && (
              <button onClick={() => navigator.clipboard.writeText(caption)} className="text-xs text-gray-500 hover:text-white">
                Copy
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        {status === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm">{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Post Button */}
        <button
          onClick={post}
          disabled={!imageUrl || !caption || status === 'posting'}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all text-base"
        >
          <Send className="w-5 h-5" />
          {status === 'posting' ? 'Posting to Instagram...' : 'Post to @shaitrades'}
        </button>
      </div>
    </div>
  )
}
