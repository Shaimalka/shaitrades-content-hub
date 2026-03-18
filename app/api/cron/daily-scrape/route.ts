export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// ── Redis key names (same logical names as the old JSON files) ────────────────
const KEYS = {
  trackedCompetitors: 'trackedCompetitors',
  lastScrape: 'lastScrape',
  viralQueue: 'viralQueue',
} as const

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

// ── GET — returns last scrape timestamps (for sync indicator in frontend) ─────
export async function GET() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  try {
    const lastScrape = (await redis.get<Record<string, string>>(KEYS.lastScrape)) ?? {}
    return NextResponse.json({ lastScrape })
  } catch (error: any) {
    console.error('GET /api/cron/daily-scrape error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── POST — triggered by Vercel cron (0 1 * * * = 8 AM Thailand time) ─────────
export async function POST(req: NextRequest) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // Verify Vercel cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<
    string,
    { newPosts: number; scriptsGenerated: boolean; error?: string }
  > = {}

  try {
    // Read from Redis (fall back to sensible defaults if keys don't exist yet)
    const usernames: string[] =
      (await redis.get<string[]>(KEYS.trackedCompetitors)) ??
      ['jordanwelch', 'rp.profits', 'thepbtrading', 'cuebanks', 'humbledtrader', 'mads.orb', 'pjtradesnq', 'itsadamitka']

    const lastScrape: Record<string, string> =
      (await redis.get<Record<string, string>>(KEYS.lastScrape)) ?? {}

    const existingQueue: any[] = (await redis.get<any[]>(KEYS.viralQueue)) ?? []
    const newQueueEntries: any[] = []

    for (const username of usernames) {
      try {
        // 1. Scrape competitor
        const scrapeRes = await fetch(`${BASE_URL}/api/competitors/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handles: [username] }),
        })

        if (!scrapeRes.ok) {
          results[username] = { newPosts: 0, scriptsGenerated: false, error: 'Scrape failed' }
          continue
        }

        const scrapeData = await scrapeRes.json()
        const competitor = scrapeData.competitors?.[0]

        if (!competitor) {
          results[username] = { newPosts: 0, scriptsGenerated: false, error: 'No data returned' }
          continue
        }

        // 2. Compare new posts vs last scrape timestamp
        const lastScrapeTime = lastScrape[username]
          ? new Date(lastScrape[username]).getTime()
          : 0
        const allPosts: any[] = competitor.allPosts || competitor.topPosts || []
        const newPosts = allPosts.filter((p: any) => {
          if (!p.timestamp) return false
          return new Date(p.timestamp).getTime() > lastScrapeTime
        })

        results[username] = { newPosts: newPosts.length, scriptsGenerated: false }

        // 3. If 3+ new posts since last scrape, automatically generate viral scripts
        if (newPosts.length >= 3) {
          try {
            const viralRes = await fetch(`${BASE_URL}/api/competitors/viral-scripts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ competitor, posts: allPosts }),
            })
            if (viralRes.ok) {
              const viralData = await viralRes.json()
              const scripts: any[] = viralData.viralScripts || []
              newQueueEntries.push(
                ...scripts.map((s: any) => ({ ...s, status: 'pending' }))
              )
              results[username].scriptsGenerated = true
            }
          } catch (viralErr: any) {
            results[username].error = `Viral scripts failed: ${viralErr.message}`
          }
        }

        // 4. Update last scrape timestamp for this competitor
        lastScrape[username] = new Date().toISOString()
      } catch (err: any) {
        results[username] = { newPosts: 0, scriptsGenerated: false, error: err.message }
      }
    }

    // 5. Persist updated viral queue (prepend new, keep existing, dedupe by handle)
    if (newQueueEntries.length > 0) {
      const existingHandles = new Set(existingQueue.map((s: any) => s.competitorUsername))
      const deduped = newQueueEntries.filter(
        (s: any) => !existingHandles.has(s.competitorUsername)
      )
      await redis.set(KEYS.viralQueue, [...deduped, ...existingQueue])
    }

    // 6. Persist updated last-scrape timestamps
    await redis.set(KEYS.lastScrape, lastScrape)

    return NextResponse.json({
      success: true,
      scrapedAt: new Date().toISOString(),
      results,
      newScriptsAdded: newQueueEntries.length,
    })
  } catch (error: any) {
    console.error('Daily scrape cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
