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

function parseCSV(csv: string): Record<string, string>[] {
    const lines = csv.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, '').trim())
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i], delimiter)
        if (values.length < headers.length) continue
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = (values[idx] || '').replace(/^"|"$/g, '').trim() })
        rows.push(row)
    }
    return rows
}

function splitCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes }
        else if (ch === delimiter && !inQuotes) { result.push(current); current = '' }
        else { current += ch }
    }
    result.push(current)
    return result
}

function extractTime(dateTimeStr: string): string {
    try {
        if (!dateTimeStr) return '00:00'
        const d = new Date(dateTimeStr)
        if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5)
        const parts = dateTimeStr.split(' ')
        if (parts.length >= 2) return parts[1].slice(0, 5)
    } catch { }
    return '00:00'
}

function formatDate(dateStr: string): string {
    try {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return y + '-' + m + '-' + day
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10)
        const parts = dateStr.split('/')
        if (parts.length === 3) {
            const [m, d2, y] = parts
            return y.padStart(4, '0') + '-' + m.padStart(2, '0') + '-' + d2.padStart(2, '0')
        }
    } catch { }
    return dateStr
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user?.email
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const TRADING_KEY = `trading:${userId}:logs`
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
        const body = await request.json()
        const { csv } = body as { csv: string }
        if (!csv || typeof csv !== 'string') {
            return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })
        }
        const rows = parseCSV(csv)
        if (rows.length === 0) {
            return NextResponse.json({ error: 'No rows found in CSV' }, { status: 400 })
        }
        const existing: Array<Record<string, unknown>> = (await redis.get(TRADING_KEY) as Array<Record<string, unknown>>) || []
        const existingKeys = new Set(existing.map(t => t.date + '|' + t.entryPrice + '|' + t.exitPrice + '|' + t.contracts))
        const newTrades: Array<Record<string, unknown>> = []
        let skipped = 0
        for (const row of rows) {
            const pnlRaw = row['PnL'] ?? row['pnl'] ?? row['P&L'] ?? ''
            const pnl = parseFloat(pnlRaw)
            if (!pnlRaw || isNaN(pnl) || pnl === 0) { skipped++; continue }
            const account = row['Account'] ?? ''
            const tradeDate = row['TradeDate'] ?? row['Trade Date'] ?? ''
            const contract = row['Contract'] ?? row['Symbol'] ?? ''
            const buySell = row['Buy/Sell'] ?? row['Side'] ?? ''
            const quantity = row['Quantity'] ?? row['Qty'] ?? '0'
            const closeDateTime = row['CloseDateTime'] ?? row['Close Date/Time'] ?? ''
            const entryPriceRaw = row['EntryPrice'] ?? row['Entry Price'] ?? row['Price'] ?? '0'
            const exitPriceRaw = row['ExitPrice'] ?? row['Exit Price'] ?? '0'
            const entryPrice = parseFloat(entryPriceRaw) || 0
            const exitPrice = parseFloat(exitPriceRaw) || 0
            const contracts = parseInt(quantity, 10) || 1
            const date = formatDate(tradeDate || closeDateTime)
            const time = extractTime(closeDateTime)
            const direction = buySell.trim().toLowerCase() === 'buy' ? 'Long' : 'Short'
            const dedupKey = date + '|' + entryPrice + '|' + exitPrice + '|' + contracts
            if (existingKeys.has(dedupKey)) { skipped++; continue }
            const id = 'tv-' + date + '-' + Math.random().toString(36).slice(2)
            const notes = 'Imported from Tradovate · ' + contract + (account ? ' · Account: ' + account : '')
            newTrades.push({
                id, date, time, direction, entryPrice, exitPrice, contracts, pnl, notes,
                emotion: 3, accountName: account || undefined, source: 'csv-import',
                createdAt: new Date().toISOString()
            })
            existingKeys.add(dedupKey)
        }
        if (newTrades.length > 0) {
            const merged = existing.concat(newTrades)
            await redis.set(TRADING_KEY, merged)
        }
        return NextResponse.json({
            imported: newTrades.length, skipped,
            total: existing.length + newTrades.length
        })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Import failed'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
