// HEALTH
import { Heart, Dumbbell, Moon, Droplets, Apple, Scale } from 'lucide-react'

export default function HealthPage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}HEALTH</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Health
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Body, sleep, training, and nutrition — the physical edge that keeps the mental edge sharp
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(255,0,229,0.2)' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(255,0,229,0.2), rgba(0,242,255,0.05))', border: '1px solid rgba(255,0,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Heart size={24} style={{ color: 'var(--neon-magenta)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Health Dashboard</h2>
                <span className="badge-pill badge-magenta">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Log workouts, track sleep quality, monitor water intake, and keep tabs on body metrics. Trading performance and physical health are directly correlated — this is where you own both.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Dumbbell, label: 'Workout Log', desc: 'Training sessions, PRs, volume' },
                  { icon: Moon, label: 'Sleep Tracker', desc: 'Hours, quality, consistency' },
                  { icon: Droplets, label: 'Hydration', desc: 'Daily water intake log' },
                  { icon: Apple, label: 'Nutrition', desc: 'Calories, macros, meal notes' },
                  { icon: Scale, label: 'Body Metrics', desc: 'Weight, body comp trends' },
                  { icon: Heart, label: 'Recovery Score', desc: 'HRV-style readiness metric' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="cyber-panel p-4" style={{ background: 'rgba(255,0,229,0.03)' }}>
                    <Icon size={16} style={{ color: 'var(--neon-magenta)', marginBottom: '0.5rem' }} />
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Workouts This Week', value: '—', color: 'var(--neon-cyan)' },
            { label: 'Avg Sleep (hrs)', value: '—', color: 'var(--neon-magenta)' },
            { label: 'Hydration (L/day)', value: '—', color: 'var(--neon-green)' },
            { label: 'Recovery Score', value: '—', color: 'var(--neon-amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="cyber-panel p-5 text-center">
              <p className="text-2xl font-bold mb-1" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
