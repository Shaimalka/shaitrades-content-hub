// scripts/finance-migration/migrate-2026-04-25.mjs
//
// Sprint A finance schema migration: stamps userId/createdAt/updatedAt on
// every Asset and Liability for every user in user:index. Defensive
// value→amount rename for Liabilities (won't fire on current data, but safe).
//
// Modes:
//   default    — DRY-RUN: prints intended changes per item, writes nothing
//   --commit   — applies changes, verifies, fails loud on any mismatch
//
// Idempotent: re-running --commit on already-migrated rows is a no-op.
// Per-key write only fires if at least one item in the array changed.
//
// Run with:
//   set -a && source .env.local && set +a && node scripts/finance-migration/migrate-2026-04-25.mjs           # dry-run
//   set -a && source .env.local && set +a && node scripts/finance-migration/migrate-2026-04-25.mjs --commit  # apply

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

const COMMIT = process.argv.includes('--commit')
const RUN_TS = new Date().toISOString()

// ---------- Upstash REST helpers ----------------------------------------------

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result // string | null | object/array
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

function parseOrEmpty(raw) {
  if (raw == null) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return Array.isArray(raw) ? raw : []
}

// Match backup script's canonical form so verification is consistent.
function canonical(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try { return JSON.stringify(JSON.parse(raw)) } catch { return JSON.stringify(raw) }
  }
  return JSON.stringify(raw)
}

// ---------- Migration logic ---------------------------------------------------

function isAssetFullyMigrated(a, userId) {
  return (
    a && typeof a === 'object' &&
    a.userId === userId &&
    typeof a.createdAt === 'string' &&
    typeof a.updatedAt === 'string'
  )
}

function migrateAsset(a, userId) {
  if (isAssetFullyMigrated(a, userId)) {
    return { changed: false, item: a, action: 'skip-already-migrated' }
  }
  // Preserve every existing field; stamp envelope only where missing.
  // userId is always (re)stamped to the key's owner — defends against rare
  // userId mismatch corruption.
  const next = {
    ...a,
    userId,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : RUN_TS,
    updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : RUN_TS,
  }
  const reasons = []
  if (a.userId !== userId) reasons.push(a.userId === undefined ? 'add userId' : `correct userId (was ${JSON.stringify(a.userId)})`)
  if (typeof a.createdAt !== 'string') reasons.push('add createdAt')
  if (typeof a.updatedAt !== 'string') reasons.push('add updatedAt')
  return { changed: true, item: next, action: `migrate (${reasons.join(', ')})` }
}

function isLiabilityFullyMigrated(l, userId) {
  return (
    l && typeof l === 'object' &&
    l.userId === userId &&
    typeof l.createdAt === 'string' &&
    typeof l.updatedAt === 'string' &&
    typeof l.amount === 'number'
  )
}

function migrateLiability(l, userId) {
  if (isLiabilityFullyMigrated(l, userId)) {
    return { changed: false, item: l, action: 'skip-already-migrated' }
  }
  // Defensive: rename legacy `value` → `amount`. Strip `value` if both exist
  // and `amount` is already a number (assume `amount` is canonical).
  const reasons = []
  const rest = { ...l }
  if (typeof rest.amount !== 'number' && typeof rest.value === 'number') {
    rest.amount = rest.value
    reasons.push('rename value→amount')
  }
  if ('value' in rest) delete rest.value

  const next = {
    ...rest,
    userId,
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : RUN_TS,
    updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : RUN_TS,
  }
  if (l.userId !== userId) reasons.unshift(l.userId === undefined ? 'add userId' : `correct userId (was ${JSON.stringify(l.userId)})`)
  if (typeof l.createdAt !== 'string') reasons.push('add createdAt')
  if (typeof l.updatedAt !== 'string') reasons.push('add updatedAt')
  if (typeof next.amount !== 'number') reasons.push('WARNING: no numeric amount or value found — stamped envelope only')
  return { changed: true, item: next, action: `migrate (${reasons.join(', ')})` }
}

// ---------- Per-key processor -------------------------------------------------

