const APIFY_API_KEY = process.env.APIFY_API_KEY!

export async function scrapeInstagramProfiles(usernames: string[]) {
  const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernames,
      resultsLimit: 20,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    throw new Error(`Apify error: ${response.statusText}`)
  }

  return response.json()
}

export async function scrapeInstagramPosts(usernames: string[], postsPerProfile = 12) {
  const url = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directUrls: usernames.map(u => `https://www.instagram.com/${u}/`),
      resultsType: 'posts',
      resultsLimit: postsPerProfile,
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!response.ok) {
    throw new Error(`Apify error: ${response.statusText}`)
  }

  return response.json()
}
