import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow all /api routes without auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow the login page itself
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Check for valid auth-token cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
