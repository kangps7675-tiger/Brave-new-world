# Conflict View — 보안 종합평가 보고서

- **대상**: `Confilct-view-dev` (Next.js 14.2.35 App Router + Cloudflare Workers/D1/R2, OpenNext)
- **평가일**: 2026-07-30
- **범위**: 소스코드 정적 분석 (`src/` 785개 파일, API 라우트 90개, `workers/cron-ingest`, 빌드·배포 설정)
- **비범위**: 배포된 인스턴스에 대한 동적 점검(DAST), 침투 테스트, 인프라 콘솔 설정, `scripts/`(Python OSINT 수집기) 상세 검토

---

## 1. 총평

**종합 등급: C+ (조건부 운영 가능 — 배포 전 Critical 2건 조치 필수)**

| 영역 | 등급 | 요약 |
|---|---|---|
| 시크릿 관리 | B− | git 이력 유출 없음. 다만 평문 `.env`가 OneDrive 동기화 경로에 존재 |
| 인증·인가 | **D** | 인증 게이트가 **fail-open** 패턴으로 다수 구현됨. 무인증 고비용 라우트 존재 |
| 입력 검증 | B | zod·화이트리스트 사용 양호. SQLi/XSS/RCE 직접 벡터 미발견 |
| 보안 헤더·CSP | **D** | 전역 CSP·HSTS·X-Frame-Options 부재 |
| 남용/레이트리밋 | C | LLM 라우트만 방어. 나머지는 무방비, IP 판별도 스푸핑 가능 |
| 의존성 | C+ | Next.js는 14.2 최신 패치. `xlsx@0.18.5`는 npm에 패치본 없음 |
| CI/공급망 | C− | 린트·테스트는 있으나 보안 스캔(감사·시크릿·SAST) 전무 |

**핵심 판단**: 이 프로젝트는 인증된 사용자 데이터를 거의 다루지 않는 공개 OSINT 지도이므로 *기밀성* 위험은 낮습니다. 반면 **무결성(허위 푸시 알림·데이터 오염)과 가용성/비용(무인증 리소스 소모)** 위험이 실질적입니다. 아래 CRIT-01, CRIT-02가 이 보고서의 핵심이며, 이 둘만 막아도 위험 프로파일이 크게 개선됩니다.

---

## 2. 심각도별 발견 사항

### 🔴 CRITICAL

#### CRIT-01. 인증 게이트 fail-open — 시크릿 미설정 시 전면 개방

`workers/cron-ingest/src/index.ts:577`

```ts
function authorizeManual(request: Request, env: IngestEnv): boolean {
  const secret = env.INGEST_CRON_SECRET?.trim();
  if (!secret) return true; // open in local/dev when secret unset
  ...
}
```

`INGEST_CRON_SECRET`이 프로덕션에 설정되지 않으면 **모든 관리 엔드포인트가 인증 없이 열립니다.** 그리고 `wrangler.ingest.toml:16`에 `workers_dev = true`가 설정되어 있어 이 Worker는 `conflict-view-ingest.<subdomain>.workers.dev`로 인터넷에 직접 노출됩니다.

개방 시 노출되는 엔드포인트:

| 엔드포인트 | 악용 시나리오 |
|---|---|
| `POST /push/send` | **전체 푸시 구독자에게 임의 제목·본문·링크의 알림 브로드캐스트.** 분쟁 알림 서비스 특성상 허위 공습경보 유포 = 서비스 신뢰도 파괴 + 피싱 URL 배포 |
| `POST /run`, `/backfill-baseline` | 유료 외부 API(NASA FIRMS·ADS-B·AISStream·MarineTraffic) 쿼터 고갈, D1 쓰기 폭주 |
| `POST /track` | 분석 이벤트 테이블 오염 |

동일한 fail-open 패턴이 Next.js 측 warm 라우트 6곳에도 반복됩니다 — `news-stream/warm:27`, `video-news/warm:29`, `ais/warm:15`, `adsb/warm:12`, `submarine-tunnels/warm:10`, `ship-movements/warm:17`.

**조치**
1. 즉시 `npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml` 로 시크릿 설정 후, 기존 시크릿이 있었다면 회전.
2. `if (!secret) return true` → `if (!secret) return process.env.NODE_ENV !== "production"` 로 변경. **이 패턴은 이미 코드베이스 안에 존재합니다** — `src/app/api/render/ukraine-control-paths/route.ts:35`가 정확히 올바른 형태이므로 이를 표준으로 삼아 전 라우트에 확산시킬 것.
3. `workers_dev = false`로 내리고 Cloudflare Access 또는 커스텀 도메인 + WAF 규칙 뒤로 이동.
4. 문자열 비교(`bearer === secret`)를 상수 시간 비교로 교체.

