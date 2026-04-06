'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Heart, AlertTriangle, Trophy, Zap, Moon, Dumbbell, RefreshCw } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import { useTheme } from '@/app/contexts/ThemeContext'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type HealthLog = { id: string; date: string; weight?: number; sleep?: number; sleepQuality?: number; gym: boolean; energy?: number; notes?: string }
type CorrelationInsight = { text: string; icon: string; color: string }

const SLEEP_QUALITY_EMOJI = ['','😴','😪','😐','😊','🌟']

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  d.setDate(d.getDate() - 7*offsetWeeks - ((d.getDay()+6)%7))
  d.setHours(0,0,0,0)
  return d
}


const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px' }: { width?: string; height?: string; borderRadius?: string }) => (
  <div style={{ width, height, borderRadius, background: 'rgba(128,128,128,0.12)', animation: 'shimmer 1.5s infinite' }} />
)

function EmptyState({ icon: Icon, heading, subtext, isDark = false }: { icon: React.ElementType; heading: string; subtext: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'), marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: 13, maxWidth: 280, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>{subtext}</p>
    </div>
  )
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => { const h = () => setWidth(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return width
}

function CorrelationEngine({ logs }: { logs: HealthLog[] }) {
  const { isDark } = useTheme()
  const cardStyle = {
    background: isDark ? (isDark ? '#111118' : '#ffffff') : (isDark ? '#ffffff' : '#0a0a0f'),
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px', padding: '20px',
  } as React.CSSProperties
  const [insights, setInsights] = useState<CorrelationInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const analyze = useCallback(async () => {
    if (logs.length < 7) return
    setLoading(true)
    try {
      let tradingLogs: any[] = []
      try { const tr = await fetch('/api/life/trading'); if (tr.ok) { const td = await tr.json(); tradingLogs = td.logs || [] } } catch {}
      const result: CorrelationInsight[] = []
      const sorted = [...logs].sort((a,b) => a.date.localeCompare(b.date))
      if (tradingLogs.length > 0) {
        const greenDays = tradingLogs.filter((t:any) => t.pnl > 0).map((t:any) => t.date)
        const greenSleep = sorted.filter(l => greenDays.includes(l.date) && l.sleep)
        if (greenSleep.length >= 3) {
          const avgSleep = greenSleep.reduce((s,l) => s+(l.sleep||0),0)/greenSleep.length
          result.push({ text: 'Your last '+greenSleep.length+' green trading days had '+avgSleep.toFixed(1)+'h sleep avg — rest fuels performance.', icon: '🟢', color: '#00c48c' })
        }
      }
      const gymDays = sorted.filter(l => l.gym && l.energy); const noGymDays = sorted.filter(l => !l.gym && l.energy)
      if (gymDays.length >= 3 && noGymDays.length >= 3) {
        const gymEnergy = gymDays.reduce((s,l)=>s+(l.energy||0),0)/gymDays.length
        const noGymEnergy = noGymDays.reduce((s,l)=>s+(l.energy||0),0)/noGymDays.length
        const diff = (gymEnergy - noGymEnergy).toFixed(1)
        if (parseFloat(diff) > 0.5) result.push({ text: 'On gym days your energy is +'+diff+' pts higher on avg. Movement is your edge.', icon: '🏋️', color: '#2563eb' })
      }
      const last7 = sorted.slice(-7).filter(l => l.sleep); const prev7 = sorted.slice(-14,-7).filter(l => l.sleep)
      if (last7.length >= 4 && prev7.length >= 4) {
        const avg7 = last7.reduce((s,l)=>s+(l.sleep||0),0)/last7.length
        const avgp7 = prev7.reduce((s,l)=>s+(l.sleep||0),0)/prev7.length
        const trend = avg7 > avgp7 ? 'improving' : 'declining'
        result.push({ text: 'Sleep is '+trend+' — last 7 days avg '+avg7.toFixed(1)+'h vs prior week '+avgp7.toFixed(1)+'h.', icon: trend==='improving'?'📈':'📉', color: trend==='improving'?'#00c48c':'#ff4d6a' })
      }
      if (result.length === 0) result.push({ text: 'Keep logging! Patterns need more data to surface — aim for 14+ consistent days.', icon: '🔍', color: '#f59e0b' })
      setInsights(result); setAnalyzed(true)
    } catch(e) { console.error('Correlation error:',e) }
    setLoading(false)
  }, [logs])

  useEffect(() => { if (logs.length >= 7 && !analyzed) analyze() }, [logs, analyzed, analyze])

  if (logs.length < 7) {
    return (
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 8 }}>COACH SHAI CORRELATIONS</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>Log at least 7 days of health data to unlock pattern analysis</p>
      </div>
    )
  }

  return (
    <div style={{ ...cardStyle, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>COACH SHAI CORRELATIONS</p>
        <button onClick={analyze} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', cursor: loading ? 'not-allowed' : 'pointer' }}>
          <RefreshCw size={10} className={loading?'animate-spin':''} /> {loading?'Analyzing...':'Re-analyze'}
        </button>
      </div>
      {loading && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>Analyzing patterns...</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((ins,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px', borderRadius: 8, borderLeft: `3px solid ${ins.color}`, background: (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon}</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'), lineHeight: 1.6, margin: 0 }}>{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768
  const searchParams = useSearchParams()
  const inputStyle = {
    background: isDark ? (isDark ? '#1a1a24' : '#f1f4f9') : '#f1f4f9',
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px', color: isDark ? (isDark ? '#ffffff' : '#0a0a0f') : (isDark ? '#0a0a0f' : '#f8f9fc'),
    fontFamily: 'Inter, sans-serif', fontSize: '13px', padding: '8px 12px', outline: 'none', width: '100%',
  } as React.CSSProperties
  const cardStyle = {
    background: isDark ? (isDark ? '#111118' : '#ffffff') : (isDark ? '#ffffff' : '#0a0a0f'),
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px', padding: '20px',
  } as React.CSSProperties
  const focusStyle = { borderColor: 'rgba(37,99,235,0.5)', boxShadow: '0 0 0 2px rgba(37,99,235,0.3)' }
  const blurStyle = { borderColor: isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)', boxShadow: 'none' }
  const tooltipStyle = {
    background: isDark ? (isDark ? '#111118' : '#ffffff') : (isDark ? '#ffffff' : '#0a0a0f'),
    border: `1px solid ${isDark ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') : 'rgba(0,0,0,0.08)'}`,
    borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    color: isDark ? (isDark ? '#ffffff' : '#0a0a0f') : (isDark ? '#0a0a0f' : '#f8f9fc')
  }
  const axisTickStyle = { fill: isDark ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.25)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen] = useState(searchParams.get('chat')==='1')
  const today = new Date().toISOString().split('T')[0]
  const todayLog = logs.find(l => l.date===today)
  const [form, setForm] = useState({ weight:'',sleep:'',sleepQuality:3,gym:false,energy:5,notes:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetch('/api/life/health').then(r=>r.json()).then(d=>{setLogs(d.logs||[]);setLoading(false)}).catch(()=>setLoading(false)) },[])
  useEffect(() => { if (todayLog) setForm({ weight:todayLog.weight?.toString()||'',sleep:todayLog.sleep?.toString()||'',sleepQuality:todayLog.sleepQuality||3,gym:todayLog.gym,energy:todayLog.energy||5,notes:todayLog.notes||'' }) },[todayLog])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const entry: any = {date:today,gym:form.gym,sleepQuality:form.sleepQuality,energy:form.energy,notes:form.notes}
    if(form.weight) entry.weight=parseFloat(form.weight)
    if(form.sleep) entry.sleep=parseFloat(form.sleep)
    const payload = todayLog ? {action:'update',entry:{...entry,id:todayLog.id}} : {entry}
    const res = await fetch('/api/life/health',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const data = await res.json(); setLogs(data.logs||[]); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  const sorted = [...logs].sort((a,b)=>a.date.localeCompare(b.date))
  const last30Start = new Date(Date.now()-30*86400000).toISOString().split('T')[0]
  const last30 = sorted.filter(l=>l.date>=last30Start)
  const weightData = last30.filter(l=>l.weight).map(l=>({date:l.date.slice(5),weight:l.weight}))
  const energyData = last30.filter(l=>l.energy).map(l=>({date:l.date.slice(5),energy:l.energy}))
  const thisWeekStart=getWeekStart(0), lastWeekStart=getWeekStart(1)
  const thisWeekLogs=logs.filter(l=>new Date(l.date)>=thisWeekStart)
  const lastWeekLogs=logs.filter(l=>new Date(l.date)>=lastWeekStart&&new Date(l.date)<thisWeekStart)
  const sleepThis=thisWeekLogs.filter(l=>l.sleep); const sleepLast=lastWeekLogs.filter(l=>l.sleep)
  const sleepAvgThis=sleepThis.length?(sleepThis.reduce((s,l)=>s+(l.sleep||0),0)/sleepThis.length).toFixed(1):null
  const sleepAvgLast=sleepLast.length?(sleepLast.reduce((s,l)=>s+(l.sleep||0),0)/sleepLast.length).toFixed(1):null
  const gymThisWeek=thisWeekLogs.filter(l=>l.gym).length
  let longestStreak=0,currentStreak=0,prevGymDate:string|null=null
  for(const l of sorted){ if(l.gym){if(prevGymDate){const diff=(new Date(l.date).getTime()-new Date(prevGymDate).getTime())/86400000;currentStreak=diff===1?currentStreak+1:1}else{currentStreak=1};longestStreak=Math.max(longestStreak,currentStreak);prevGymDate=l.date}else{prevGymDate=null;currentStreak=0} }
  const sleepWeeks:Record<string,number[]>={}
  for(const l of logs){if(!l.sleep)continue;const d=new Date(l.date);const wk=new Date(d);wk.setDate(d.getDate()-((d.getDay()+6)%7));const key=wk.toISOString().split('T')[0];if(!sleepWeeks[key])sleepWeeks[key]=[];sleepWeeks[key].push(l.sleep)}
  const bestSleepWeek=Object.entries(sleepWeeks).reduce((best,[k,arr])=>{const avg=arr.reduce((s,v)=>s+v,0)/arr.length;return avg>best.avg?{week:k,avg}:best},{week:'',avg:0})
  const recentSorted=sorted.slice(-2)
  const lowSleepWarning=recentSorted.length===2&&recentSorted.every(l=>l.sleep&&l.sleep<6)
  const gymStreakBroke=sorted.length>=2&&sorted[sorted.length-2].gym&&!sorted[sorted.length-1].gym
  const energyAvg=energyData.length?(energyData.reduce((s,l)=>s+(l.energy||0),0)/energyData.length).toFixed(1):null

  return (
    <div style={{ background: (isDark ? '#0a0a0f' : '#f8f9fc'), minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` }} />
      <div className="max-w-[1100px] mx-auto" style={{ padding: isMobile ? '16px' : '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <Link href="/life" style={{ color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← LIFE HUB</Link>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>Health</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), marginTop: 2 }}>Track sleep, energy, gym and wellbeing</p>
          </div>
          <Heart size={32} style={{ color: '#ff4d6a', opacity: 0.4 }} />
        </div>

        {/* Alerts */}
        {lowSleepWarning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, marginBottom: 24, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#f59e0b', marginBottom: 2 }}>COACH SHAI ALERT</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)') }}>You have had under 6 hours sleep 2 days in a row. Prioritize rest tonight.</p>
            </div>
          </div>
        )}
        {gymStreakBroke && !lowSleepWarning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, marginBottom: 24, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.25)' }}>
            <Zap size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)') }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#2563eb' }}>COACH SHAI: </span>Gym streak just broke. Get back in tomorrow.</p>
          </div>
        )}

        {/* Log Form */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: (isDark ? '#ffffff' : '#0a0a0f'), margin: 0 }}>Today's Log — {today}</h2>
            {saved && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,196,140,0.1)', color: '#00c48c' }}>✓ SAVED</span>}
          </div>
          <form onSubmit={submitLog}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>⚖️ WEIGHT (lbs) <span style={{ opacity: 0.5, fontSize: 10 }}>optional</span></label>
                <input type="number" step="0.1" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="175.0" />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><Moon size={11}/> SLEEP HOURS</label>
                <input type="number" step="0.5" min="0" max="24" value={form.sleep} onChange={e=>setForm(f=>({...f,sleep:e.target.value}))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="7.5" />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><Dumbbell size={11}/> GYM TODAY?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={()=>setForm(f=>({...f,gym:true}))} style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.gym ? 'rgba(0,196,140,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${form.gym ? '#00c48c' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')}`, color: form.gym ? '#00c48c' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>✓ YES</button>
                  <button type="button" onClick={()=>setForm(f=>({...f,gym:false}))} style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !form.gym ? 'rgba(255,77,106,0.1)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${!form.gym ? '#ff4d6a' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')}`, color: !form.gym ? '#ff4d6a' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>✗ NO</button>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'block', marginBottom: 6 }}>😴 SLEEP QUALITY</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(q=>(
                    <button key={q} type="button" onClick={()=>setForm(f=>({...f,sleepQuality:q}))} style={{ flex: 1, padding: '6px', borderRadius: 8, fontSize: 16, cursor: 'pointer', background: form.sleepQuality===q ? 'rgba(37,99,235,0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${form.sleepQuality===q ? 'rgba(37,99,235,0.4)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')}` }}>
                      {SLEEP_QUALITY_EMOJI[q]}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 4, textAlign: 'center' }}>{form.sleepQuality}/5 — {['','Poor','Fair','Good','Great','Perfect'][form.sleepQuality]}</p>
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>⚡ ENERGY LEVEL</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>{form.energy}/10</span>
                </label>
                <input type="range" min="1" max="10" value={form.energy} onChange={e=>setForm(f=>({...f,energy:parseInt(e.target.value)}))} style={{ width: '100%', accentColor: '#2563eb' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 2 }}>
                  <span>Dead</span><span>Wired</span>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>📝 NOTE <span style={{ opacity: 0.5, fontSize: 10 }}>optional</span></label>
                <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => Object.assign(e.target.style, blurStyle)} placeholder="How are you feeling?" />
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ background: saving ? (isDark ? '#111118' : '#ffffff') : '#2563eb', border: saving ? '1px solid rgba(255,255,255,0.06)' : 'none', borderRadius: 8, color: saving ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : (isDark ? '#ffffff' : '#0a0a0f'), fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, padding: '12px', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', minHeight: 44 }}>
              {saving?'Saving...':todayLog?"Update Today's Log":'Log Today'}
            </button>
          </form>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Skeleton height="70px" /><Skeleton height="70px" /><Skeleton height="70px" /><Skeleton height="70px" />
            </div>
          </div>
        ) : (<>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>SLEEP THIS WEEK</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#a78bfa', margin: 0 }}>{sleepAvgThis?sleepAvgThis+'h avg':'—'}</p>
              {sleepAvgLast && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 4 }}>Last week: {sleepAvgLast}h <span style={{ color: parseFloat(sleepAvgThis||'0')>=parseFloat(sleepAvgLast)?'#00c48c':'#ff4d6a' }}>{parseFloat(sleepAvgThis||'0')>=parseFloat(sleepAvgLast)?'↑':'↓'}</span></p>}
            </div>
            <div style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>GYM THIS WEEK</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#00c48c', margin: 0 }}>{gymThisWeek}/7</p>
              <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                {Array.from({length:7},(_,i)=>{const d=new Date(thisWeekStart);d.setDate(d.getDate()+i);const ds=d.toISOString().split('T')[0];const hit=logs.find(l=>l.date===ds)?.gym;return <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: hit?'#00c48c':(isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)') }}/>})}
              </div>
            </div>
            <div style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>AVG ENERGY (30d)</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{energyAvg?energyAvg+'/10':'—'}</p>
              {energyAvg && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 4 }}>{parseFloat(energyAvg)>=7?'🌟 High performer':parseFloat(energyAvg)>=5?'⚡ Decent':'😴 Low — rest up'}</p>}
            </div>
            <div style={{ background: (isDark ? '#111118' : '#ffffff'), border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>BEST GYM STREAK</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#2563eb', margin: 0 }}>{longestStreak>0?longestStreak+' days':'—'}</p>
              {bestSleepWeek.avg>0 && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginTop: 4 }}>Best sleep wk: {bestSleepWeek.avg.toFixed(1)}h</p>}
            </div>
          </div>

          {/* Charts */}
          {weightData.length>1 && (
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 16 }}>30-DAY WEIGHT TREND</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={axisTickStyle}/>
                  <YAxis domain={['auto','auto']} tick={axisTickStyle}/>
                  <Tooltip contentStyle={tooltipStyle}/>
                  <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot={{fill:'#2563eb',r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {energyData.length>2 && (
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), marginBottom: 16 }}>ENERGY TREND (30 DAYS)</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={axisTickStyle}/>
                  <YAxis domain={[0,10]} tick={axisTickStyle}/>
                  <Tooltip contentStyle={tooltipStyle}/>
                  <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={{fill:'#f59e0b',r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Energy x Trading insight */}
          {energyAvg && (
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>AI</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#2563eb', letterSpacing: '0.15em', marginBottom: 6 }}>COACH SHAI — ENERGY x TRADING</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'), lineHeight: 1.6 }}>
                    {parseFloat(energyAvg)>=7?'Your 30-day energy average is '+energyAvg+'/10 — elite territory. High-energy days correlate strongly with disciplined trade execution.':parseFloat(energyAvg)>=5?'Your 30-day energy average is '+energyAvg+'/10 — middle of the pack. Watch for your lowest-energy days: those are when emotional trading decisions sneak in.':'Your 30-day energy average is '+energyAvg+'/10 — below optimal. Low energy and poor trading decisions are deeply linked. Prioritize 7+ hours sleep.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Bests */}
          {(longestStreak>0||bestSleepWeek.avg>0) && (
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Trophy size={14} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>PERSONAL BESTS</h3>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                {longestStreak>0 && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>LONGEST GYM STREAK</p><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#00c48c' }}>{longestStreak} days 🔥</p></div>}
                {bestSleepWeek.avg>0 && <div><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>BEST SLEEP WEEK</p><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>{bestSleepWeek.avg.toFixed(1)}h avg 🌙</p><p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>w/o {bestSleepWeek.week}</p></div>}
              </div>
            </div>
          )}

          {logs.length===0 && !loading && <EmptyState icon={Heart} heading="NO HEALTH DATA YET" isDark={isDark} subtext="Start logging your sleep, nutrition and energy to see correlations." />}
          {logs.length>0 && (
            <div style={{ ...cardStyle, marginBottom: 24, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), margin: 0 }}>HEALTH LOG · {logs.length} ENTRIES</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{['DATE','WEIGHT','SLEEP','QUALITY','GYM','ENERGY','NOTES'].map(h=>(<th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), textTransform: 'uppercase' }}>{h}</th>))}</tr></thead>
                  <tbody>{[...logs].reverse().map(log=>(<tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}><td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }}>{log.date}</td><td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#2563eb' }}>{log.weight||'—'}</td><td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#a78bfa' }}>{log.sleep?log.sleep+'h':'—'}</td><td style={{ padding: '10px 16px' }}>{log.sleepQuality?SLEEP_QUALITY_EMOJI[log.sleepQuality]:'—'}</td><td style={{ padding: '10px 16px' }}>{log.gym?<span style={{color:'#00c48c'}}>✓</span>:<span style={{color:(isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}}>✗</span>}</td><td style={{ padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>{log.energy||'—'}/10</td><td style={{ padding: '10px 16px', fontFamily: 'Inter, sans-serif', color: (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.notes||'—'}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </>)}
        <CorrelationEngine logs={logs} />
      </div>
      <LifeHubChat section="health" apiRoute="/api/life/health/chat" contextData={{logs}} systemPrompt="You are Coach Shai, a health AI. Analyze weight, sleep, gym, and energy trends. Be direct and motivating." defaultOpen={chatOpen} />
    </div>
  )
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(128,128,128,0.5)' }}>Loading...</div></div>}>
      <HealthInner />
    </Suspense>
  )
}
