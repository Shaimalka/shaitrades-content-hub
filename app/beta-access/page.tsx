'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BetaAccessPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!pin) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/beta-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()

      if (data.success) {
        router.push('/')
        router.refresh()
      } else {
        setError('Incorrect PIN. Contact @shaitrading for access.')
        setPin('')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0f1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.55))' }}
            >
              <circle cx="28" cy="28" r="26" stroke="#00f2ff" strokeWidth="2" fill="none" />
              <path d="M31 14L21 30h9l-5 12 14-18h-9l4-10z" fill="#00f2ff" />
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              marginBottom: '0.6rem',
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontWeight: 700,
                fontSize: '2rem',
                color: '#00f2ff',
                letterSpacing: '0.06em',
                textShadow: '0 0 18px rgba(0,242,255,0.55)',
              }}
            >
              TRABITS
            </span>
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              color: '#00f2ff',
              opacity: 0.65,
              textTransform: 'uppercase',
            }}
          >
            TRADE · HABITS · EVOLVE
          </div>
        </div>

        <div
          style={{
            border: '1px solid #1a1a2e',
            background: '#0d1117',
            padding: '2rem',
            boxShadow: '0 0 40px rgba(0,242,255,0.05)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                color: '#e0e0ff',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: '0.5rem',
              }}
            >
              TRABITS is in private beta.
            </div>
            <div
              style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                letterSpacing: '0.06em',
              }}
            >
              Enter your access PIN to continue.
            </div>
          </div>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="· · · · · ·"
            style={{
              width: '100%',
              background: '#0a0f1a',
              border: '1px solid #1e1e2e',
              color: '#00f2ff',
              fontSize: '1.5rem',
              fontWeight: 700,
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              boxSizing: 'border-box',
              textAlign: 'center',
              letterSpacing: '0.4em',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#00f2ff'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(0,242,255,0.2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#1e1e2e'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          {error && (
            <div
              style={{
                color: '#ff2d78',
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                marginBottom: '1rem',
                fontFamily: 'JetBrains Mono, monospace',
                textAlign: 'center',
              }}
            >
              !! {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !pin}
            style={{
              width: '100%',
              background: loading || !pin ? 'transparent' : 'rgba(0,242,255,0.1)',
              border: '1px solid #00f2ff',
              color: '#00f2ff',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.85rem',
              letterSpacing: '0.2em',
              cursor: loading || !pin ? 'not-allowed' : 'pointer',
              opacity: loading || !pin ? 0.5 : 1,
              fontFamily: 'JetBrains Mono, monospace',
              boxShadow: loading || !pin ? 'none' : '0 0 12px rgba(0,242,255,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading && pin) {
                e.currentTarget.style.background = 'rgba(0,242,255,0.15)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,242,255,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                loading || !pin ? 'transparent' : 'rgba(0,242,255,0.1)'
              e.currentTarget.style.boxShadow =
                loading || !pin ? 'none' : '0 0 12px rgba(0,242,255,0.25)'
            }}
          >
            {loading ? '// VERIFYING...' : 'ENTER'}
          </button>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            color: '#2a2a3a',
            fontSize: '0.62rem',
            letterSpacing: '0.1em',
          }}
        >
          PRIVATE BETA ACCESS ONLY
        </div>
      </div>
    </div>
  )
}
