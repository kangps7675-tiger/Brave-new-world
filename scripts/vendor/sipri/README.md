# SIPRI Arms Transfers summary

Canonical payload: `axis-arms.json` (this folder).

Server copy: `src/data/sipri/axis-arms.json` (서버 번들 전용). public 폴더에는 두지 않는다 — SIPRI 승인 조건(유저가 원본을 내려받지 못해야 함). 화면은 `/api/sipri/arms`로 허브·나라 쌍 단위만 받는다.

Publish:
1. `src/lib/licensing/sipriPolicy.ts` → `SIPRI_ARMS_LENS_ENABLED = true` (속보 카드 칸은 `SIPRI_ARMS_EVIDENCE_ENABLED`)
2. `npm run axis:arms:publish`
3. Redeploy

Blank again: `npm run axis:arms:unpublish` (+ set flag `false` if shelving the lens)

Rebuild from CSV: `node scripts/build-axis-arms.js [trade-register.csv]`
