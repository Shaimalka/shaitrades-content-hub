import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

export async function POST(req: NextRequest) {
    try {
          const body = await req.json()
          const { email, password, name } = body

      // Validate required fields
      if (!email || !password || !name) {
              return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
                      )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
                  return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                          )
          }

      // Validate password length
      if (password.length < 8) {
              return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
                      )
      }

      // Check if user already exists
      const existing = await redis.get(`user:${email.toLowerCase()}`)
          if (existing) {
                  return NextResponse.json(
                    { error: 'User already exists' },
                    { status: 400 }
                          )
          }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Save user to Redis
      await redis.set(`user:${email.toLowerCase()}`, {
              email: email.toLowerCase(),
              name,
              passwordHash,
              createdAt: new Date().toISOString(),
      })

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
          console.error('Signup error:', error)
          return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
                )
    }
}
