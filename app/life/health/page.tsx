export const metadata = {
  title: 'Health'
}

'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Heart, AlertTriangle, Trophy, Zap, Moon, Dumbbell, RefreshCw } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type HealthLog = {
  id: string
  date: string
  weight?: number
  sleep?: number
  sleepQuality?: number
  gym: boolean
  energy?: number
  notes?: string
}

type CorrelationInsight = { text: string; icon: string; color: string }

const SLEEP_QUALITY_EMOJI = ['','😴','😪','😐','😊','🌟']

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  d.setDate(d.getDate() - 7*offsetWeeks - ((d.getDay()+6)%7))
  d.setHours(0,0,0,0)
  return d
}

function EmptyState({ icon: Icon, heading, subtext }: { icon: React.ElementType; heading: string; subtext: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
      <Icon size={48} style={{ color: 'rgba(0,242,255,0.3)', marginBottom: 16 }} />
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#888888', fontSize: 13, letterSpacing: '0.15em', fontVariant: 'small-caps', textTransform: 'uppercase', marginBottom: 8 }}>{heading}</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 280, textAlign: 'center' }}>{subtext}</p>
    </div>
  )
}

function CorrelationEngine({ logs }: { logs: HealthLog[] }) {
  const [insights, setInsights] = useState<CorrelationInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const analyze = useCallback(async () => {
    if (logs.length < 7) return
    setLoading(true)
    try {
      let tradingLogs: any[] = []
      try {
        const tr = await fetch('/api/life/trading')
        if (tr.ok) { const td = await tr.json(); tradingLogs = td.logs || [] }
      } catch {}

      // Build correlations client-side for speed
      const result: CorrelationInsight[] = []
      const sorted = [...logs].sort((a,b) => a.date.localeCompare(b.date))

      // 1. Sleep vs trading days
      if (tradingLogs.length > 0) {
        const greenDays = tradingLogs.filter((t:any) => t.pnl > 0).map((t:any) => t.date)
        const greenSleep = sorted.filter(l => greenDays.includes(l.date) && l.sleep)
        if (greenSleep.length >= 3) {
          const avgSleep = greenSleep.reduce((s,l) => s+(l.sleep||0),0)/greenSleep.length
          result.push({ text: 'Your last '+greenSleep.length+' green trading days had '+avgSleep.toFixed(1)+'h sleep avg — rest fuels performance.', icon: '🟢', color: '#00ff88' })
        }
      }

      // 2. Gym + energy correlation
      const gymDays = sorted.filter(l => l.gym && l.energy)
      const noGymDays = sorted.filter(l => !l.gym && l.energy)
      if (gymDays.length >= 3 && noGymDays.length >= 3) {
        const gymEnergy = gymDays.reduce((s,l)=>s+(l.energy||0),0)/gymDays.length
        const noGymEnergy = noGymDays.reduce((s,l)=>s+(l.energy||0),0)/noGymDays.length
        const diff = (gymEnergy - noGymEnergy).toFixed(1)
        if (parseFloat(diff) > 0.5) {
          result.push({ text: 'On gym days your energy is +'+diff+' pts higher on avg. Movement is your edge.', icon: '🏋️', color: '#00f2ff' })
        }
      }

      // 3. Sleep quality trend
      const last7 = sorted.slice(-7).filter(l => l.sleep)
      const prev7 = sorted.slice(-14,-7).filter(l => l.sleep)
      if (last7.length >= 4 && prev7.length >= 4) {
        const avg7 = last7.reduce((s,l)=>s+(l.sleep||0),0)/last7.length
        const avgp7 = prev7.reduce((s,l)=>s+(l.sleep||0),0)/prev7.length
        const trend = avg7 > avgp7 ? 'improving' : 'declining'
        result.push({ text: 'Sleep is '+trend+' — last 7 days avg '+avg7.toFixed(1)+'h vs prior week '+avgp7.toFixed(1)+'h.', icon: trend==='improving'?'📈':'📉', color: '#ff00e5' })
      }

      if (result.length === 0) {
        result.push({ text: 'Keep logging! Patterns need more data to surface — aim for 14+ consistent days.', icon: '🔍', color: '#ffb400' })
      }

      setInsights(result)
      setAnalyzed(true)
    } catch(e) {
      console.error('Correlation error:',e)
    }
    setLoading(false)
  }, [logs])

  useEffect(() => { if (logs.length >= 7 && !analyzed) analyze() }, [logs, analyzed, analyze])

  if (logs.length < 7) {
    return (
      <div className="premium-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono tracking-widest font-bold" style={{color:'#00f2ff'}}>COACH SHAI CORRELATIONS</span>
        </div>
        <p className="text-xs font-mono" style={{color:'var(--text-muted)'}}>Log at least 7 days of health data to unlock pattern analysis</p>
      </div>
    )
  }

  return (
    <div className="premium-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-mono tracking-widest font-bold" style={{color:'#00f2ff'}}>// COACH SHAI CORRELATIONS</span>
        <button onClick={analyze} disabled={loading} className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border transition-all" style={{color:'#00f2ff',borderColor:'rgba(0,242,255,0.3)',background:'rgba(0,242,255,0.06)'}}>
          <RefreshCw size={10} className={loading?'animate-spin':''} />
          {loading?'Analyzing...':'Re-analyze'}
        </button>
      </div>
      {loading && <p className="text-xs font-mono" style={{color:'var(--text-muted)'}}>Analyzing patterns...</p>}
      <div className="space-y-3">
        {insights.map((ins,i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{borderLeft:'3px solid '+ins.color,background:'rgba(255,255,255,0.02)'}}>
            <span className="text-base flex-shrink-0">{ins.icon}</span>
            <p className="text-xs leading-relaxed" style={{color:'var(--text-secondary)'}}>{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthInner() {
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen] = useState(searchParams.get('chat')==='1')
  const today = new Date().toISOString().split('T')[0]
  const todayLog = logs.find(l => l.date===today)

  const [form, setForm] = useState({ weight:'',sleep:'',sleepQuality:3,gym:false,energy:5,notes:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/life/health').then(r=>r.json()).then(d=>{setLogs(d.logs||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[])

  useEffect(() => {
    if (todayLog) setForm({ weight:todayLog.weight?.toString()||'',sleep:todayLog.sleep?.toString()||'',sleepQuality:todayLog.sleepQuality||3,gym:todayLog.gym,energy:todayLog.energy||5,notes:todayLog.notes||'' })
  },[todayLog])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const entry: any = {date:today,gym:form.gym,sleepQuality:form.sleepQuality,energy:form.energy,notes:form.notes}
    if(form.weight) entry.weight=parseFloat(form.weight)
    if(form.sleep) entry.sleep=parseFloat(form.sleep)
    const payload = todayLog ? {action:'update',entry:{...entry,id:todayLog.id}} : {entry}
    const res = await fetch('/api/life/health',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const data = await res.json()
    setLogs(data.logs||[])
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000)
  }

  const sorted = [...logs].sort((a,b)=>a.date.localeCompare(b.date))
  const last30Start = new Date(Date.now()-30*86400000).toISOString().split('T')[0]
  const last30 = sorted.filter(l=>l.date>=last30Start)
  const weightData = last30.filter(l=>l.weight).map(l=>({date:l.date.slice(5),weight:l.weight}))
  const energyData = last30.filter(l=>l.energy).map(l=>({date:l.date.slice(5),energy:l.energy}))
  const thisWeekStart=getWeekStart(0), lastWeekStart=getWeekStart(1)
  const thisWeekLogs=logs.filter(l=>new Date(l.date)>=thisWeekStart)
  const lastWeekLogs=logs.filter(l=>new Date(l.date)>=lastWeekStart&&new Date(l.date)<thisWeekStart)
  const sleepThis=thisWeekLogs.filter(l=>l.sleep)
  const sleepLast=lastWeekLogs.filter(l=>l.sleep)
  const sleepAvgThis=sleepThis.length?(sleepThis.reduce((s,l)=>s+(l.sleep||0),0)/sleepThis.length).toFixed(1):null
  const sleepAvgLast=sleepLast.length?(sleepLast.reduce((s,l)=>s+(l.sleep||0),0)/sleepLast.length).toFixed(1):null
  const gymThisWeek=thisWeekLogs.filter(l=>l.gym).length

  let longestStreak=0,currentStreak=0,prevGymDate:string|null=null
  for(const l of sorted){
    if(l.gym){if(prevGymDate){const diff=(new Date(l.date).getTime()-new Date(prevGymDate).getTime())/86400000;currentStreak=diff===1?currentStreak+1:1}else{currentStreak=1};longestStreak=Math.max(longestStreak,currentStreak);prevGymDate=l.date}else{prevGymDate=null;currentStreak=0}
  }

  const sleepWeeks:Record<string,number[]>={}
  for(const l of logs){if(!l.sleep)continue;const d=new Date(l.date);const wk=new Date(d);wk.setDate(d.getDate()-((d.getDay()+6)%7));const key=wk.toISOString().split('T')[0];if(!sleepWeeks[key])sleepWeeks[key]=[];sleepWeeks[key].push(l.sleep)}
  const bestSleepWeek=Object.entries(sleepWeeks).reduce((best,[k,arr])=>{const avg=arr.reduce((s,v)=>s+v,0)/arr.length;return avg>best.avg?{week:k,avg}:best},{week:'',avg:0})

  const recentSorted=sorted.slice(-2)
  const lowSleepWarning=recentSorted.length===2&&recentSorted.every(l=>l.sleep&&l.sleep<6)
  const gymStreakBroke=sorted.length>=2&&sorted[sorted.length-2].gym&&!sorted[sorted.length-1].gym
  const energyAvg=energyData.length?(energyData.reduce((s,l)=>s+(l.energy||0),0)/energyData.length).toFixed(1):null

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{color:'var(--text-muted)'}}>← LIFE HUB</Link>
            <span className="section-header">HEALTH</span>
            <h1 className="text-2xl font-bold mt-1" style={{color:'var(--text-primary)'}}>Health Dashboard</h1>
          </div>
          <Heart size={32} style={{color:'#ff00e5',opacity:0.4}} />
        </div>

        {lowSleepWarning&&(<div className="flex items-center gap-3 p-4 rounded-lg mb-6 border" style={{background:'rgba(255,180,0,0.08)',borderColor:'rgba(255,180,0,0.4)'}}><AlertTriangle size={16} style={{color:'#ffb400',flexShrink:0}}/><div><p className="text-xs font-mono font-semibold" style={{color:'#ffb400'}}>COACH SHAI ALERT</p><p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>You have had under 6 hours sleep 2 days in a row. Prioritize rest tonight.</p></div></div>)}
        {gymStreakBroke&&!lowSleepWarning&&(<div className="flex items-center gap-3 p-4 rounded-lg mb-6 border" style={{background:'rgba(0,242,255,0.05)',borderColor:'rgba(0,242,255,0.25)'}}><Zap size={16} style={{color:'#00f2ff',flexShrink:0}}/><p className="text-xs" style={{color:'var(--text-secondary)'}}><span className="font-mono font-semibold" style={{color:'#00f2ff'}}>COACH SHAI: </span>Gym streak just broke. Get back in tomorrow.</p></div>)}

        <div className="premium-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-semibold" style={{color:'var(--text-primary)'}}>// TODAY's LOG — {today}</h2>
            {saved&&<span className="text-xs font-mono px-2 py-1 rounded" style={{color:'#00ff88',background:'rgba(0,255,136,0.1)'}}>✓ SAVED</span>}
          </div>
          <form onSubmit={submitLog}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div><label className="text-xs font-mono mb-1.5 flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>⚖️ WEIGHT (lbs) <span className="opacity-40">optional</span></label><input type="number" step="0.1" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} className="cyber-input w-full" placeholder="175.0" /></div>
              <div><label className="text-xs font-mono mb-1.5 flex items-center gap-1.5" style={{color:'var(--text-muted)'}}><Moon size={11}/> SLEEP HOURS</label><input type="number" step="0.5" min="0" max="24" value={form.sleep} onChange={e=>setForm(f=>({...f,sleep:e.target.value}))} className="cyber-input w-full" placeholder="7.5" /></div>
              <div><label className="text-xs font-mono mb-1.5 flex items-center gap-1.5" style={{color:'var(--text-muted)'}}><Dumbbell size={11}/> GYM TODAY?</label><div className="flex gap-2"><button type="button" onClick={()=>setForm(f=>({...f,gym:true}))} className="flex-1 py-2 rounded text-xs font-mono font-semibold border" style={form.gym?{background:'rgba(0,255,136,0.15)',borderColor:'#00ff88',color:'#00ff88'}:{background:'rgba(255,255,255,0.03)',borderColor:'var(--border-panel)',color:'var(--text-muted)'}}>✓ YES</button><button type="button" onClick={()=>setForm(f=>({...f,gym:false}))} className="flex-1 py-2 rounded text-xs font-mono font-semibold border" style={!form.gym?{background:'rgba(255,45,120,0.1)',borderColor:'#ff2d78',color:'#ff2d78'}:{background:'rgba(255,255,255,0.03)',borderColor:'var(--border-panel)',color:'var(--text-muted)'}}>✗ NO</button></div></div>
              <div><label className="text-xs font-mono mb-1.5 block" style={{color:'var(--text-muted)'}}>😴 SLEEP QUALITY</label><div className="flex gap-1.5">{[1,2,3,4,5].map(q=>(<button key={q} type="button" onClick={()=>setForm(f=>({...f,sleepQuality:q}))} className="flex-1 py-1.5 rounded text-sm border" style={form.sleepQuality===q?{background:'rgba(0,242,255,0.15)',borderColor:'#00f2ff'}:{background:'rgba(255,255,255,0.03)',borderColor:'var(--border-panel)'}}>{SLEEP_QUALITY_EMOJI[q]}</button>))}</div><p className="text-xs font-mono mt-1 text-center" style={{color:'var(--text-muted)'}}>{form.sleepQuality}/5 — {['','Poor','Fair','Good','Great','Perfect'][form.sleepQuality]}</p></div>
              <div><label className="text-xs font-mono mb-1.5 flex items-center justify-between" style={{color:'var(--text-muted)'}}><span>⚡ ENERGY LEVEL</span><span style={{color:'#ffb400'}}>{form.energy}/10</span></label><input type="range" min="1" max="10" value={form.energy} onChange={e=>setForm(f=>({...f,energy:parseInt(e.target.value)}))} className="w-full" /><div className="flex justify-between text-xs font-mono mt-0.5" style={{color:'var(--text-muted)',opacity:0.5}}><span>Dead</span><span>Wired</span></div></div>
              <div><label className="text-xs font-mono mb-1.5 flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>📝 NOTE <span className="opacity-40">optional</span></label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="cyber-input w-full" placeholder="How are you feeling?" /></div>
            </div>
            <button type="submit" disabled={saving} className="btn-cyber-primary w-full" style={{opacity:saving?0.6:1}}>{saving?'Saving...':todayLog?"Update Today's Log":'Log Today'}</button>
          </form>
        </div>

        {loading?(<div className="text-center py-12 text-xs font-mono" style={{color:'var(--text-muted)'}}>Loading data...</div>):(<>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="stat-card"><p className="metric-label">SLEEP THIS WEEK</p><p className="metric-value text-xl font-mono" style={{color:'#ff00e5'}}>{sleepAvgThis?sleepAvgThis+'h avg':'—'}</p>{sleepAvgLast&&<p className="text-xs font-mono mt-1" style={{color:'var(--text-muted)'}}>Last week: {sleepAvgLast}h <span style={{color:parseFloat(sleepAvgThis||'0')>=parseFloat(sleepAvgLast)?'#00ff88':'#ff2d78'}}>{parseFloat(sleepAvgThis||'0')>=parseFloat(sleepAvgLast)?'↑':'↓'}</span></p>}</div>
            <div className="stat-card"><p className="metric-label">GYM THIS WEEK</p><p className="metric-value text-xl font-mono" style={{color:'#00ff88'}}>{gymThisWeek}/7</p><div className="flex gap-0.5 mt-2">{Array.from({length:7},(_,i)=>{const d=new Date(thisWeekStart);d.setDate(d.getDate()+i);const ds=d.toISOString().split('T')[0];const hit=logs.find(l=>l.date===ds)?.gym;return <div key={i} className="flex-1 h-1.5 rounded-full" style={{background:hit?'#00ff88':'rgba(255,255,255,0.08)'}}/>})}</div></div>
            <div className="stat-card"><p className="metric-label">AVG ENERGY (30d)</p><p className="metric-value text-xl font-mono" style={{color:'#ffb400'}}>{energyAvg?energyAvg+'/10':'—'}</p>{energyAvg&&<p className="text-xs font-mono mt-1" style={{color:'var(--text-muted)'}}>{parseFloat(energyAvg)>=7?'🌟 High performer':parseFloat(energyAvg)>=5?'⚡ Decent':'😴 Low — rest up'}</p>}</div>
            <div className="stat-card"><p className="metric-label">BEST GYM STREAK</p><p className="metric-value text-xl font-mono" style={{color:'#00f2ff'}}>{longestStreak>0?longestStreak+' days':'—'}</p>{bestSleepWeek.avg>0&&<p className="text-xs font-mono mt-1" style={{color:'var(--text-muted)'}}>Best sleep wk: {bestSleepWeek.avg.toFixed(1)}h</p>}</div>
          </div>

          {weightData.length>1&&(<div className="chart-container mb-6"><h3 className="section-header mb-4">30-DAY WEIGHT TREND</h3><ResponsiveContainer width="100%" height={180}><LineChart data={weightData}><XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:11,fontFamily:'JetBrains Mono'}}/><YAxis domain={['auto','auto']} tick={{fill:'var(--text-muted)',fontSize:11,fontFamily:'JetBrains Mono'}}/><Tooltip contentStyle={{background:'var(--bg-panel)',border:'1px solid var(--border-panel)',borderRadius:8,fontFamily:'JetBrains Mono',fontSize:11}}/><Line type="monotone" dataKey="weight" stroke="#00f2ff" strokeWidth={2} dot={{fill:'#00f2ff',r:3}}/></LineChart></ResponsiveContainer></div>)}
          {energyData.length>2&&(<div className="chart-container mb-6"><h3 className="section-header mb-4">ENERGY TREND (30 DAYS)</h3><ResponsiveContainer width="100%" height={140}><LineChart data={energyData}><XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:11,fontFamily:'JetBrains Mono'}}/><YAxis domain={[0,10]} tick={{fill:'var(--text-muted)',fontSize:11,fontFamily:'JetBrains Mono'}}/><Tooltip contentStyle={{background:'var(--bg-panel)',border:'1px solid var(--border-panel)',borderRadius:8,fontFamily:'JetBrains Mono',fontSize:11}}/><Line type="monotone" dataKey="energy" stroke="#ffb400" strokeWidth={2} dot={{fill:'#ffb400',r:3}}/></LineChart></ResponsiveContainer></div>)}
          {energyAvg&&(<div className="premium-card p-4 mb-6"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#00f2ff,#0060ff)'}}><span style={{fontSize:'0.65rem',fontWeight:700,color:'#fff'}}>AI</span></div><div><p className="text-xs font-mono font-semibold mb-1" style={{color:'#00f2ff'}}>COACH SHAI — ENERGY x TRADING</p><p className="text-xs" style={{color:'var(--text-secondary)',lineHeight:1.6}}>{parseFloat(energyAvg)>=7?'Your 30-day energy average is '+energyAvg+'/10 — elite territory. High-energy days correlate strongly with disciplined trade execution.':parseFloat(energyAvg)>=5?'Your 30-day energy average is '+energyAvg+'/10 — middle of the pack. Watch for your lowest-energy days: those are when emotional trading decisions sneak in.':'Your 30-day energy average is '+energyAvg+'/10 — below optimal. Low energy and poor trading decisions are deeply linked. Prioritize 7+ hours sleep.'}</p></div></div></div>)}

          {(longestStreak>0||bestSleepWeek.avg>0)&&(<div className="premium-card p-4 mb-6"><div className="flex items-center gap-2 mb-3"><Trophy size={14} style={{color:'#ffb400'}}/><h3 className="section-header">PERSONAL BESTS</h3></div><div className="flex gap-6">{longestStreak>0&&<div><p className="text-xs font-mono" style={{color:'var(--text-muted)'}}>LONGEST GYM STREAK</p><p className="text-lg font-mono font-bold" style={{color:'#00ff88'}}>{longestStreak} days 🔥</p></div>}{bestSleepWeek.avg>0&&<div><p className="text-xs font-mono" style={{color:'var(--text-muted)'}}>BEST SLEEP WEEK</p><p className="text-lg font-mono font-bold" style={{color:'#ff00e5'}}>{bestSleepWeek.avg.toFixed(1)}h avg 🌙</p><p className="text-xs font-mono" style={{color:'var(--text-muted)'}}>w/o {bestSleepWeek.week}</p></div>}</div></div>)}

          {logs.length===0&&!loading&&(<div><EmptyState icon={Heart} heading="NO HEALTH DATA YET" subtext="Start logging your sleep, nutrition and energy to see correlations." /></div>)}{logs.length>0&&(<div className="premium-card overflow-hidden"><div className="p-4 border-b" style={{borderColor:'var(--border-panel)'}}><h3 className="section-header">HEALTH LOG · {logs.length} ENTRIES</h3></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b" style={{borderColor:'var(--border-panel)'}}>{['DATE','WEIGHT','SLEEP','QUALITY','GYM','ENERGY','NOTES'].map(h=>(<th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{color:'var(--text-muted)'}}>{h}</th>))}</tr></thead><tbody>{[...logs].reverse().map(log=>(<tr key={log.id} className="border-b hover:bg-white/[0.02]" style={{borderColor:'var(--border-subtle)'}}><td className="px-4 py-3 font-mono" style={{color:'var(--text-secondary)'}}>{log.date}</td><td className="px-4 py-3 font-mono" style={{color:'#00f2ff'}}>{log.weight||'—'}</td><td className="px-4 py-3 font-mono" style={{color:'#ff00e5'}}>{log.sleep?log.sleep+'h':'—'}</td><td className="px-4 py-3">{log.sleepQuality?SLEEP_QUALITY_EMOJI[log.sleepQuality]:'—'}</td><td className="px-4 py-3">{log.gym?<span style={{color:'#00ff88'}}>✓</span>:<span style={{color:'var(--text-muted)'}}>✗</span>}</td><td className="px-4 py-3 font-mono" style={{color:'#ffb400'}}>{log.energy||'—'}/10</td><td className="px-4 py-3 max-w-[150px] truncate" style={{color:'var(--text-muted)'}}>{log.notes||'—'}</td></tr>))}</tbody></table></div></div>)}
        </>)}

        {/* COACH SHAI CORRELATIONS */}
        <CorrelationEngine logs={logs} />

      </div>
      <LifeHubChat section="health" apiRoute="/api/life/health/chat" contextData={{logs}} systemPrompt="You are Coach Shai, a health AI. Analyze weight, sleep, gym, and energy trends. Be direct and motivating." defaultOpen={chatOpen} />
    </div>
  )
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div className="cyber-bg-grid min-h-screen flex items-center justify-center"><div className="text-xs font-mono" style={{color:'var(--text-muted)'}}>Loading...</div></div>}>
      <HealthInner />
    </Suspense>
  )
}
