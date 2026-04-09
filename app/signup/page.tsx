'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
        setError('')

        if (!name || !email || !password || !confirmPassword) {
                setError('ALL FIELDS REQUIRED')
                return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
                setError('INVALID EMAIL FORMAT')
                return
        }

        if (password.length < 8) {
                setError('PASSWORD MIN 8 CHARACTERS')
                return
        }

        if (password !== confirmPassword) {
                setError('PASSWORDS DO NOT MATCH')
                return
        }

        setLoading(true)
        try {
                const res = await fetch('/api/auth/signup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name, email, password }),
                })

          const data = await res.json()

          if (res.ok) {
                        const loginResult = await signIn('credentials', {
              email,
              username: email,
              password,
              redirect: false,
            })
            if (loginResult?.ok) {
              router.push('/dashboard')
            } else {
              router.push('/login?message=Account+created!+Please+sign+in.')
            }
          } else {
                        setError((data.error || 'SIGNUP FAILED').toUpperCase())
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
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
                                style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.55))' }}>
                                <circle cx="28" cy="28" r="26" stroke="#00f2ff" strokeWidth="2" fill="none" />
                                <path d="M31 14L21 30h9l-5 12 14-18h-9l4-10z" fill="#00f2ff" />
                            </svg>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '0.6rem' }}>
                            <span style={{
                                fontFamily: 'Georgia, serif',
                                fontWeight: 700,
                                fontSize: '2rem',
                                color: '#00f2ff',
                                letterSpacing: '0.06em',
                                textShadow: '0 0 18px rgba(0,242,255,0.55)',
                            }}>TRABITS</span>
                        </div>
                        <div style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.62rem',
                            fontVariant: 'small-caps',
                            letterSpacing: '0.22em',
                            color: '#00f2ff',
                            opacity: 0.65,
                            textTransform: 'uppercase',
                        }}>
                            CREATE ACCOUNT
                        </div>
                    </div>

                    {/* Form */}
                    <div style={{
                        border: '1px solid #1a1a2e',
                        background: '#0d0d12',
                        padding: '2rem',
                        boxShadow: '0 0 40px rgba(0,242,255,0.05)',
                    }}>
                        {[
                          { label: 'full name', value: name, setter: setName, type: 'text', placeholder: 'full name' },
                          { label: 'email', value: email, setter: setEmail, type: 'email', placeholder: 'email' },
                          { label: 'password', value: password, setter: setPassword, type: 'password', placeholder: 'password (min 8 chars)' },
                          { label: 'confirm password', value: confirmPassword, setter: setConfirmPassword, type: 'password', placeholder: 'confirm password' },
                              ].map(({ value, setter, type, placeholder }, i) => (
                                <input
                                    key={i}
                                    type={type}
                                    value={value}
                                    onChange={e => setter(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                                    placeholder={placeholder}
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
                        ))}

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
                            onClick={handleSignup}
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
                            {loading ? '// CREATING...' : 'CREATE ACCOUNT'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <Link href="/login" style={{
                            color: '#00f2ff',
                            fontSize: '0.72rem',
                            letterSpacing: '0.1em',
                            textDecoration: 'none',
                            opacity: 0.7,
                        }}>
                            Already have an account? Sign in →
                        </Link>
                    </div>
                </div>
        </div>
  )
}
