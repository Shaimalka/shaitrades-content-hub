'use client'
import React from 'react'

interface CardProps {
      children: React.ReactNode
      style?: React.CSSProperties
      className?: string
      padding?: string
}

export default function Card({ children, style, className, padding = '20px 24px' }: CardProps) {
      return (
              <div
                        className={className}
                        style={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding,
                                    boxShadow: 'var(--shadow-sm)',
                                    ...style,
                        }}
                      >
                  {children}
              </div>div>
            )
}</div>
