'use client'
import { useState, useEffect, Suspense } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type WeeklyReport = {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  overallScore: number
  verdict: string
  trading: { pnl: number; winRate: string; patterns: string; summary: string }
  habits: { completionRate: string; bestHabit: string; missedHabit: string; streakStatus: string }
  health: { sleepAvg: string; gymSessions: number; energyTrend: string }
  mindset: { themes: string; dominantMood: string; journalInsight: string }
  goals: { onTrack: string[]; atRisk: string[]; crushing: string[] }
  finance: { incomeLogged: number; expenses: number; net: number }
  focusNext: string
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const mon = new Date(now.setDate(diff))
  mon.setHours(0,0,0,0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] }
}

function ScoreRing({ score }: { score: number }) {
  const r = 36, cx = 44, cy = 44
  const circ = 2 * Math.PI * r
  const pct = score / 10
  const color = score >= 8 ? '#00ff88' : score >= 6 ? '#ffb400' : '#ff2d78'
  return (
    <svg width='88' height='88' viewBox='0 0 88 88'>
      <circle cx={cx} cy={cy} r={r} fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='7' />
      <circle cx={cx} cy={cy} r={r} fill='none' stroke={color} strokeWidth='7'
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap='round' transform='rotate(-90 44 44)'
        style={{ filter: 'drop-shadow(0 0 6px ' + color + ')' }}
      />
      <text x={cx} y={cy+2} textAnchor='middle' dominantBaseline='middle' fill={color} fontSize='18' fontFamily='JetBrains Mono' fontWeight='700'>{score}</text>
      <text x={cx} y={cy+16} textAnchor='middle' fill='rgba(255,255,255,0.4)' fontSize='8' fontFamily='JetBrains Mono'>/10</text>
    </svg>
  )
}

function ReviewCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className='premium-card p-5'>
      <p className='text-xs font-mono font-semibold mb-3 tracking-widest' style={{ color }}>{title}</p>
      {children}
    </div>
  )
}

