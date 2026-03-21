'use client'
import { useState } from 'react'
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        sessionStorage.setItem('st_auth', 'authenticated')
        router.push('/')
        router.refresh()
      } else {
        setError('Invalid credentials')
        setPassword('')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-500 flex items-center justify-center text-black font-bold text-lg">S</div>
        <div>
          <p className="text-white font-bold">Shaitrades</p>
          <p className="text-gray-500 text-xs">Content Hub</p>
        </div>
      </div>
      <div className="w-full max-w-sm border border-[#1e1e1e] bg-[#0d0d0d] p-8">
        <p className="text-gray-500 text-xs font-mono mb-6">// ADMIN ACCESS</p>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full bg-black border border-[#2a2a2a] text-white text-sm px-4 py-3 mb-3 placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Password"
          className="w-full bg-black border border-[#2a2a2a] text-white text-sm px-4 py-3 mb-3 placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black text-sm font-bold py-3 hover:bg-gray-200 disabled:opacity-50 transition-all"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </div>
      <p className="text-gray-700 text-xs mt-6">Authorized personnel only</p>
    </div>
  )
}
