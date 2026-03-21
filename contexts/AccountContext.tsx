'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface Account {
  id: string
  name: string
}

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'shaitrades', name: 'shaitrades' },
  { id: 'shaitrades2', name: 'shaitrades2' },
]

interface AccountContextValue {
  accounts: Account[]
  activeAccount: Account
  setActiveAccount: (account: Account) => void
  switchAccount: (name: string) => void
  addAccount: (name: string) => void
  storageKey: (baseKey: string) => string
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [activeAccount, setActiveAccountState] = useState<Account>(DEFAULT_ACCOUNTS[0])

  useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem('shaitrades_accounts')
      if (savedAccounts) {
        const parsed: Account[] = JSON.parse(savedAccounts)
        if (parsed.length > 0) setAccounts(parsed)
      }
    } catch {}

    try {
      const savedActive = localStorage.getItem('activeAccount')
      if (savedActive) {
        const parsed: Account = JSON.parse(savedActive)
        setActiveAccountState(parsed)
      }
    } catch {}
  }, [])

  const setActiveAccount = (account: Account) => {
    setActiveAccountState(account)
    localStorage.setItem('activeAccount', JSON.stringify(account))
  }

  const switchAccount = (name: string) => {
    const found = accounts.find(a => a.name === name || a.id === name)
    if (found) setActiveAccount(found)
  }

  const addAccount = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = trimmed.toLowerCase().replace(/\s+/g, '-')
    const newAccount: Account = { id, name: trimmed }
    const updated = [...accounts, newAccount]
    setAccounts(updated)
    localStorage.setItem('shaitrades_accounts', JSON.stringify(updated))
  }

  const storageKey = (baseKey: string) => activeAccount.id + '_' + baseKey

  return React.createElement(
    AccountContext.Provider,
    { value: { accounts, activeAccount, setActiveAccount, switchAccount, addAccount, storageKey } },
    children
  )
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
