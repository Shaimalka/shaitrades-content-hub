'use client'

import { useState } from 'react'
import { Sparkles, FileText, Calendar, Hash, Play } from 'lucide-react'
import Header from '@/components/Header'
import ContentCalendar from '@/components/ContentCalendar'
import { CalendarPost } from '@/types'

const HOOK_TEMPLATES = [
  'Most traders fail because of THIS one mistake...',
  'I went from $500 to $50k in 6 months using this strategy',
  'Stop doing [X] if you want to be profitable',
  'The truth about trading no one tells you',
  'Watch me turn $1,000 into $10,000 (step by step)',
]

export default function ContentPage() {
  const [topic, setTopic] = useState('')
  const [selectedHook, setSelectedHook] = useState('')
  const [script, setScript] = useState('')
  const [caption, setCaption] = useState('')
  const [calendar, setCalendar] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'script' | 'calendar'>('script')

  const generate = async (action: string) => {
    if (!topic && action !== 'calendar') return
    setLoading(action)
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, topic, hook: selectedHook, ideas: [] }),
      })
      const data = await res.json()
      if (action === 'script') setScript(data.script || '')
      if (action === 'caption') setCaption(data.caption || '')
      if (action === 'calendar') setCalendar(data.calendar || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-8">
      <Header title="Content Generator" subtitle="AI-powered scripts, captions, and 30-day calendar" />

      <div className="flex gap-2 mb-6">
        {(['script', 'calendar'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'script' ? '✍️ Script & Caption' : '📅 30-Day Calendar'}
          </button>
        ))}
      </div>

      {tab === 'script' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Topic
              </h3>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why 90% of day traders lose money"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Hook Templates</h3>
              <div className="space-y-2">
                {HOOK_TEMPLATES.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedHook(h)}
                    className={`w-full text-left text-sm p-3 rounded-lg transition-colors ${
                      selectedHook === h
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
                <input
                  value={selectedHook}
                  onChange={(e) => setSelectedHook(e.target.value)}
                  placeholder="Or write your own hook..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => generate('script')}
                disabled={!topic || loading === 'script'}
                className="flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                {loading === 'script' ? 'Writing...' : 'Generate Script'}
              </button>
              <button
                onClick={() => generate('caption')}
                disabled={!topic || loading === 'caption'}
                className="flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                <Hash className="w-4 h-4" />
                {loading === 'caption' ? 'Writing...' : 'Generate Caption'}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-4">
            {script && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-white">Video Script</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(script)}
                    className="ml-auto text-xs text-gray-500 hover:text-white"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{script}</pre>
              </div>
            )}
            {caption && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-white">Caption + Hashtags</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(caption)}
                    className="ml-auto text-xs text-gray-500 hover:text-white"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{caption}</pre>
              </div>
            )}
            {!script && !caption && (
              <div className="flex items-center justify-center h-64 text-gray-600">
                <div className="text-center">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Your generated content will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-400 text-sm">30-day content plan generated by AI based on what&apos;s working in your niche</p>
            <button
              onClick={() => generate('calendar')}
              disabled={loading === 'calendar'}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {loading === 'calendar' ? 'Generating...' : 'Generate Calendar'}
            </button>
          </div>
          {calendar.length > 0 ? (
            <ContentCalendar posts={calendar} />
          ) : (
            <div className="text-center py-20 text-gray-600">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click Generate Calendar to create your 30-day plan</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