async function processArrayKey({ kind, userId, sourceKey, migrateFn }) {
  const raw = await rget(sourceKey)
  if (raw === null) {
    console.log(`  ${kind}: source key absent — no-op`)
    return { total: 0, migrated: 0, skipped: 0, written: 0 }
  }
  const items = parseOrEmpty(raw)
  if (!Array.isArray(items)) {
    throw new Error(`${sourceKey}: expected array, got ${typeof items}`)
  }
  if (items.length === 0) {
    console.log(`  ${kind}: empty array — no-op`)
    return { total: 0, migrated: 0, skipped: 0, written: 0 }
  }

  const results = items.map((item, idx) => ({ idx, ...migrateFn(item, userId) }))

  for (const r of results) {
    const idLabel = `id=${r.item?.id ?? '<no-id>'}`
    if (r.changed) {
      console.log(`  ${kind}[${r.idx}] ${idLabel} → ${COMMIT ? 'MIGRATING' : 'WOULD migrate'} — ${r.action}`)
      if (!COMMIT) console.log(`      next: ${JSON.stringify(r.item)}`)
    } else {
      console.log(`  ${kind}[${r.idx}] ${idLabel} → already migrated, skip`)
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
    console.log(`  ${kind}: no items changed — no write needed`)
    return tally
  }

  const nextArr = results.map(r => r.item)
  const nextCanon = JSON.stringify(nextArr)

  if (!COMMIT) {
    console.log(`  ${kind}: WOULD write ${nextCanon.length} bytes back to ${sourceKey}`)
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
  tally.written = 1
  console.log(`  ${kind}: WROTE ${nextCanon.length} bytes to ${sourceKey} + VERIFIED`)
  return tally
}

// ---------- Per-user processor ------------------------------------------------

async function processUser(userId) {
  console.log(`\n[user] ${userId}`)
  const assets = await processArrayKey({
    kind: 'ASSETS',
    userId,
    sourceKey: `user:${userId}:assets`,
    migrateFn: migrateAsset,
  })
  const liabilities = await processArrayKey({
    kind: 'LIABILITIES',
    userId,
    sourceKey: `user:${userId}:liabilities`,
    migrateFn: migrateLiability,
  })
  console.log(
    `  → user totals: ` +
      `assets ${assets.migrated}/${assets.total} migrated, ${assets.skipped} skipped, ${assets.written} write(s); ` +
      `liabilities ${liabilities.migrated}/${liabilities.total} migrated, ${liabilities.skipped} skipped, ${liabilities.written} write(s)`
  )
  return { assets, liabilities }
}

// ---------- Main --------------------------------------------------------------

async function main() {
  console.log(`# Finance migration — ${RUN_TS}`)
  console.log(`# Mode: ${COMMIT ? '--commit (will write)' : 'DRY-RUN (no writes)'}`)

  const userIds = await rsmembers('user:index')
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}`)

  const perUser = {}
  for (const userId of userIds) {
    perUser[userId] = await processUser(userId)
  }

  // Top-line summary
  console.log('\n# Final summary')
  let totA = 0, migA = 0, skipA = 0, writA = 0
  let totL = 0, migL = 0, skipL = 0, writL = 0
  for (const [userId, t] of Object.entries(perUser)) {
    console.log(
      `- ${userId}: ` +
        `assets total=${t.assets.total} migrated=${t.assets.migrated} skipped=${t.assets.skipped} writes=${t.assets.written}; ` +
        `liabilities total=${t.liabilities.total} migrated=${t.liabilities.migrated} skipped=${t.liabilities.skipped} writes=${t.liabilities.written}`
    )
    totA += t.assets.total; migA += t.assets.migrated; skipA += t.assets.skipped; writA += t.assets.written
    totL += t.liabilities.total; migL += t.liabilities.migrated; skipL += t.liabilities.skipped; writL += t.liabilities.written
  }
  console.log(
    `Totals: assets ${migA}/${totA} migrated (${skipA} skipped, ${writA} key writes); ` +
      `liabilities ${migL}/${totL} migrated (${skipL} skipped, ${writL} key writes)`
  )
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
