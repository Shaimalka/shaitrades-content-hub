'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import React from 'react'

type ThemeMode = 'dark' | 'light'

const ThemeContext = createContext<{
        mode: ThemeMode
        toggle: () => void
        isDark: boolean
}>({ mode: 'dark', toggle: () => {}, isDark: true })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
        const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
            const saved = localStorage.getItem('trabits-theme') as ThemeMode
            if (saved) setMode(saved)
  }, [])

  const toggle = () => {
            const next = mode === 'dark' ? 'light' : 'dark'
            setMode(next)
            localStorage.setItem('trabits-theme', next)
  }

  return React.createElement(
            ThemeContext.Provider,
        { value: { mode, toggle, isDark: mode === 'dark' } },
            children
          )
}

export const useTheme = () => useContext(ThemeContext)
