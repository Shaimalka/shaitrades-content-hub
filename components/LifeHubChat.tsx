'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, MessageSquare, X, Send, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load chat history from Redis on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/life/chat-history?section=${section}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch (err) {
        console.error('[LifeHubChat] Failed to load history:', err)
      } finally {
        setHistoryLoaded(true)
      }
    }
    loadHistory()
  }, [section])

  // Save chat history to Redis whenever messages change (after initial load)
  useEffect(() => {
    if (!historyLoaded || messages.length === 0) return
    async function saveHistory() {
      try {
        await fetch('/api/life/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, messages }),
        })
      } catch (err) {
        console.error('[LifeHubChat] Failed to save history:', err)
      }
    }
    saveHistory()
  }, [messages, section, historyLoaded])

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
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
      }}
    >
      {/* Popup (anchored above the bubble) */}
      {isOpen && (
        <div
          className="flex flex-col"
          style={{
            width: 400,
            height: 560,
            maxHeight: 'calc(100vh - 120px)',
            background: 'var(--bg-card, #1a1f2e)',
            borderRadius: 'var(--radius-xl, 12px)',
            border: '1px solid var(--border, rgba(96,165,250,0.2))',
            boxShadow: 'var(--shadow-lg, 0 4px 24px rgba(0,0,0,0.2))',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{
              background: '#0f1117',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px 12px 0 0',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
              >
                <MessageSquare size={12} style={{ color: '#60a5fa' }} />
              </div>
              <span
                className="text-xs font-sans font-semibold tracking-widest uppercase"
                style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}
              >
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
            <div
              className="px-4 py-3 mx-3 mt-3 rounded-lg text-xs"
              style={{
                background: 'rgba(96,165,250,0.04)',
                border: '1px solid rgba(96,165,250,0.08)',
                color: 'var(--text-muted)',
              }}>
              <span style={{ color: '#60a5fa' }}>Coach Shai</span> has access to all your {section} data. Ask anything about your trends, patterns, or progress.
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div
                    className="max-w-[82%] px-4 py-2.5 text-xs leading-relaxed rounded-2xl"
                    style={{
                      background: '#1a1f2e',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  </div>
                ) : (
                  <div className="max-w-[90%]" style={{ backgroundColor: '#1a1f2e' }}>
                    <span
                      className="block text-[9px] font-sans tracking-widest mb-1 font-semibold"
                      style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontVariant: 'small-caps' }}
                    >
                      COACH SHAI
                    </span>
                    <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="pl-0">
                  <span
                    className="block text-[9px] font-sans tracking-widest mb-1 font-semibold"
                    style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontVariant: 'small-caps' }}
                  >
                    COACH SHAI
                  </span>
                  <Loader2 size={13} className="animate-spin" style={{ color: '#60a5fa' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
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
                style={{ color: '#f9fafb' }}
                onFocus={e => {
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.boxShadow = '0 0 0 1px rgba(96,165,250,0.35), 0 0 8px rgba(96,165,250,0.15)'
                    parent.style.borderColor = 'rgba(96,165,250,0.4)'
                  }
                }}
                onBlur={e => {
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.boxShadow = ''
                    parent.style.borderColor = 'rgba(255,255,255,0.08)'
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40"
                style={{
                  background: '#60a5fa',
                  border: 'none',
                  color: '#ffffff',
                }}
              >
                <Send size={11} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble (closed-state trigger; also toggles when open) */}
      <button
        onClick={() => setIsOpen(p => !p)}
        aria-label={isOpen ? `Close ${label}` : `Open ${label}`}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#0f1117',
          border: '2px solid var(--brand, #60a5fa)',
          boxShadow: 'var(--shadow-lg, 0 4px 24px rgba(0,0,0,0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <MessageCircle size={22} color="var(--brand, #60a5fa)" />
      </button>
    </div>
  )
}
