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
    connected: false,
    href: '#',
    description: 'Short-form video analytics and trending sounds',
    stats: 'Coming soon',
  },
  {
    name: 'YouTube',
    icon: '▶️',
    connected: false,
    href: '#',
    description: 'Long-form content performance and subscriber growth',
    stats: 'Coming soon',
  },
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

      {/* Platform picker */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl">
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
      </div>
    </div>
  )
}
