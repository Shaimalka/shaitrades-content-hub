'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Users, Sparkles, Calendar, TrendingUp, ChevronLeft, BarChart2 } from 'lucide-react'
import clsx from 'clsx'
import AccountSwitcher from '@/components/AccountSwitcher'

const instagramNav = [
  { href: '/instagram', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instagram/competitors', label: 'Competitors', icon: Users },
  { href: '/instagram/reports', label: 'Weekly Report', icon: FileText },
  { href: '/instagram/content', label: 'Content Gen', icon: Sparkles },
  { href: '/instagram/scheduler', label: 'Scheduler', icon: Calendar },
]

const tiktokNav = [
  { href: '/tiktok/analytics', label: 'Analytics', icon: BarChart2 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-black border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Shaitrades</p>
            <p className="text-xs text-gray-500">Content Hub</p>
          </div>
        </Link>
      </div>

      {/* Account Switcher */}
      <AccountSwitcher />

      <div className="px-4 pt-4 pb-2">
        <Link href="/" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-3 h-3" />
          All Platforms
        </Link>
      </div>

      {/* Instagram Section */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">📸</span>
          <span className="text-xs font-bold text-white tracking-wide">INSTAGRAM</span>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        </div>
      </div>
      <nav className="px-4 pb-2 space-y-1">
        {instagramNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all',
              pathname === href
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-900'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* TikTok Section */}
      <div className="px-4 pt-3 pb-1 border-t border-gray-800/50 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🎵</span>
          <span className="text-xs font-bold text-white tracking-wide">TIKTOK</span>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        </div>
      </div>
      <nav className="px-4 pb-2 space-y-1">
        {tiktokNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all',
              pathname === href
                ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-900'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold">
            ST
          </div>
          <div>
            <p className="text-sm font-medium text-white">@shaitrades</p>
            <p className="text-xs text-gray-600">Creator Account</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
