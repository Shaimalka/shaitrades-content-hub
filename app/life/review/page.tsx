'use client'
import { useState, useEffect, Suspense } from 'react'
import { RefreshCw, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type WeeklyReport = {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  overallScore: number
  verdict: string
  letter: string
  focusNext: string
  trading: { pnl: number; winRate: string; patterns: string; summary: string }
  habits: { completionRate: string; bestHabit: string; missedHabit: string; streakStatus: string }
  health: { sleepAvg: string; gymSessions: number; energyTrend: string }
  mindset: { themes: string; dominantMood: string; journalInsight: string }
  goals: { onTrack: string[]; atRisk: string[]; crushing: string[] }
  finance: { incomeLogged: number; expenses: number; net: number }
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
      <circle cx={cx} cy={cy} r={r} fill='none' stroke={color} strokeWidth='7' strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)} strokeLinecap='round' transform='rotate(-90 44 44)'
        style={{ filter: 'drop-shadow(0 0 6px ' + color + ')' }} />
      <text x={cx} y={cy+2} textAnchor='middle' dominantBaseline='middle' fill={color} fontSize='18' fontFamily='JetBrains Mono' fontWeight='700'>{score}</text>
      <text x={cx} y={cy+16} textAnchor='middle' fill='rgba(255,255,255,0.4)' fontSize='8' fontFamily='JetBrains Mono'>/10</text>
    </svg>
  )
}

// ── CSS Confetti (pure CSS, no library) ──────────────────────────────────────
function Confetti() {
  const dots = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: ['#00ff88', '#00f2ff', '#ffb400', '#ff00e5', '#c084fc', '#ff6b35'][i % 6],
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    duration: 1.5 + Math.random() * 1.5,
  }))

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{
        `@keyframes confetti-fall {
          0% { transform: translateY(100vh) scale(0); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }`
      }</style>
      {dots.map(d => (
        <div key={d.id} style={{
          position: 'absolute',
          bottom: 0,
          left: d.left + '%',
          width: d.size + 'px',
          height: d.size + 'px',
          borderRadius: '50%',
          background: d.color,
          boxShadow: '0 0 6px ' + d.color,
          animation: `confetti-fall ${d.duration}s ease-out ${d.delay}s both`,
        }} />
      ))}
    </div>
  )
}

