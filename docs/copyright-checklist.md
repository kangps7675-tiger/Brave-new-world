# 저작권 · 데이터 라이선스 체크리스트

멋진 신세계 목표 문서용. **법률 자문이 아닙니다.** 유료 SaaS 직전에는 변호사 검토를 권장합니다.

## VIINA (ODbL) — 핵심 원칙

| 항목 | 정책 |
|------|------|
| **용도** | **렌더링 전용 (Produced Work)** — 지구본 폴리곤·전선·지역명·이벤트 마커를 화면에 표시 |
| **SaaS** | ODbL 3.1 — 상업적 이용 명시 허용 |
| **Share-Alike 회피** | ODbL 4.5(b): DB 조회로 만든 **제작물**은 파생 DB가 아님 → 가공 DB 전체 ODbL 공개 의무 없음 (렌더링만 할 때) |
| **필수 의무** | ODbL 4.3 — **출처 표기** (VIINA + ODbL 링크) |
| **금지** | 사용자가 VIINA **원본/가공 DB를 추출·다운로드·API로 수령**할 수 있는 기능 |

### 체크리스트 (릴리스 전)

- [ ] 지도·레이어·About/출처 패널에 VIINA + ODbL attribution 문구 표시
- [ ] `Contains information from VIINA, which is made available here under the Open Database License (ODbL).` (또는 동등 문구)
- [ ] ODbL v1.0 링크: https://opendatacommons.org/licenses/odbl/1-0/
- [ ] VIINA 프로젝트 링크 (공식 URI 사용)
- [ ] **VIINA 렌더링 전용** — `public/data/`에 VIINA 원본 GeoJSON **미배포** (또는 배포 시 별도 ODbL Share-Alike 검토)
- [ ] **공개 API 금지** — `/api/**` 경로로 VIINA 타일·셀·폴리곤 bulk export **없음**
- [ ] **Export 버튼 금지** — "GeoJSON 다운로드", "데이터보내기" 등 VIINA 좌표+속성 통째 반출 UI 없음
- [ ] **스크rape 게이트** — `/api/render/ukraine-control*` 는 `cv_viina_gate` HttpOnly 쿠키 + same-origin만 허용 (`viinaRenderGate.ts`)
- [ ] 서버 내부 캐시(Supabase 등)는 허용하되, **클라이언트/외부 API 응답에 raw 필드 미포함**
- [ ] 코드 리뷰 시 `src/lib/licensing/viinaPolicy.ts` 정책 준수 확인
- [ ] 유료화 전 법률 자문 1회

### 허용 vs 금지

| ✅ 허용 | ❌ 금지 |
|---------|---------|
| RU/UA 주장 영역을 지구본에 폴리곤으로 렌더 | VIINA 원본을 API JSON으로 제공 |
| 클릭 시 정보 패널에 텍스트·상태 표시 | 사용자 GeoJSON/CSV export |
| 서버에서 가공 후 **화면 출력만** | `public/` 정적 파일로 가공본 무제한 배포 (Share-Alike 검토 필요) |
| SaaS 구독·로그인·기능 제한 | VIINA 데이터 재판매 전용 API |
| 동일 출처 UI의 렌더 세션 fetch | curl/스크립트/타 도메인에서 렌더 캐시 덤프 |

### 코드 정책

- 정책 상수: `src/lib/licensing/viinaPolicy.ts`
- 스크rape 게이트: `src/lib/licensing/viinaRenderGate.ts` · `GET /api/render/viina-session`
- 신규 API 라우트에 VIINA 데이터 포함 시 `rejectViinaPublicDataApi()` 사용
- 환경 변수 `VIINA_RENDERING_ONLY=true` (기본) — `false`여도 공개 export API는 구현하지 않음
- 서명 시크릿: `VIINA_RENDER_GATE_SECRET` (없으면 `INGEST_CRON_SECRET` 폴백)
- 로컬 curl 디버그 전용: `VIINA_RENDER_GATE_RELAX=true` (프로덕션 금지)

---

## Telegram OSINT — LLM 분리 (절대 규칙)

| 항목 | 정책 |
|------|------|
| **절대 규칙** | 텔레그램 OSINT 콘텐츠는 **AI 요약 프롬프트의 컨텍스트로 절대 넣지 않는다** |
| **표시** | 사람이 읽는 raw 피드 패널 **`TelegramOsintPanel`** 로만 존재 |
| **분리** | LLM·뉴스 파이프라인(`/api/news-stream`, `buildNewsStream`)과 **완전히 별도 트랙** |

### 체크리스트 (릴리스 전)

- [ ] `IntelNewsSheet` / `NewsStreamProvider`에 Telegram fetch·표시 없음
- [ ] `src/lib/news/pipeline.ts` — RSS·GDELT 뉴스만 (Telegram import 금지)
- [ ] `translateNewsStreamPayload` — 뉴스 항목만 번역 (Telegram 미포함)
- [ ] Telegram은 `/api/telegram-alerts` → `TelegramOsintPanel` 경로만
- [ ] 코드 리뷰 시 `src/lib/licensing/telegramOsintPolicy.ts` 준수 확인

### 코드 정책

- 정책 상수: `src/lib/licensing/telegramOsintPolicy.ts`

---

