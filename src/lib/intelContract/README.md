# IntelContract — 국가형 정보창구 교차검증 계약

수집은 넓게, **전시(Publish)는 Gate 합격만**.  
비밀 INT가 아니라 공개출처 + 정보기관식 규율.

## DisplayGrade

| grade | 유저 표기 | 의미 |
|-------|-----------|------|
| `drop` | 숨김 | 유저 UI 없음 (원재료만) |
| `hold` | 모으는 중 | 수집 중 / 미충족 — Watchboard 하단 섹션 |
| `low` | 얇음 | 「왜?」·약한 배지 |
| `std` | 교차확인 | Watchboard + 보조 핀/경보 |
| `high` | 탄탄함 | Watchboard 상단 + 강조 |

유저 카피·첫 안내 카드는 `uxCopy.ts` / `IntelDeskTipCard` / Feature Guide(관측·지정학·지경학)를 본다.

## Gates (G0–G10)

| ID | 규칙 | 실패 시 |
|----|------|---------|
| G0 | schema: observations≥1, method | drop |
| G1 | independence≥2 **or** (modality≥2 ∧ independence≥1) | drop / tip→hold |
| G2 | tip-only 단독 Pass 금지 | hold |
| G3 | media-only → high 금지; T3-only → low/drop | cap |
| G4 | geoOk (종류별 시공간) | drop |
| G5 | claim ⊆ evidence (인용 없는 so-what 금지) | drop / strip |
| G6 | disconfirmLog.queried | 미탐색 → ≤low |
| G7 | altHypothesis (std+) | ≤low |
| G8 | killCriteria≥1 (std+) | ≤low |
| G9 | high → modality≥2 ∧ !media-only | ≤std |
| G10 | fatigue merge (UI/큐) | merge |

## Surfaces (최소 등급)

| surface | min grade |
|---------|-----------|
| `watchboard` | low (+ hold 섹션 별도) |
| `source_drill` | 선택 bundle (any except drop for display of reasons) |
| `map_hero` | std |
| `theater_sitrep` | std (`rss-brief`는 low 허용) |
| `breaking_flash` | std |
| `escalation_banner` | std |
| `economy_alert` | std |

## 모드

- **계약**: 지정학 · 관측 · 지경학 공통 (`gate` / `canPublish`)
- **전황 책 + 센서 교차**: 관측(`satellite`)만
- **Watchboard / Source drill 풀 UI**: 관측 우선

## Desk density (밀도 전략)

양을 늘리지 않고 **선별·교차·PIR·72h 창**으로 데스크 강도를 올린다.

1. `theaterCanonSources.ts` — 전장별 공개 정본 채널(공식/센서/언론 소수). 빈칸은 숨기지 않음.
2. `conflictClusters` → Gate → Watchboard (`conflict-cluster` kind). 단일 소스면 얇음/Hold.
3. `pirModalityStatus` — 필요 / 확보 / 빈칸 카드 (`PirFulfillmentCard`).
4. `whyPublishLines` — 소스 드릴 상단 3줄(채널·반증·PIR).
5. Watchboard 기본 `windowHours: 72`.

## Horizon (비목표)

Entity graph, human QC 워크벤치, 거시 Assessment 서사, 사후 채점 루프, D1 원문 전량 적재.
