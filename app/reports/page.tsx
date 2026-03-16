'use client'

import { useState } from 'react'
import { FileText, RefreshCw, Lightbulb, TrendingUp, Star } from 'lucide-react'
import Header from '@/components/Header'
import { WeeklyReport } from '@/types'

export default function ReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')

  const generateReport = async () => {
    setLoading(true)
    setStep('Scraping competitor posts...')
    try {
      const scrapeRes = await fetch('/api/competitors/scrape', { method: 'POST' })
      const scrapeData = await scrapeRes.json()

      setStep('Analyzing performance with AI...')
      const reportRes = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: scrapeData.posts || [] }),
      })
      const reportData = await reportRes.json()
      setReport(reportData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <div className="p-8">
      <Header
        title="Weekly Report"
        subtitle={`Auto-generated intelligence for the week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
        action={
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? step || 'Generating...' : 'Generate Report'}
          </button>
        }
      />

      {!report && !loading && (
        <div className="text-center py-20">
          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-400 text-lg font-medium mb-2">No report yet</p>
          <p className="text-gray-500 text-sm mb-6">Generate your weekly competitor intelligence report powered by AI analysis.</p>
          <button onClick={generateReport} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors">
            Generate This Week&apos;s Report
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <RefreshCw className="w-10 h-10 mx-auto mb-4 text-cyan-400 animate-spin" />
          <p className="text-gray-400">{step || 'Generating report...'}</p>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-8">
          {/* Summary */}
          <div className="bg-gray-900 border border-cyan-500/20 rounded-xl p-5">
            <p className="text-gray-300">{report.summary}</p>
          </div>

          {/* Top Posts */}
          {report.top_posts?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Top 10 Posts This Week</h2>
              </div>
              <div className="space-y-4">
                {report.top_posts.map((post, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-sm shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-cyan-400">@{post.username}</span>
                          <span className="text-xs text-gray-500">{post.media_type}</span>
                          <span className="text-xs text-green-400">❤️ {(post.likes as unknown as number)?.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">{post.caption}</p>
                        {post.analysis && (
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-xs text-cyan-400 font-medium mb-1">Why it performed:</p>
                            <p className="text-xs text-gray-400">{(post.analysis as Record<string, unknown>).why_it_works as string || JSON.stringify(post.analysis).substring(0, 200)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Ideas */}
          {report.content_ideas?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">3 Content Ideas for @shaitrades</h2>
              </div>
              <div className="grid gap-4">
                {report.content_ideas.map((idea, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-3">{idea.title}</h3>
                    {idea.hook_options?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Hook Options</p>
                        <div className="space-y-1">
                          {idea.hook_options.map((h, j) => (
                            <p key={j} className="text-sm text-cyan-300">• {h}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {idea.why_it_works && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-3">
                        <p className="text-xs text-green-400 font-medium mb-1">Why this will work:</p>
                        <p className="text-xs text-gray-300">{idea.why_it_works}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emerging Creators */}
          {report.emerging_creators?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Creators to Watch</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {report.emerging_creators.map((creator, i) => (
                  <div key={i} className="bg-gray-900 border border-green-500/20 rounded-lg px-4 py-2">
                    <span className="text-green-400 font-medium">@{creator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
