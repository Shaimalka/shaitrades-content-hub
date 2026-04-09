import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Redis } from '@upstash/redis'
import { redirect } from "next/navigation";
const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  date: string;
  notes?: string;
}

interface Habit {
  id: string;
  name: string;
  completedDates: string[];
}

function calculateHabitStreak(habits: Habit[]): number {
  if (!habits.length) return 0;

  const allDates = new Set<string>();
  habits.forEach((habit) => {
    habit.completedDates?.forEach((date) => allDates.add(date));
  });

  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (!sortedDates.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const date = new Date(sortedDates[i]);
    date.setHours(0, 0, 0, 0);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);

    if (date.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const userId = session.user.email as string;

  let trades: Trade[] = [];
  let habits: Habit[] = [];

  try {
    const tradesRaw = await redis.get('life:trading:logs');
    if (tradesRaw) {
      trades = typeof tradesRaw === "string" ? JSON.parse(tradesRaw) : tradesRaw;
    }
  } catch {
    trades = [];
  }

  try {
    const habitsRaw = await redis.get('life:habits');
    if (habitsRaw) {
      habits = typeof habitsRaw === "string" ? JSON.parse(habitsRaw) : habitsRaw;
    }
  } catch {
    habits = [];
  }

  const totalTrades = trades.length;

  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate =
    totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const habitStreak = calculateHabitStreak(habits);

  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#0a0f1a",
      color: "#e2e8f0",
      fontFamily: "'Inter', sans-serif",
      padding: "2rem",
    } as React.CSSProperties,

    heading: {
      fontSize: "1.75rem",
      fontWeight: 700,
      color: "#00f2ff",
      marginBottom: "0.25rem",
      letterSpacing: "-0.02em",
    } as React.CSSProperties,

    subheading: {
      fontSize: "0.9rem",
      color: "#64748b",
      marginBottom: "2rem",
    } as React.CSSProperties,

    statsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "1rem",
      marginBottom: "2.5rem",
    } as React.CSSProperties,

    statCard: {
      backgroundColor: "#0d1424",
      border: "1px solid #1e293b",
      borderRadius: "12px",
      padding: "1.25rem 1.5rem",
    } as React.CSSProperties,

    statLabel: {
      fontSize: "0.75rem",
      fontWeight: 600,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      marginBottom: "0.5rem",
    } as React.CSSProperties,

    statValue: {
      fontSize: "2rem",
      fontWeight: 700,
      color: "#00f2ff",
      lineHeight: 1,
    } as React.CSSProperties,

    statValueNeutral: {
      fontSize: "2rem",
      fontWeight: 700,
      color: "#e2e8f0",
      lineHeight: 1,
    } as React.CSSProperties,

    sectionTitle: {
      fontSize: "1.1rem",
      fontWeight: 600,
      color: "#e2e8f0",
      marginBottom: "1rem",
    } as React.CSSProperties,

    card: {
      backgroundColor: "#0d1424",
      border: "1px solid #1e293b",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
    } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
    } as React.CSSProperties,

    th: {
      textAlign: "left" as const,
      fontSize: "0.72rem",
      fontWeight: 600,
      color: "#475569",
      textTransform: "uppercase" as const,
      letterSpacing: "0.07em",
      paddingBottom: "0.75rem",
      borderBottom: "1px solid #1e293b",
    } as React.CSSProperties,

    td: {
      padding: "0.85rem 0",
      fontSize: "0.875rem",
      color: "#cbd5e1",
      borderBottom: "1px solid #111827",
    } as React.CSSProperties,

    tdLast: {
      padding: "0.85rem 0",
      fontSize: "0.875rem",
      color: "#cbd5e1",
    } as React.CSSProperties,

    badge: (side: string) =>
      ({
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "99px",
        fontSize: "0.72rem",
        fontWeight: 600,
        backgroundColor: side === "long" ? "#052e16" : "#2d0a0a",
        color: side === "long" ? "#4ade80" : "#f87171",
        border: `1px solid ${side === "long" ? "#166534" : "#991b1b"}`,
      } as React.CSSProperties),

    pnlPositive: {
      color: "#4ade80",
      fontWeight: 600,
    } as React.CSSProperties,

    pnlNegative: {
      color: "#f87171",
      fontWeight: 600,
    } as React.CSSProperties,

    emptyState: {
      textAlign: "center" as const,
      padding: "2.5rem 1rem",
      color: "#475569",
      fontSize: "0.9rem",
    } as React.CSSProperties,

    emptyIcon: {
      fontSize: "2rem",
      marginBottom: "0.5rem",
    } as React.CSSProperties,

    quickLinksGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "1rem",
    } as React.CSSProperties,

    quickLink: {
      backgroundColor: "#0d1424",
      border: "1px solid #1e293b",
      borderRadius: "12px",
      padding: "1.25rem 1rem",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: "0.5rem",
      textDecoration: "none",
      color: "#94a3b8",
      fontSize: "0.85rem",
      fontWeight: 500,
      transition: "border-color 0.2s, color 0.2s",
      cursor: "pointer",
    } as React.CSSProperties,

    quickLinkIcon: {
      fontSize: "1.5rem",
    } as React.CSSProperties,
  };

  const totalPnlFormatted =
    (totalPnl >= 0 ? "+" : "") +
    totalPnl.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const quickLinks = [
    { href: "/dashboard/trades/new", icon: "📈", label: "Log Trade" },
    { href: "/dashboard/trades", icon: "📋", label: "All Trades" },
    { href: "/dashboard/habits", icon: "✅", label: "Habits" },
    { href: "/dashboard/journal", icon: "📓", label: "Journal" },
    { href: "/dashboard/analytics", icon: "📊", label: "Analytics" },
    { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Dashboard</h1>
      <p style={styles.subheading}>
        Welcome back{session.user.name ? `, ${session.user.name}` : ""}. Here's
        your trading overview.
      </p>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Trades</div>
          <div style={styles.statValueNeutral}>{totalTrades}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Win Rate</div>
          <div style={styles.statValue}>{winRate}%</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total P&amp;L</div>
          <div
            style={{
              ...styles.statValue,
              color:
                totalPnl > 0
                  ? "#4ade80"
                  : totalPnl < 0
                  ? "#f87171"
                  : "#00f2ff",
            }}
          >
            {totalTrades > 0 ? totalPnlFormatted : "$0.00"}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Habit Streak</div>
          <div style={styles.statValue}>
            {habitStreak}
            <span
              style={{ fontSize: "1rem", color: "#64748b", marginLeft: "4px" }}
            >
              days
            </span>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Recent Trades</div>
        {recentTrades.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div>No trades logged yet.</div>
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Start by logging your first trade above.
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Symbol</th>
                <th style={styles.th}>Side</th>
                <th style={styles.th}>Entry</th>
                <th style={styles.th}>Exit</th>
                <th style={{ ...styles.th, textAlign: "right" }}>P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade, index) => {
                const isLast = index === recentTrades.length - 1;
                const tdStyle = isLast ? styles.tdLast : styles.td;
                return (
                  <tr key={trade.id}>
                    <td style={tdStyle}>
                      {new Date(trade.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        color: "#e2e8f0",
                      }}
                    >
                      {trade.symbol}
                    </td>
                    <td style={tdStyle}>
                      <span style={styles.badge(trade.side)}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      ${Number(trade.entryPrice).toFixed(2)}
                    </td>
                    <td style={tdStyle}>
                      ${Number(trade.exitPrice).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        ...(trade.pnl >= 0
                          ? styles.pnlPositive
                          : styles.pnlNegative),
                      }}
                    >
                      {trade.pnl >= 0 ? "+" : ""}
                      {Number(trade.pnl).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Links */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Quick Links</div>
        <div style={styles.quickLinksGrid}>
          {quickLinks.map((link) => (
            <a key={link.href} href={link.href} style={styles.quickLink}>
              <span style={styles.quickLinkIcon}>{link.icon}</span>
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
