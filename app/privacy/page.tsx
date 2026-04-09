export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: '#0a0f1a', color: '#e2e8f0', minHeight: '100vh', padding: '6rem 2rem 4rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>Privacy Policy</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Last updated: April 2026</p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          At TRABITS, your privacy is important to us. Your data is encrypted and never shared with third parties.
          You own your data — always.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          We collect only the information necessary to provide our services, including trade logs, habit tracking data,
          and account information. This data is used solely to power your personal dashboard and AI analysis.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
          For questions about your privacy, contact us at{' '}
          <a href="mailto:shai@trabits.co" style={{ color: '#00f2ff' }}>shai@trabits.co</a>.
        </p>
      </div>
    </div>
  )
}
