'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Heart, Plus, Trash2 } from 'lucide-react'
import LifeHubChat from '@/components/LifeHubChat'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type HealthLog = {
  id: string
  date: string
  weight?: number
  sleep?: number
  gym: boolean
  mood?: number
  energy?: number
  notes?: string
}

type Settings = {
  goalWeight?: number
  currentUnit?: 'lbs' | 'kg'
}

export default function HealthPage() {
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [chatOpen] = useState(searchParams.get('chat') === '1')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '', sleep: '', gym: false, mood: 7, energy: 7, notes: '',
  })

  useEffect(() => {
    fetch('/api/life/health').then(r => r.json()).then(d => {
      setLogs(d.logs || [])
      setSettings(d.settings || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    const log: Partial<HealthLog> = {
      date: form.date,
      gym: form.gym,
      mood: form.mood,
      energy: form.energy,
      notes: form.notes,
    }
    if (form.weight) log.weight = parseFloat(form.weight)
    if (form.sleep) log.sleep = parseFloat(form.sleep)

    const res = await fetch('/api/life/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log }),
    })
    const data = await res.json()
    setLogs(data.logs || [])
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], weight: '', sleep: '', gym: false, mood: 7, energy: 7, notes: '' })
  }

  async function deleteLog(id: string) {
    const res = await fetch('/api/life/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    const data = await res.json()
    setLogs(data.logs || [])
  }

  // Stats
  const weightLogs = logs.filter(l => l.weight).sort((a, b) => a.date.localeCompare(b.date))
  const latestWeight = weightLogs[weightLogs.length - 1]?.weight
  const sleepLogs = logs.filter(l => l.sleep)
  const avgSleep = sleepLogs.length > 0 ? (sleepLogs.reduce((s, l) => s + (l.sleep || 0), 0) / sleepLogs.length).toFixed(1) : '—'
  
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
  const gymThisWeek = logs.filter(l => l.gym && new Date(l.date) >= weekStart).length
  
  const moodLogs = logs.filter(l => l.mood)
  const avgMood = moodLogs.length > 0 ? (moodLogs.reduce((s, l) => s + (l.mood || 0), 0) / moodLogs.length).toFixed(1) : '—'

  const weightChartData = weightLogs.slice(-30).map(l => ({
    date: l.date.slice(5),
    weight: l.weight,
  }))

  const goalWeight = settings.goalWeight
  const weightProgress = goalWeight && latestWeight
    ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(latestWeight - goalWeight) / goalWeight) * 100)))
    : null

  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="max-w-[1100px] mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/life" className="text-xs font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>← LIFE HUB</Link>
            <span className="section-label">HEALTH</span>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Health Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Goal weight (lbs)"
              defaultValue={settings.goalWeight || ''}
              onBlur={async e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v)) {
                  const newSettings = { ...settings, goalWeight: v }
                  setSettings(newSettings)
                  await fetch('/api/life/health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'settings', settings: newSettings }),
                  })
                }
              }}
              className="cyber-input w-40 text-xs"
              style={{ fontFamily: 'JetBrains Mono' }}
            />
            <button onClick={() => setShowForm(!showForm)} className="btn-cyber-primary flex items-center gap-2">
              <Plus size={14} /> Log Entry
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'CURRENT WEIGHT', value: latestWeight ? `${latestWeight} lbs` : '—', color: '#00f2ff' },
            { label: 'AVG SLEEP', value: avgSleep !== '—' ? `${avgSleep}h` : '—', color: '#ff00e5' },
            { label: 'GYM THIS WEEK', value: gymThisWeek, color: '#00ff88' },
            { label: 'AVG MOOD', value: avgMood !== '—' ? `${avgMood}/10` : '—', color: '#ffb400' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="metric-label">{s.label}</p>
              <p className="metric-value text-xl" style={{ color: s.color, fontFamily: 'JetBrains Mono' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Weight Goal Progress */}
        {goalWeight && latestWeight && (
          <div className="cyber-panel p-4 mb-6">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span style={{ color: 'var(--text-muted)' }}>WEIGHT GOAL: {goalWeight} lbs</span>
              <span style={{ color: '#00f2ff' }}>Current: {latestWeight} lbs · {Math.abs(latestWeight - goalWeight).toFixed(1)} lbs to go</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${weightProgress}%`, background: 'linear-gradient(90deg, #00f2ff, #00ff88)' }} />
            </div>
          </div>
        )}

        {/* Weight Chart */}
        {weightChartData.length > 1 && (
          <div className="chart-container mb-6">
            <h3 className="section-label mb-4">WEIGHT TREND</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightChartData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Line type="monotone" dataKey="weight" stroke="#00f2ff" strokeWidth={2} dot={{ fill: '#00f2ff', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Add Log Form */}
        {showForm && (
          <div className="cyber-panel p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>// NEW HEALTH ENTRY</h3>
            <form onSubmit={submitLog} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="cyber-input w-full" required />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>WEIGHT (lbs)</label>
                <input type="number" step="0.1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="cyber-input w-full" placeholder="175.0" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>SLEEP (hrs)</label>
                <input type="number" step="0.5" value={form.sleep} onChange={e => setForm(f => ({ ...f, sleep: e.target.value }))} className="cyber-input w-full" placeholder="7.5" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>GYM SESSION</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, gym: !f.gym }))}
                  className={`w-full py-2 rounded text-xs font-mono font-semibold transition-all ${form.gym ? 'bg-green-400/20 border-green-400 text-green-400' : 'bg-white/5 border-gray-600 text-gray-400'} border`}>
                  {form.gym ? '✓ YES' : '✗ NO'}
                </button>
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>MOOD (1-10): {form.mood}</label>
                <input type="range" min="1" max="10" value={form.mood} onChange={e => setForm(f => ({ ...f, mood: parseInt(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>ENERGY (1-10): {form.energy}</label>
                <input type="range" min="1" max="10" value={form.energy} onChange={e => setForm(f => ({ ...f, energy: parseInt(e.target.value) }))} className="w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="cyber-input w-full" placeholder="How are you feeling?" />
              </div>
              <div className="md:col-span-4 flex gap-3">
                <button type="submit" className="btn-cyber-primary">Save Entry</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cyber-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Log Table */}
        <div className="cyber-panel overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-panel)' }}>
            <h3 className="section-label">HEALTH LOG · {logs.length} ENTRIES</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>No entries yet.</p>
              <button onClick={() => setShowForm(true)} className="btn-cyber-primary">Log Your First Entry</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                    {['DATE', 'WEIGHT', 'SLEEP', 'GYM', 'MOOD', 'ENERGY', 'NOTES', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...logs].reverse().map(log => (
                    <tr key={log.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{log.date}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#00f2ff' }}>{log.weight ? `${log.weight} lbs` : '—'}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#ff00e5' }}>{log.sleep ? `${log.sleep}h` : '—'}</td>
                      <td className="px-4 py-3">{log.gym ? <span style={{ color: '#00ff88' }}>✓</span> : <span style={{ color: 'var(--text-muted)' }}>✗</span>}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#ffb400' }}>{log.mood || '—'}/10</td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#00f2ff' }}>{log.energy || '—'}/10</td>
                      <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{log.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteLog(log.id)} className="opacity-30 hover:opacity-70">
                          <Trash2 size={12} style={{ color: '#ff00e5' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LifeHubChat
        section="health"
        apiRoute="/api/life/health/chat"
        contextData={{ logs, settings }}
        systemPrompt="You are a health AI. Analyze weight trends, sleep, gym, mood, and energy."
        defaultOpen={chatOpen}
      />
    </div>
  )
}
