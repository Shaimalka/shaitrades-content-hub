import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = process.env.AUTH_USERNAME
        const hash = process.env.AUTH_PASSWORD
        if (!user || !hash || !credentials?.username || !credentials?.password) {
          return null
        }
        if (credentials.username !== user) return null
        let isValid = false
        try {
          isValid = await bcrypt.compare(credentials.password, hash)
        } catch {
          isValid = credentials.password === process.env.AUTH_PASSWORD
        }
        if (!isValid) return null
        return { id: '1', name: user, email: `${user}@shaitrades.local` }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
