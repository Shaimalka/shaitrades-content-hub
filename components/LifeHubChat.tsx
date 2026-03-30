'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface LifeHubChatProps {
  section: string
  apiRoute: string
  contextData: object
  systemPrompt: string
  defaultOpen?: boolean
}

export default function LifeHubChat({
  section,
  apiRoute,
  contextData,
  systemPrompt,
  defaultOpen = false,
}: LifeHubChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          contextData,
          systemPrompt,
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sectionLabels: Record<string, string> = {
    trading: 'Trading AI',
    goals: 'Goals AI',
    habits: 'Habits AI',
    health: 'Health AI',
    journal: 'Journal AI',
    finance: 'Finance AI',
  }

  const label = sectionLabels[section] || 'Life Hub AI'

  return (
    <>
      {/* Mobile/bottom: toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-xs font-mono tracking-wide shadow-lg transition-all duration-200 hover:scale-105 lg:hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,136,0.25), rgba(0,242,255,0.15))',
            border: '1px solid rgba(0,255,136,0.5)',
            color: '#00ff88',
            boxShadow: '0 0 12px rgba(0,255,136,0.6)',
          }}
        >
          <MessageSquare size={15} />
          {label}
        </button>
      )}

      {/* Desktop: right side panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 flex flex-col transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: '360px',
          background: 'rgba(10,10,14,0.97)',
          borderLeft: isOpen
            ? '1px solid rgba(0,255,136,0.4)'
            : '1px solid rgba(0,242,255,0.15)',
          backdropFilter: 'blur(16px)',
          boxShadow: isOpen ? '0 0 20px rgba(0,255,136,0.3)' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(0,242,255,0.12)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: 'rgba(0,242,255,0.12)', border: '1px solid rgba(0,242,255,0.3)' }}
            >
              <MessageSquare size={12} style={{ color: '#00f2ff' }} />
            </div>
            <span className="text-xs font-mono font-semibold tracking-widest uppercase" style={{ color: '#00f2ff' }}>
              {label}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* System hint */}
        {messages.length === 0 && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-lg text-xs" style={{
            background: 'rgba(0,242,255,0.05)',
            border: '1px solid rgba(0,242,255,0.1)',
            color: 'var(--text-muted)',
          }}>
            <span style={{ color: '#00f2ff' }}>Coach Shai</span> has access to all your {section} data.
            Ask anything about your trends, patterns, or progress.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-primary)',
                      }
                    : {
                        background: 'rgba(0,242,255,0.06)',
                        border: '1px solid rgba(0,242,255,0.2)',
                        color: '#00f2ff',
                      }
                }
              >
                {msg.role === 'assistant' && (
                  <span className="block text-[9px] font-mono tracking-widest mb-1 opacity-60">COACH SHAI</span>
                )}
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'rgba(0,242,255,0.06)',
                  border: '1px solid rgba(0,242,255,0.2)',
                  color: '#00f2ff',
                }}
              >
                <Loader2 size={12} className="animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-3 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'rgba(0,242,255,0.12)' }}
        >
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(0,242,255,0.2)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Coach Shai about your data..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: 'var(--text-primary)', caretColor: '#00f2ff' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-7 h-7 flex items-center justify-center rounded transition-all duration-150 disabled:opacity-40"
              style={{
                background: 'rgba(0,242,255,0.15)',
                border: '1px solid rgba(0,242,255,0.3)',
                color: '#00f2ff',
              }}
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop toggle tab (side tab) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1.5 px-1.5 py-4 text-[10px] font-mono font-bold tracking-widest transition-all duration-200"
        style={{
          background: 'linear-gradient(180deg, rgba(0,255,136,0.18) 0%, rgba(10,10,14,0.97) 100%)',
          borderLeft: '2px solid rgba(0,255,136,0.7)',
          borderTop: '2px solid rgba(0,255,136,0.7)',
          borderBottom: '2px solid rgba(0,255,136,0.7)',
          borderRadius: '8px 0 0 8px',
          color: '#00ff88',
          right: isOpen ? '360px' : '0px',
          boxShadow: '0 0 12px rgba(0,255,136,0.6), inset 0 0 8px rgba(0,255,136,0.08)',
          textShadow: '0 0 8px rgba(0,255,136,0.8)',
        }}
      >
        {isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {label}
        </span>
      </button>
    </>
  )
}
