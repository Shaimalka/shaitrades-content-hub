import type { NetWorthSnapshot, MonthlyFinanceAggregate } from '@/types/finance'

export function aggregateMonthlySnapshots(
  snapshots: NetWorthSnapshot[],
): MonthlyFinanceAggregate[] {
  const byMonth = new Map<string, NetWorthSnapshot[]>()

  for (const snap of snapshots) {
    const month = snap.date.slice(0, 7)
    const bucket = byMonth.get(month)
    if (bucket) bucket.push(snap)
    else byMonth.set(month, [snap])
  }

  const result: MonthlyFinanceAggregate[] = []

  for (const [month, snaps] of byMonth) {
    const sorted = [...snaps].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return a.createdAt < b.createdAt ? -1 : 1
    })
    const last = sorted[sorted.length - 1]
    result.push({
      month,
      endOfMonthAssets: last.assets,
      endOfMonthLiabilities: last.liabilities,
      endOfMonthDebts: last.debts,
      endOfMonthNetWorth: last.netWorth,
      snapshotsInMonth: snaps.length,
    })
  }

  return result.sort((a, b) => (a.month < b.month ? -1 : 1))
}
