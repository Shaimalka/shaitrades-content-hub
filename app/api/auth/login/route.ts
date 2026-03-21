import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
      const { username, password } = await request.json()

          const adminUsername = process.env.ADMIN_USERNAME
              const adminPassword = process.env.ADMIN_PASSWORD

                  if (username === adminUsername && password === adminPassword) {
                        const response = NextResponse.json({ success: true })
                              response.cookies.set('auth-token', 'authenticated', {
                                      httpOnly: true,
                                              secure: process.env.NODE_ENV === 'production',
                                                      sameSite: 'lax',
                                                              maxAge: 60 * 60 * 24 * 7, // 7 days
                                                                      path: '/',
                                                                            })
                                                                                  return response
                                                                                      }

                                                                                          return NextResponse.json(
                                                                                                { success: false, message: 'Invalid credentials' },
                                                                                                      { status: 401 }
                                                                                                          )
                                                                                                            } catch {
                                                                                                                return NextResponse.json(
                                                                                                                      { success: false, message: 'Internal server error' },
                                                                                                                            { status: 500 }
                                                                                                                                )
                                                                                                                                  }
                                                                                                                                  }