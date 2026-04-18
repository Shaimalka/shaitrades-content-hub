import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shailoop1@gmail.com'

// One-time cleanup route — deletes all legacy global Redis keys from before the
// multi-tenancy fix. Hit this endpoint once after deploy, then delete this file.
//
// Auth guard: only the admin email may call this route.
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerEmail = session.user?.email
    if (!callerEmail || callerEmail !== ADMIN_EMAIL) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  const deleted: string[] = []

      // ── Static global keys to delete ─────────────────────────────────────────────
      const staticKeys = [
            'life:habits',
            'life:habits:completions',
            'life:habit-completions',
            'life:trading:logs',
            'life:health',
            'life:health:settings',
            'life:journal',
            'life:finance:income',
            'life:finance:expenses',
            'life:finance:streams',
            'life:reviews',
            'life:goals',
          ]

  for (const key of staticKeys) {
        try {
                const result = await redis.del(key)
                if (result > 0) {
                          deleted.push(key)
                          console.log(`[wipe-global-keys] Deleted: ${key}`)
                } else {
                          console.log(`[wipe-global-keys] Not found (already gone): ${key}`)
                }
        } catch (err) {
                console.error(`[wipe-global-keys] Error deleting ${key}:`, err)
        }
  }

  // ── Scan and delete all life:chat:* keys ──────────────────────────────────────
  try {
        let cursor = 0
        do {
                const [nextCursor, keys] = await redis.scan(cursor, { match: 'life:chat:*', count: 100 })
                cursor = Number(nextCursor)
                for (const key of keys) {
                          try {
                                      await redis.del(key)
                                      deleted.push(key)
                                      console.log(`[wipe-global-keys] Deleted chat key: ${key}`)
                          } catch (err) {
                                      console.error(`[wipe-global-keys] Error deleting chat key ${key}:`, err)
                          }
                }
        } while (cursor !== 0)
  } catch (err) {
        console.error('[wipe-global-keys] Error scanning life:chat:* keys:', err)
  }

  console.log(`[wipe-global-keys] Done. Total deleted: ${deleted.length}`)
    return NextResponse.json({ deleted, count: deleted.length })
}
