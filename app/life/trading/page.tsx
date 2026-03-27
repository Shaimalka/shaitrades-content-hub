// TRADING JOURNAL
import { BookOpen, TrendingUp, DollarSign, Target, Clock, BarChart2 } from 'lucide-react'

export default function TradingJournalPage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}TRADING JOURNAL</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Trading Journal
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            NQ / ES futures — real-time trade log, P&amp;L tracking, and replay analysis
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(0,242,255,0.2)' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0,242,255,0.2), rgba(0,242,255,0.05))', border: '1px solid rgba(0,242,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={24} style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Trading Journal</h2>
                <span className="badge-pill badge-cyan">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                A dedicated space to log every trade — entry, exit, size, setup type, and emotional state at the time. Built for NQ/ES futures traders who want to turn raw data into pattern recognition.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: TrendingUp, label: 'Trade Log', desc: 'Entry / exit / P&L per trade' },
                  { icon: DollarSign, label: 'P&L Dashboard', desc: 'Daily, weekly, monthly stats' },
                  { icon: Target, label: 'Setup Tagging', desc: 'Tag ICT concepts per trade' },
                  { icon: Clock, label: 'Session Review', desc: 'Pre / intra / post market notes' },
                  { icon: BarChart2, label: 'Win Rate Analytics', desc: 'By setup, by session, by day' },
                  { icon: BookOpen, label: 'Replay Notes', desc: 'Annotated chart screenshots' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="cyber-panel p-4" style={{ background: 'rgba(0,242,255,0.03)' }}>
                    <Icon size={16} style={{ color: 'var(--neon-cyan)', marginBottom: '0.5rem' }} />
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Trades', value: '—', color: 'var(--neon-cyan)' },
            { label: 'Win Rate', value: '—', color: 'var(--neon-green)' },
            { label: 'Avg R:R', value: '—', color: 'var(--neon-amber)' },
            { label: 'Net P&L', value: '—', color: 'var(--neon-magenta)' },
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
