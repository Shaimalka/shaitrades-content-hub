import { NextResponse } from 'next/server'
import { generateScript, generateCaption, generateContentCalendar } from '@/lib/anthropic'

export async function POST(req: Request) {
  try {
    const { action, topic, hook, ideas } = await req.json()

    if (action === 'script') {
      const script = await generateScript(topic, hook)
      return NextResponse.json({ script })
    }

    if (action === 'caption') {
      const caption = await generateCaption(topic, hook)
      return NextResponse.json({ caption })
    }

    if (action === 'calendar') {
      const calendar = await generateContentCalendar(ideas || [])
      return NextResponse.json({ calendar })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
