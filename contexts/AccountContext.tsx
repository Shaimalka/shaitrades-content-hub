'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AccountContextType {
    activeAccount: string
    accounts: string[]
    switchAccount: (name: string) => void
    addAccount: (name: string) => void
}

const AccountContext = createContext<AccountContextType>({
    activeAccount: 'shaitrades',
    accounts: ['shaitrades', 'shaitrades2'],
    switchAccount: () => {},
    addAccount: () => {},
})

export function AccountProvider({ children }: { children: ReactNode }) {
    const [accounts, setAccounts] = useState<string[]>(['shaitrades', 'shaitrades2'])
    const [activeAccount, setActiveAccount] = useState('shaitrades')

  useEffect(() => {
        const saved = localStorage.getItem('activeAccount')
        if (saved) setActiveAccount(saved)
        const savedAccounts = localStorage.getItem('accounts')
        if (savedAccounts) setAccounts(JSON.parse(savedAccounts))
  }, [])

  const switchAccount = (name: string) => {
        setActiveAccount(name)
        localStorage.setItem('activeAccount', name)
        window.location.reload()
  }

  const addAccount = (name: string) => {
        const updated = [...accounts, name]
        setAccounts(updated)
        localStorage.setItem('accounts', JSON.stringify(updated))
  }

  return (
        <AccountContext.Provider value={{ activeAccount, accounts, switchAccount, addAccount }}>
          {children}
        </AccountContext.Provider>
      )
}

export function useAccount() {
    return useContext(AccountContext)
}
