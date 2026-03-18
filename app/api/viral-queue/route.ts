import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const VIRAL_QUEUE_FILE = path.join(process.cwd(), 'data', 'viralQueue.json')

export async function GET() {
  try {
    let queue: any[] = []
    try {
      const content = await fs.readFile(VIRAL_QUEUE_FILE, 'utf-8')
      queue = JSON.parse(content)
    } catch {
      queue = []
    }
    return NextResponse.json({ scripts: queue, total: queue.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { index, status } = await req.json()
    let queue: any[] = []
    try {
      const content = await fs.readFile(VIRAL_QUEUE_FILE, 'utf-8')
      queue = JSON.parse(content)
    } catch {
      queue = []
    }
    if (index >= 0 && index < queue.length) {
      queue[index] = { ...queue[index], status }
      await fs.writeFile(VIRAL_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8')
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
