export type {
  NetWorthSnapshot,
  Milestone,
  MilestoneType,
  FinancePreferences,
} from '@/lib/finance-keys'

export type AssetCategory = 'Cash' | 'Crypto' | 'Stocks' | 'Real Estate' | 'Other'
export type AssetLiquidity = 'liquid' | 'illiquid'

export interface Asset {
  id: string
  userId: string
  name: string
  value: number
  category: AssetCategory
  liquidity?: AssetLiquidity
  createdAt: string
  updatedAt: string
}

export type LiabilityCategory = 'Credit Card' | 'Loan' | 'Other'

export interface Liability {
  id: string
  userId: string
  name: string
  amount: number
  category: LiabilityCategory
  createdAt: string
  updatedAt: string
}

export interface MonthlyFinanceAggregate {
  month: string
  endOfMonthAssets: number
  endOfMonthLiabilities: number
  endOfMonthDebts: number
  endOfMonthNetWorth: number
  snapshotsInMonth: number
}
