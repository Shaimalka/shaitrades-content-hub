// HABITS
import { Activity, Sun, Moon, Flame, RotateCcw, CheckSquare } from 'lucide-react'

export default function HabitsPage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}HABITS</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Habits
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Daily habit stack — morning routines, consistency streaks, and discipline metrics
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(0,255,136,0.2)' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,255,136,0.05))', border: '1px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={24} style={{ color: 'var(--neon-green)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Habit Tracker</h2>
                <span className="badge-pill badge-green">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Build and track your daily habit stack. Morning routine, workout, market prep, content creation — see your streak counts, heatmaps, and weekly completion rate at a glance.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Sun, label: 'Morning Stack', desc: 'Wake-up, gym, market prep' },
                  { icon: Moon, label: 'Evening Stack', desc: 'Journal, review, wind-down' },
                  { icon: Flame, label: 'Streaks', desc: 'Consecutive day counters' },
                  { icon: RotateCcw, label: 'Habit Heatmap', desc: 'GitHub-style completion grid' },
                  { icon: CheckSquare, label: 'Daily Checklist', desc: 'One-tap habit check-off' },
                  { icon: Activity, label: 'Consistency Score', desc: 'Rolling 30-day average' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="cyber-panel p-4" style={{ background: 'rgba(0,255,136,0.03)' }}>
                    <Icon size={16} style={{ color: 'var(--neon-green)', marginBottom: '0.5rem' }} />
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder streak cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Gym Streak', value: '—', sub: 'days', color: 'var(--neon-green)' },
            { label: 'Morning Routine', value: '—', sub: 'days', color: 'var(--neon-cyan)' },
            { label: 'Market Prep', value: '—', sub: 'days', color: 'var(--neon-amber)' },
            { label: 'Content Posted', value: '—', sub: 'days', color: 'var(--neon-magenta)' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="cyber-panel p-5 text-center">
              <Flame size={18} style={{ color, margin: '0 auto 0.5rem' }} />
              <p className="text-2xl font-bold mb-0.5" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