---

#### CRIT-02. `POST /api/data-sync` — 무인증 원격 프로세스 실행

`src/app/api/data-sync/route.ts:83, 162`

```ts
export async function POST(request: Request) {
  // ← 인증 검사 자체가 없음
  ...
  void execFileAsync(process.execPath, args, { cwd: ROOT, timeout: 15 * 60 * 1000, ... });
}
```

인터넷의 누구나 `POST /api/data-sync?force=1&mode=full` 한 번으로 **최대 15분짜리 Node 자식 프로세스를 서버에서 기동**시킬 수 있습니다. `force=1`은 스테일 검사와 최소 간격(15분) 레이트리밋을 모두 우회합니다. 락(`.sync.lock`)이 동시 실행은 막지만, 락 해제 시점마다 재요청하면 파이프라인을 영구 점유할 수 있습니다.

> **명령어 인젝션은 없습니다.** `mode`는 `quick`/`full` 화이트리스트로 플래그만 선택하고 `execFile`(셸 미경유)을 쓰므로 임의 명령 주입은 불가능합니다. 위험은 **자원 고갈·외부 API 쿼터 소진·비용 발생**에 한정됩니다.

영향도는 배포 타깃에 따라 달라집니다. OpenNext/Cloudflare Workers 런타임에서는 `child_process`·`fs` 자체가 동작하지 않아 실패하지만, Node 런타임(Vercel/셀프호스팅/로컬 노출)에서는 그대로 실행됩니다. `runtime = "nodejs"`로 선언되어 있으므로 **배포 경로를 반드시 확인**해야 합니다.

**조치**: `authorize()` 게이트 추가(CRIT-01 수정 후의 fail-closed 버전), 또는 프로덕션에서 라우트 자체를 비활성화하고 Cloudflare Cron Trigger로만 파이프라인을 구동.

---

### 🟠 HIGH

#### HIGH-01. 전역 보안 헤더·CSP 전무

`next.config.mjs`에 `headers()` 블록이 없고, `src/middleware.ts`는 VIINA 라이선스 경로 차단만 수행합니다. 전 저장소에서 `Content-Security-Policy`·`Strict-Transport-Security`·`X-Frame-Options`·`Permissions-Policy` 문자열이 **단 한 건도 발견되지 않았습니다**(`nosniff`/`Referrer-Policy`가 `api/render/*` 2개 라우트에만 국소 적용).

결과: 클릭재킹 방어 없음, MIME 스니핑 방어 없음, HTTPS 다운그레이드 방어 없음, XSS 발생 시 2차 방어선 없음. 사용자 콘텐츠 XSS 싱크가 현재 없더라도(HIGH-04 참조) CSP는 서드파티 스크립트·CDN(`NEXT_PUBLIC_DATA_CDN`, R2) 오염에 대한 유일한 완화 수단입니다.

**조치**: `next.config.mjs`에 전역 `headers()` 추가.

```js
async headers() {
  return [{
    source: "/:path*",
    headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ],
  }];
}
```

MapLibre가 WebWorker/blob을 쓰므로 `worker-src blob:`가 필요하며, CSP는 `Report-Only`로 1주 관찰 후 강제 적용을 권장합니다.

---

#### HIGH-02. 시크릿을 URL 쿼리 파라미터로 허용

`workers/cron-ingest/src/index.ts:582`, `src/app/api/telegram-alerts/ingest/route.ts:34`, warm 라우트 전반에서 `?secret=<값>` 을 인증 수단으로 허용합니다.

쿼리스트링은 Cloudflare/CDN/리버스프록시 액세스 로그, 브라우저 히스토리, `Referer` 헤더, 에러 리포팅 툴에 **평문으로 축적**됩니다. 로그 접근 권한만으로 관리자 권한이 승격됩니다.

**조치**: `Authorization: Bearer` 헤더만 허용하고 쿼리 폴백 제거. 이미 노출되었을 가능성을 고려해 시크릿 회전.

---

#### HIGH-03. 관리자 로그인 무제한 브루트포스

`src/app/api/ship-movements/admin/route.ts:60`

```ts
if (!body.secret || body.secret !== secret) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
```

