# SIPRI Arms Transfers summary

Canonical payload: `axis-arms.json` (this folder).

Frontend copies live under `public/data/{lite,full}/axis-arms.json` when published.

Publish:
1. `src/lib/licensing/sipriPolicy.ts` → `SIPRI_ARMS_LENS_ENABLED = true`
2. `npm run axis:arms:publish`
3. Recompress sidecars if needed: `node scripts/compress-data-gzip.js all` (or at least refresh `axis-arms.json.gz`)
4. Redeploy (R2/CDN if used)

Blank again: `npm run axis:arms:unpublish` (+ set flag `false` if shelving the lens)

Rebuild from CSV: `node scripts/build-axis-arms.js [trade-register.csv]`
