'use client'
import { useState, useEffect } from 'react'
import { Plus, Target } from 'lucide-react'
import { useTheme } from '@/app/contexts/ThemeContext'

type TimeHorizon = 'weekly' | 'monthly' | 'quarterly'

type Goal = {
  id: string
  title: string
  timeHorizon: TimeHorizon
  status: 'active' | 'completed' | 'archived'
  current: number
  target: number
  unit: string
  category: string
  subcategory?: string
  startDate: string
  endDate: string
  createdAt: string
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getPaceStatus(goal: Goal): { label: string; color: string; bg: string } {
  if (goal.current === 0) {
    return { label: 'BEHIND', color: '#d97706', bg: 'rgba(217,119,6,0.12)' }
  }
  return { label: 'ON PACE', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' }
}

function formatValue(value: number, unit: string): string {
  if (unit === '$' || unit === 'USD') {
    return '$' + value.toLocaleString()
  }
  return value.toLocaleString() + (unit ? ' ' + unit : '')
}

interface GoalRowProps {
  goal: Goal
  isDark: boolean
  textPrimary: string
  borderColor: string
}

function GoalRow({ goal, isDark, textPrimary, borderColor }: GoalRowProps) {
  const progressPct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0
  const daysLeft = getDaysRemaining(goal.endDate)
  const pace = getPaceStatus(goal)
  const metricLabel = [goal.category, goal.subcategory].filter(Boolean).join(' · ')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '14px 0',
      borderBottom: `1px solid ${borderColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.3,
          }}>
            {goal.title}
          </p>
          {metricLabel && (
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: '#94a3b8',
              margin: '2px 0 0',
            }}>
              {metricLabel}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: textPrimary,
          }}>
            {formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 6,
            background: pace.bg,
            color: pace.color,
          }}>
            {pace.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1,
          height: 6,
          background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: '#2563eb',
            borderRadius: 999,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          color: '#94a3b8',
          flexShrink: 0,
          minWidth: 70,
          textAlign: 'right',
        }}>
          {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
        </span>
      </div>
    </div>
  )
}

interface SectionCardProps {
  label: string
  emptyText: string
  goals: Goal[]
  isDark: boolean
  cardBg: string
  borderColor: string
  textPrimary: string
}

function SectionCard({ label, emptyText, goals, isDark, cardBg, borderColor, textPrimary }: SectionCardProps) {
  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ ...labelStyle, marginBottom: goals.length > 0 ? 4 : 0 }}>{label}</div>
      {goals.length === 0 ? (
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          color: '#94a3b8',
          fontStyle: 'italic',
          margin: '10px 0 0',
        }}>
          {emptyText}
        </p>
      ) : (
        <div>
          {goals.map((goal, idx) => (
            <div key={goal.id} style={idx === goals.length - 1 ? { borderBottom: 'none' } : {}}>
              <GoalRow
                goal={goal}
                isDark={isDark}
                textPrimary={textPrimary}
                borderColor={borderColor}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ isDark, textPrimary }: { isDark: boolean; textPrimary: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 48,
        marginBottom: 16,
        lineHeight: 1,
      }}>
        🎯
      </div>
      <h2 style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 20,
        fontWeight: 700,
        color: textPrimary,
        margin: '0 0 8px',
      }}>
        No goals yet
      </h2>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        color: '#94a3b8',
        margin: '0 0 24px',
        maxWidth: 320,
      }}>
        Set your first target and start tracking progress
      </p>
      <button
        onClick={() => {}}
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#ffffff',
          background: '#2563eb',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Plus size={14} />
        Create your first goal
      </button>
    </div>
  )
}

function GoalsInner() {
  const { isDark } = useTheme()
  const isMobile = useWindowWidth() < 768

  const pageBg = isDark ? '#0f1117' : '#f8fafc'
  const cardBg = isDark ? '#1a1f2e' : '#ffffff'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textPrimary = isDark ? '#f9fafb' : '#0f172a'

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/life/goals')
      .then(r => r.json())
      .then(data => {
        setGoals(data.goals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeGoals = goals.filter(g => g.status === 'active')
  const weekly = activeGoals.filter(g => g.timeHorizon === 'weekly')
  const monthly = activeGoals.filter(g => g.timeHorizon === 'monthly')
  const quarterly = activeGoals.filter(g => g.timeHorizon === 'quarterly')

  const hasAnyGoals = activeGoals.length > 0

  return (
    <div style={{ background: pageBg, minHeight: '100vh' }}>
      <div
        className="max-w-[1100px] mx-auto"
        style={{ padding: isMobile ? '24px 16px' : '32px 24px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: isMobile ? 24 : 28,
              fontWeight: 800,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}>
              Goals
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: '#94a3b8',
              margin: '4px 0 0',
            }}>
              Weekly, monthly, and quarterly targets
            </p>
          </div>
          <button
            onClick={() => {}}
            style={{
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} />
            New Goal
          </button>
        </div>

        {/* Coach Shai card */}
        <div style={{
          ...cardStyle,
          background: isDark ? '#0f1117' : '#f8fafc',
          marginBottom: 24,
        }}>
          <div style={{
            ...labelStyle,
            marginBottom: 6,
          }}>
            🧠 COACH SHAI
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.6,
          }}>
            Set clear targets. What gets measured gets done.
          </p>
        </div>

        {/* Main content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                ...cardStyle,
                height: 80,
                background: isDark ? '#1a1f2e' : '#f1f5f9',
                opacity: 0.6,
              }} />
            ))}
          </div>
        ) : !hasAnyGoals ? (
          <div style={cardStyle}>
            <EmptyState isDark={isDark} textPrimary={textPrimary} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard
              label="THIS WEEK"
              emptyText="No weekly goals yet"
              goals={weekly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
            />
            <SectionCard
              label="THIS MONTH"
              emptyText="No monthly goals yet"
              goals={monthly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
            />
            <SectionCard
              label="THIS QUARTER"
              emptyText="No quarterly goals yet"
              goals={quarterly}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoalsClient() {
  return <GoalsInner />
}
