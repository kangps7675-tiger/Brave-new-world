# Shelved: SIPRI Arms Transfers summary

Real payload: `axis-arms.json` (this folder only — not served).

Frontend (`public/data/*/axis-arms.json`) is a **blank stub** until clearance:
`{"pairs":[],"deals":[]}`

Restore:
1. `src/lib/licensing/sipriPolicy.ts` → `SIPRI_ARMS_LENS_ENABLED = true`
2. `npm run axis:arms:publish`
3. Redeploy (R2 올리면 CDN 공란도 덮어씀)

Re-blank: `npm run axis:arms:unpublish`
Rebuild from CSV: `node scripts/build-axis-arms.js [trade-register.csv]`
