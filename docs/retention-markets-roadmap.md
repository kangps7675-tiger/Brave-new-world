# 재방문 · 시장 해석 로드맵 (추후 설계)

> **상태 (코드 기준):**  
> - **구현됨:** `theaterAssets` 전장 심볼 전체 · watchlist(localStorage) · Yahoo 딥링크 · TradingView **심볼 URL** (`tradingViewSymbolUrl`) · 「오늘 핫한 곳」규칙 기반 브리핑 · 투자 권유 아님 고지.  
> - **미구현:** TradingView **임베드/위젯** · 국내 증권·토스 딥링크 · 전용 일일 cron UX(맵 프리셋 칩).  
> - LLM digest 연동은 [`llm-news-digest.md`](./llm-news-digest.md) (스캐폴딩만).  
> **포지션:** 매매 앱이 아니라 **지정학/초크포인트 → 시장 리스크 해석기**  
> **관련:** `src/lib/theaterAssets.ts` · `src/lib/watchlistPrefs.ts` · `src/lib/news/todayBriefing.ts` · `IntelRelatedMarketsPanel` · `heroHighlightSymbols` · [`deferred-status.md`](./deferred-status.md)

---

## 1. 한 줄 포지션

투자를 “직접” 붙인다고 방문이 꾸준해지지 않는다.  
사람은 **여기서 뭘 결정하나**에 다시 온다 → **내 전장/허브 + 오늘 핫한 곳 + (선택) 관련 심볼 해석**.

---

## 2. 현실적으로 가능한 것 / 과한 것

### 해도 됨 (초기~중기)

| 항목 | 설명 |
|------|------|
| 공개/준공개 시세 | 이미 Yahoo류 (`/api/stock-tickers`). 관심종목 watchlist 확장 |
| TradingView 위젯 | 차트 임베드 — **제휴·이용약관 확인 후**. 주문 아님 |
| 전장·초크포인트 → 심볼 매핑 | 해석용 테이블. “사라”가 아니라 “관련 자산 후보” |
| 증권/토스 딥링크 | “관련 자산 보기”로 외부 앱 열기 (제휴 가능 시) |

### 초기엔 하지 말 것

| 항목 | 이유 |
|------|------|
| 앱 내 주문·계좌 연동 | 증권사 제휴·라이선스·규제 비용 |
| 유명 투자 앱 API 무단 연동 | 심사·계약 없이 불가에 가까움 |
| 매매 추천 카피 | 규제·신뢰·브랜드 리스크 |

---

## 3. 재방문 레버 (투자 API보다 우선)

우선순위 높은 것부터.

### 3.1 내 허브 / 전장 저장

- localStorage (또는 로그인 전제 시 서버): `preferredTheater` · `preferredEconHub` · `watchSymbols[]`
- 부팅 시: 저장 지역 fly-to + 관련 심볼 스트립 하이라이트
- 기존: ModePicker / viewPackages theater·hub 선택과 연결 가능

### 3.2 하루 1회 “오늘 핫한 곳” 브리핑

- 입력: GDELT/RSS 히어로 · FIRMS/경보 신호 · (추후) news-digest
- 출력: 맵 카메라 프리셋 1개 + **3줄** (사람이 쓰거나 LLM digest)
- 갱신: cron / `data:sync` 1일 1회
- UI: 입장 후 또는 벨 옆 “Today” 칩

### 3.3 사운드 = 옵션, 조용한 기본

- 기본: 음소거 또는 매우 낮은 ambient (이미 벨·입장 주의창 있음)
- SNS용 “살벌한 소리”는 **명시적 opt-in** 유지
- 재방문 UX는 조용한 맵이 담당

### 3.4 관련 자산 보기 (후순위 딥링크)

- 심볼 클릭 → TradingView 심볼 URL 또는 국내 증권/토스 검색 딥링크
- 카피: 「외부에서 보기 · 투자 권유 아님」

---

## 3.5 관심 프로필 · 맞춤 추천 (P0 로컬)

> **상태:** P0+ — `geowatch-interest-v1` localStorage · For you 칩 · **행동 스코어로 뉴스 가중·레이어 soft ON** · 로그인 이관 키 등록.  
> **하지 않음:** 고정 관심 프리셋 픽커(중동 화약고 등). 알고리즘만.

| Phase | 내용 |
|-------|------|
| **P0 (지금)** | 클릭·모드·관심종목·등불/왜중요 신호를 기기 로컬에 적재. 하단 **맞춤(For you)** 칩 2~4개. |
| **P0.5 (지금)** | `applyFromInterest` — 관심 전장으로 Intel 뉴스 정렬 가중 · 일 1회 테마/전장 레이어 soft ON(끄기 없음). |
| **P1** | 로그인 시 `InterestStore` → 계정 문서. `onFirstLoginMigrateLocal: ask` 로 로컬 merge. |
| 이후 | 푸시 알림은 유료 티어 · HoverNav 빈 입력 추천 |

