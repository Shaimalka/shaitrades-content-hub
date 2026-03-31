'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

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
                          router.push('/')
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
                          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                      <div style={{
                      color: '#00f2ff',
                      fontSize: '2rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      marginBottom: '0.5rem',
                      textShadow: '0 0 20px rgba(0,242,255,0.5)',
        }}>
                                                    SHAI HUB
                                      </div>div>
                                      <div style={{
                      color: '#4a4a5a',
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      fontFamily: 'JetBrains Mono, monospace',
        }}>
                                                    // ACCESS TERMINAL
                                      </div>div>
                          </div>div>

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
                                                    placeholder="username"
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
                      </div>div>
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
                                      </button>button>
                          </div>div>
                
                        <div style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    color: '#2a2a3a',
                    fontSize: '0.62rem',
                    letterSpacing: '0.1em',
        }}>
                                  AUTHORIZED PERSONNEL ONLY
                        </div>div>
                </div>div>
        </div>div>
      )
}</button>