function ReviewInner() {
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [pastReviews, setPastReviews] = useState<WeeklyReport[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { start, end } = getWeekRange()

  useEffect(() => {
    fetch('/api/life/review').then(r => r.json()).then(d => {
      setPastReviews(d.reviews || [])
      const thisWeek = (d.reviews || []).find((r: WeeklyReport) => r.weekStart === start)
      if (thisWeek) setReport(thisWeek)
    }).catch(() => {})
  }, [start])

  async function generateReview() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/life/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: start, weekEnd: end }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setGenerating(false); return }
      setReport(data.report)
      setPastReviews(prev => {
        const filtered = prev.filter(r => r.weekStart !== start)
        return [data.report, ...filtered]
      })
    } catch (e) {
      setError('Failed to generate review. Please try again.')
    }
    setGenerating(false)
  }

  const getScoreColor = (score: number) => score >= 8 ? '#00ff88' : score >= 6 ? '#ffb400' : '#ff2d78'

  return (
    <div className='cyber-bg-grid min-h-screen'>
      <div className='max-w-[1100px] mx-auto p-6'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <Link href='/life' className='text-xs font-mono block mb-1' style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className='section-label'>LIFE HUB</span>
            <h1 className='text-2xl font-bold mt-1 flex items-center gap-3' style={{ color: 'var(--text-primary)' }}>
              Weekly Review
              <span className='text-sm font-mono font-normal' style={{ color: 'var(--text-muted)' }}>WEEK OF {start} to {end}</span>
            </h1>
          </div>
          <button onClick={generateReview} disabled={generating} className='btn-cyber-primary flex items-center gap-2' style={{ opacity: generating ? 0.7 : 1 }}>
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate Review'}
          </button>
        </div>

        {error && <div className='p-4 rounded-lg mb-6 border text-xs font-mono' style={{ background: 'rgba(255,45,120,0.08)', borderColor: 'rgba(255,45,120,0.4)', color: '#ff2d78' }}>{error}</div>}

        {generating && (
          <div className='premium-card p-8 mb-8 text-center'>
            <p className='text-xs font-mono' style={{ color: 'var(--text-muted)' }}>Coach Shai is analyzing your week...</p>
            <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Reading trading logs, habits, health, journal, goals, and finance data</p>
          </div>
        )}

        {report && !generating && (
          <div>
            <div className='premium-card p-6 mb-6'>
              <div className='flex items-center gap-6'>
                <ScoreRing score={report.overallScore} />
                <div>
                  <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>OVERALL WEEK SCORE</p>
                  <p className='text-xl font-semibold' style={{ color: getScoreColor(report.overallScore) }}>{report.verdict}</p>
                  <p className='text-xs font-mono mt-2' style={{ color: 'var(--text-muted)' }}>Generated {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              <ReviewCard title='TRADING SUMMARY' color='#00f2ff'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>P&amp;L</span>
                    <span style={{ color: report.trading.pnl >= 0 ? '#00ff88' : '#ff2d78' }}>{report.trading.pnl >= 0 ? '+' : ''}${report.trading.pnl}</span>
                  </div>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Win Rate</span>
                    <span style={{ color: '#00f2ff' }}>{report.trading.winRate}</span>
                  </div>
                  <p className='text-xs mt-3' style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.trading.summary}</p>
                  {report.trading.patterns && <p className='text-xs font-mono mt-2 p-2 rounded' style={{ color: '#ffb400', background: 'rgba(255,180,0,0.05)', border: '1px solid rgba(255,180,0,0.15)' }}>Pattern: {report.trading.patterns}</p>}
                </div>
              </ReviewCard>

              <ReviewCard title='HABITS' color='#00ff88'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Completion Rate</span>
                    <span style={{ color: '#00ff88' }}>{report.habits.completionRate}</span>
                  </div>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Best Habit</span>
                    <span style={{ color: '#00f2ff' }}>{report.habits.bestHabit}</span>
                  </div>
                  {report.habits.missedHabit && <div className='flex justify-between text-xs font-mono'><span style={{ color: 'var(--text-muted)' }}>Missed</span><span style={{ color: '#ff2d78' }}>{report.habits.missedHabit}</span></div>}
                  <p className='text-xs mt-2' style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.habits.streakStatus}</p>
                </div>
              </ReviewCard>

              <ReviewCard title='HEALTH' color='#ff00e5'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Sleep Avg</span>
                    <span style={{ color: '#ff00e5' }}>{report.health.sleepAvg}</span>
                  </div>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Gym Sessions</span>
                    <span style={{ color: '#00ff88' }}>{report.health.gymSessions}/7</span>
                  </div>
                  <p className='text-xs mt-2' style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.health.energyTrend}</p>
                </div>
              </ReviewCard>

              <ReviewCard title='MINDSET' color='#c084fc'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Dominant Mood</span>
                    <span style={{ color: '#c084fc' }}>{report.mindset.dominantMood}</span>
                  </div>
                  <p className='text-xs mt-2' style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.mindset.themes}</p>
                  {report.mindset.journalInsight && <p className='text-xs font-mono mt-2 p-2 rounded' style={{ color: '#c084fc', background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)' }}>{report.mindset.journalInsight}</p>}
                </div>
              </ReviewCard>

              <ReviewCard title='GOALS STATUS' color='#ffb400'>
                <div className='space-y-3'>
                  {report.goals.crushing.length > 0 && <div><p className='text-xs font-mono mb-1' style={{ color: '#00ff88' }}>CRUSHING IT</p>{report.goals.crushing.map((g, i) => <p key={i} className='text-xs' style={{ color: 'var(--text-secondary)' }}>• {g}</p>)}</div>}
                  {report.goals.onTrack.length > 0 && <div><p className='text-xs font-mono mb-1' style={{ color: '#00f2ff' }}>ON TRACK</p>{report.goals.onTrack.map((g, i) => <p key={i} className='text-xs' style={{ color: 'var(--text-secondary)' }}>• {g}</p>)}</div>}
                  {report.goals.atRisk.length > 0 && <div><p className='text-xs font-mono mb-1' style={{ color: '#ff2d78' }}>AT RISK</p>{report.goals.atRisk.map((g, i) => <p key={i} className='text-xs' style={{ color: 'var(--text-secondary)' }}>• {g}</p>)}</div>}
                </div>
              </ReviewCard>

              <ReviewCard title='FINANCE SNAPSHOT' color='#00ff88'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Income</span>
                    <span style={{ color: '#00ff88' }}>${report.finance.incomeLogged}</span>
                  </div>
                  <div className='flex justify-between text-xs font-mono'>
                    <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                    <span style={{ color: '#ff2d78' }}>${report.finance.expenses}</span>
                  </div>
                  <div className='flex justify-between text-xs font-mono border-t pt-2' style={{ borderColor: 'var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Net</span>
                    <span style={{ color: report.finance.net >= 0 ? '#00ff88' : '#ff2d78', fontWeight: 700 }}>{report.finance.net >= 0 ? '+' : ''}${report.finance.net}</span>
                  </div>
                </div>
              </ReviewCard>
            </div>

            <div className='premium-card p-5 mb-8' style={{ borderColor: 'rgba(0,242,255,0.3)', background: 'rgba(0,242,255,0.03)' }}>
              <div className='flex items-start gap-4'>
                <div className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'linear-gradient(135deg, #00f2ff, #0060ff)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>AI</span>
                </div>
                <div>
                  <p className='text-xs font-mono font-semibold mb-2' style={{ color: '#00f2ff' }}>COACH SHAI — #1 FOCUS FOR NEXT WEEK</p>
                  <p className='text-sm' style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>{report.focusNext}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!report && !generating && (
          <div className='premium-card p-12 text-center mb-8'>
            <Calendar size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p className='text-sm font-mono mb-2' style={{ color: 'var(--text-muted)' }}>No review for this week yet.</p>
            <p className='text-xs font-mono mb-6' style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Click Generate Review to have Coach Shai analyze your entire week.</p>
            <button onClick={generateReview} className='btn-cyber-primary flex items-center gap-2 mx-auto'>
              <RefreshCw size={14} /> Generate This Week
            </button>
          </div>
        )}

        {pastReviews.filter(r => r.weekStart !== start).length > 0 && (
          <div>
            <h2 className='section-label mb-4'>PAST REVIEWS</h2>
            <div className='space-y-2'>
              {pastReviews.filter(r => r.weekStart !== start).map(rev => (
                <div key={rev.id} className='premium-card overflow-hidden'>
                  <button onClick={() => setExpandedId(expandedId === rev.id ? null : rev.id)} className='w-full p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left'>
                    <span className='text-xs font-mono' style={{ color: 'var(--text-muted)', minWidth: 120 }}>w/o {rev.weekStart}</span>
                    <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ border: '2px solid ' + getScoreColor(rev.overallScore) }}>
                      <span className='text-xs font-mono font-bold' style={{ color: getScoreColor(rev.overallScore) }}>{rev.overallScore}</span>
                    </div>
                    <span className='text-xs flex-1 truncate' style={{ color: 'var(--text-secondary)' }}>{rev.verdict}</span>
                    {expandedId === rev.id ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {expandedId === rev.id && (
                    <div className='px-4 pb-4 border-t' style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-xs'>
                        <div><p className='font-mono mb-1' style={{ color: 'var(--text-muted)' }}>TRADING P&amp;L</p><p className='font-mono' style={{ color: rev.trading?.pnl >= 0 ? '#00ff88' : '#ff2d78' }}>{rev.trading?.pnl >= 0 ? '+' : ''}${rev.trading?.pnl}</p></div>
                        <div><p className='font-mono mb-1' style={{ color: 'var(--text-muted)' }}>HABITS</p><p style={{ color: '#00ff88' }}>{rev.habits?.completionRate}</p></div>
                        <div><p className='font-mono mb-1' style={{ color: 'var(--text-muted)' }}>DOMINANT MOOD</p><p style={{ color: '#c084fc' }}>{rev.mindset?.dominantMood}</p></div>
                        <div className='col-span-3'><p className='font-mono mb-1' style={{ color: 'var(--text-muted)' }}>COACH FOCUS</p><p style={{ color: 'var(--text-secondary)' }}>{rev.focusNext}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WeeklyReviewPage() {
  return (
    <Suspense fallback={<div className='cyber-bg-grid min-h-screen flex items-center justify-center'><div className='text-xs font-mono' style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <ReviewInner />
    </Suspense>
  )
}
