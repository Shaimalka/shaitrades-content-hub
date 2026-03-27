// GOALS
import { Target, CheckCircle, Circle, TrendingUp, Calendar, Zap } from 'lucide-react'

export default function GoalsPage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}GOALS</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Goals
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Annual, monthly, and weekly objectives — tracked, weighted, and ruthlessly honest
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(255,0,229,0.2)' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(255,0,229,0.2), rgba(255,0,229,0.05))', border: '1px solid rgba(255,0,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={24} style={{ color: 'var(--neon-magenta)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Goals Tracker</h2>
                <span className="badge-pill badge-magenta">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Set your 90-day, monthly, and weekly goals across trading, content, health, and finance. Track completion rates, see what you&apos;re consistently hitting and what&apos;s slipping, and stay locked in on what matters.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Target, label: '90-Day Goals', desc: 'Big-picture quarterly targets' },
                  { icon: Calendar, label: 'Monthly Goals', desc: 'Month-by-month breakdown' },
                  { icon: CheckCircle, label: 'Weekly Wins', desc: 'Small commitments, daily' },
                  { icon: TrendingUp, label: 'Progress Tracking', desc: 'Visual completion rates' },
                  { icon: Circle, label: 'Goal Categories', desc: 'Trading / Health / Finance / Life' },
                  { icon: Zap, label: 'Streak System', desc: 'Accountability streaks' },
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

        {/* Placeholder goal rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { period: 'Q2 2026', count: '—', label: 'Active Goals', color: 'var(--neon-magenta)' },
            { period: 'This Month', count: '—', label: 'Completed', color: 'var(--neon-green)' },
            { period: 'This Week', count: '—', label: 'On Track', color: 'var(--neon-cyan)' },
          ].map(({ period, count, label, color }) => (
            <div key={period} className="cyber-panel p-5 text-center">
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{period}</p>
              <p className="text-3xl font-bold mb-1" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
