'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Lock, AlertCircle } from 'lucide-react'

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
      const data = await res.json()
      if (data.success) {
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <div>
            <p className="font-bold text-white text-lg tracking-tight">Shaitrades</p>
            <p className="text-xs text-gray-500 -mt-0.5">Content Hub</p>
          </div>
        </div>

        {/* Login box */}
        <div className="border border-gray-800 bg-black p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">// ADMIN ACCESS</span>
          </div>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Username"
            autoFocus
            className="w-full bg-black border border-gray-800 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors mb-3"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full bg-black border border-gray-800 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors mb-4"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!username || !password || loading}
            className="w-full py-3 bg-white hover:bg-gray-100 disabled:opacity-40 text-black font-bold text-sm transition-colors"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-6">Authorized personnel only</p>
      </div>
    </div>
  )
}
