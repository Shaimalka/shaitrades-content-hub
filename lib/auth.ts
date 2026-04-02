import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
        providers: [
                  CredentialsProvider({
                              name: 'credentials',
                              credentials: {
                                            username: { label: 'Username', type: 'text' },
                                            password: { label: 'Password', type: 'password' },
                              },
                              async authorize(credentials) {
                                            console.log('authorize called')
                                            console.log('username received:', credentials?.username)
                                            console.log('AUTH_USERNAME:', process.env.AUTH_USERNAME)
                                            console.log('password received:', credentials?.password)
                                            console.log('AUTH_PASSWORD:', process.env.AUTH_PASSWORD)
                                            if (
                                                            credentials?.username === process.env.AUTH_USERNAME &&
                                                            credentials?.password === process.env.AUTH_PASSWORD
                                                          ) {
                                                            return { id: '1', name: credentials?.username ?? '' }
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
        secret: process.env.NEXTAUTH_SECRET,
}