코드: `src/lib/interest/*` · `InterestRecommendChips` · `guestPolicy.GUEST_LOCAL_PREF_KEYS`.

관련(별도): 군사 훈련 자동 경보·confidence는 [exercise-alerts.md](./exercise-alerts.md).

---

## 3.6 일일 긴장도 랭킹 · 내일 1위 예측 (P0 MVP)

> **상태:** P0 구현 — 점수 안정화 + 게스트 예측 + 「어제 맞춘 %」.

**점수 공식 (cron `dailyRanks.ts`):** 성분 `log1p` 가중 → `0.55*raw + 0.45*prev` EMA → 일일 `|Δ| ≤ max(prev,12)*0.4` 캡. 순위는 안정화 점수, `detail_json`에 `rawScore`/`smoothScore`/`displayScore`(당일 max 대비 0–100).

**예측 루프:** 오늘 전장 TOP에서 **내일 긴장도 1위** 고르기 → `deviceId`(localStorage) 익명 1표 upsert → UTC cron이 랭킹 upsert 직후 정산 → `daily_prediction_stats.correct_pct` → UI 「어제 맞춘 N%」. 로그인·포인트·복수 문항은 다음 단계 (`guestPolicy` 키만 예고).

코드: `workers/cron-ingest/src/dailyRanks.ts` · `dailyPredictions.ts` · `DailyPredictPanel` · `POST /api/daily-predict`.

---

## 4. 전장 → 심볼 매핑 (해석 테이블)

정본: `src/lib/theaterAssets.ts` (`THEATER_ASSETS`). 스트립·반응 API·브리핑은 **목록 전체**를 사용한다 (`theaterPrimarySymbols` / `heroHighlightSymbols` — `limit` 옵셔널).

```ts
// 현행: src/lib/theaterAssets.ts
type TheaterAssetMap = Record<
  string, // NewsTheater | "all"
  { symbols: string[]; noteKo: string; noteEn: string }
>;
```

예시 방향:

| 키 | 심볼 예 | 노트 |
|----|---------|------|
| middle-east / hormuz | CL=F, BZ=F, 에너지 ETF | 해상 초크·원유 민감 |
| china-taiwan | 반도체·운임 관련 | 물류·칩 서플라이 |
| russia-ukraine | 곡물·유럽 가스 민감 심볼 | 해석용, 추천 아님 |
| global | VIX, 달러·금 | 매크로 스트레스 |

UI: Intel 관련 시장 패널 · 경제 허브 패널에 “왜 이 심볼?” 한 줄.

---

## 5. TradingView · 시세

| Phase | 내용 | 상태 |
|-------|------|------|
| 지금 | Yahoo 티커 스트립 + 전장 하이라이트 + 심볼 Yahoo/TV URL | 구현 |
| P1 | watchlist (localStorage) | 구현 |
| P2 | 심볼 상세에 TradingView **embed** (약관 OK 시) | 미구현 |
| P3 | digest `relatedSymbols` ∩ theaterAssets | digest 배치 대기 |

---

## 6. LLM과의 경계

- 요약·전장 태그·(선택) relatedSymbols → [llm-news-digest.md](./llm-news-digest.md)
- 심볼 매핑의 **정본**은 코드 테이블 (LLM이 심볼을 “발명”하지 않게)
- digest의 symbols는 테이블 ∩ 기사 근거만

---

## 7. 소액 수익과의 연결 (참고)

트래픽 검증 후:

- 주간 브리핑(맵 스냅샷 + 3줄) 소액 / 후원
- 스폰서·임베드 협업
- **매매 중개 수수료는 후순위·계약 전제**

상세 수익화는 README가 아니라 운영 메모로 분리 유지.

---

## 8. 비목표

- 멋진 신세계 = 증권 앱
- 푸시로 매수 타이밍 알림
- Telegram 기반 자동 트레이딩 시그널

---

## 9. 수용 기준 (재방문)

  - [ ] 재방문 시 저장된 전장/허브로 복귀
  - [ ] “오늘 핫한 곳”이 24h 내 갱신되거나 stale 표시
  - [ ] 기본 세션이 무음/저음으로도 사용 가능
  - [ ] 심볼 UI에 투자 권유 아님 고지
  - [x] 로컬 관심 신호 → For you 칩 (게스트 기기)
  - [x] 긴장도 점수 log1p+EMA+일일 cap + 내일 1위 예측 MVP
  - [ ] 로그인 시 관심 프로필 계정 merge
  - [ ] 로그인 시 예측 deviceId → 계정 연동
