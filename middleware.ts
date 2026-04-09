import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // If authenticated user hits the root, redirect to dashboard
    if (token && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes: root, login, signup, privacy, terms, api/auth, static assets
        const publicRoutes = ['/', '/login', '/signup', '/privacy', '/terms']
        if (publicRoutes.includes(pathname)) return true
        if (pathname.startsWith('/api/auth')) return true
        if (pathname.startsWith('/_next')) return true
        if (pathname.startsWith('/favicon')) return true

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