## Telegram 미디어 (영상·사진) — 재호스팅 금지 (절대 규칙)

채널 게시물 텍스트는 위 LLM 분리 규칙으로 처리되지만, **영상·사진 원본 파일 자체의 저작권은 채널 텍스트와 별개 문제**다. 재게시된 전선 영상의 저작권자는 대개 텔레그램 채널 운영자도 아니고(드론 조종사·현지 병사·국영매체 등에서 재유통), 우리가 파일을 다운받아 우리 서버/R2/CDN에 올리는 순간 무단 복제·재배포 리스크가 생긴다.

| 항목 | 정책 |
|------|------|
| **절대 규칙** | 영상·사진 원본 파일을 **다운로드·재호스팅하지 않는다.** 항상 텔레그램 공식 공개 임베드(`t.me/.../{id}?embed=1`)를 iframe으로 그대로 띄운다 |
| **로딩 시점** | 자동재생 금지 — 사용자가 "미리보기 로드" 클릭할 때만 iframe 마운트 (그래픽 폭력성 콘텐츠 경고 문구 동반) |
| **구현 위치** | `TelegramIntelFeed.tsx` — `embedSrc = ${alert.messageUrl}?embed=1`, `showEmbed` 클릭 게이트 |
| **미검토** | 채널 운영자가 "임베드 자체를 금지"하는 경우(비공개 채널, 임베드 차단 설정)까지는 처리 안 됨 — 변호사 미검토 |

### 체크리스트 (릴리스 전)

- [ ] 영상/사진 파일을 `fetch` 후 자체 스토리지(R2/S3 등)에 저장하는 코드 없음
- [ ] 모든 미디어 렌더는 `<iframe src="{messageUrl}?embed=1">` 형태 — `<video src=...>` 로 직접 재생 금지
- [ ] 미디어 로드는 사용자 클릭 후에만 (자동재생/자동 프리로드 금지)
- [ ] 그래픽 콘텐츠 경고 문구 표시 ("공식 t.me 임베드 · 재호스팅 없음. 전장·폭격 영상이 포함될 수 있습니다.")
- [ ] 코드 리뷰 시 `src/lib/licensing/telegramOsintPolicy.ts`의 `TELEGRAM_MEDIA_POLICY` 준수 확인
- [ ] 유료화 전 법률 자문 1회 (특히 임베드 차단/비공개 채널 케이스)

### 코드 정책

- 정책 상수: `src/lib/licensing/telegramOsintPolicy.ts` (`TELEGRAM_MEDIA_ABSOLUTE_RULE_KO`)

---

## 유료화 전 미해결 항목 (정기 점검)

아래는 **지금 무료/데모 단계라 당장 문제는 아니지만, 결제·유료 SaaS 전환 전에 반드시 재확인해야 하는 항목**이다. 상태가 "미확인"인 채로 유료 전환하면 안 됨.

| 항목 | 리스크 | 상태 | 조치 |
|------|--------|------|------|
| GDELT 상업 이용 | 이용약관에 상업적 이용 관련 조건이 있을 수 있음 | 🟡 미확인 | 유료화 전 GDELT ToS 재확인 |
| UCDP GED 상업 이용 | 연구용 라이선스 — 상업 서비스 포함 여부 불명확 | 🟡 미확인 | 유료화 전 UCDP 라이선스 확인, 필요 시 대체 데이터 검토 |
| adsb.fi | 카탈로그(`sourceCatalog.ts`)에 "비상업"으로 명시된 소스를 그대로 사용 중 | 🔴 위반 소지 (무료 단계는 관행상 허용 범위) | 유료화 전 상업 라이선스가 있는 대체 피드(ADS-B Exchange 상업 티어 등)로 교체 |
| Telegram 미디어 재호스팅 | 위 섹션대로 embed-only 구현은 됐으나 변호사 검토는 안 됨 | 🟢 완화됨 (미검토) | 유료화 전 변호사 1회 검토 |

체크 주기: **월 1회** 또는 결제 기능 출시 직전 필수. 담당자가 이 표의 상태 컬럼을 갱신할 것.

---

## 기타 데이터 소스 (요약)

| 소스 | 라이선스·주의 |
|------|----------------|
| Natural Earth | 퍼블릭 도메인 (영토 경계·국가) |
| GDELT | 공개 이벤트; 상업 이용 시 GDELT 이용 약관 확인 |
| UCDP GED | 연구용; 상업 시 별도 확인 |
| NASA FIRMS | 공개; attribution 필요 |
| adsb.fi | 비상업·출처 표기 (서비스 약관 확인) |
| OpenStreetMap / GEM 등 | 각 라이선스(CC BY, ODbL 등)별 attribution |

전체 레이어 목록: `src/data/sourceCatalog.ts` · UI: 앱 내 「데이터 출처 · 라이선스」 패널

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-10 | VIINA 렌더링 전용·공개 API/export 금지 원칙 문서화 |
| 2026-07-11 | Telegram OSINT — LLM/뉴스 파이프라인 절대 분리 규칙 문서화 |
| 2026-07-28 | Telegram 미디어(영상·사진) 재호스팅 금지 규칙 문서화 + 유료화 전 미해결 항목(GDELT·UCDP·adsb.fi·Telegram 미디어) 정기 점검표 추가 |
