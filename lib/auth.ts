import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { Redis } from '@upstash/redis'

const redis = new Redis({
          url: (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^["]+|["]+$/g, ''),
          token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^["]+|["]+$/g, ''),
})

export const authOptions: NextAuthOptions = {
          providers: [
                      CredentialsProvider({
                                    name: 'credentials',
                                    credentials: {
                                                    username: { label: 'Username', type: 'text' },
                                                    password: { label: 'Password', type: 'password' },
                                    },
                                    async authorize(credentials) {
                                                    if (!credentials?.username || !credentials?.password) return null

                                      const username = credentials.username
                                                    const password = credentials.password

                                      // Fallback: hardcoded admin credentials (env vars)
                                      if (
                                                        username === process.env.AUTH_USERNAME &&
                                                        password === process.env.AUTH_PASSWORD
                                                      ) {
                                                        return { id: '1', name: username, email: username }
                                      }

                                      // Redis lookup: try by email
                                      try {
                                                        const userData = await redis.get(`user:${username.toLowerCase()}`) as {
                                                                            email: string
                                                                            name: string
                                                                            passwordHash: string
                                                                            createdAt: string
                                                        } | null

                                                      if (userData && userData.passwordHash) {
                                                                          const passwordMatch = await bcrypt.compare(password, userData.passwordHash)
                                                                          if (passwordMatch) {
                                                                                                return {
                                                                                                                        id: userData.email,
                                                                                                                        name: userData.name,
                                                                                                                        email: userData.email,
                                                                                                        }
                                                                          }
                                                      }
                                      } catch (err) {
                                                        console.error('Redis auth error:', err)
                                      }

                                      return null
                                    },
                      }),
                    ],
          session: {
                      strategy: 'jwt',
                      maxAge: 30 * 24 * 60 * 60, // 30 days
          },
          pages: { signIn: '/login' },
          callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative URLs (like /dashboard)
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow URLs on same origin
      if (new URL(url).origin === baseUrl) return url.startsWith(baseUrl + '/') ? url : `${baseUrl}/dashboard`
      return baseUrl + '/dashboard'
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
