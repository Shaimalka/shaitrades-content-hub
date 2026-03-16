import { Calendar } from 'lucide-react'

export default function SchedulerPage() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-800" />
        <h2 className="text-lg font-bold text-white mb-2">Post Scheduler</h2>
        <p className="text-sm text-gray-500 mb-1">Draft, approve, and post directly to @shaitrades.</p>
        <p className="text-xs text-gray-700 font-mono mt-4">// COMING SOON</p>
      </div>
    </div>
  )
}
