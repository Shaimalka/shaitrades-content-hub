export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/((?!api/auth|login|signup|privacy|terms|_next/static|_next/image|favicon.ico).*)'],
}
