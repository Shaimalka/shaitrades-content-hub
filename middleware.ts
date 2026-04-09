import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── BETA GATE ────────────────────────────────────────────────────────────────
// Routes exempt from the beta PIN gate
const BETA_EXEMPT = ['/beta-access', '/api/beta-check']

function betaGate(req: NextRequest): NextResponse | null {
    const pathname = req.nextUrl.pathname

  // Skip gate for exempt routes and static assets
  if (BETA_EXEMPT.some((p) => pathname.startsWith(p))) return null
    if (pathname.startsWith('/_next')) return null
    if (pathname.startsWith('/favicon')) return null

  // Check for valid beta cookie
  const betaCookie = req.cookies.get('trabits_beta')
    if (betaCookie?.value === 'granted') return null

  // No valid cookie → redirect to /beta-access
  return NextResponse.redirect(new URL('/beta-access', req.url))
}
// ──────────────────────────────────────────────────────────────────────────────

export default withAuth(
    function middleware(req) {
          // Beta gate runs first — if it returns a redirect, bail out immediately
      const betaRedirect = betaGate(req)
          if (betaRedirect) return betaRedirect

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

                  // Beta-gate exempt routes are always allowed through
                  if (BETA_EXEMPT.some((p) => pathname.startsWith(p))) return true

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
