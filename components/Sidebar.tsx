'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Sparkles, Calendar, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/competitors', label: 'Competitors', icon: Users },
  { href: '/reports', label: 'Weekly Report', icon: FileText },
  { href: '/content', label: 'Content Gen', icon: Sparkles },
  { href: '/scheduler', label: 'Scheduler', icon: Calendar },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Shaitrades</p>
            <p className="text-xs text-gray-400">Content Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              pathname === href
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold">
            ST
          </div>
          <div>
            <p className="text-sm font-medium text-white">@shaitrades</p>
            <p className="text-xs text-gray-500">Creator Account</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
