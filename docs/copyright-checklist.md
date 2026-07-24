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
