// scripts/finance-tax-rate-migration/verification-2026-04-26.mjs
//
// READ-ONLY audit run on 2026-04-26 closing Item 14 of the Finance MUST-FIX
// sprint as a verified no-op. The legacy /api/life/finance/settings route
// (key namespace `financeSettings:*`) was flagged as a "fighting backend"
// against the canonical /api/finance/tax-rate route (key namespace
// `user:*:taxReservePercent`).
//
// This script confirms the orphaned namespace is empty cluster-wide, so:
//   - No data migration is required
//   - The orphaned route is safe to delete in Item 15
//
// Re-runnable any time as audit evidence:
//   set -a && source .env.local && set +a && node scripts/finance-tax-rate-migration/verification-2026-04-26.mjs
//
// Performs zero writes. Performs zero deletes.

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

async function rkeys(pattern) {
  const res = await fetch(`${url}/keys/${encodeURIComponent(pattern)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`KEYS ${pattern} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result || []
}

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result
}

async function main() {
  console.log(`# Tax-rate namespace verification — ${new Date().toISOString()}`)
  console.log(`# Item 14 closure: confirming orphaned namespace is empty.\n`)

  const orphaned = await rkeys('financeSettings:*')
  const canonical = await rkeys('user:*:taxReservePercent')

  console.log(`Orphaned key pattern (financeSettings:*) — found: ${orphaned.length}`)
  for (const k of orphaned) console.log(`  - ${k}: ${JSON.stringify(await rget(k))}`)

  console.log(`\nCanonical key pattern (user:*:taxReservePercent) — found: ${canonical.length}`)
  for (const k of canonical) console.log(`  - ${k}: ${JSON.stringify(await rget(k))}`)

  console.log(`\n# Verdict`)
  if (orphaned.length === 0) {
    console.log(`✓ Orphaned namespace is empty. No migration required.`)
    console.log(`✓ Item 14 verified as a no-op. Item 15 (route deletion) is unblocked.`)
  } else {
    console.log(`✗ Orphaned namespace has ${orphaned.length} entries.`)
    console.log(`✗ Migration IS required before Item 15 can safely delete the route.`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
