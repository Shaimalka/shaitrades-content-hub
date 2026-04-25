// scripts/finance-migration/dryrun-2026-04-25.mjs
//
// READ-ONLY pre-flight audit for Sprint A finance schema migration.
// Iterates every user in `user:index` and reports:
//   - current asset shape (full JSON)
//   - current liability shape (full JSON, or null if absent)
//   - snapshot count
//   - shape anomalies and partial-migration detection
//
// Performs zero writes. Safe to run any time.
//
// Run with: set -a && source .env.local && set +a && node scripts/finance-migration/dryrun-2026-04-25.mjs

const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/^"+|"+$/g, '')
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/^"+|"+$/g, '')

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env.')
  process.exit(1)
}

// ---------- Upstash REST helpers (read-only) -----------------------------------

async function rget(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${key} → HTTP ${res.status}`)
  const j = await res.json()
  return j.result // string | null | object
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

// ---------- Shape analysis -----------------------------------------------------

const ASSET_CATEGORIES = ['Cash', 'Crypto', 'Stocks', 'Real Estate', 'Other']
const LIABILITY_CATEGORIES = ['Credit Card', 'Loan', 'Other']

function analyzeAsset(a, idx) {
  const findings = []
  const has = k => Object.prototype.hasOwnProperty.call(a, k)
  if (!has('id')) findings.push('missing id')
  if (!has('name')) findings.push('missing name')
  if (!has('value')) findings.push('missing value')
  if (has('amount') && !has('value')) findings.push('legacy: has amount but not value')
  if (has('type') && !has('category')) findings.push('legacy: has type but not category (orphaned-route shape)')
  if (has('category') && !ASSET_CATEGORIES.includes(a.category)) {
    findings.push(`unexpected category enum: ${JSON.stringify(a.category)}`)
  }
  if (has('liquidity') && !['liquid', 'illiquid'].includes(a.liquidity)) {
    findings.push(`unexpected liquidity enum: ${JSON.stringify(a.liquidity)}`)
  }
  const envelope = {
    userId: has('userId'),
    createdAt: has('createdAt'),
    updatedAt: has('updatedAt'),
  }
  const partiallyMigrated =
    envelope.userId || envelope.createdAt || envelope.updatedAt
  const fullyMigrated =
    envelope.userId && envelope.createdAt && envelope.updatedAt
  return { idx, findings, envelope, partiallyMigrated, fullyMigrated }
}

function analyzeLiability(l, idx) {
  const findings = []
  const has = k => Object.prototype.hasOwnProperty.call(l, k)
  if (!has('id')) findings.push('missing id')
  if (!has('name')) findings.push('missing name')
  if (!has('amount')) findings.push('missing amount')
  if (has('value') && !has('amount')) findings.push('legacy: has value but not amount (orphaned-route shape — needs value→amount rename)')
  if (has('type') && !has('category')) findings.push('legacy: has type but not category')
  if (has('category') && !LIABILITY_CATEGORIES.includes(l.category)) {
    findings.push(`unexpected category enum: ${JSON.stringify(l.category)}`)
  }
  const envelope = {
    userId: has('userId'),
    createdAt: has('createdAt'),
    updatedAt: has('updatedAt'),
  }
  const partiallyMigrated =
    envelope.userId || envelope.createdAt || envelope.updatedAt
  const fullyMigrated =
    envelope.userId && envelope.createdAt && envelope.updatedAt
  return { idx, findings, envelope, partiallyMigrated, fullyMigrated }
}

// ---------- Per-user audit -----------------------------------------------------

async function auditUser(userId) {
  const [rawAssets, rawLiabilities, rawSnapshots, rawPrefs] = await Promise.all([
    rget(`user:${userId}:assets`),
    rget(`user:${userId}:liabilities`),
    rget(`user:${userId}:nw:snapshots`),
    rget(`user:${userId}:finance:preferences`),
  ])

  const assets = parseOrEmpty(rawAssets)
  const liabilities = parseOrEmpty(rawLiabilities)
  const snapshots = parseOrEmpty(rawSnapshots)

  const assetReport = assets.map(analyzeAsset)
  const liabilityReport = liabilities.map(analyzeLiability)

  return {
    userId,
    rawState: {
      'assets key present': rawAssets !== null,
      'liabilities key present': rawLiabilities !== null,
      'snapshots key present': rawSnapshots !== null,
    },
    timezone: (() => {
      try {
        const p = typeof rawPrefs === 'string' ? JSON.parse(rawPrefs) : (rawPrefs || {})
        return p.timezone || '(none)'
      } catch { return '(parse error)' }
    })(),
    assets: {
      count: assets.length,
      data: assets,
      analysis: assetReport,
    },
    liabilities: {
      count: liabilities.length,
      data: rawLiabilities === null ? null : liabilities,
      analysis: liabilityReport,
    },
    snapshots: {
      count: snapshots.length,
      sample_first: snapshots[0] || null,
      sample_last: snapshots[snapshots.length - 1] || null,
    },
    summary: {
      assets_with_findings: assetReport.filter(r => r.findings.length).length,
      liabilities_with_findings: liabilityReport.filter(r => r.findings.length).length,
      assets_partially_migrated: assetReport.filter(r => r.partiallyMigrated && !r.fullyMigrated).length,
      assets_fully_migrated: assetReport.filter(r => r.fullyMigrated).length,
      liabilities_partially_migrated: liabilityReport.filter(r => r.partiallyMigrated && !r.fullyMigrated).length,
      liabilities_fully_migrated: liabilityReport.filter(r => r.fullyMigrated).length,
    },
  }
}

// ---------- Main ---------------------------------------------------------------

async function main() {
  const userIds = await rsmembers('user:index')
  console.log(`# Finance migration dry-run (read-only) — ${new Date().toISOString()}`)
  console.log(`Users in user:index: ${userIds.length} → ${JSON.stringify(userIds)}\n`)

  const reports = []
  for (const userId of userIds) {
    try {
      const r = await auditUser(userId)
      reports.push(r)
    } catch (err) {
      reports.push({ userId, error: err?.message || String(err) })
    }
  }

  console.log(JSON.stringify(reports, null, 2))

  // Top-line summary at the end for skim-readability.
  console.log('\n# Summary')
  for (const r of reports) {
    if (r.error) {
      console.log(`- ${r.userId}: ERROR — ${r.error}`)
      continue
    }
    console.log(
      `- ${r.userId}: ` +
        `${r.assets.count} assets, ` +
        `${r.liabilities.count} liabilities, ` +
        `${r.snapshots.count} snapshots; ` +
        `findings: ${r.summary.assets_with_findings + r.summary.liabilities_with_findings}; ` +
        `partial-migration rows: ${r.summary.assets_partially_migrated + r.summary.liabilities_partially_migrated}; ` +
        `fully-migrated rows: ${r.summary.assets_fully_migrated + r.summary.liabilities_fully_migrated}`
    )
  }
}

main().catch(err => {
  console.error('Dry-run failed:', err)
  process.exit(1)
})
