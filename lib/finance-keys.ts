// Typed Redis key helpers + types for the Finance / Net Worth feature.
// Inline Upstash clients (per repo convention) — this file owns no Redis client.

export const SNAPSHOTS_MAX = 3650

export type NetWorthSnapshot = {
  id: string
  date: string
  source: 'auto' | 'manual'
  assets: number
  liabilities: number
  debts: number
  netWorth: number
  createdAt: string
}

export type MilestoneType = 'net_worth' | 'debt_free' | 'runway_months'

export type Milestone = {
  id: string
  label: string
  type: MilestoneType
  target: number
  months?: number
  isDefault?: boolean
  createdAt: string
}

export type FinancePreferences = {
  timezone?: string
  dismissedWarnings?: {
    nwDuplicateDebts?: boolean
  }
}

export const financeKeys = {
  assets: (userId: string) => `user:${userId}:assets`,
  liabilities: (userId: string) => `user:${userId}:liabilities`,
  debts: (userId: string) => `debts:${userId}`,
  snapshots: (userId: string) => `user:${userId}:nw:snapshots`,
  milestones: (userId: string) => `user:${userId}:nw:milestones`,
  preferences: (userId: string) => `user:${userId}:finance:preferences`,
  userIndex: 'user:index',
} as const

export const DEFAULT_MILESTONES: Omit<Milestone, 'id' | 'createdAt'>[] = [
  { label: 'First $1k', type: 'net_worth', target: 1000, isDefault: true },
  { label: 'First $10k', type: 'net_worth', target: 10000, isDefault: true },
  { label: 'First $50k', type: 'net_worth', target: 50000, isDefault: true },
  { label: 'First $100k', type: 'net_worth', target: 100000, isDefault: true },
  { label: 'First $250k', type: 'net_worth', target: 250000, isDefault: true },
  { label: 'First $500k', type: 'net_worth', target: 500000, isDefault: true },
  { label: 'First $1M', type: 'net_worth', target: 1000000, isDefault: true },
  { label: 'Debt-free', type: 'debt_free', target: 0, isDefault: true },
  { label: '6-month runway', type: 'runway_months', target: 6, months: 6, isDefault: true },
  { label: '1-year runway', type: 'runway_months', target: 12, months: 12, isDefault: true },
]
