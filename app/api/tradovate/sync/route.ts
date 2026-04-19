import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

const TRADOVATE_LIVE = 'https://live.tradovateapi.com/v1'


async function getValidToken(userId: string): Promise<string> {
    const token = await redis.get<string>(`tradovate:${userId}:token`)
    if (!token) throw new Error('Not connected to Tradovate. Please connect in Settings.')
    const expiry = await redis.get<string>(`tradovate:${userId}:token:expiry`)
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
                            await redis.set(`tradovate:${userId}:token`, renewed.accessToken)
                            await redis.set(`tradovate:${userId}:token:expiry`, renewed.expirationTime || new Date(Date.now() + 80 * 60 * 1000).toISOString())
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

type Fill = {
    id: number; orderId: number; contractId: number; timestamp: string
    tradeDate: { year: number; month: number; day: number }
    qty: number; price: number; action: string
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
    const TRADING_KEY = `trading:${userId}:logs`
          const token = await getValidToken(userId)
          const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          const acctRes = await fetch(`${TRADOVATE_LIVE}/account/list`, { headers })
          if (!acctRes.ok) throw new Error('Failed to fetch accounts from Tradovate')
          const accounts: Array<{ id: number; name: string; nickname?: string }> = await acctRes.json()
          if (!accounts || accounts.length === 0) {
                  return NextResponse.json({ imported: 0, total: 0, trades: [] })
          }
          const existingTrades: Array<Record<string, unknown>> = (await redis.get(TRADING_KEY) as Array<Record<string, unknown>>) || []
                const existingIds = new Set(existingTrades.map((t) => String(t.id)))
          const newTrades: Array<Record<string, unknown>> = []
                for (const account of accounts) {
                        const accountId = account.id
                        const accountName = account.nickname || account.name || `Account-${accountId}`
                        let fills: Fill[] = []
                                try {
                                          const fillRes = await fetch(`${TRADOVATE_LIVE}/fill/list?accountId=${accountId}`, { headers })
                                          if (fillRes.ok) fills = await fillRes.json()
                                } catch { continue }
                        if (!fills || fills.length === 0) continue
                        const contractIds = Array.from(new Set(fills.map((f) => f.contractId)))
                        const contractMap: Record<number, string> = {}
                                for (const cid of contractIds) {
                                          try {
                                                      const cRes = await fetch(`${TRADOVATE_LIVE}/contract/item?id=${cid}`, { headers })
                                                      if (cRes.ok) { const c: { id: number; name: string } = await cRes.json(); contractMap[cid] = c.name }
                                          } catch { contractMap[cid] = `Contract-${cid}` }
                                }
                        const sortedFills = fills.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        const buyQueue = sortedFills.filter((f) => f.action.toLowerCase() === 'buy')
                        const sellQueue = sortedFills.filter((f) => f.action.toLowerCase() === 'sell')
                        const longBuys = buyQueue.slice()
                        const longSells = sellQueue.slice()
                        while (longBuys.length > 0 && longSells.length > 0) {
                                  const buy = longBuys.shift()!
                                  const sell = longSells.shift()!
                                  const tradeId = `tradovate-long-${accountId}-${buy.id}-${sell.id}`
                                  if (existingIds.has(tradeId)) continue
                                  const qty = Math.min(buy.qty, sell.qty)
                                  const pnl = parseFloat(((sell.price - buy.price) * qty).toFixed(2))
                                  const contractName = contractMap[buy.contractId] || `Contract-${buy.contractId}`
                                  const buyTd = buy.tradeDate || { year: new Date(buy.timestamp).getFullYear(), month: new Date(buy.timestamp).getMonth() + 1, day: new Date(buy.timestamp).getDate() }
                                  newTrades.push({ id: tradeId, date: tradeDate(buyTd), time: tradeTime(buy.timestamp), direction: 'Long', entryPrice: buy.price, exitPrice: sell.price, contracts: qty, pnl, notes: `Auto-imported from Tradovate Â· ${contractName}`, emotion: 3, source: 'tradovate', accountId, accountName, symbol: contractName, createdAt: new Date().toISOString() })
                                  existingIds.add(tradeId)
                        }
                        if (sellQueue.length > buyQueue.length) {
                                  const extraSells = sellQueue.slice(buyQueue.length)
                                  for (let i = 0; i < extraSells.length; i++) {
                                              const sell = extraSells[i]
                                              const cover = buyQueue[buyQueue.length - extraSells.length + i]
                                              if (!cover) continue
                                              const tradeId = `tradovate-short-${accountId}-${sell.id}-${cover.id}`
                                              if (existingIds.has(tradeId)) continue
                                              const qty = Math.min(sell.qty, cover.qty)
                                              const pnl = parseFloat(((sell.price - cover.price) * qty).toFixed(2))
                                              const contractName = contractMap[sell.contractId] || `Contract-${sell.contractId}`
                                              const sellTd = sell.tradeDate || { year: new Date(sell.timestamp).getFullYear(), month: new Date(sell.timestamp).getMonth() + 1, day: new Date(sell.timestamp).getDate() }
                                              newTrades.push({ id: tradeId, date: tradeDate(sellTd), time: tradeTime(sell.timestamp), direction: 'Short', entryPrice: sell.price, exitPrice: cover.price, contracts: qty, pnl, notes: `Auto-imported from Tradovate Â· ${contractName}`, emotion: 3, source: 'tradovate', accountId, accountName, symbol: contractName, createdAt: new Date().toISOString() })
                                              existingIds.add(tradeId)
                                  }
                        }
                }
          const merged = existingTrades.concat(newTrades)
          await redis.set(TRADING_KEY, merged)
          await redis.set(`tradovate:${userId}:lastSync`, new Date().toISOString())
          return NextResponse.json({ imported: newTrades.length, total: merged.length, trades: newTrades })
    } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Sync failed'
          return NextResponse.json({ error: msg }, { status: 500 })
    }
}
