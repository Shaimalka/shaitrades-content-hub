'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { useAccount } from '@/contexts/AccountContext'

export default function AccountSwitcher() {
  const { accounts, activeAccount, setActiveAccount, addAccount } = useAccount()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setAdding(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAdd = () => {
    if (!newName.trim()) return
    addAccount(newName)
    setNewName('')
    setAdding(false)
  }

  return (
    <div ref={ref} className="relative px-4 py-3 border-b border-gray-800/60">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-900/60 border border-gray-800 hover:border-gray-600 transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-cyan-400 text-[8px] font-bold">
              {activeAccount.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-200 font-medium truncate">{activeAccount.name}</span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-[#0a0a0a] border border-gray-800 shadow-xl">
          <div className="py-1">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => { setActiveAccount(account); setOpen(false) }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-4 h-4 bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-[8px] font-bold">
                      {account.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-300 truncate">{account.name}</span>
                </div>
                {account.id === activeAccount.id && (
                  <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-800/60 p-2">
            {adding ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  placeholder="Account name..."
                  autoFocus
                  className="flex-1 text-xs bg-black border border-gray-700 text-white px-2 py-1 focus:outline-none focus:border-gray-500 placeholder-gray-700"
                />
                <button
                  onClick={handleAdd}
                  className="text-xs px-2 py-1 bg-white text-black hover:bg-gray-200 font-bold transition-colors"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:text-gray-300 transition-colors text-xs"
              >
                <Plus className="w-3 h-3" />
                Add account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
