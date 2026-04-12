'use client'
import React from 'react'

interface CardProps {
        children: React.ReactNode
        style?: React.CSSProperties
        className?: string
        padding?: string
        noPadding?: boolean
}

export default function Card({
        children,
        style,
        className,
        padding = '18px 20px',
        noPadding = false,
}: CardProps) {
        return (
                  <div
                              className={className}
                              style={{
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: noPadding ? '0' : padding,
                                            boxShadow: 'var(--shadow-sm)',
                                            ...style,
                              }}
                            >
                        {children}
                  </div>div>
                )
}</div>
