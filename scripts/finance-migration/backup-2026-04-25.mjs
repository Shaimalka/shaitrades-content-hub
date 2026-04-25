// scripts/finance-migration/backup-2026-04-25.mjs
//
// Pre-migration backup for Sprint A finance schema migration.
// For every user in `user:index`, copies these three keys into a sibling
// `:backup-2026-04-25` key:
//   - user:{userId}:assets
//   - user:{userId}:liabilities
//   - user:{userId}:nw:snapshots
//
// Idempotent: if the backup key already exists, it is left untouched
// (so re-running this script never overwrites the original pre-migration
// snapshot — important for rollback integrity).
//
// Each newly-written backup is verified by reading it back and comparing
// canonicalized JSON to the source. A mismatch throws and aborts.
//
// Run with: set -a && source .env.local && set +a && node scripts/finance-migration/backup-2026-04-25.mjs

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

const BACKUP_SUFFIX = 'backup-2026-04-25'
const SOURCE_KEY_TEMPLATES = [
  uid => `user:${uid}:assets`,
  uid => `user:${uid}:liabilities`,
  uid => `user:${uid}:nw:snapshots`,
]

// ---------- Upstash REST helpers ----------------------------------------------

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result // string | null | object/array
}

async function rexists(key) {
  const res = await fetch(`${url}/exists/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`EXISTS ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result === 1
}

async function rset(key, value) {
  // value must already be a string
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: value,
  })
  if (!res.ok) throw new Error(`SET ${key} → HTTP ${res.status} ${await res.text()}`)
}

async function rsmembers(key) {
  const res = await fetch(`${url}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`SMEMBERS ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result || []
}

// ---------- Canonical form (for verification) ---------------------------------

// Upstash auto-parses JSON-shaped strings on GET, but the live writers in this
// repo always SET via JSON.stringify(...). Canonicalize both sides to a single
// JSON string so source/backup compare reliably.
function canonical(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try { return JSON.stringify(JSON.parse(raw)) } catch { return JSON.stringify(raw) }
  }
  return JSON.stringify(raw)
}

// ---------- Per-key backup ----------------------------------------------------

async function backupKey(sourceKey) {
  const backupKey = `${sourceKey}:${BACKUP_SUFFIX}`

  // Idempotency: never overwrite an existing backup.
  if (await rexists(backupKey)) {
    console.log(`  · ${sourceKey} → SKIP (backup already exists at ${backupKey})`)
    return { decision: 'skipped_already_exists' }
  }

  const source = await rget(sourceKey)
  if (source === null) {
    console.log(`  · ${sourceKey} → SKIP (source key absent)`)
    return { decision: 'skipped_source_missing' }
  }

  const sourceCanon = canonical(source)
  if (sourceCanon === null) {
    console.log(`  · ${sourceKey} → SKIP (source value canonicalized to null)`)
    return { decision: 'skipped_source_missing' }
  }

  // Write the canonical JSON string. (This matches how the live writers store
  // these keys — JSON.stringify(...) — so the backup is byte-equivalent for
  // anything written via the existing API.)
  await rset(backupKey, sourceCanon)

  // Verify by reading back and comparing canonical strings.
  const verify = await rget(backupKey)
  const verifyCanon = canonical(verify)
  if (verifyCanon !== sourceCanon) {
    throw new Error(
      `Verification failed for ${sourceKey}:\n` +
        `  source canonical (len=${sourceCanon.length}): ${sourceCanon.slice(0, 200)}…\n` +
        `  backup canonical (len=${(verifyCanon || '').length}): ${(verifyCanon || '').slice(0, 200)}…`
    )
  }

  console.log(`  · ${sourceKey} → CREATED + VERIFIED at ${backupKey} (${sourceCanon.length} bytes)`)
  return { decision: 'created_and_verified', bytes: sourceCanon.length }
}

// ---------- Per-user backup ---------------------------------------------------

async function backupUser(userId) {
  console.log(`\n[user] ${userId}`)
  const tally = {
    created_and_verified: 0,
    skipped_already_exists: 0,
    skipped_source_missing: 0,
  }
  for (const tmpl of SOURCE_KEY_TEMPLATES) {
    const sourceKey = tmpl(userId)
    const { decision } = await backupKey(sourceKey)
    tally[decision] += 1
  }
  return tally
}

// ---------- Main --------------------------------------------------------------

async function main() {
  const userIds = await rsmembers('user:index')
  console.log(`# Finance migration backup — ${new Date().toISOString()}`)
  console.log(`# Suffix: :${BACKUP_SUFFIX}`)
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}`)

  const perUser = {}
  for (const userId of userIds) {
    perUser[userId] = await backupUser(userId)
  }

  console.log('\n# Final summary')
  let totalCreated = 0, totalSkippedExists = 0, totalSkippedMissing = 0
  for (const [userId, t] of Object.entries(perUser)) {
    console.log(
      `- ${userId}: ` +
        `created+verified=${t.created_and_verified}, ` +
        `skipped(already exists)=${t.skipped_already_exists}, ` +
        `skipped(source missing)=${t.skipped_source_missing}`
    )
    totalCreated += t.created_and_verified
    totalSkippedExists += t.skipped_already_exists
    totalSkippedMissing += t.skipped_source_missing
  }
  console.log(
    `Total: created+verified=${totalCreated}, ` +
      `skipped(already exists)=${totalSkippedExists}, ` +
      `skipped(source missing)=${totalSkippedMissing}`
  )
}

main().catch(err => {
  console.error('\nBackup FAILED:', err)
  process.exit(1)
})