function ReviewInner() {
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [pastReviews, setPastReviews] = useState<WeeklyReport[]>([])
  const [error, setError] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
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
      if (data.report.overallScore >= 8) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)
      }
    } catch (e) {
      setError('Failed to generate review. Please try again.')
    }
    setGenerating(false)
  }

  const getScoreColor = (score: number) => score >= 8 ? '#00ff88' : score >= 6 ? '#ffb400' : '#ff2d78'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ background: '#040406', minHeight: '100vh' }}>
      {showConfetti && <Confetti />}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.4), 0 0 20px rgba(0,255,136,0.2); }
          50% { box-shadow: 0 0 0 12px rgba(0,255,136,0), 0 0 40px rgba(0,255,136,0.4); }
        }
        .generate-btn-pulse { animation: pulse-glow 2.5s ease-in-out infinite; }
        .generate-btn-pulse:disabled { animation: none; }
      `}</style>

      <div className='max-w-[900px] mx-auto p-6'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <Link href='/life' className='text-xs font-mono block mb-1' style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className='text-xs font-mono tracking-widest font-bold' style={{ color: 'var(--text-muted)' }}>LIFE HUB</span>
            <h1 className='text-2xl font-bold mt-1' style={{ color: 'var(--text-primary)' }}>
              Weekly Review <span className='text-sm font-mono font-normal ml-2' style={{ color: 'var(--text-muted)' }}>w/o {start}</span>
            </h1>
          </div>
        </div>

        {error && (
          <div className='p-4 rounded-lg mb-6 border text-xs font-mono' style={{ background: 'rgba(255,45,120,0.08)', borderColor: 'rgba(255,45,120,0.4)', color: '#ff2d78' }}>{error}</div>
        )}

        {!report && !generating && (
          <div className='flex flex-col items-center justify-center py-20 mb-8'>
            <Calendar size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1.5rem' }} />
            <p className='text-sm font-mono mb-2' style={{ color: 'var(--text-muted)' }}>No review for this week yet.</p>
            <p className='text-xs font-mono mb-8' style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Coach Shai will analyze your entire week and write you a letter.
            </p>
            <button
              onClick={generateReview}
              disabled={generating}
              className='generate-btn-pulse flex items-center gap-3 px-10 py-5 rounded-xl text-base font-mono font-bold transition-all'
              style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,242,255,0.1))', border: '1px solid rgba(0,255,136,0.5)', color: '#00ff88', fontSize: '1rem' }}>
              <RefreshCw size={18} />
              Generate This Week
            </button>
          </div>
        )}

        {generating && (
          <div className='premium-card p-10 mb-8 text-center'>
            <div className='flex items-center justify-center gap-3 mb-3'>
              <RefreshCw size={20} className='animate-spin' style={{ color: '#00f2ff' }} />
              <p className='text-sm font-mono' style={{ color: '#00f2ff' }}>Coach Shai is writing your letter...</p>
            </div>
            <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Reading trading logs, habits, health, journal, goals, and finance data</p>
          </div>
        )}

        {report && !generating && (
          <div>
            {/* Score + Re-generate row */}
            <div className='flex items-center justify-between mb-6 flex-wrap gap-4'>
              <div className='flex items-center gap-4'>
                <ScoreRing score={report.overallScore} />
                <div>
                  <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>OVERALL WEEK SCORE</p>
                  <p className='text-base font-semibold' style={{ color: getScoreColor(report.overallScore) }}>{report.verdict}</p>
                  <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)' }}>Generated {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={generateReview}
                disabled={generating}
                className='generate-btn-pulse flex items-center gap-2 px-8 py-4 rounded-xl font-mono font-bold transition-all'
                style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,242,255,0.1))', border: '1px solid rgba(0,255,136,0.5)', color: '#00ff88' }}>
                <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating...' : 'Regenerate'}
              </button>
            </div>

            {/* LETTER FROM COACH SHAI */}
            <div className='rounded-xl p-8 mb-6' style={{ background: 'rgba(0,242,255,0.03)', border: '1px solid rgba(0,242,255,0.2)', borderLeft: '4px solid #00f2ff' }}>
              <p className='text-xs font-mono tracking-widest mb-6' style={{ color: '#00f2ff', opacity: 0.7 }}>// LETTER FROM COACH SHAI</p>
              <div className='space-y-4'>
                <p className='text-sm leading-relaxed' style={{ color: 'var(--text-primary)', lineHeight: 1.8 }}>
                  {report.letter || report.verdict}
                </p>
                <div className='pt-4 border-t' style={{ borderColor: 'rgba(0,242,255,0.1)' }}>
                  <p className='text-sm font-semibold' style={{ color: '#00ff88', lineHeight: 1.8 }}>
                    My one focus for you next week: {report.focusNext}
                  </p>
                </div>
                <p className='text-xs font-mono mt-4' style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  — Coach Shai · {today}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mb-6'>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>TRADING P&L</p>
                <p className='font-mono font-semibold' style={{ color: report.trading?.pnl >= 0 ? '#00ff88' : '#ff2d78' }}>{report.trading?.pnl >= 0 ? '+' : ''}${report.trading?.pnl}</p>
                <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)' }}>Win rate: {report.trading?.winRate}</p>
              </div>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>HABITS</p>
                <p className='font-mono font-semibold' style={{ color: '#00ff88' }}>{report.habits?.completionRate}</p>
                <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)' }}>Best: {report.habits?.bestHabit}</p>
              </div>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>HEALTH</p>
                <p className='font-mono font-semibold' style={{ color: '#ff00e5' }}>{report.health?.sleepAvg} sleep</p>
                <p className='text-xs font-mono mt-1' style={{ color: 'var(--text-muted)' }}>{report.health?.gymSessions}/7 gym</p>
              </div>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>MINDSET</p>
                <p className='font-mono font-semibold' style={{ color: '#c084fc' }}>{report.mindset?.dominantMood}</p>
              </div>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>FINANCE NET</p>
                <p className='font-mono font-semibold' style={{ color: (report.finance?.net ?? 0) >= 0 ? '#00ff88' : '#ff2d78' }}>{(report.finance?.net ?? 0) >= 0 ? '+' : ''}${report.finance?.net}</p>
              </div>
              <div className='premium-card p-4'>
                <p className='text-xs font-mono mb-1' style={{ color: 'var(--text-muted)' }}>SCORE</p>
                <p className='font-mono font-semibold' style={{ color: getScoreColor(report.overallScore) }}>{report.overallScore}/10</p>
              </div>
            </div>
          </div>
        )}

        {/* Past Reviews — Timeline */}
        {pastReviews.filter(r => r.weekStart !== start).length > 0 && (
          <div className='mt-8'>
            <h2 className='text-xs font-mono tracking-widest font-bold mb-5' style={{ color: 'var(--text-muted)' }}>PAST REVIEWS</h2>
            <div className='relative'>
              <div className='absolute left-[11px] top-0 bottom-0 w-px' style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className='space-y-4'>
                {pastReviews.filter(r => r.weekStart !== start).map(rev => {
                  const color = getScoreColor(rev.overallScore)
                  const firstLine = rev.letter ? rev.letter.split('.')[0] + '.' : rev.verdict
                  return (
                    <div key={rev.id} className='flex items-start gap-4'>
                      <div className='flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center relative z-10' style={{ borderColor: color, background: '#040406' }}>
                        <span className='text-[9px] font-mono font-bold' style={{ color }}>{rev.overallScore}</span>
                      </div>
                      <div className='flex-1 premium-card p-4'>
                        <div className='flex items-center gap-3 mb-1 flex-wrap'>
                          <span className='text-xs font-mono px-2 py-0.5 rounded-full' style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>w/o {rev.weekStart}</span>
                          <span className='text-xs font-mono px-2 py-0.5 rounded-full font-bold' style={{ background: color + '18', color, border: '1px solid ' + color + '44' }}>{rev.overallScore}/10</span>
                        </div>
                        <p className='text-xs' style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{firstLine}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WeeklyReviewPage() {
  return (
    <Suspense fallback={<div style={{ background: '#040406' }} className='min-h-screen flex items-center justify-center'><div className='text-xs font-mono' style={{ color: 'var(--text-muted)' }}>Loading...</div></div>}>
      <ReviewInner />
    </Suspense>
  )
}
