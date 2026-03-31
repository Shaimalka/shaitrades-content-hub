import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const TRADOVATE_LIVE = 'https://live.tradovateapi.com/v1'
const TRADING_KEY = 'life:trading:logs'

async function getValidToken(): Promise<string> {
  const token = await redis.get<string>('tradovate:token')
  if (!token) throw new Error('Not connected to Tradovate. Please connect in Settings.')

  const expiry = await redis.get<string>('tradovate:token:expiry')
  const expiryTime = expiry ? new Date(expiry).getTime() : 0
  const msUntilExpiry = expiryTime - Date.now()

  // Renew if less than 5 minutes remain (or if 85+ minutes have passed)
  if (msUntilExpiry < 5 * 60 * 1000) {
    const renewRes = await fetch(`${TRADOVATE_LIVE}/auth/renewAccessToken`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (renewRes.ok) {
      const renewed = await renewRes.json()
      if (renewed.accessToken) {
        await redis.set('tradovate:token', renewed.accessToken)
        await redis.set('tradovate:token:expiry', renewed.expirationTime || new Date(Date.now() + 80 * 60 * 1000).toISOString())
        return renewed.accessToken
      }
    }
  }

  return token
}

interface TradovateAccount {
  id: number
  name: string
  nickname?: string
}

interface TradovateFill {
  id: number
  orderId: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  qty: number
  price: number
  tradeSessionId?: number
  action: string // Buy | Sell
}

interface TradovatePosition {
  id: number
  accountId: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  netPos: number
  netPrice: number
  realizedPnl?: number
  openPnl?: number
  action?: string
}

interface TradovateContract {
  id: number
  name: string
}

function padZ(n: number) { return String(n).padStart(2, '0') }

function tradeDate(td: { year: number; month: number; day: number }): string {
  return `${td.year}-${padZ(td.month)}-${padZ(td.day)}`
}

function tradeTime(ts: string): string {
  try { return new Date(ts).toTimeString().slice(0, 5) } catch { return '00:00' }
}

export async function POST() {
  try {
    const token = await getValidToken()
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // 1. Get all accounts
    const acctRes = await fetch(`${TRADOVATE_LIVE}/account/list`, { headers })
    if (!acctRes.ok) throw new Error('Failed to fetch accounts from Tradovate')
    const accounts: TradovateAccount[] = await acctRes.json()

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ imported: 0, total: 0, trades: [] })
    }

    // 2. Load existing trades from Redis
    const existingTrades: any[] = (await redis.get(TRADING_KEY) as any[]) || []
    const existingIds = new Set(existingTrades.map((t: any) => t.id))

    const newTrades: any[] = []

    // 3. For each account, sync fills
    for (const account of accounts) {
      const accountId = account.id
      const accountName = account.nickname || account.name || `Account-${accountId}`

      // Get fills for this account
      let fills: TradovateFill[] = []
      try {
        const fillRes = await fetch(`${TRADOVATE_LIVE}/fill/list?accountId=${accountId}`, { headers })
        if (fillRes.ok) {
          fills = await fillRes.json()
        }
      } catch { /* skip account on error */ }

      if (!fills || fills.length === 0) continue

      // Get contracts for name resolution
      const contractIds = [...new Set(fills.map(f => f.contractId))]
      const contractMap: Record<number, string> = {}
      for (const cid of contractIds) {
        try {
          const cRes = await fetch(`${TRADOVATE_LIVE}/contract/item?id=${cid}`, { headers })
          if (cRes.ok) {
            const c: TradovateContract = await cRes.json()
            contractMap[cid] = c.name
          }
        } catch { contractMap[cid] = `Contract-${cid}` }
      }

      // Group fills by orderId to match entry/exit pairs
      const orderMap: Record<number, TradovateFill[]> = {}
      for (const fill of fills) {
        const key = fill.orderId
        if (!orderMap[key]) orderMap[key] = []
        orderMap[key].push(fill)
      }

      // Sort fills by timestamp and pair them into trades
      const sortedFills = [...fills].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Match Buy/Sell pairs to create completed trades
      const buyQueue: TradovateFill[] = []
      const sellQueue: TradovateFill[] = []

      for (const fill of sortedFills) {
        const action = (fill.action || '').toLowerCase()
        if (action === 'buy') {
          buyQueue.push(fill)
        } else if (action === 'sell') {
          sellQueue.push(fill)
        }
      }

      // Pair buys and sells (simple FIFO matching)
      while (buyQueue.length > 0 && sellQueue.length > 0) {
        const buy = buyQueue.shift()!
        const sell = sellQueue.shift()!

        const tradeId = `tradovate-${accountId}-${buy.id}-${sell.id}`
        if (existingIds.has(tradeId)) continue

        const qty = Math.min(buy.qty, sell.qty)
        const pnl = parseFloat(((sell.price - buy.price) * qty).toFixed(2))
        const direction: 'Long' | 'Short' = 'Long'
        const contractName = contractMap[buy.contractId] || `Contract-${buy.contractId}`
        const dateStr = tradeDate(buy.tradeDate || { year: new Date(buy.timestamp).getFullYear(), month: new Date(buy.timestamp).getMonth() + 1, day: new Date(buy.timestamp).getDate() })

        const trade = {
          id: tradeId,
          date: dateStr,
          time: tradeTime(buy.timestamp),
          direction,
          entryPrice: buy.price,
          exitPrice: sell.price,
          contracts: qty,
          pnl,
          notes: `Auto-imported from Tradovate · ${contractName}`,
          emotion: 3,
          source: 'tradovate',
          accountId,
          accountName,
          symbol: contractName,
          createdAt: new Date().toISOString(),
        }
        newTrades.push(trade)
        existingIds.add(tradeId)
      }

      // Also do Short (sell-first) pairs
      const shortSells = [...fills].filter(f => (f.action || '').toLowerCase() === 'sell').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const shortBuys = [...fills].filter(f => (f.action || '').toLowerCase() === 'buy').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      if (shortSells.length > shortBuys.length) {
        // More sells than buys indicates short positions
        const extraSells = shortSells.slice(shortBuys.length)
        const coverBuys = shortBuys.slice(shortSells.length - extraSells.length)
        for (let i = 0; i < Math.min(extraSells.length, coverBuys.length); i++) {
          const sell = extraSells[i]
          const cover = coverBuys[i]
          const tradeId = `tradovate-short-${accountId}-${sell.id}-${cover.id}`
          if (existingIds.has(tradeId)) continue

          const qty = Math.min(sell.qty, cover.qty)
          const pnl = parseFloat(((sell.price - cover.price) * qty).toFixed(2))
          const contractName = contractMap[sell.contractId] || `Contract-${sell.contractId}`
          const dateStr = tradeDate(sell.tradeDate || { year: new Date(sell.timestamp).getFullYear(), month: new Date(sell.timestamp).getMonth() + 1, day: new Date(sell.timestamp).getDate() })

          const trade = {
            id: tradeId,
            date: dateStr,
            time: tradeTime(sell.timestamp),
            direction: 'Short' as const,
            entryPrice: sell.price,
            exitPrice: cover.price,
            contracts: qty,
            pnl,
            notes: `Auto-imported from Tradovate · ${contractName}`,
            emotion: 3,
            source: 'tradovate',
            accountId,
            accountName,
            symbol: contractName,
            createdAt: new Date().toISOString(),
          }
          newTrades.push(trade)
          existingIds.add(tradeId)
        }
      }
    }

    // 4. Merge and save
    const merged = [...existingTrades, ...newTrades]
    await redis.set(TRADING_KEY, merged)
    await redis.set('tradovate:lastSync', new Date().toISOString())

    return NextResponse.json({
      imported: newTrades.length,
      total: merged.length,
      trades: newTrades,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Sync failed' }, { status: 500 })
  }
}
