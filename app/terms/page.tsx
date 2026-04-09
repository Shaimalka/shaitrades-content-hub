export default function TermsPage() {
  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: '#0a0f1a', color: '#e2e8f0', minHeight: '100vh', padding: '6rem 2rem 4rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>Terms of Service</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Last updated: April 2026</p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          By using TRABITS, you agree to use the platform for lawful purposes only. TRABITS is a personal trading
          and habit tracking tool intended for individual use.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          We reserve the right to suspend or terminate accounts that violate these terms. You are responsible for
          maintaining the security of your account credentials.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
          For questions about these terms, contact us at{' '}
          <a href="mailto:shai@trabits.co" style={{ color: '#00f2ff' }}>shai@trabits.co</a>.
        </p>
      </div>
    </div>
  )
}
