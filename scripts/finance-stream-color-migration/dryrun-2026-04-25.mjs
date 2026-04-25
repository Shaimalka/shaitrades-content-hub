// scripts/finance-stream-color-migration/dryrun-2026-04-25.mjs
//
// READ-ONLY pre-flight audit for stream-color migration (Item 3).
// Iterates every user in `user:index` and reports streams stored at
// `finance:{userId}:streams`, flagging any with the neon seed colors
// '#00ff88' (trading) or '#00f2ff' (content).
//
// Performs zero writes. Safe to run any time.
//
// Run with: set -a && source .env.local && set +a && node scripts/finance-stream-color-migration/dryrun-2026-04-25.mjs

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

// Migration mapping — derived from server seed vs client palette.
const NEON_TO_BRAND = {
  trading: { neon: '#00ff88', brand: '#00c48c' },
  content: { neon: '#00f2ff', brand: '#2563eb' },
}

// ---------- Upstash REST helpers ----------------------------------------------

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result
}

async function rsmembers(key) {
  const res = await fetch(`${url}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`SMEMBERS ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result || []
}

function parseOrEmpty(raw) {
  if (raw == null) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return Array.isArray(raw) ? raw : []
}

// ---------- Per-stream classifier ---------------------------------------------

function classifyStream(s) {
  const findings = []
  const has = k => Object.prototype.hasOwnProperty.call(s, k)
  for (const required of ['id', 'name', 'color', 'emoji']) {
    if (!has(required)) findings.push(`missing ${required}`)
  }
  const extras = Object.keys(s).filter(k => !['id', 'name', 'color', 'emoji'].includes(k))
  if (extras.length) findings.push(`extra fields: ${JSON.stringify(extras)}`)

  const isDefault = s.id === 'trading' || s.id === 'content'
  const expectedNeon = isDefault ? NEON_TO_BRAND[s.id]?.neon : null
  const expectedBrand = isDefault ? NEON_TO_BRAND[s.id]?.brand : null

  let action
  if (!isDefault) {
    action = 'leave-alone (custom stream)'
  } else if (s.color === expectedBrand) {
    action = 'already-clean'
  } else if (s.color === expectedNeon) {
    action = `migrate ${expectedNeon} → ${expectedBrand}`
  } else {
    action = `unexpected color ${JSON.stringify(s.color)} for default stream — leave alone`
  }
  return { findings, isDefault, action }
}

// ---------- Per-user audit ----------------------------------------------------

async function auditUser(userId) {
  const key = `finance:${userId}:streams`
  const raw = await rget(key)
  const streams = parseOrEmpty(raw)
  const reports = streams.map((s, idx) => ({ idx, stream: s, ...classifyStream(s) }))
  const tally = {
    total: streams.length,
    keyPresent: raw !== null,
    migratable: reports.filter(r => r.action.startsWith('migrate ')).length,
    alreadyClean: reports.filter(r => r.action === 'already-clean').length,
    customStreams: reports.filter(r => r.action.startsWith('leave-alone')).length,
    unexpected: reports.filter(r => r.action.startsWith('unexpected ')).length,
    withFindings: reports.filter(r => r.findings.length > 0).length,
  }
  return { userId, key, keyPresent: raw !== null, streams, reports, tally }
}

// ---------- Main --------------------------------------------------------------

async function main() {
  const userIds = await rsmembers('user:index')
  console.log(`# Stream-color migration dry-run (read-only) — ${new Date().toISOString()}`)
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}\n`)

  const reports = []
  for (const userId of userIds) {
    try {
      reports.push(await auditUser(userId))
    } catch (err) {
      reports.push({ userId, error: err?.message || String(err) })
    }
  }

  console.log(JSON.stringify(reports, null, 2))

  console.log('\n# Summary')
  let totalMigratable = 0, totalClean = 0, totalCustom = 0, totalUnexpected = 0
  for (const r of reports) {
    if (r.error) { console.log(`- ${r.userId}: ERROR — ${r.error}`); continue }
    console.log(
      `- ${r.userId}: keyPresent=${r.keyPresent}, total=${r.tally.total}, ` +
        `migratable=${r.tally.migratable}, clean=${r.tally.alreadyClean}, ` +
        `custom=${r.tally.customStreams}, unexpected=${r.tally.unexpected}, ` +
        `withFindings=${r.tally.withFindings}`
    )
    totalMigratable += r.tally.migratable
    totalClean += r.tally.alreadyClean
    totalCustom += r.tally.customStreams
    totalUnexpected += r.tally.unexpected
  }
  console.log(
    `Totals: migratable=${totalMigratable}, clean=${totalClean}, custom=${totalCustom}, unexpected=${totalUnexpected}`
  )
}

main().catch(err => {
  console.error('Dry-run failed:', err)
  process.exit(1)
})
