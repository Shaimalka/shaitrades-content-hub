// FINANCE
import { Wallet, TrendingUp, CreditCard, PiggyBank, ArrowUpRight, BarChart2 } from 'lucide-react'

export default function FinancePage() {
  return (
    <div className="cyber-bg-grid min-h-screen">
      <div className="p-8 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{'// '}FINANCE</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-panel)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            Finance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Income tracking, expenses, savings rate, and net worth — full financial picture in one place
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="cyber-panel p-8 mb-6" style={{ borderColor: 'rgba(255,180,0,0.2)' }}>
          <div className="flex items-start gap-6">
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(255,180,0,0.2), rgba(255,180,0,0.05))', border: '1px solid rgba(255,180,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wallet size={24} style={{ color: 'var(--neon-amber)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Finance Dashboard</h2>
                <span className="badge-pill badge-amber">COMING SOON</span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Track every income stream — trading P&amp;L, content revenue, brand deals — alongside expenses, savings rate, and net worth progression. Know your numbers cold so you can make the right moves.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: TrendingUp, label: 'Income Streams', desc: 'Trading + content + other' },
                  { icon: CreditCard, label: 'Expense Tracker', desc: 'Fixed vs variable costs' },
                  { icon: PiggyBank, label: 'Savings Rate', desc: 'Monthly savings percentage' },
                  { icon: ArrowUpRight, label: 'Net Worth', desc: 'Running total over time' },
                  { icon: BarChart2, label: 'Monthly P&L', desc: 'Income vs expenses chart' },
                  { icon: Wallet, label: 'Budget Planner', desc: 'Category-based allocations' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="cyber-panel p-4" style={{ background: 'rgba(255,180,0,0.03)' }}>
                    <Icon size={16} style={{ color: 'var(--neon-amber)', marginBottom: '0.5rem' }} />
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder financial metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Monthly Income', value: '—', color: 'var(--neon-green)' },
            { label: 'Monthly Expenses', value: '—', color: 'var(--neon-magenta)' },
            { label: 'Savings Rate', value: '—%', color: 'var(--neon-cyan)' },
            { label: 'Net Worth', value: '—', color: 'var(--neon-amber)' },
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
