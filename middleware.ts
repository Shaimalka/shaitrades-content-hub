import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

    // Allow API routes to pass through without auth
      if (pathname.startsWith('/api/')) {
          return NextResponse.next()
            }

              // Allow login page
                if (pathname === '/login') {
                    return NextResponse.next()
                      }

                        // Check for auth-token cookie
                          const token = request.cookies.get('auth-token')?.value

                            if (!token) {
                                const loginUrl = new URL('/login', request.url)
                                    return NextResponse.redirect(loginUrl)
                                      }

                                        return NextResponse.next()
                                        }

                                        export const config = {
                                          matcher: [
                                              '/((?!_next/static|_next/image|favicon.ico).*)',
                                                ],
                                                }