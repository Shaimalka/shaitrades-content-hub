// scripts/finance-stream-color-migration/migrate-2026-04-25.mjs
//
// Stream-color migration (Item 3): swaps neon seed colors for brand palette
// on default streams (trading + content). Custom streams and unexpected
// default-stream colors are left untouched.
//
// Modes:
//   default    — DRY-RUN: prints intended changes per stream, writes nothing
//   --commit   — applies changes, verifies, fails loud on any mismatch
//
// Idempotent: re-running --commit on already-migrated data is a no-op.
// Per-key write only fires if at least one stream in the array changes.
//
// Run with:
//   set -a && source .env.local && set +a && node scripts/finance-stream-color-migration/migrate-2026-04-25.mjs           # dry-run
//   set -a && source .env.local && set +a && node scripts/finance-stream-color-migration/migrate-2026-04-25.mjs --commit  # apply

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

const COMMIT = process.argv.includes('--commit')
const RUN_TS = new Date().toISOString()

// Migration mapping — matches the dry-run audit script.
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

async function rset(key, value) {
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: value,
  })
  if (!res.ok) throw new Error(`SET ${key} → HTTP ${res.status} ${await res.text()}`)
}

async function rstrlen(key) {
  const res = await fetch(`${url}/strlen/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`STRLEN ${key} → HTTP ${res.status}`)
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

function canonical(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try { return JSON.stringify(JSON.parse(raw)) } catch { return JSON.stringify(raw) }
  }
  return JSON.stringify(raw)
}

// ---------- Per-stream classifier ---------------------------------------------

function classifyStream(s) {
  const mapping = NEON_TO_BRAND[s.id]
  if (!mapping) {
    return { changed: false, item: s, action: 'skip-custom (id outside trading/content)' }
  }
  if (s.color === mapping.brand) {
    return { changed: false, item: s, action: 'already-migrated' }
  }
  if (s.color === mapping.neon) {
    // Preserve every other field; only swap color.
    return { changed: true, item: { ...s, color: mapping.brand }, action: `migrate ${mapping.neon} → ${mapping.brand}` }
  }
  return { changed: false, item: s, action: `skip-unexpected (color ${JSON.stringify(s.color)} on default stream — leave alone)` }
}

// ---------- Per-user processor ------------------------------------------------

async function processUser(userId) {
  console.log(`\n[user] ${userId}`)
  const sourceKey = `finance:${userId}:streams`
  const raw = await rget(sourceKey)

  if (raw === null) {
    console.log(`  STREAMS: source key absent — no-op`)
    return { total: 0, migrated: 0, skipped: 0, written: 0 }
  }

  const items = parseOrEmpty(raw)
  if (!Array.isArray(items)) {
    throw new Error(`${sourceKey}: expected array, got ${typeof items}`)
  }
  if (items.length === 0) {
    console.log(`  STREAMS: empty array — no-op`)
    return { total: 0, migrated: 0, skipped: 0, written: 0 }
  }

  const results = items.map((item, idx) => ({ idx, ...classifyStream(item) }))

  for (const r of results) {
    const idLabel = `id=${items[r.idx]?.id ?? '<no-id>'} color=${JSON.stringify(items[r.idx]?.color)}`
    if (r.changed) {
      console.log(`  STREAMS[${r.idx}] ${idLabel} → ${COMMIT ? 'MIGRATING' : 'WOULD migrate'} — ${r.action}`)
      if (!COMMIT) console.log(`      next: ${JSON.stringify(r.item)}`)
    } else {
      console.log(`  STREAMS[${r.idx}] ${idLabel} → ${r.action}`)
    }
  }

  const changedCount = results.filter(r => r.changed).length
  const tally = {
    total: items.length,
    migrated: changedCount,
    skipped: items.length - changedCount,
    written: 0,
  }

  if (changedCount === 0) {
    console.log(`  STREAMS: no items changed — no write needed`)
    return tally
  }

  const nextArr = results.map(r => r.item)
  const nextCanon = JSON.stringify(nextArr)
  const expectedBytes = Buffer.byteLength(nextCanon, 'utf8')

  if (!COMMIT) {
    console.log(`  STREAMS: WOULD write ${expectedBytes} bytes back to ${sourceKey}`)
    return tally
  }

  // --- COMMIT path: write + verify ---
  await rset(sourceKey, nextCanon)
  const verifyRaw = await rget(sourceKey)
  const verifyCanon = canonical(verifyRaw)
  if (verifyCanon !== nextCanon) {
    throw new Error(
      `Verification failed for ${sourceKey}:\n` +
        `  intended (len=${nextCanon.length}): ${nextCanon.slice(0, 200)}…\n` +
        `  re-read  (len=${(verifyCanon || '').length}): ${(verifyCanon || '').slice(0, 200)}…`
    )
  }
  const actualBytes = await rstrlen(sourceKey)
  if (actualBytes !== expectedBytes) {
    throw new Error(`STRLEN mismatch for ${sourceKey}: expected ${expectedBytes} bytes, server reported ${actualBytes}`)
  }
  tally.written = 1
  console.log(`  STREAMS: WROTE ${expectedBytes} bytes to ${sourceKey} + VERIFIED (canonical + STRLEN)`)
  return tally
}

// ---------- Main --------------------------------------------------------------

async function main() {
  console.log(`# Stream-color migration — ${RUN_TS}`)
  console.log(`# Mode: ${COMMIT ? '--commit (will write)' : 'DRY-RUN (no writes)'}`)

  const userIds = await rsmembers('user:index')
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}`)

  const perUser = {}
  for (const userId of userIds) {
    perUser[userId] = await processUser(userId)
  }

  console.log('\n# Final summary')
  let total = 0, migrated = 0, skipped = 0, written = 0
  for (const [userId, t] of Object.entries(perUser)) {
    console.log(
      `- ${userId}: total=${t.total} migrated=${t.migrated} skipped=${t.skipped} writes=${t.written}`
    )
    total += t.total; migrated += t.migrated; skipped += t.skipped; written += t.written
  }
  console.log(`Totals: ${migrated}/${total} migrated (${skipped} skipped, ${written} key writes)`)
  if (!COMMIT) {
    console.log('\n(DRY-RUN complete. Re-run with --commit to apply.)')
  } else {
    console.log('\n(--commit complete. All writes verified.)')
  }
}

main().catch(err => {
  console.error('\nMigration FAILED:', err)
  process.exit(1)
})
