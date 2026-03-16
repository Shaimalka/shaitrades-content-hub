const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY!
const COMPOSIO_BASE = 'https://backend.composio.dev/api/v2'
const CONNECTED_ACCOUNT_ID = process.env.COMPOSIO_CONNECTED_ACCOUNT_ID!

async function composioAction(actionName: string, input: Record<string, unknown>) {
  const res = await fetch(`${COMPOSIO_BASE}/actions/${actionName}/execute`, {
    method: 'POST',
    headers: {
      'x-api-key': COMPOSIO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connectedAccountId: CONNECTED_ACCOUNT_ID,
      input,
    }),
  })
  if (!res.ok) throw new Error(`Composio error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function getInstagramUserInfo() {
  return composioAction('INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me' })
}

export async function getInstagramMedia(limit = 12) {
  return composioAction('INSTAGRAM_GET_USER_MEDIA', {
    ig_user_id: 'me',
    limit,
  })
}

export async function getInstagramInsights() {
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60
  return composioAction('INSTAGRAM_GET_USER_INSIGHTS', {
    ig_user_id: 'me',
    metric: ['reach', 'follower_count', 'total_interactions', 'accounts_engaged'],
    period: 'day',
    since: String(thirtyDaysAgo),
    until: String(now),
  })
}

export async function postToInstagram(imageUrl: string, caption: string) {
  return composioAction('INSTAGRAM_CREATE_PHOTO_POST', {
    image_url: imageUrl,
    caption,
  })
}
