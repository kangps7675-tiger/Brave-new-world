# Geopolitics deep-dive MVP

**Date:** 2026-09-20  
**Status:** Implementing (conflict first)  
**Product:** Brave New World

## Goal

속보는 입구, 사안 클릭 후 **심층**으로 들어간다. 지정학부터.

```
속보/내비 → L1 개요(양피지·브리프) → L2 고리(이후) → L3 근거(이후)
           ↑ 심층 중: 속보 타전 OFF · 레이어 교체(최대 3)
```

## Rules (locked)

| Rule | Value |
|------|--------|
| Layer target / soft / hard | **3 / 5 / 6** |
| Apply mode | **Replace** (not stack) |
| Flash / lamp parchment while deep dive | **Blocked** |
| Same UX skeleton | 폭격·분쟁·허브 모두 동일 뼈대 |
| Economy deep dive | Later |

## Entry (v1)

| Entry | Kind | Scene patch source |
|-------|------|--------------------|
| Hub brief open | `hub` | `hubBriefingLayers(navId)` capped to 3 |
| Friction episode brief | `friction` | war zones + diplomatic + blocs |
| Territorial brief | `territorial` | war zones + diplomatic + island chains |

## L2 rings (v1.1)

하단 `DeepDiveRingPanel`. 고리 클릭 → 같은 스냅샷 기준으로 레이어 교체 + 선택적 fly.

| Catalog | Rings |
|---------|--------|
| Peninsula nav | tension · bases · blocs |
| Taiwan nav | strait · ADIZ · incidents |
| Default hub | tension · axis arcs · GDELT signals |
| Friction | first 3 timeline stages |
| Territorial | claims · chains · diplo |

## Exit

Restore layer snapshot from session start. Then existing hub→live-briefing path may run.

## Non-goals (v1)

- Full L2 ring list UI
- Per-ring GeoJSON scene kits
- Economy domain session
- AI-generated scenes
