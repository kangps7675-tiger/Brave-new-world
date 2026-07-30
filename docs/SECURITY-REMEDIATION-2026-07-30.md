# 보안 조치 내역 — 2026-07-30

`docs/SECURITY-ASSESSMENT-2026-07-30.md` 의 Critical / High / Medium 항목에 대한 코드 수정 기록.

---

## 1. 신규 파일

| 파일 | 역할 |
|---|---|
| `src/lib/auth/cronAuth.ts` | cron·워밍 라우트 공용 인증 게이트. **fail-closed**, Bearer 헤더 전용, 상수 시간 비교 |
| `src/lib/auth/clientIdentity.ts` | 스푸핑 저항 레이트리밋 키(`cf-connecting-ip` 우선), 프로덕션 오류 메시지 마스킹 |
| `src/lib/svgSafe.ts` | SVG 속성값·JSON-LD 이스케이프 유틸 |
| `scripts/check-security.mjs` | 보안 회귀 가드 (CI) |
| `.github/dependabot.yml` | 주간 의존성 보안 업데이트 |
| `src/lib/auth/cronAuth.test.ts`, `src/lib/svgSafe.test.ts` | 회귀 테스트 |

---

## 2. CRITICAL

### CRIT-01 — fail-open 인증 게이트 (해결)

`if (!secret) return true` 를 전량 제거했다.

- `workers/cron-ingest/src/index.ts` — `authorizeManual()` 을 fail-closed 로 전환. 시크릿 미설정 시 `/run` · `/push/send` · `/track` · `/backfill-baseline` · `/daily-predict` 전부 401. 로컬 개발용 탈출구는 `.dev.vars` 의 `ALLOW_UNAUTHENTICATED_INGEST="true"` 로만 열린다. 상수 시간 비교(`safeEqual`) 적용.
- warm 라우트 6곳 (`news-stream` · `video-news` · `ais` · `adsb` · `submarine-tunnels` · `ship-movements`) → `authorizeCronRequest()` 로 통일.
- `src/app/api/render/dispute-paths/route.ts` — 감사 보고서에서 놓쳤던 7번째 지점. **회귀 가드 스크립트가 잡아냈다.**
- `workers/cron-ingest/src/env.ts` — `INGEST_CRON_SECRET` 을 "프로덕션 필수" 로 문서화, `ALLOW_UNAUTHENTICATED_INGEST` 타입 추가.

`workers_dev` 는 **끄지 않았다.** Next 앱이 `DEFAULT_INGEST_URL`(`src/lib/d1LiveSnapshots.ts:108`)로 이 Worker 에 붙기 때문에, 끄면 `/track` · `/push/subscribe` · D1 읽기 폴백이 죽는다. 대신 `wrangler.ingest.toml` 에 필수 조건과 권장 조치(커스텀 도메인 + WAF)를 명시했다.

### CRIT-02 — 무인증 원격 프로세스 실행 (해결)

- `src/app/api/data-sync/route.ts` — POST 에 `authorizeCronRequest()` 게이트 추가.
- **아키텍처 수정이 핵심이다.** 원인은 인증 부재가 아니라 *브라우저가 서버 파이프라인을 트리거하는 구조* 였다. `src/hooks/useDataSync.ts` 의 `triggerIfStale()` 이 방문자 브라우저에서 POST 를 보내고 있었다 → 상태 폴링 전용으로 변경. 파이프라인 구동은 Cron 이 전담한다.
- 같은 패턴이 텔레그램 쪽에도 있었다: `GlobeDashboard.tsx:4685` 와 `useLiveOsintPolling.ts:137` 이 방문자마다 `POST /api/telegram-alerts/sync`(120초 외부 스크레이핑)를 호출 → 읽기 전용으로 변경.

---

## 3. HIGH

| ID | 조치 |
|---|---|
| HIGH-01 | `next.config.mjs` 에 전역 `headers()` 추가 — HSTS(프로덕션 한정) · X-Frame-Options · nosniff · Referrer-Policy · Permissions-Policy · COOP, `/api/*` 에 `X-Robots-Tag: noindex`. CSP 는 **Report-Only** 로 시작하며 `CSP_ENFORCE=true` 로 강제 전환. MapLibre(`worker-src blob:`) · Google Fonts · t.me/YouTube 임베드 · R2 CDN 을 반영했다 |
| HIGH-02 | `?secret=` 쿼리 인증을 전 지점에서 제거 — Worker, `telegram-alerts/ingest`, warm 라우트 6곳, `viinaRenderGate.isViinaCronAuthorized()`. Bearer 헤더만 허용 |
| HIGH-03 | `ship-movements/admin` 로그인에 IP 기준 시도 제한(15분 내 5회 → 15분 잠금, 429 + `Retry-After`) 추가. 비교를 `matchesAdminSecret()`(상수 시간)로 교체. 세션 토큰에 `jti` 추가(`exp.jti.sig`) — 로그인마다 토큰이 달라지고 향후 개별 폐기가 가능해진다. **기존 토큰은 무효화되므로 재로그인이 필요하다** |
| HIGH-04 | `svgSafe.ts` 도입. `locationPinSvg()` · `surfaceCombatantIconSvg()` 의 색상·크기 인자 검증, chokepoints 2개 페이지의 JSON-LD 를 `safeJsonLd()` 로 교체 |

