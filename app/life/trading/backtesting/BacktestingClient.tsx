'use client'

export default function BacktestingClient() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '1rem',
          padding: '3rem 2.5rem',
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Emoji */}
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🔬</div>

        {/* Badge */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: '9999px',
              padding: '0.25rem 0.875rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            COMING SOON
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#f1f5f9',
            marginBottom: '0.875rem',
            letterSpacing: '-0.02em',
          }}
        >
          Backtest Like a Pro.
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '0.95rem',
            color: '#94a3b8',
            lineHeight: 1.65,
            marginBottom: '1.75rem',
          }}
        >
          TradingView-powered chart replay is coming. Test your strategy on
          historical data before risking real capital.
        </p>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #1f2937', marginBottom: '1.75rem' }} />

        {/* Bullet points */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 1.75rem 0',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          {[
            'TradingView chart replay',
            'Session P&L tracking',
            'Strategy vs live comparison',
            'Coach Shai gap analysis',
          ].map((item) => (
            <li
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.9rem',
                color: '#cbd5e1',
              }}
            >
              <span style={{ fontSize: '1rem' }}>✅</span>
              {item}
            </li>
          ))}
        </ul>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #1f2937', marginBottom: '1.75rem' }} />

        {/* Value box */}
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.07)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '0.625rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#94a3b8',
            lineHeight: 1.6,
            textAlign: 'left',
          }}
        >
          <strong style={{ color: '#e2e8f0' }}>Tradezella charges $50/month</strong> for
          backtesting alone. TRABITS gives you a full trading OS — and
          backtesting is next.
        </div>

        {/* Muted footer */}
        <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>
          Powered by TradingView · Coming Q2 2026
        </p>
      </div>
    </div>
  )
}
