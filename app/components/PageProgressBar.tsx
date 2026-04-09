'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function PageProgressBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [progress, setProgress] = useState(0)
    const [visible, setVisible] = useState(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
        // Start progress bar on route change
                setVisible(true)
        setProgress(10)

                if (timerRef.current) clearInterval(timerRef.current)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)

                // Simulate progress
                timerRef.current = setInterval(() => {
                        setProgress(prev => {
                                  if (prev >= 90) {
                                              if (timerRef.current) clearInterval(timerRef.current)
                                              return 90
                                  }
                                  return prev + Math.random() * 15
                        })
                }, 150)

                // Complete and hide after a short delay
                const completeTimer = setTimeout(() => {
                        if (timerRef.current) clearInterval(timerRef.current)
                        setProgress(100)
                        hideTimerRef.current = setTimeout(() => {
                                  setVisible(false)
                                  setProgress(0)
                        }, 300)
                }, 500)

                return () => {
                        clearInterval(timerRef.current ?? undefined)
                        clearTimeout(hideTimerRef.current ?? undefined)
                        clearTimeout(completeTimer)
                }
  }, [pathname, searchParams])

  if (!visible) return null

  return (
        <>
              <style dangerouslySetInnerHTML={{ __html: `
                      @keyframes trabits-shimmer {
                                0% { background-position: -200% center; }
                                          100% { background-position: 200% center; }
                                                  }
                                                        ` }} />
              <div
                        style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    zIndex: 99999,
                                    pointerEvents: 'none',
                        }}
                      >
                      <div
                                  style={{
                                                height: '100%',
                                                width: `${progress}%`,
                                                background: 'linear-gradient(90deg, #00f2ff, #0060ff, #00f2ff)',
                                                backgroundSize: '200% auto',
                                                animation: 'trabits-shimmer 1.2s linear infinite',
                                                boxShadow: '0 0 8px rgba(0, 242, 255, 0.8), 0 0 16px rgba(0, 242, 255, 0.4)',
                                                transition: 'width 0.15s ease, opacity 0.3s ease',
                                                opacity: progress === 100 ? 0 : 1,
                                                borderRadius: '0 2px 2px 0',
                                  }}
                                />
              </div>div>
        </>>
      )
}</>