---

## 4. MEDIUM

| ID | 조치 |
|---|---|
| MED-01 | `rateLimitKey()` 도입 — `cf-connecting-ip` 우선, 없으면 `TRUST_PROXY_HEADERS=true` 일 때만 XFF 허용, 프로덕션에서 신뢰 출처 없으면 `null`. `user-analyze`(429 반환) · `ask-layers` · `why-matters`(LLM 스킵 후 규칙/템플릿 폴백) · `viinaRenderGate` 적용 |
| MED-02 | 인메모리 한계는 코드 주석으로 명시하고 D1/Cloudflare Rate Limiting 이관을 후속 과제로 남김 (구조 변경이라 별도 작업) |
| MED-03 | `daily-predict` 에 IP당 일 12회 제출 상한 추가. `deviceId` 는 게스트 UX 유지를 위해 그대로 두되 IP 축으로 상한을 걸었다 |
| MED-04 | `publicErrorMessage()` 도입 — API 라우트 46개 파일에서 `error.message` 직접 반환을 제거. 프로덕션에서는 일반화 메시지, 상세는 서버 로그로 |
| MED-05 | `push/subscribe` 에 푸시 서비스 호스트 화이트리스트(FCM/Mozilla/WNS/Apple) 추가 — Next 라우트와 Worker 양쪽. 임의 URL 구독으로 인한 D1 증식·브로드캐스트 증폭 차단 |
| MED-06 | `telegram-alerts/sync` 의 `GET → POST` 위임 제거. GET 은 405 + `Allow: POST` |
| MED-08 | `xlsx` 는 **교체하지 않았다** (사용자 선택 범위 밖). CI 의 `npm audit` 이 dev 의존성은 보고만 하고 통과시키므로 빌드를 막지 않는다 |

### 추가로 발견해 고친 것 (원 보고서에 없던 항목)

`src/lib/licensing/viinaRenderGate.ts:41` — VIINA 게이트 시크릿에 하드코딩 폴백 `"dev-only-viina-render-gate"` 가 있었다. 공개 저장소에 그대로 노출되므로 누구나 유효한 게이트 쿠키를 위조해 렌더 캐시를 bulk 로 긁어갈 수 있었다. 프로덕션에서는 시크릿 미설정 시 **예외를 던지도록** 변경.

---

## 5. CI

`.github/workflows/ci.yml`

- `quality` 잡에 `npm run verify:security` 추가 (fail-open 인증 · 쿼리 시크릿 · 하드코딩 자격증명 · 부수효과 GET 회귀 검사)
- `security` 잡 — `node scripts/ci-npm-audit-gate.js`(프로덕션 high/critical 차단). Next 14 / 내장 postcss 는 OpenNext 마이그레이션 전까지 allowlist. `adm-zip`·`fast-uri` 는 overrides/업그레이드로 제거.
- `.github/dependabot.yml` — 주간 npm 업데이트, Next/React 메이저는 제외(마이그레이션 계획 필요)

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| 보안 회귀 가드 | ✅ 위반 0건 |
| 타입체크 (`src/lib/**` + `src/app/api/**` + `src/hooks/useDataSync.ts`) | ✅ 오류 0건 |
| 신규 모듈 단위 테스트 (14개 어서션) | ✅ 전부 통과 |
| `next.config.mjs` `headers()` 실행 | ✅ Report-Only 헤더 정상 생성 확인 |
| 컴포넌트 편집부(GlobeDashboard · useLiveOsintPolling) | ✅ 댕글링 참조 없음 |

**검증 과정에서 실제로 버그를 2건 잡았다.**

1. 타입체크가 `svgSafe.ts` 의 정규식 오류를 잡아냈다 — U+2028/2029 를 원시 문자로 쓴 탓에 정규식 리터럴이 깨졌다. 이스케이프 시퀀스로 수정.
2. 회귀 가드가 `render/dispute-paths/route.ts` 의 fail-open 게이트를 잡아냈다 — 원 감사 보고서가 놓친 7번째 지점.

### 검증하지 못한 부분

- **전체 `tsc --noEmit`** 을 완주하지 못했다. 저장소가 OneDrive 동기화 경로에 있어 파일 I/O 가 매우 느리고, 샌드박스에서 컴파일이 시간 제한에 걸린다. 검증한 범위는 위 표대로이며, `src/components/**`(GlobeDashboard 등 대형 파일)는 편집 부위를 육안 확인만 했다. **로컬에서 `npx tsc --noEmit` 를 한 번 돌려 주시길 권한다.**
- `workers/cron-ingest` 는 자체 tsconfig 로 검사했을 때 오류 5건이 나오지만 **전부 내가 건드리지 않은 파일**(`ais.ts` · `exerciseIngest.ts` · `navarea.ts` 등)의 기존 오류다. 이 디렉터리는 메인 tsconfig 의 `exclude` 에 있어 CI 타입체크 대상이 아니었다 — 별도 정리가 필요하다.
- `npm audit` 은 샌드박스에서 레지스트리 보안 API 응답이 오지 않아 여전히 미완료다. 전이 의존성 취약점은 로컬 확인이 필요하다.

