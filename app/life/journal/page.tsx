// DAILY JOURNAL
import { NotebookPen, Sun, Sunset, Lightbulb, ThumbsUp, AlertCircle } from 'lucide-react'

export default function JournalPage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}DAILY JOURNAL</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Daily Journal
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Morning intentions, evening reflections, mindset notes — private and unfiltered
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(0,242,255,0.2)', background: 'linear-gradient(135deg, rgba(0,242,255,0.03), rgba(255,0,229,0.03))' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0,242,255,0.2), rgba(255,0,229,0.1))', border: '1px solid rgba(0,242,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <NotebookPen size={24} style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Daily Journal</h2>
                <span className="badge-pill badge-cyan">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                A private space to write every day. Morning pages, evening wind-down, mindset check-ins. Not for content — for you. The people who win long-term are the ones who know what&apos;s actually going on inside.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Sun, label: 'Morning Entry', desc: 'Intentions, mood, focus word' },
                  { icon: Sunset, label: 'Evening Entry', desc: 'Reflection, what went well' },
                  { icon: Lightbulb, label: 'Insights', desc: 'Tag breakthrough moments' },
                  { icon: ThumbsUp, label: 'Gratitude Log', desc: '3 things daily' },
                  { icon: AlertCircle, label: 'Mental Flags', desc: 'Spot patterns in low days' },
                  { icon: NotebookPen, label: 'Free Write', desc: 'Unstructured stream of thought' },
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

        {/* Recent entries placeholder */}
        <div className="cyber-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}RECENT ENTRIES</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <div className="space-y-3">
            {['Today', 'Yesterday', '2 days ago'].map((day) => (
              <div key={day} className="cyber-panel p-4 flex items-center gap-4" style={{ opacity: 0.4 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,242,255,0.08)', border: '1px solid var(--border-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <NotebookPen size={14} style={{ color: 'var(--neon-cyan)' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{day}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No entry yet</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
