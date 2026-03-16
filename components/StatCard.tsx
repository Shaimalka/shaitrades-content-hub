import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  positive?: boolean
  icon: LucideIcon
  color?: string
}

export default function StatCard({ label, value, change, positive, icon: Icon, color = 'cyan' }: StatCardProps) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={clsx('p-2 rounded-lg', colorMap[color])}>
          <Icon className={clsx('w-4 h-4', colorMap[color].split(' ')[0])} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && (
        <p className={clsx('text-xs mt-1', positive ? 'text-green-400' : 'text-red-400')}>
          {positive ? '↑' : '↓'} {change}
        </p>
      )}
    </div>
  )
}
