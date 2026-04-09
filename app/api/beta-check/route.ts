import { NextRequest, NextResponse } from 'next/server'

// Set BETA_PIN in Vercel environment variables
export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  const betaPin = process.env.BETA_PIN

  if (!betaPin) {
    return NextResponse.json({ success: false, error: 'BETA_PIN not configured' }, { status: 500 })
  }

  if (pin === betaPin) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('trabits_beta', 'granted', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  }

  return NextResponse.json({ success: false })
}
