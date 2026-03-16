const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY!
const COMPOSIO_BASE = 'https://backend.composio.dev/api/v1'

async function composioRequest(endpoint: string, method = 'GET', body?: object) {
  const res = await fetch(`${COMPOSIO_BASE}${endpoint}`, {
    method,
    headers: {
      'x-api-key': COMPOSIO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Composio error: ${res.statusText}`)
  return res.json()
}

export async function getInstagramUserInfo() {
  return composioRequest('/actions/execute', 'POST', {
    actionName: 'INSTAGRAM_GET_USER_INFO',
    input: { ig_user_id: 'me' },
    appName: 'instagram',
  })
}

export async function getInstagramMedia(limit = 12) {
  return composioRequest('/actions/execute', 'POST', {
    actionName: 'INSTAGRAM_GET_IG_USER_MEDIA',
    input: {
      ig_user_id: 'me',
      limit,
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
    },
    appName: 'instagram',
  })
}

export async function getInstagramInsights() {
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60
  return composioRequest('/actions/execute', 'POST', {
    actionName: 'INSTAGRAM_GET_USER_INSIGHTS',
    input: {
      ig_user_id: 'me',
      metric: ['reach', 'follower_count', 'total_interactions', 'accounts_engaged'],
      period: 'day',
      since: thirtyDaysAgo,
      until: now,
    },
    appName: 'instagram',
  })
}

export async function postToInstagram(imageUrl: string, caption: string) {
  return composioRequest('/actions/execute', 'POST', {
    actionName: 'INSTAGRAM_CREATE_PHOTO_POST',
    input: { image_url: imageUrl, caption },
    appName: 'instagram',
  })
}
