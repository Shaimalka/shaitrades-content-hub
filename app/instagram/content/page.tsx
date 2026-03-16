import { Sparkles } from 'lucide-react'

export default function ContentGenPage() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-800" />
        <h2 className="text-lg font-bold text-white mb-2">Content Generator</h2>
        <p className="text-sm text-gray-500 mb-1">AI-powered scripts, captions, and 30-day calendar.</p>
        <p className="text-xs text-gray-700 font-mono mt-4">// COMING SOON</p>
      </div>
    </div>
  )
}