- 시도 횟수 제한·지연·계정 잠금 없음 → 온라인 브루트포스 무제한
- `!==` 비대칭 비교 → 이론적 타이밍 사이드채널 (원격 환경에선 실용성 낮음)
- 성공 시 `/admin/ship-movements`에서 D1 관측 데이터 승인·좌표·라벨 수정 권한 획득 → **지도에 표시되는 함정 이동 정보 위조 가능**

> 참고로 토큰 **검증** 로직(`src/lib/shipMovements/adminAuth.ts:21`)은 HMAC-SHA256 + `timingSafeEqual`로 올바르게 구현되어 있습니다. 쿠키도 `httpOnly`/`sameSite=lax`/`secure`(프로덕션)로 적절합니다. 문제는 로그인 관문뿐입니다.

**조치**: IP+세션 기준 로그인 시도 제한(예: 5회/15분 + 지수 백오프), `crypto.timingSafeEqual`로 비교 교체, `SHIP_MOVEMENT_ADMIN_SECRET`을 고엔트로피 값으로 회전.

---

#### HIGH-04. `dangerouslySetInnerHTML` 6개소 — 현재는 안전하나 회귀 위험

| 위치 | 주입 소스 |
|---|---|
| `MapLegend.tsx:96` | `carrierDeckIconSvg()` — 내부 생성 |
| `globe/AnalysisPanel.tsx:481` | `milAircraftIconSvg()` — 내부 생성 |
| `WeeklyShipMovesPanel.tsx:426, 497` | `warshipProfileIconSvg(shipNavyFillColor(...))` — 내부 팔레트 |
| `LocationPinIcon.tsx:43` | `locationPinSvg()` — 내부 생성 |
| `chokepoints/*/page.tsx` | `JSON.stringify(jsonLd)` — 정적 데이터 |

**현재 모두 코드 내부에서 생성되는 SVG이며 사용자 입력이 흐르지 않아 즉시 악용 가능한 XSS는 없습니다.** 다만 `warshipProfileIconSvg`는 관리자 검토 DB의 `navyCode`에서 파생되는 색상 값을 받으므로, 향후 이 경로에 문자열이 더 흘러들면 SVG 속성 이스케이프 이슈로 전환될 수 있습니다. `JSON.stringify(jsonLd)`도 `</script>` 시퀀스를 이스케이프하지 않습니다.

**조치**: SVG 빌더에 색상 값 정규식 검증(`/^#[0-9a-f]{3,8}$/i`) 추가, JSON-LD는 `.replace(/</g, "\\u003c")` 처리, HIGH-01의 CSP로 심층 방어.

---

### 🟡 MEDIUM

