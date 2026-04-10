'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
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
          borderLeft: isOpen ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(0,242,255,0.15)',
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
          <div
            className="px-4 py-3 mx-3 mt-3 rounded-lg text-xs"
            style={{
              background: 'rgba(0,242,255,0.05)',
              border: '1px solid rgba(0,242,255,0.1)',
              color: 'var(--text-muted)',
            }}>
            <span style={{ color: '#00f2ff' }}>Coach Shai</span> has access to all your {section} data. Ask anything about your trends, patterns, or progress.
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
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              ) : (
                <div className="max-w-[90%]" style={{ backgroundColor: '#0f1117' }}>
                  <span
                    className="block text-[9px] font-mono tracking-widest mb-1 font-semibold"
                    style={{ color: '#00ff88', fontVariant: 'small-caps' }}
                  >
                    COACH SHAI
                  </span>
                  <div className="text-xs leading-relaxed" style={{ color: '#00f2ff' }}>
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
                  className="block text-[9px] font-mono tracking-widest mb-1 font-semibold"
                  style={{ color: '#00ff88', fontVariant: 'small-caps' }}
                >
                  COACH SHAI
                </span>
                <Loader2 size={13} className="animate-spin" style={{ color: '#00f2ff' }} />
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
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(0,242,255,0.18)',
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
              onFocus={e => {
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.style.boxShadow = '0 0 0 1px rgba(0,242,255,0.35), 0 0 8px rgba(0,242,255,0.15)'
                  parent.style.borderColor = 'rgba(0,242,255,0.4)'
                }
              }}
              onBlur={e => {
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.style.boxShadow = ''
                  parent.style.borderColor = 'rgba(0,242,255,0.18)'
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40"
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
