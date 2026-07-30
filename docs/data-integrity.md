# 데이터 무결성 — 게이트와 원칙

> 2026-07-31 감사(`DATA-AUDIT-2026-07-31.md`) 이후 도입.
> **수치·플래그는 코드가 정본.** 이 문서와 코드가 다르면 코드를 믿는다.

---

## 왜 생겼나

감사 전까지 이 프로젝트의 테스트 33개는 **전부 `src/lib` 순수 로직**이었고
`public/data/*.json` 을 한 줄도 검사하지 않았다. 그 공백으로 세 가지가 뚫렸다.

| ID | 사고 | 규모 |
|----|------|------|
| **P0-1** | GEM 철강·시멘트·철광석·화학이 전부 널섬(0,0) | 2,000 시설 |
| **P0-2** | 낡은/빈 `.json.gz` 가 살아있는 `.json` 을 가림 | 파이프라인 3종이 `[]` |
| **P0-3** | 합성 데모가 PeeringDB·UCDP·OFAC 이름으로 shipped | 4개 레이어 |
| **P0-5** | 같은 지명이 두 소스에서 다른 좌표 (수에즈 73km) | 핀 중복 |

**셋 다 조용한 실패였다.** 예외도 안 나고 빈 지도만 나온다.
사람의 주의력이 아니라 빌드가 잡아야 한다.

---

## 게이트 3중 구조

| 층 | 명령 | 언제 |
|----|------|------|
| **빌드 게이트** | `npm run verify:data` | `npm run build` 안에서 자동 (`ci-build.js`) |
| **단위 테스트** | `npm test` → `dataIntegrity.test.ts` · `chokepoints.test.ts` | CI |
| **레지스트리 테스트** | `layerReliability.test.ts` | CI |

비상 탈출은 `DATA_GATE_SKIP=1` — **사유를 커밋 메시지에 남길 것.**

---

## 검사하는 불변식

### 좌표
- 널섬(0,0) 비율 **1% 미만** — 0,0 이 진짜 좌표인 데이터셋은 이 프로젝트에 없다. 결측의 신호다.
- 위도 ±90 · 경도 ±180 범위
- 초크포인트는 `SCENE_PLACES` 와 **1km 이내**, `criticalNodes` 와 **50km 이내**

### 합성 데이터
플레이스홀더 탐지는 **파일명 반복 패턴**으로 한다:

```
internet-exchanges.json → "internet-exchanges site 0"   ← 잡힘
conflict-zones.json     → "conflict-zone-0"             ← 잡힘
military-bases.json     → "Ellsworth AFB Site 2"        ← 안 잡힘 (실재)
```

단순 `/site \d+/` 로 하면 실재하는 미니트맨 발사대가 걸린다. 반드시 slug 기준으로.

### gzip sidecar
`fetchJsonPreferGzip` 은 **`.gz` 를 먼저 시도하고 200 이면 그걸 쓴다.**
따라서 gz 가 낡거나 비어 있으면 **런타임이 조용히 옛 데이터를 서빙한다.**

- 원본 10KB 초과인데 gz 100B 미만 → **실패** (빈 gzip = 약 23B)
- gz 가 json 보다 5분 이상 낡음 → **실패**
- 512KB 이하 gz 는 해제해 레코드 수까지 대조

### 비어 있음
레코드 0건이면 실패. 의도한 것이면 `ALLOWLIST` 에 **사유와 함께** 추가한다.

---

## `KNOWN_PENDING` 사용 규칙

재빌드가 끝나지 않은 알려진 결함은 `KNOWN_PENDING` 에 두면 경고로만 나온다.

> ⚠️ **여기 있는 항목은 반드시 비워야 한다.**
> 빌드를 통과시키려고 항목을 늘리는 순간 이 게이트는 무의미해진다.

현재 대기 중:

| 파일 | 해소 명령 |
|------|----------|
| `gem-{steel,cement,iron-ore,chemicals,oil-gas-extraction}.json` | `npm run gem:trackers:all` |
| `internet-exchanges.json` | `npm run peeringdb:fetch` |

---

## EvidenceTier — 6단계

```
observed   위성·항적처럼 기계가 잡아낸 신호
reported   매체가 전하고 교차로 잡힌 내용
claimed    교전 당사국이 발표한 내용 · 독립 검증 없음   ← 신규
unverified 한 경로만의 전언
model      우리가 계산한 점수
synthetic  데모·플레이스홀더 · 프로덕션 자동 제외        ← 신규
```

**`claimed` 가 필요한 이유:** ArmyInform 은 우크라이나 국방부 매체다.
그 타격 좌표를 FIRMS 위성 탐지와 **시각적으로 같게** 그리면 관측과 주장이
동급이 되고, 제품의 인식론이 무너진다.
`evidenceTierStroke()` 로 관측=실선 / 주장=점선을 강제한다.

**`synthetic` 이 필요한 이유:** P0-3 이 뚫린 구조적 원인이 바로
"이건 가짜 데이터다"를 표현할 자리가 없었다는 것이다.

### 교차 검증 승격

```ts
promoteEvidenceTier("claimed", firmsMatched)  // → "reported"
```

⚠️ **강등은 하지 않는다.** 위성은 야간·구름·소규모 타격을 놓친다.
"확인되지 않음"은 "일어나지 않음"이 아니다.

---

## `status: "blocked"`

품질·출처 문제로 노출을 막은 레이어. `blockedReason` 이 **필수**다.

| 레이어 | 사유 | 해소 |
|--------|------|------|
| `internet-exchanges` | 합성 5건을 PeeringDB 로 표기 | `npm run peeringdb:fetch` |
| `ucdp-events` | 데모 15건을 UCDP GED 로 표기 | `npm run data:ucdp` (토큰 이미 있음) |
| `sanctions-entities` | 더미 15건을 OFAC SDN 으로 표기 | `npm run sanctions:build` (완료 · 카탈로그 복구 필요) |

**원칙: 데이터 없음을 보여주는 것이, 잘못된 출처로 표기된 합성 데이터를
보여주는 것보다 낫다.**

차단 해제 시 반드시 함께 고칠 것:
1. `status` → `"shipped"`
2. `ingest` → `"synthetic-demo"` 가 아닌 실제 값
3. `attribution` → 실제 기관명 복구
4. `notes` 의 경고 문구 정리

---

## 새 레이어를 추가할 때

1. `sourceCatalog.ts` 에 등록 — `attribution` 은 **실제로 그 데이터를 만든 곳**만
2. 필요하면 `layerReliability.ts` `OVERRIDES` 에 tier 명시 (없으면 `ingest` 로 자동 파생)
3. `npm run verify:data` 통과 확인
4. 좌표를 다른 레이어와 공유하는 실체면 `chokepoints.test.ts` 패턴으로 정합성 잠그기

**절대 하지 말 것:** 지도에 점이 있어야 하니까 좌표를 지어내기.
좌표가 없으면 `null` 로 두거나 국가 단위 집계로 표현한다
(`sanctions-rollup.json` 이 그 예 — 19,441건은 점이 아니라 집계로 낸다).
