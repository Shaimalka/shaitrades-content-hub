'use client'
import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

  useEffect(() => {
        const msg = searchParams.get('message')
        if (msg) setMessage(msg)
  }, [searchParams])

  const handleLogin = async () => {
        if (!username || !password) return
        setLoading(true)
        setError('')
        try {
                const res = await signIn('credentials', {
                          username,
                          password,
                          redirect: false,
                })
                if (res?.ok) {
                          router.push('/dashboard')
                          router.refresh()
                } else {
                          setError('ACCESS DENIED')
                          setPassword('')
                }
        } catch {
                setError('CONNECTION ERROR')
        } finally {
                setLoading(false)
        }
  }

  return (
        <div style={{
                minHeight: '100vh',
                background: '#0a0a0b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace',
        }}>
                <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.5rem' }}>
                    {/* Logo Block */}
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        {/* SVG: cyan circle outline + lightning bolt */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
                                style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.55))' }}
                            >
                                <circle cx="28" cy="28" r="26" stroke="#00f2ff" strokeWidth="2" fill="none" />
                                <path d="M31 14L21 30h9l-5 12 14-18h-9l4-10z" fill="#00f2ff" />
                            </svg>
                        </div>
                        {/* TRABITS in full cyan Georgia serif */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            marginBottom: '0.6rem',
                        }}>
                            <span style={{
                                fontFamily: 'Georgia, serif',
                                fontWeight: 700,
                                fontSize: '2rem',
                                color: '#00f2ff',
                                letterSpacing: '0.06em',
                                textShadow: '0 0 18px rgba(0,242,255,0.55)',
                            }}>TRABITS</span>
                        </div>
                        {/* Tagline */}
                        <div style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.62rem',
                            fontVariant: 'small-caps',
                            letterSpacing: '0.22em',
                            color: '#00f2ff',
                            opacity: 0.65,
                            textTransform: 'uppercase',
                        }}>
                            TRADE · HABITS · EVOLVE
                        </div>
                    </div>

                    {/* Success message from signup */}
                    {message && (
                        <div style={{
                            color: '#00f2ff',
                            fontSize: '0.72rem',
                            letterSpacing: '0.1em',
                            marginBottom: '1rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            textAlign: 'center',
                            opacity: 0.8,
                        }}>
                            ✓ {message}
                        </div>
                    )}

                    {/* Cyberpunk Form */}
                    <div style={{
                        border: '1px solid #1a1a2e',
                        background: '#0d0d12',
                        padding: '2rem',
                        boxShadow: '0 0 40px rgba(0,242,255,0.05)',
                    }}>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="username or email"
                            style={{
                                width: '100%',
                                background: '#0a0a0b',
                                border: '1px solid #1e1e2e',
                                color: '#e0e0ff',
                                fontSize: '0.85rem',
                                padding: '0.75rem 1rem',
                                marginBottom: '0.75rem',
                                outline: 'none',
                                fontFamily: 'JetBrains Mono, monospace',
                                boxSizing: 'border-box',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#00f2ff' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#1e1e2e' }}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            placeholder="password"
                            style={{
                                width: '100%',
                                background: '#0a0a0b',
                                border: '1px solid #1e1e2e',
                                color: '#e0e0ff',
                                fontSize: '0.85rem',
                                padding: '0.75rem 1rem',
                                marginBottom: '1rem',
                                outline: 'none',
                                fontFamily: 'JetBrains Mono, monospace',
                                boxSizing: 'border-box',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#00f2ff' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#1e1e2e' }}
                        />
                        {error && (
                            <div style={{
                                color: '#ff2d78',
                                fontSize: '0.72rem',
                                letterSpacing: '0.1em',
                                marginBottom: '1rem',
                                fontFamily: 'JetBrains Mono, monospace',
                            }}>
                                !! {error}
                            </div>
                        )}
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: '1px solid #00f2ff',
                                color: '#00f2ff',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                padding: '0.75rem',
                                letterSpacing: '0.2em',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                fontFamily: 'JetBrains Mono, monospace',
                                boxShadow: loading ? 'none' : '0 0 12px rgba(0,242,255,0.25)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'rgba(0,242,255,0.08)'
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,242,255,0.4)'
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.boxShadow = loading ? 'none' : '0 0 12px rgba(0,242,255,0.25)'
                            }}
                        >
                            {loading ? '// VERIFYING...' : 'ENTER'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ color: '#2a2a3a', fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                            AUTHORIZED PERSONNEL ONLY
                        </div>
                        <Link href="/signup" style={{
                            color: '#00f2ff',
                            fontSize: '0.72rem',
                            letterSpacing: '0.1em',
                            textDecoration: 'none',
                            opacity: 0.7,
                        }}>
                            Don&apos;t have an account? Sign up →
                        </Link>
                    </div>
                </div>
        </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
