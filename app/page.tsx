'use client'

import { TrendingUp } from 'lucide-react'
import Link from 'next/link'

const platforms = [
  {
    name: 'Instagram',
    icon: '📸',
    connected: true,
    href: '/instagram',
    description: 'Full analytics dashboard, post analysis, weekly reports',
    stats: '@shaitrades connected',
  },
  {
    name: 'TikTok',
    icon: '🎵',
    connected: true,
    href: '/tiktok/analytics',
    description: 'Analytics dashboard — views, growth, best posting times',
    stats: 'Analytics dashboard live',
  },
  {
    name: 'YouTube',
    icon: '▶️',
    connected: true,
    href: '/youtube',
    description: 'Analytics dashboard live',
    stats: 'Analytics dashboard live',
  },
]

const lifeSections = [
  { name: 'Trading Journal', emoji: '📈' },
  { name: 'Goals', emoji: '🎯' },
  { name: 'Habits', emoji: '✅' },
  { name: 'Health', emoji: '💪' },
  { name: 'Daily Journal', emoji: '📓' },
  { name: 'Finance', emoji: '💰' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Shaitrades</p>
            <p className="text-xs text-gray-500">Content Hub</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-12">

          {/* // SELECT PLATFORM */}
          <div>
            <div className="mb-8">
              <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">{'// '}SELECT PLATFORM</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map((p) => {
                const Tag = p.connected ? Link : 'div'
                return (
                  <Tag
                    key={p.name}
                    href={p.href}
                    className={`border p-6 transition-colors ${
                      p.connected
                        ? 'border-gray-800 hover:border-cyan-500/50 cursor-pointer'
                        : 'border-gray-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{p.icon}</span>
                      {p.connected ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600">OFFLINE</span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{p.description}</p>
                    <p className="text-xs text-gray-600 font-mono">{p.stats}</p>
                  </Tag>
                )
              })}
            </div>
          </div>

          {/* // LIFE HUB */}
          <div>
            <div className="mb-8">
              <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">{'// '}LIFE HUB</span>
            </div>
            <Link href="/life" className="block group">
              <div className="relative p-[1px] rounded-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #00f2ff, #ff00e5)' }}>
                <div className="bg-[#0a0a0b] p-8 rounded-sm transition-colors group-hover:bg-[#0d0d10]">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="font-mono text-xs tracking-widest text-gray-500 uppercase mb-2">Personal Command Center</p>
                      <h2 className="text-3xl font-bold text-white tracking-tight">LIFE HUB</h2>
                      <p className="text-sm text-gray-400 mt-2">Your personal command center</p>
                    </div>
                    <div className="text-3xl">🧠</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lifeSections.map((s) => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-semibold tracking-wide border rounded-sm"
                        style={{
                          borderColor: 'rgba(0,242,255,0.3)',
                          background: 'rgba(0,242,255,0.06)',
                          color: '#00f2ff',
                        }}
                      >
                        <span>{s.emoji}</span>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
