"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTheme } from '@/app/contexts/ThemeContext'

interface Trade {
  id: string
  symbol: string
  direction: string
  pnl: number
  date: string
  result: string
}

const QUICK_LINKS = [
  { href: "/life/trading", label: "Trading Journal", icon: "📒", desc: "Log & review your trades" },
  { href: "/life/trading/playbook", label: "Playbook", icon: "📘", desc: "Your strategy rules" },
  { href: "/life/trading/backtesting", label: "Backtesting", icon: "📊", desc: "Test strategies" },
  { href: "/life/habits", label: "Habits", icon: "🧘", desc: "Daily habit tracker" },
  { href: "/life/goals", label: "Goals", icon: "🎯", desc: "Track your goals" },
  { href: "/life/finance", label: "Finance", icon: "💰", desc: "Net worth tracker" },
]

const FALLBACK_TRADES: Trade[] = [
  { id: "1", symbol: "ES", direction: "LONG", pnl: 320, date: "2026-04-09", result: "win" },
  { id: "2", symbol: "NQ", direction: "SHORT", pnl: -150, date: "2026-04-08", result: "loss" },
  { id: "3", symbol: "CL", direction: "LONG", pnl: 480, date: "2026-04-07", result: "win" },
  { id: "4", symbol: "GC", direction: "SHORT", pnl: 210, date: "2026-04-06", result: "win" },
  { id: "5", symbol: "ES", direction: "LONG", pnl: -95, date: "2026-04-05", result: "loss" },
]

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { isDark } = useTheme()
  const bg = isDark ? "#0d1424" : "#f0f4ff"
  const border = isDark ? "#1a2540" : "#d0daf0"
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,15,26,0.5)"
  const textPrimary = isDark ? "#ffffff" : "#0a0f1a"
  const accentColor = accent === "cyan" ? "#00f2ff" : accent === "green" ? "#00e676" : accent === "amber" ? "#ffa726" : "#a78bfa"

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: "12px",
      padding: "20px 24px",
      flex: 1,
      minWidth: "160px",
    }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.75rem", fontWeight: 700, color: accentColor }}>
        {value}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { isDark } = useTheme()
  const [trades, setTrades] = useState<Trade[]>(FALLBACK_TRADES)
  const [totalTrades, setTotalTrades] = useState(0)
  const [winRate, setWinRate] = useState("—")
  const [totalPnL, setTotalPnL] = useState("—")
  const [habitStreak, setHabitStreak] = useState(0)

  const bg = isDark ? "#0a0f1a" : "#f8faff"
  const cardBg = isDark ? "#0d1424" : "#ffffff"
  const cardBorder = isDark ? "#1a2540" : "#e0e8ff"
  const textPrimary = isDark ? "#ffffff" : "#0a0f1a"
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,15,26,0.6)"
  const cyan = "#00f2ff"

  useEffect(() => {
    // Calculate stats from trades
    const wins = FALLBACK_TRADES.filter(t => t.result === "win").length
    const rate = Math.round((wins / FALLBACK_TRADES.length) * 100)
    const pnl = FALLBACK_TRADES.reduce((sum, t) => sum + t.pnl, 0)
    setTotalTrades(FALLBACK_TRADES.length)
    setWinRate(`${rate}%`)
    setTotalPnL(pnl >= 0 ? `+$${pnl}` : `-$${Math.abs(pnl)}`)
    setHabitStreak(7)
  }, [])

  return (
    <div style={{
      background: bg,
      minHeight: "100vh",
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      color: textPrimary,
      padding: "32px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: cyan, margin: 0, letterSpacing: "-0.02em" }}>
          TRABITS Dashboard
        </h1>
        <p style={{ color: textSecondary, marginTop: "4px", fontSize: "0.9rem" }}>
          Your trading + habits operating system
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
        <StatCard label="Total Trades" value={String(totalTrades)} accent="cyan" />
        <StatCard label="Win Rate" value={winRate} accent="green" />
        <StatCard label="Total P&L" value={totalPnL} accent="cyan" />
        <StatCard label="Habit Streak" value={`${habitStreak}d`} accent="amber" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>

        {/* Coach Shai welcome card */}
        <div style={{
          background: `linear-gradient(135deg, rgba(0,242,255,0.08), rgba(0,242,255,0.02))`,
          border: `1px solid ${isDark ? "rgba(0,242,255,0.3)" : "rgba(0,150,200,0.3)"}`,
          borderRadius: "16px",
          padding: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "linear-gradient(135deg, #00f2ff, #0080ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.25rem"
            }}>
              🎯
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: cyan }}>Coach Shai</div>
              <div style={{ fontSize: "0.75rem", color: textSecondary }}>Daily Brief</div>
            </div>
          </div>
          <p style={{ color: textPrimary, fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
            Welcome back! You&apos;re on a <strong style={{ color: cyan }}>7-day habit streak</strong>. 
            Keep executing your playbook with discipline. Today&apos;s focus: stick to your stop-loss rules 
            and journal every trade.
          </p>
          <div style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: isDark ? "rgba(0,242,255,0.08)" : "rgba(0,150,200,0.08)",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: textSecondary,
            fontStyle: "italic",
          }}>
            💡 <strong>Tip:</strong> Review yesterday&apos;s trades before opening new positions.
          </div>
        </div>

        {/* Recent Trades */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: "16px",
          padding: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: textPrimary, margin: 0 }}>Recent Trades</h3>
            <Link href="/life/trading" style={{ fontSize: "0.75rem", color: cyan, textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {trades.slice(0, 5).map((trade) => (
              <div key={trade.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderRadius: "8px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    background: trade.direction === "LONG" ? "rgba(0,230,118,0.15)" : "rgba(255,82,82,0.15)",
                    color: trade.direction === "LONG" ? "#00e676" : "#ff5252",
                  }}>
                    {trade.direction}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem", color: textPrimary }}>{trade.symbol}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: textSecondary }}>{trade.date}</span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: trade.pnl >= 0 ? "#00e676" : "#ff5252",
                  }}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Quick Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "20px",
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: "12px",
                textDecoration: "none",
                transition: "border-color 0.2s ease, background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = cyan
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = cardBorder
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{link.icon}</span>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: textPrimary }}>{link.label}</span>
              <span style={{ fontSize: "0.75rem", color: textSecondary }}>{link.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
