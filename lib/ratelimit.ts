import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

export function getRatelimit(): Ratelimit {
    if (!ratelimit) {
          const redis = new Redis({
                  url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
                  token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
                })
          ratelimit = new Ratelimit({
                  redis,
                  limiter: Ratelimit.slidingWindow(60, '60 s'),
                  analytics: false,
                })
        }
    return ratelimit
  }

export async function checkRateLimit(ip: string): Promise<{ success: boolean; limit: number; remaining: number }> {
    const rl = getRatelimit()
    const { success, limit, remaining } = await rl.limit(ip)
    return { success, limit, remaining }
  }
