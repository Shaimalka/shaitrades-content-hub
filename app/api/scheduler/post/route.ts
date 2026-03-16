import { NextResponse } from 'next/server'
import { postToInstagram } from '@/lib/composio'

export async function POST(req: Request) {
  try {
    const { image_url, caption } = await req.json()

    if (!image_url || !caption) {
      return NextResponse.json({ error: 'image_url and caption are required' }, { status: 400 })
    }

    const result = await postToInstagram(image_url, caption)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Post scheduler error:', error)
    return NextResponse.json({ error: 'Failed to post to Instagram' }, { status: 500 })
  }
}
