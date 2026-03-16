import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateContentIdeas(topPosts: object[]) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a trading/finance content strategist for @shaitrades on Instagram.

Based on these top performing posts this week in the trading/finance niche:
${JSON.stringify(topPosts, null, 2)}

Generate 3 actionable content ideas for @shaitrades to recreate, each with:
1. Title
2. 5 hook variations
3. Video script outline
4. Caption + hashtags
5. Why it will perform well

Respond as JSON array of content ideas.`
    }]
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function generateScript(topic: string, hook: string) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Write a 60-second Instagram Reel script for @shaitrades (trading educator) about: "${topic}"
Hook to use: "${hook}"

Format:
HOOK (0-3s): ...
PROBLEM (3-10s): ...
BODY (10-50s): [3 key points]
CTA (50-60s): ...

Make it punchy, educational, and action-driving. Trading/finance audience.`
    }]
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export async function generateCaption(topic: string, script: string) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Write an Instagram caption for @shaitrades post about: "${topic}"
Script context: ${script.substring(0, 300)}

Requirements:
- Strong first line (hook)
- 3-5 lines max
- CTA to link in bio
- 15-20 relevant hashtags
- Trading/finance niche

Return as: CAPTION: ... HASHTAGS: ...`
    }]
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export async function generateContentCalendar(ideas: object[]) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Create a 30-day Instagram content calendar for @shaitrades (trading educator) starting from today.

Content ideas to draw from: ${JSON.stringify(ideas)}

Mix of content types: Reels (60%), Carousels (25%), Stories (15%)
Topics: trading tips, mindset, market analysis, beginner guides, income proof, myth-busting

Return as JSON array of 30 objects: { date, content_type, topic, hook, status: "planned" }`
    }]
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function analyzePostPerformance(posts: object[]) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze these top performing trading/finance Instagram posts and identify why each performed well:
${JSON.stringify(posts, null, 2)}

For each post identify:
- Hook type used
- Content format
- Why it performed well (psychology, topic, timing)
- Key takeaway for content creators

Return as JSON array.`
    }]
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
