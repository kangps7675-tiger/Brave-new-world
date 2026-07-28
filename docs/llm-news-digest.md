# LLM 뉴스 다이제스트 (추후 설계)

> **상태:** P0 스캐폴딩만 — `digestTypes` · `public/data/live/news-digest.json` · `GET /api/news-digest` · Intel AnalysisPanel 캐시 바인딩. **LLM 배치·온디맨드 파이프라인은 미구현** (설계 문서).  
> **원칙:** 검증 매체만 LLM · OSINT(Telegram)는 사람 눈 · AI는 사실 단정 금지  
> **관련:** `src/lib/licensing/telegramOsintPolicy.ts` · `src/lib/news/digestTypes.ts` · `src/app/api/news-digest/route.ts` · Intel AnalysisPanel (`BottomIntelStack`) · [`deferred-status.md`](./deferred-status.md)

---

## 1. 목표

화이트리스트 RSS/GDELT 기사에 대해 **참고용 3줄 요약**을 제공해, 맵·Intel 시트의 “왜 뜨겁나”를 빠르게 읽게 한다.  
매 요청 LLM 호출 금지. **캐시된 digest**만 UI에 노출.

---

## 2. 정책 (하드 룰)

| 규칙 | 내용 |
|------|------|
| Telegram 제외 | 본문·제목·번역문을 LLM 컨텍스트에 **절대 주입 금지** |
| 화이트리스트만 | `feedCatalog` / media tier 1–2 중심. tier 3·관영은 요약 대상에서 제외하거나 “미검증” 배지 고정 |
| 사실 단정 금지 | UI 카피: **「AI 요약 (참고용)」** + 원문 링크 필수 |
| stub | `API_STUB_MODE=true` 이면 LLM 경로 OFF (시드 digest만 허용) |
| 비용 | 일일 토큰/요청 cap. 초과 시 제목·출처만 |

기존 체크리스트와 충돌 시 **Telegram 분리 정책이 항상 우선**.

---

## 3. 입·출력 스키마

### 입력 (서버 전용)

```ts
type DigestJobInput = {
  articleId: string;
  title: string;
  source: string;
  link: string;
  theater?: string;       // NewsTheater
  publishedAt?: string;
  excerpt?: string;       // RSS description 일부, 본문 전문 스크래핑은 선택·법적 검토
  lang: "ko" | "en";
};
```

- 소스: `/api/news-stream` 파이프라인 결과 중 whitelist만 큐잉  
- **금지:** `telegram-alerts`, embed scrape 텍스트

### 출력 (캐시 JSON)

```ts
type NewsDigestItem = {
  articleId: string;
  link: string;
  source: string;
  theater: string | null;
  /** 정확히 3문장 권장. 실패 시 null */
  summaryLines: [string, string, string] | null;
  confidence: "high" | "medium" | "low";
  relatedSymbols?: string[];  // Yahoo 심볼, 매매 권유 아님
  model: string;
  generatedAt: string;        // ISO
  disclaimer: "reference-only";
};
```

저장 예: `public/data/live/news-digest.json` 또는 KV/Blob + TTL 6–24h.

---

## 4. 트리거 · 파이프라인

```
RSS/GDELT whitelist
    → digest queue (dedupe by articleId/link)
    → LLM (structured JSON out)
    → validate schema + strip banned sources
    → write cache
    → UI reads cache only
```

| 트리거 | 용도 |
|--------|------|
| Cron / `data:sync` | 하루 N회 배치 (권장 기본) |
| Hero / Intel 시트 오픈 | 캐시 miss 시에만 온디맨드 (cap 엄격) |
| Stub | 시드 파일 또는 빈 digest |

권장 기본: **배치만**. 온디맨드는 트래픽·비용 본 뒤.

---

## 5. API · 비용 분리 (스캐폴딩)

| 엔드포인트 | 역할 | 과금 |
|------------|------|------|
| `GET /api/news-digest?articleId=` | 캐시 hit만. LLM 온디맨드 없음 | 없음 |
| `GET /api/claude/status` | 서버 키/digest 준비 여부 (키 값 비노출) | 없음 |
| `POST /api/claude/user-analyze` | 유저 헤드라인 분석 | **유저 BYOK** (`x-anthropic-api-key`) |
| `POST /api/news-digest/run` | 내부/cron 편집 digest (미구현) | **서버 `ANTHROPIC_API_KEY`** |

환경변수 (서버 전용):

- `ANTHROPIC_API_KEY=` — 편집자/배치만. 유저 분석에 **절대 사용 안 함**
- `LLM_NEWS_DIGEST_ENABLED=false` — true + 키 + stub OFF 일 때만 배치 LLM
- `ANTHROPIC_MODEL=claude-sonnet-4-5`

유저 키: 브라우저 `localStorage` (`bnw-user-anthropic-api-key`) → 요청 헤더로만 전달, 서버 미저장.

---

## 6. UI 자리

| 위치 | 동작 |
|------|------|
| AnalysisPanel / 기사 카드 | digest 있으면 3줄 + 「참고용」+ 원문 |
| 없으면 | 현재처럼 제목·출처·링크만 (placeholder 문구 제거 가능) |
| Telegram 패널 | digest UI **없음** |

카피 예 (ko/en `uiStrings`):

- `aiDigestLabel`: AI 요약 (참고용) / AI digest (for reference)  
- `aiDigestFail`: 요약을 불러오지 못했습니다. 원문을 확인하세요.

---

## 7. 프롬프트 제약 (요지)

- 역할: 편집자 보조. 추측·미확인 사실 단정 금지  
- 출력: JSON only, `summaryLines` 길이 제한  
- 심볼: 기사에 **명시된** 자산·원자재만. 없으면 `[]`  
- 언어: `labelLanguage`에 맞춤. 환각 시 confidence `low`

---

## 8. 단계적 롤아웃

| Phase | 내용 |
|-------|------|
| P0 | 스키마 + 빈 캐시 + UI 자리 + 정책 문서(본 파일) |
| P1 | 화이트리스트 배치 digest, stub 시드 1~2건 |
| P2 | Intel 시트 표시 + 일일 cap 모니터링 |
| P3 | `relatedSymbols` ↔ 전장 매핑(`theater-assets`) 연동 |
| — | TradingView·증권 딥링크는 [retention-markets-roadmap.md](./retention-markets-roadmap.md) |

---

## 9. 비목표

- Telegram OSINT 자동 요약  
- 매매 추천·목표가·포지션 지시  
- 기사 전문 무단 재배포  
- 매 페이지뷰 LLM 호출  

---

## 10. 수용 기준

- [ ] Telegram 텍스트가 LLM 요청 로그에 0건  
- [ ] stub ON에서 외부 LLM 호출 0건  
- [ ] UI에 원문 링크 없는 digest 노출 0건  
- [ ] cap 초과 시 우아한 폴백 (제목만)
