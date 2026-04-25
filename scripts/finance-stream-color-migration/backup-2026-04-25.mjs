// scripts/finance-stream-color-migration/backup-2026-04-25.mjs
//
// Pre-migration backup for stream-color migration (Item 3).
// For every user in `user:index`, copies `finance:{userId}:streams`
// into `finance:{userId}:streams:backup-2026-04-25`.
//
// Idempotent: if the backup key already exists, it is left untouched.
// Each newly-written backup is verified by reading it back and comparing
// canonicalized JSON to the source. A mismatch throws and aborts.
//
// Run with: set -a && source .env.local && set +a && node scripts/finance-stream-color-migration/backup-2026-04-25.mjs

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

const BACKUP_SUFFIX = 'backup-2026-04-25'

// ---------- Upstash REST helpers ----------------------------------------------

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result
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

// Canonicalize so source/backup compare reliably regardless of how Upstash
// returns the value (string vs auto-parsed object/array).
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

  if (await rexists(backupKey)) {
    console.log(`  · ${sourceKey} → SKIP (backup already exists at ${backupKey})`)
    return { decision: 'skipped_already_exists', backupKey }
  }

  const source = await rget(sourceKey)
  if (source === null) {
    console.log(`  · ${sourceKey} → SKIP (source key absent)`)
    return { decision: 'skipped_source_missing', backupKey }
  }

  const sourceCanon = canonical(source)
  if (sourceCanon === null) {
    console.log(`  · ${sourceKey} → SKIP (source value canonicalized to null)`)
    return { decision: 'skipped_source_missing', backupKey }
  }

  await rset(backupKey, sourceCanon)

  const verify = await rget(backupKey)
  const verifyCanon = canonical(verify)
  if (verifyCanon !== sourceCanon) {
    throw new Error(
      `Verification failed for ${sourceKey}:\n` +
        `  source canonical (len=${sourceCanon.length}): ${sourceCanon.slice(0, 200)}…\n` +
        `  backup canonical (len=${(verifyCanon || '').length}): ${(verifyCanon || '').slice(0, 200)}…`
    )
  }

  // Server-side STRLEN compare for byte-level confidence.
  const [srcBytes, bakBytes] = await Promise.all([rstrlen(sourceKey), rstrlen(backupKey)])
  if (srcBytes !== bakBytes) {
    throw new Error(`STRLEN mismatch for ${sourceKey}: source=${srcBytes} bytes, backup=${bakBytes} bytes`)
  }

  console.log(`  · ${sourceKey} → CREATED + VERIFIED at ${backupKey} (STRLEN ${bakBytes} bytes)`)
  return { decision: 'created_and_verified', backupKey, bytes: bakBytes }
}

// ---------- Main --------------------------------------------------------------

async function main() {
  const userIds = await rsmembers('user:index')
  console.log(`# Stream-color migration backup — ${new Date().toISOString()}`)
  console.log(`# Suffix: :${BACKUP_SUFFIX}`)
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}`)

  const perUser = {}
  for (const userId of userIds) {
    console.log(`\n[user] ${userId}`)
    perUser[userId] = await backupKey(`finance:${userId}:streams`)
  }

  console.log('\n# Final summary')
  let totalCreated = 0, totalSkippedExists = 0, totalSkippedMissing = 0
  for (const [userId, r] of Object.entries(perUser)) {
    console.log(`- ${userId}: ${r.decision}${r.bytes != null ? ` (${r.bytes} bytes)` : ''}`)
    if (r.decision === 'created_and_verified') totalCreated++
    else if (r.decision === 'skipped_already_exists') totalSkippedExists++
    else if (r.decision === 'skipped_source_missing') totalSkippedMissing++
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
