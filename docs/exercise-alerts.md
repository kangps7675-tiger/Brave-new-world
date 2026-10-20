# 군사 훈련 경보 (exercise alerts)

> **제품 원칙:** ADS-B/AIS만으로 북·중·러·이란을 서방 수준으로 “완벽 추적”한다고 말하지 않는다.  
> **스택:** 공시·OSINT 라벨이 본문 · RF(항적)는 보너스 · confidence / RF 공백을 UI에 명시.

## 데이터

| 경로 | 역할 |
|------|------|
| D1 `military_exercises` | 정규화 훈련 레코드 (`drizzle/0018_military_exercises.sql`) |
| `GET /api/military-exercises` | 활성(또는 전체) 목록 |
| Cron `exerciseIngest.ts` | NAVAREA 훈련 구역 → upsert · 뉴스 키워드 → `unverified` |
| 레이어 `showMilitaryExercises` | 청록 hatch (`militaryExerciseHatch.ts`) |

## Confidence

| 등급 | 의미 |
|------|------|
| `announced` | 공시(NAVAREA 등) |
| `announced_osint` | 공시 + OSINT 보강 |
| `announced_rf` | 공시/OSINT + **bbox 안 공개 항적** (클라이언트 soft bump 가능, DB 필수 아님) |
| `unverified` | 뉴스 키워드 등 — RF로 올리지 않음 |

## UX

1. 신규 활성 훈련(좌표 있음) → 레이어 soft ON → fly → **전보음** + 양피지 (사이렌 아님).
2. 북·이란 행위자: 군사 ADS-B/AIS를 강제 ON하지 않음.
3. auto-ON한 레이어만, 활성 훈련이 없을 때 soft OFF.
4. 호버·양피지에 `rfGapNote` / 행위자별 RF 공백 카피.

## 한계 (사용자·운영 고지)

- 공개 RF 공백은 정상이다. 항적 없음 ≠ 훈련 없음.
- `unverified`는 속보 후보일 뿐 공식 확인이 아니다.
- NAVAREA 스냅샷·뉴스 키워드에 의존하므로 전 세계 훈련을 완전 커버하지 않는다.
- 뉴스 키워드 ingest는 `unverified`만 — **관영 매체 화이트리스트 승격은 추후** (`workers/cron-ingest/src/exerciseIngest.ts`).
