export type {
  NetWorthSnapshot,
  Milestone,
  MilestoneType,
  FinancePreferences,
} from '@/lib/finance-keys'

export type AssetType =
  | 'cash'
  | 'trading_account'
  | 'investment'
  | 'crypto'
  | 'real_estate'
  | 'other'

export type AssetLiquidity = 'liquid' | 'illiquid'

export interface Asset {
  id: string
  userId: string
  name: string
  type: AssetType
  value: number
  liquidity?: AssetLiquidity
  createdAt: string
  updatedAt: string
}

export type LiabilityType = 'loan' | 'credit_card' | 'mortgage' | 'other'

export interface Liability {
  id: string
  userId: string
  name: string
  type: LiabilityType
  value: number
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
