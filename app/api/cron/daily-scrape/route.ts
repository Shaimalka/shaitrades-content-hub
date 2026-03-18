import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const TRACKED_FILE = path.join(DATA_DIR, 'trackedCompetitors.json')
const LAST_SCRAPE_FILE = path.join(DATA_DIR, 'lastScrape.json')
const VIRAL_QUEUE_FILE = path.join(DATA_DIR, 'viralQueue.json')

async function readJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

// GET — returns last scrape timestamps (for sync indicator in frontend)
export async function GET() {
  try {
    const lastScrape = await readJSON<Record<string, string>>(LAST_SCRAPE_FILE, {})
    return NextResponse.json({ lastScrape })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — triggered by Vercel cron (0 1 * * *)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { newPosts: number; scriptsGenerated: boolean; error?: string }> = {}

  try {
    const usernames: string[] = await readJSON<string[]>(TRACKED_FILE, [])
    const lastScrape: Record<string, string> = await readJSON<Record<string, string>>(LAST_SCRAPE_FILE, {})
    const existingQueue: any[] = await readJSON<any[]>(VIRAL_QUEUE_FILE, [])
    const newQueueEntries: any[] = []

    for (const username of usernames) {
      try {
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
        const lastScrapeTime = lastScrape[username] ? new Date(lastScrape[username]).getTime() : 0
        const allPosts: any[] = competitor.allPosts || competitor.topPosts || []
        const newPosts = allPosts.filter((p: any) => {
          if (!p.timestamp) return false
          return new Date(p.timestamp).getTime() > lastScrapeTime
        })
        results[username] = { newPosts: newPosts.length, scriptsGenerated: false }
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
              newQueueEntries.push(...scripts.map((s: any) => ({ ...s, status: 'pending' })))
              results[username].scriptsGenerated = true
            }
          } catch (viralErr: any) {
            results[username].error = `Viral scripts failed: ${viralErr.message}`
          }
        }
        lastScrape[username] = new Date().toISOString()
      } catch (err: any) {
        results[username] = { newPosts: 0, scriptsGenerated: false, error: err.message }
      }
    }

    if (newQueueEntries.length > 0) {
      const existingHandles = new Set(existingQueue.map((s: any) => s.competitorUsername))
      const deduped = newQueueEntries.filter((s: any) => !existingHandles.has(s.competitorUsername))
      await writeJSON(VIRAL_QUEUE_FILE, [...deduped, ...existingQueue])
    }
    await writeJSON(LAST_SCRAPE_FILE, lastScrape)

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
