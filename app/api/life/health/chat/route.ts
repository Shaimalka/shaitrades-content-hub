import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, ''),
})

export async function POST(req: NextRequest) {
    try {
          const { messages } = await req.json()
          const logs = await redis.get('life:health') || []
                const settings = await redis.get('life:health:settings') || {}

                      const logArr = logs as any[]
          const totalLogs = logArr.length
          const avgSleep = totalLogs > 0
            ? (logArr.reduce((s: number, l: any) => s + (l.sleep || 0), 0) / totalLogs).toFixed(1)
                  : '0'
          const avgMood = totalLogs > 0
            ? (logArr.reduce((s: number, l: any) => s + (l.mood || 0), 0) / totalLogs).toFixed(1)
                  : '0'
          const avgEnergy = totalLogs > 0
            ? (logArr.reduce((s: number, l: any) => s + (l.energy || 0), 0) / totalLogs).toFixed(1)
                  : '0'
          const gymDays = logArr.filter((l: any) => l.gym).length
          const latestWeight = totalLogs > 0 ? logArr[totalLogs - 1].weight || 0 : 0

      const systemPrompt = `You are a personal health coach AI for the user's Life Hub. You have access to their full health log covering weight, sleep, gym, mood, and energy.

      HEALTH SETTINGS/GOALS:
      ${JSON.stringify(settings, null, 2)}

      HEALTH LOG DATA:
