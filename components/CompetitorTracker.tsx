'use client'

import { useState } from 'react'

interface Post {

  id: string

  shortCode: string

  url: string

  type: string

  displayUrl: string | null

  caption: string

  likesCount: number

  commentsCount: number

  videoViewCount: number

  timestamp: string | null

  hashtags: string[]

}

interface Competitor {

  username: string

  fullName: string

  profilePicUrl: string | null

  followersCount: number

  postsCount: number

  avgLikes: number

  avgComments: number

  engagementRate: number

  topPosts: Post[]

  allPosts: Post[]

}

export default function CompetitorTracker() {

  const [input, setInput] = useState('')

  const [competitors, setCompetitors] = useState<Competitor[]>([])

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const [analyses, setAnalyses] = useState<Record<string, string>>({})

  const [analyzingFor, setAnalyzingFor] = useState<string | null>(null)

  const [risingAccounts, setRisingAccounts] = useState<any[]>([])

  const [loadingRising, setLoadingRising] = useState(false)

  const handleScrape = async () => {

        const handles = input

          .split(/[\n,]+/)

          .map(h => h.replace('@', '').trim())

          .filter(Boolean)

        if (handles.length === 0) {

          setError('Please enter at least one Instagram handle')

          return

        }

        setLoading(true)

        setError('')

        setCompetitors([])

        try {

          const res = await fetch('/api/competitors/scrape', {

                                          method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({ handles }),

          })

          const data = await res.json()

          if (!res.ok) throw new Error(data.error || 'Failed to scrape')

          if (!data.competitors || data.competitors.length === 0) {

                  setError('No data found. The accounts may be private or not exist.')

          } else {

                  setCompetitors(data.competitors)

          }

        } catch (err: any) {

          setError(err.message || 'An error occurred')

        } finally {

          setLoading(false)

        }

  }

  const handleAnalyze = async (competitor: Competitor) => {

        if (analyses[competitor.username]) return

        setAnalyzingFor(competitor.username)

        try {

          const res = await fetch('/api/competitors/analyze', {

                                          method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({ competitor }),

          })

          const data = await res.json()

          if (data.analysis) {

                  setAnalyses(prev => ({ ...prev, [competitor.username]: data.analysis }))

          }

        } catch (err) {

          console.error('Analyze error:', err)

        } finally {

          setAnalyzingFor(null)

        }

  }

  const handleScanNiche = async () => {

        setLoadingRising(true)

        try {

          const res = await fetch('/api/competitors/rising', { method: 'GET' })

          const data = await res.json()

          if (data.accounts) setRisingAccounts(data.accounts)

        } catch (err) {

          console.error('Rising error:', err)

        } finally {

          setLoadingRising(false)

        }

  }

  const formatNumber = (n: number) => {

        if (!n) return '—'

        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'

        if (n >= 1000) return (n / 1000).toFixed(1) + 'K'

        return n.toString()

  }

  const getInitial = (username: string) => username?.[0]?.toUpperCase() ?? '?'

  return (

        <div className="space-y-6">
        
              <div>
              
                      <h1 className="text-2xl font-bold text-white">Competitor Intelligence</h1>h1>
              
                      <p className="text-gray-400 mt-1">Track and analyze trading Instagram accounts</p>p>
              
              </div>div>
        
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                      
                                Instagram Handles (one per line or comma-separated)
                      
                      </label>label>
              
                      <textarea
                        
                                  value={input}
                        
                        onChange={e => setInput(e.target.value)}
                        
                        placeholder="humbledtrader&#10;rayner.teo&#10;tradingview"
                        
                        rows={4}
                        
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                        
                      />
              
                      <button
                        
                                  onClick={handleScrape}
                        
                        disabled={loading}
                        
                        className="mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        
                      >
                      
                        {loading ? '⏳ Scraping (1–3 min)...' : '🔍 Scrape Competitors'}
                      
                      </button>button>
              
                {loading && (
          
                    <p className="text-yellow-400 text-sm mt-2">
                    
                                Apify is collecting data. This usually takes 1–2 minutes...
                    
                    </p>p>
              
                  )}
              
              </div>div>
        
          {error && (
          
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{error}</div>div>
        
                )}
        
          {competitors.length > 0 && (
          
                  <div className="space-y-4">
                  
                            <h2 className="text-lg font-semibold text-white">
                            
                              {competitors.length} Competitor{competitors.length !== 1 ? 's' : ''} Found
                            
                            </h2>h2>
                  
                    {competitors.map(comp => (
                    
                                <div key={comp.username} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                
                                              <div className="p-5 flex items-start justify-between">
                                              
                                                              <div className="flex items-center gap-4">
                                                              
                                                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                                                                
                                                                                  {getInitial(comp.username)}
                                                                                
                                                                                </div>div>
                                                              
                                                                                <div>
                                                                                
                                                                                                    <h3 className="font-bold text-white text-lg">@{comp.username}</h3>h3>
                                                                                
                                                                                  {comp.fullName && comp.fullName !== comp.username && (
                                  
                                                        <p className="text-gray-400 text-sm">{comp.fullName}</p>p>
                                                                                
                                                      )}
                                                                                
                                                                                </div>div>
                                                              
                                                              </div>div>
                                              
                                                              <div className="flex gap-6 text-center">
                                                              
                                                                                <div>
                                                                                
                                                                                                    <div className="text-white font-bold text-lg">{formatNumber(comp.postsCount)}</div>div>
                                                                                
                                                                                                    <div className="text-gray-400 text-xs">Posts Scraped</div>div>
                                                                                
                                                                                </div>div>
                                                              
                                                                                <div>
                                                                                
                                                                                                    <div className="text-white font-bold text-lg">{formatNumber(comp.avgLikes)}</div>div>
                                                                                
                                                                                                    <div className="text-gray-400 text-xs">Avg Likes</div>div>
                                                                                
                                                                                </div>div>
                                                              
                                                                                <div>
                                                                                
                                                                                                    <div className="text-white font-bold text-lg">{formatNumber(comp.avgComments)}</div>div>
                                                                                
                                                                                                    <div className="text-gray-400 text-xs">Avg Comments</div>div>
                                                                                
                                                                                </div>div>
                                                              
                                                              </div>div>
                                              
                                              </div>div>
                                
                                  {comp.topPosts.length > 0 && (
                                  
                                                  <div className="px-5 pb-2">
                                                  
                                                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Top Posts by Engagement</p>p>
                                                  
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                    
                                                                      {comp.topPosts.slice(0, 3).map(post => (
                                                    
                                                                          <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer"
                                                                            
                                                                                                    className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden group">
                                                                          
                                                                            {post.displayUrl ? (
                                                                                                      
                                                                                                                                <img src={post.displayUrl} alt="post" className="w-full h-full object-cover" />
                                                                                                      
                                                                                                                              ) : (
                                                                                                      
                                                                                                                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                                                                                                                                
                                                                                                                                  {post.type === 'Video' ? '🎬' : '🖼️'}
                                                                                                                                
                                                                                                                                  </div>div>
                                                                          
                                                                                                                              )}
                                                                          
                                                                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                  
                                                                                                                            <div className="text-center text-white text-xs">
                                                                                                                            
                                                                                                                                                        <div>❤️ {formatNumber(post.likesCount)}</div>div>
                                                                                                                            
                                                                                                                                                        <div>💬 {formatNumber(post.commentsCount)}</div>div>
                                                                                                                            
                                                                                                                              {post.videoViewCount > 0 && <div>👁️ {formatNumber(post.videoViewCount)}</div>div>}
                                                                                                                            
                                                                                                                              </div>div>
                                                                                                  
                                                                                                    </div>div>
                                                                          
                                                                          </a>a>
                                                    
                                                                        ))}
                                                                    
                                                                    </div>div>
                                                  
                                                  </div>div>
                                
                                                )}
                                
                                              <div className="px-5 py-4 flex gap-3 border-t border-gray-700 mt-3">
                                              
                                                              <button
                                                                
                                                                                  onClick={() => setExpandedCard(expandedCard === comp.username ? null : comp.username)}
                                                                
                                                                className="text-sm text-blue-400 hover:text-blue-300"
                                                                
                                                              >
                                                              
                                                                {expandedCard === comp.username ? '▲ Less' : '▼ All Posts'}
                                                              
                                                              </button>button>
                                              
                                                              <button
                                                                
                                                                                  onClick={() => handleAnalyze(comp)}
                                                                
                                                                disabled={analyzingFor === comp.username}
                                                                
                                                                className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md"
                                                                
                                                              >
                                                              
                                                                {analyzingFor === comp.username ? '🤖 Analyzing...' : analyses[comp.username] ? '✅ View Analysis' : '🤖 AI Analyze'}
                                                              
                                                              </button>button>
                                              
                                              </div>div>
                                
                                  {analyses[comp.username] && (
                                  
                                                  <div className="px-5 pb-5">
                                                  
                                                                    <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg p-4">
                                                                    
                                                                                        <h4 className="text-purple-300 font-semibold mb-2">AI Analysis — @{comp.username}</h4>h4>
                                                                    
                                                                                        <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                                                        
                                                                                          {analyses[comp.username]}
                                                                                        
                                                                                          </div>div>
                                                                    
                                                                    </div>div>
                                                  
                                                  </div>div>
                                
                                                )}
                                
                                  {expandedCard === comp.username && (
                                  
                                                  <div className="px-5 pb-5">
                                                  
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                    
                                                                      {comp.allPosts.map(post => (
                                                    
                                                                          <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer"
                                                                            
                                                                                                    className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden group">
                                                                          
                                                                            {post.displayUrl ? (
                                                                                                      
                                                                                                                                <img src={post.displayUrl} alt="post" className="w-full h-full object-cover" />
                                                                                                      
                                                                                                                              ) : (
                                                                                                      
                                                                                                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                                                                                                
                                                                                                                                  {post.type === 'Video' ? '🎬' : '🖼️'}
                                                                                                                                
                                                                                                                                  </div>div>
                                                                          
                                                                                                                              )}
                                                                          
                                                                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                  
                                                                                                                            <div className="text-center text-white text-xs space-y-1">
                                                                                                                            
                                                                                                                                                        <div>❤️ {formatNumber(post.likesCount)}</div>div>
                                                                                                                            
                                                                                                                                                        <div>💬 {formatNumber(post.commentsCount)}</div>div>
                                                                                                                            
                                                                                                                              </div>div>
                                                                                                  
                                                                                                    </div>div>
                                                                          
                                                                          </a>a>
                                                    
                                                                        ))}
                                                                    
                                                                    </div>div>
                                                  
                                                  </div>div>
                                
                                                )}
                                
                                </div>div>
                    
                              ))}
                  
                  </div>div>
        
                )}
        
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              
                      <div className="flex items-start justify-between">
                      
                                <div>
                                
                                            <h2 className="text-lg font-semibold text-white">🚀 Who's Coming Up?</h2>h2>
                                
                                            <p className="text-gray-400 text-sm mt-1">AI-generated list of rising trading accounts in your niche</p>p>
                                
                                </div>div>
                      
                                <button
                                  
                                              onClick={handleScanNiche}
                                  
                                  disabled={loadingRising}
                                  
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                                  
                                >
                                
                                  {loadingRising ? '⏳ Scanning...' : '🔎 Scan Niche'}
                                
                                </button>button>
                      
                      </div>div>
              
                {risingAccounts.length > 0 && (
          
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                      {risingAccounts.map((acc, i) => (
                      
                                    <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    
                                                    <div className="flex items-center justify-between mb-2">
                                                    
                                                                      <span className="font-bold text-white">@{acc.username}</span>span>
                                                    
                                                                      <span className="text-green-400 text-xs">{acc.growthRate}</span>span>
                                                    
                                                    </div>div>
                                    
                                                    <p className="text-gray-400 text-xs mb-1">{acc.estimatedFollowers} followers · {acc.niche}</p>p>
                                    
                                                    <p className="text-gray-300 text-sm mb-1">{acc.whyGrowing}</p>p>
                                    
                                                    <p className="text-gray-400 text-xs">Formula: {acc.contentFormula}</p>p>
                                    
                                      {acc.weakness && <p className="text-yellow-600 text-xs mt-1">⚠️ {acc.weakness}</p>p>}
                                    
                                    </div>div>
                      
                                  ))}
                    
                    </div>div>
              
                  )}
              
              </div>div>
        
        </div>div>
    
      )
    
}</div>