| ID | 발견 | 위치 | 조치 |
|---|---|---|---|
| MED-01 | **레이트리밋 IP 스푸핑** — `x-forwarded-for` 첫 값을 신뢰. Cloudflare 뒤에서는 `cf-connecting-ip`가 우선하지만, 오리진 직접 접근 시 헤더 위조로 LLM 쿼터(BYOK 3회/분, 서버 8회/일) 무력화 | `claude/user-analyze:21`, `ask-layers:28`, `claude/why-matters` | 오리진을 Cloudflare IP로만 제한, `cf-connecting-ip` 부재 시 거부 |
| MED-02 | **인메모리 레이트리밋의 구조적 한계** — `Map` 기반이라 워커 인스턴스마다 독립. 서버리스 다중 인스턴스에서 실효 한도가 N배로 증폭 | 동상 | Cloudflare Rate Limiting 또는 D1/KV 기반 카운터로 이관 |
| MED-03 | **투표 조작** — `deviceId`가 클라이언트 생성 문자열(8~80자)이며 서버 검증 없음. 무한 생성으로 일일 예측 통계 왜곡 가능 | `daily-predict/route.ts:22` | IP당 제출 상한, 서버 서명 deviceId(HMAC) 발급 |
| MED-04 | **오류 메시지 원문 노출** — `error.message`를 클라이언트에 그대로 반환하는 지점 48곳. DB 스키마·내부 경로·업스트림 응답이 새어나올 수 있음 | `src/app/api/**` 전반 | 프로덕션에서는 일반화된 메시지 + 서버 로그에만 상세 기록 |
| MED-05 | **`POST /push/subscribe` 무인증·무제한** — Next 프록시와 Worker 양쪽 모두 공개. 자동화 요청으로 D1 구독 테이블 무한 증식 → 저장 비용 + 브로드캐스트 지연 | `api/push/subscribe/route.ts`, `workers/.../index.ts:637` | 엔드포인트 도메인 화이트리스트(FCM/Mozilla/WNS), IP·UA 기준 제한, Turnstile |
| MED-06 | **`POST /api/telegram-alerts/sync`가 GET으로도 동작하며 인증 없음** — `export async function GET(request) { return POST(request); }`. 부수효과 있는 GET은 CSRF·프리페치·크롤러에 의해 트리거되며, `maxDuration = 120`의 외부 스크레이핑을 유발 | `telegram-alerts/sync/route.ts:48` | GET 핸들러 제거, warm 라우트와 동일한 인증 적용 |
| MED-07 | **평문 시크릿이 OneDrive 동기화 경로에 존재** — 저장소가 `C:\Users\...\OneDrive\Desktop\` 하위이며 `.env`에 Anthropic·NASA FIRMS·AISStream·MarineTraffic·ADS-B·FRED·Telegram·UCDP 등 **13개 이상 실키**가 평문 보관. git 커밋은 없으나(확인 완료) 클라우드 동기화·이전 버전·공유 링크·타 기기 캐시로 확산 | `.env` | 저장소를 OneDrive 밖으로 이전, 로컬은 `.dev.vars`+Wrangler secret, OneDrive 버전 기록에서 삭제 |
| MED-08 | **`xlsx@0.18.5`** — SheetJS는 npm 배포를 중단해 레지스트리 최신본이 여전히 0.18.5(확인 완료). Prototype Pollution(CVE-2023-30533)·ReDoS(CVE-2024-22363) 영향권이며 **npm 경로로는 패치 불가**. devDependency이므로 노출은 빌드 스크립트가 신뢰할 수 없는 스프레드시트를 처리할 때로 한정 | `package.json` devDeps | `cdn.sheetjs.com`의 0.20.x로 교체하거나 `exceljs`로 이관. 불가 시 신뢰 입력만 처리하도록 문서화 |

---

### 🔵 LOW / 관찰 사항

- **`next.config.mjs:4-7`**: `eslint.ignoreDuringBuilds: true` + `typescript.ignoreBuildErrors: true`. 타입 오류가 빌드를 통과하므로 타입 기반 안전성 보장이 약화됨. CI에서 `tsc --noEmit`를 별도로 돌리고 있어 완화되지만, CI 우회 배포 시 게이트 없음.
- **CI 보안 스캔 부재** (`.github/workflows/ci.yml`): lint·test·typecheck만 존재. `npm audit --audit-level=high`, gitleaks/trufflehog 시크릿 스캔, Dependabot/Renovate, CodeQL 중 어느 것도 없음.
- **Next.js 14.2.35**: `next-14` dist-tag의 최신 패치본이 맞습니다(레지스트리 확인 완료). 다만 현행 최신은 16.2.12로 **메이저 2단계 뒤처져 있어**, 14.x 보안 지원 종료 시 즉시 위험으로 전환됩니다. 마이그레이션 계획 수립 권장.
- **`/push/unsubscribe` 무인증**: 엔드포인트 문자열만 알면 타인 구독 해제 가능. 엔드포인트 URL은 사실상 비밀이라 실효 위험은 낮음.
- **관리자 토큰 설계**: `${exp}.${HMAC(exp)}` 구조로 세션 식별자·nonce가 없어 개별 세션 폐기가 불가능(시크릿 회전만이 유일한 무효화 수단). 단일 관리자 운영 전제에서는 수용 가능.
- **`API_STUB_MODE` 게이트**: `verify:stub-off-gate` 스크립트로 프로덕션 스텁 방지 장치가 마련되어 있으나 CI 워크플로에는 포함되지 않음.

---

## 3. 잘 되어 있는 점

객관적으로 평가하면, 이 코드베이스는 **개인 프로젝트 평균을 상회하는 보안 습관**을 여러 곳에서 보여줍니다.

1. **시크릿이 git 이력에 없음** — `.env`, `.dev.vars`, `*.session`, `*.pem` 전체 이력 검색 결과 커밋 흔적 0건. `.gitignore`가 telethon 세션·R2 캐시·VIINA 원본까지 촘촘히 커버.
2. **서버 전용 키가 클라이언트로 새지 않음** — `NEXT_PUBLIC_` 접두사는 `DATA_CDN`·`SITE_URL`·`VAPID_PUBLIC_KEY`·`DISCORD_INVITE` 4개뿐이며 모두 공개되어야 할 값. `.env` 주석에 "NEXT_PUBLIC_ 절대 붙이지 말 것"이 반복 명시된 것도 좋은 규율.
3. **SQL 인젝션 벡터 없음** — Drizzle ORM만 사용, `sql.raw`·문자열 연결 쿼리 0건.
4. **코드 실행 벡터 없음** — `eval`·`new Function` 0건. `execFile`은 셸을 거치지 않고 인자도 화이트리스트.
5. **입력 검증** — zod 스키마 9개 라우트, `/api/track`과 Worker `/track` 양쪽에 이벤트 화이트리스트, `daily-predict`의 픽 ID·날짜 윈도우 검증.
6. **HMAC 토큰 검증에 `timingSafeEqual` 사용** (`adminAuth.ts:22`) — 흔히 놓치는 부분.
7. **BYOK 설계** — 사용자 LLM 분석에 서버 `ANTHROPIC_API_KEY`를 쓰지 않고 사용자 키를 요청 단위로만 사용·미저장. 키 형식 검증(`sk-ant-` 접두사)도 존재.
8. **fail-closed 패턴의 선례 존재** — `render/ukraine-control-paths/route.ts:34`. 이 프로젝트는 올바른 답을 이미 알고 있으며, 문제는 그것이 일관되게 적용되지 않았다는 점입니다.
9. **라이선스 준수 게이트** — VIINA ODbL 정책을 미들웨어 + 경로 패턴 + 라우트 가드 3중으로 강제. 법적 리스크 관리 측면에서 모범적.

---

## 4. 조치 로드맵

### 즉시 (배포 전 필수 — 예상 2~4시간)

1. `INGEST_CRON_SECRET` 설정 및 회전, `workers_dev = false` (CRIT-01)
2. 전 라우트 `if (!secret) return true` → fail-closed 일괄 치환 (CRIT-01) — 7개 파일
3. `/api/data-sync` POST에 인증 추가 또는 프로덕션 비활성화 (CRIT-02)
4. `.env`를 OneDrive 밖으로 이전 (MED-07)

### 1주 내

5. 전역 보안 헤더 + CSP `Report-Only` 적용 (HIGH-01)
6. 쿼리 파라미터 시크릿 인증 제거 (HIGH-02)
7. 관리자 로그인 레이트리밋 + `timingSafeEqual` (HIGH-03)
8. `/api/telegram-alerts/sync`의 GET 핸들러 제거 (MED-06)
9. CI에 `npm audit --audit-level=high` + gitleaks 추가

### 1개월 내

10. 레이트리밋을 Cloudflare Rate Limiting / D1 카운터로 이관 (MED-01, MED-02)
11. 프로덕션 오류 메시지 일반화 (MED-04)
12. `xlsx` 교체 (MED-08)
13. CSP 강제 전환, Dependabot·CodeQL 도입
14. Next.js 15/16 마이그레이션 계획 수립

---

## 5. 평가의 한계

정직하게 밝혀둘 부분입니다.

- **`npm audit`을 완료하지 못했습니다.** 샌드박스에서 npm 보안 권고 API 호출이 응답하지 않아, 의존성 평가는 `package.json` 직접 의존성의 버전 대조(레지스트리 dist-tag 조회로 확인)에 기반합니다. **전이 의존성(transitive dependency) 취약점은 미확인 상태**이므로 로컬에서 `npm audit --omit=dev`를 직접 실행해 교차 검증하시길 권합니다.
- 배포된 인스턴스를 점검하지 않았으므로, 실제 프로덕션에 `INGEST_CRON_SECRET`이 설정되어 있다면 CRIT-01의 실현 위험은 크게 낮아집니다. **다만 fail-open 코드 패턴 자체는 설정 실수 한 번으로 전면 개방되는 구조이므로, 설정 여부와 무관하게 수정 대상입니다.**
- `scripts/`(Node 빌드 스크립트, Python Telegram OSINT 수집기)와 `IRONSIGHT/` 하위는 상세 검토하지 않았습니다. Telethon 세션 파일 취급은 별도 점검이 필요합니다.
- 정적 분석 특성상 런타임에서만 드러나는 인가 우회, 레이스 컨디션, 세션 처리 결함은 탐지 범위 밖입니다.

---

*본 보고서는 소스코드 정적 분석 결과이며, 배포 환경의 실제 설정에 따라 각 항목의 실현 위험도는 달라질 수 있습니다.*
