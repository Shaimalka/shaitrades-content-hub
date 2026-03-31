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
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // 1. Get all accounts
    const acctRes = await fetch(`${TRADOVATE_LIVE}/account/list`, { headers })
    if (!acctRes.ok) throw new Error('Failed to fetch accounts from Tradovate')
    const accounts: Array<{ id: number; name: string; nickname?: string }> = await acctRes.json()

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ imported: 0, total: 0, trades: [] })
    }

    // 2. Load existing trades from Redis
    const existingTrades: Array<Record<string, unknown>> = (await redis.get(TRADING_KEY) as Array<Record<string, unknown>>) || []
    const existingIds = new Set(existingTrades.map((t) => t.id as string))

    const newTrades: Array<Record<string, unknown>> = []

    // 3. For each account, sync fills
    for (const account of accounts) {
      const accountId = account.id
      const accountName = account.nickname || account.name || `Account-${accountId}`

      // Get fills for this account
      let fills: Array<{ id: number; orderId: number; contractId: number; timestamp: string; tradeDate: { year: number; month: number; day: number }; qty: number; price: number; action: string }> = []
      try {
        const fillRes = await fetch(`${TRADOVATE_LIVE}/fill/list?accountId=${accountId}`, { headers })
        if (fillRes.ok) {
          fills = await fillRes.json()
        }
      } catch {
        continue
      }

      if (!fills || fills.length === 0) continue

      // Get contracts for name resolution
      const contractIds = [...new Set(fills.map(f => f.contractId))]
      const contractMap: Record<number, string> = {}
      for (const cid of contractIds) {
        try {
          const cRes = await fetch(`${TRADOVATE_LIVE}/contract/item?id=${cid}`, { headers })
          if (cRes.ok) {
            const c: { id: number; name: string } = await cRes.json()
            contractMap[cid] = c.name
          }
        } catch {
          contractMap[cid] = `Contract-${cid}`
        }
      }

      // Sort fills by timestamp
      const sortedFills = [...fills].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Separate buys and sells for FIFO matching
      const buyQueue = sortedFills.filter(f => (f.action || '').toLowerCase() === 'buy')
      const sellQueue = sortedFills.filter(f => (f.action || '').toLowerCase() === 'sell')

      // Pair Long trades: buy entry → sell exit
      const longBuys = [...buyQueue]
      const longSells = [...sellQueue]
      while (longBuys.length > 0 && longSells.length > 0) {
        const buy = longBuys.shift()!
        const sell = longSells.shift()!

        const tradeId = `tradovate-long-${accountId}-${buy.id}-${sell.id}`
        if (existingIds.has(tradeId)) continue

        const qty = Math.min(buy.qty, sell.qty)
        const pnl = parseFloat(((sell.price - buy.price) * qty).toFixed(2))
        const contractName = contractMap[buy.contractId] || `Contract-${buy.contractId}`
        const buyDate = buy.tradeDate || { year: new Date(buy.timestamp).getFullYear(), month: new Date(buy.timestamp).getMonth() + 1, day: new Date(buy.timestamp).getDate() }

        newTrades.push({
          id: tradeId,
          date: tradeDate(buyDate),
          time: tradeTime(buy.timestamp),
          direction: 'Long',
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
        })
        existingIds.add(tradeId)
      }

      // Pair Short trades: sell entry → buy cover
      const shortSells = sortedFills.filter(f => (f.action || '').toLowerCase() === 'sell')
      const coverBuys = sortedFills.filter(f => (f.action || '').toLowerCase() === 'buy')
      if (shortSells.length > coverBuys.length) {
        const extraSells = shortSells.slice(coverBuys.length)
        for (let i = 0; i < extraSells.length; i++) {
          const sell = extraSells[i]
          // Look for a subsequent buy to cover
          const cover = coverBuys[coverBuys.length - extraSells.length + i]
          if (!cover) continue

          const tradeId = `tradovate-short-${accountId}-${sell.id}-${cover.id}`
          if (existingIds.has(tradeId)) continue

          const qty = Math.min(sell.qty, cover.qty)
          const pnl = parseFloat(((sell.price - cover.price) * qty).toFixed(2))
          const contractName = contractMap[sell.contractId] || `Contract-${sell.contractId}`
          const sellDate = sell.tradeDate || { year: new Date(sell.timestamp).getFullYear(), month: new Date(sell.timestamp).getMonth() + 1, day: new Date(sell.timestamp).getDate() }

          newTrades.push({
            id: tradeId,
            date: tradeDate(sellDate),
            time: tradeTime(sell.timestamp),
            direction: 'Short',
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
          })
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