---

## 7. 직접 하셔야 할 일

코드로 해결할 수 없는 항목들이다.

1. **`INGEST_CRON_SECRET` 설정** — 이걸 안 하면 cron 워밍이 전부 401 로 막힌다(의도된 동작). 프로덕션 배포 전 필수. 발급 방법은 아래 8절 참조.

2. **시크릿 회전** — `?secret=` 쿼리로 오간 값들은 로그에 남았을 수 있다. `INGEST_CRON_SECRET` · `TELEGRAM_INGEST_SECRET` · `NEWS_WARM_SECRET` · `SHIP_MOVEMENT_ADMIN_SECRET` · `VIINA_RENDER_GATE_SECRET` 회전 권장.

3. **`VIINA_RENDER_GATE_SECRET` 설정** — 미설정 시 프로덕션에서 예외가 발생하도록 바꿨다(하드코딩 폴백 제거의 대가).

4. **`.env` 를 OneDrive 밖으로** — 13개 이상의 실키가 평문으로 클라우드 동기화되고 있다. 저장소 자체를 `C:\dev\` 같은 로컬 경로로 옮기는 편이 낫다.

5. **CSP 위반 관찰 후 강제 전환** — 1주쯤 브라우저 콘솔의 Report-Only 위반을 지켜본 뒤 `CSP_ENFORCE=true`.

6. **관리자 재로그인** — 토큰 형식이 바뀌어 기존 세션은 무효다.

7. **로컬 검증** — `npx tsc --noEmit && npm test && npm audit --omit=dev`

---

## 8. 시크릿 발급 방법

### 이건 "발급"이 아니라 "생성"이다

`NASA_FIRMS_API_KEY` · `ANTHROPIC_API_KEY` 처럼 **외부 서비스에서 받아오는 키가 아니다.**
`INGEST_CRON_SECRET` 과 `VIINA_RENDER_GATE_SECRET` 은 이 프로젝트 안에서만 통하는 자물쇠라서,
**본인이 무작위 문자열을 만들어 넣으면 그게 곧 시크릿**이다. 어디에 가입할 필요가 없다.

조건은 하나뿐이다 — 아무도 추측할 수 없을 만큼 길고 무작위일 것. (32바이트 = 256비트 권장)

### 생성

```bash
# Windows 포함 어디서나 (Node 만 있으면 됨)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# macOS / Linux
openssl rand -base64 32
```

`Math.random()` 이나 직접 타이핑한 문자열은 쓰지 말 것 — 암호학적 난수여야 한다.
두 시크릿은 **서로 다른 값**으로 만든다.

### 어디에 넣는가

#### `INGEST_CRON_SECRET` — **같은 값을 3곳에**

Cron Worker 가 Next 앱의 warm 라우트를 부를 때 `Authorization: Bearer <secret>` 을 붙이고
(`workers/cron-ingest/src/index.ts:156`), Next 앱이 자기 환경변수와 대조한다.
따라서 **양쪽 값이 일치해야** 워밍이 통과한다.

```bash
# (1) ingest Worker
npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml

# (2) 메인 Next 앱 (wrangler.jsonc / name = "confilct-view")
npx wrangler secret put INGEST_CRON_SECRET
```

```ini
# (3) 로컬 개발 — .dev.vars (gitignored)
INGEST_CRON_SECRET=생성한_값
```

#### `VIINA_RENDER_GATE_SECRET` — Next 앱만

```bash
npx wrangler secret put VIINA_RENDER_GATE_SECRET
```

로컬 `.env` 에는 이미 값이 들어 있다. 다만 `.env` 가 OneDrive 동기화 경로에 평문으로 있었으므로
**새 값으로 교체(회전)하는 편이 안전하다.**

### 확인

```bash
npx wrangler secret list -c wrangler.ingest.toml   # ingest Worker
npx wrangler secret list                            # 메인 앱
```

값 자체는 보이지 않고 이름만 나온다 — 정상이다. Cloudflare 는 시크릿을 다시 읽어주지 않으므로
잃어버리면 새로 만들어 3곳을 다시 맞추면 된다.

### 주의

- 시크릿을 **채팅·이슈·커밋 메시지·스크린샷에 붙여넣지 말 것.** 한 번 노출되면 회전이 유일한 대응이다.
- `INGEST_CRON_SECRET` 은 `/push/send`(전체 구독자 푸시 브로드캐스트)를 여는 열쇠다. 사실상 관리자 자격증명으로 취급할 것.
