# Brave New World — 해역 위험 판단

> **한 줄:** 피격 경보가 뜬 직후 "이 바다는 지금 다닐 만한가"에 근거를 갖춘 답을 가장 먼저 건넨다.

해운사·해운 관련 중소기업·화주·보험 실무자를 위한 해역 위험 대시보드입니다.
해역 하나(홍해·아덴만 / 호르무즈·걸프 / 흑해 / 대만해협 / 말라카)를 고르면 한 흐름으로 봅니다.

| 정보 | 출처 | 코드 |
|------|------|------|
| 피격 선박 (확인/유력/못 좁힘/항적 없음) | UKMTO 경보 × AIS 항적 | `src/lib/strikeMatch`, `/api/strikes` |
| 해상 사건 속보 | LiveUAMap (해역 슬롯) | `src/lib/liveuamap` |
| 항행경보 | NGA NAVAREA | `/api/navarea` |
| 전쟁위험 보험료 | 해운·보험 매체 보도 추출 | `src/lib/warRisk`, `/api/war-risk` |
| 해상 기상 (파고·바람, 0~72h) | NOAA GFS-Wave | `src/lib/marineWeather`, `/api/marine-weather` |
| 통항량 변화 | IMF PortWatch | `/api/portwatch` |
| 지정학 뉴스 (해역 관련 우선) | RSS 피드 | `src/lib/news`, `src/lib/sea/newsRelevance.ts` |
| 러·우 에너지·항만 시설 피격 (흑해) | LiveUAMap + NASA FIRMS 열점 | `src/data/energyFacilities.ts`, `src/lib/sea/energyStrikes.ts` |
| 군용기 (사건 깊게 보기 안에서만) | ADS-B | `/api/adsb-mil` |

- 화면: `src/components/sea/SeaDashboard.tsx` — 해역 전체는 maplibre 지구본(`SeaGlobe`), 사건 하나는 세슘 위성(`SeaCesiumView`)
- 수집: Cloudflare Worker 크론 `workers/cron-ingest` → D1
- 판정 원칙: 선명이 일치할 때만 "확인", 정황이 하나로 좁혀지면 "유력". AIS 공백은 "배가 없었다"가 아니라 "자료가 없다".
- 옛 지정학·지경학 전체 버전: git 태그 `archive/geopolitics-full`

---

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
```

### Cloudflare에 배포

```bash
npx wrangler login
npm run cf:app:deploy   # OpenNext → Workers (conflict-view)
```

Cron ingest: `npm run cf:ingest:deploy` · [`docs/cloudflare-deploy.md`](docs/cloudflare-deploy.md)

---


## 환경 변수 (`.env.local`)

| 변수 | 기본 | 설명 |
|------|------|------|
| `API_STUB_MODE` | `true` | stub 정책 (외부 API 차단, 시드 JSON) |
| `DATA_PROFILE` | `lite` | `lite` \| `full` — 서버 전용 |
| `VIINA_RENDERING_ONLY` | `true` | VIINA ODbL 렌더링 전용 |
| `VIINA_RENDER_GATE_SECRET` | (권장) | 렌더 세션 쿠키 HMAC 시크릿 — 없으면 cron 시크릿 폴백 |
| `VIINA_RENDER_GATE_RELAX` | — | `true`면 게이트 해제 (로컬 curl 디버그만, 프로덕션 금지) |
| `NEPTUN_ENABLED` | — | NEPTUN 레이어·API |
| `TZEVA_ADOM_ENABLED` | — | 이스라엘 공습 경보 |
| `TELEGRAM_OSINT_ENABLED` | `true` | 텔레그램 OSINT |
| `FREESOUND_API_KEY` | — | 앰비언트·경제·UI 사운드 프록시 |
| `FIRMS_MAP_KEY` | — | NASA FIRMS (있으면 라이브) |
| `STATSOFTHEWORLD_API_KEY` | — | SOTW API Pro. 지경학 양피지·구역 패널·시장 등불에 GDP/인플레/성장 충격·피어 비교 (`/api/world-stats/macro`, `/market-lamp`). [docs](https://statisticsoftheworld.com/api-docs) |
| `SYNC_POLL_MS` | `300000` | `/api/data-sync` 폴링 |
| `NEWS_TRANSLATE_KO` / `TELEGRAM_TRANSLATE_KO` | `true` | 자동 한국어 번역 |

템플릿: [`.env.example`](.env.example) (안내) · [`.env.local.example`](.env.local.example) (Next) · [`.dev.vars.example`](.dev.vars.example) (Wrangler)

> **보안:** API 키·운영 플래그는 `NEXT_PUBLIC_` 없이 서버 전용. 클라이언트는 `initRuntimeConfig()` 경로만 사용.

---


## 출처 표기 · 라이선스 공개 의무

> Public Domain·무료 공개 API·일반 npm 라이브러리는 별도 표기 의무 없이 제외.  
> 상세: [`docs/copyright-checklist.md`](docs/copyright-checklist.md) · 앱 **「출처」** 패널 (`MethodologySourcesPanel`)

### 신뢰도 축 (과장 금지)

이 제품에는 **두 개의 다른 축**이 있습니다. 둘 다 “진실 점수”가 아닙니다.

| 축 | 모듈 | 의미 |
|----|------|------|
| **매체 Tier (T1–3)** | `mediaTiers` · `NewsTrustTierPanel` | 기사·RSS의 편집독립 |
| **레이어 증거 종류** | `layerReliability` · EvidenceTier | 지도 레이어가 어떤 종류의 앎인가 + 신선도 |

**EvidenceTier 6단계** (`src/lib/evidenceTier.ts`):

| tier | 뜻 | 렌더 |
|------|-----|------|
| `observed` | 위성·항적처럼 기계가 잡아낸 신호 | 실선 |
| `reported` | 매체가 전하고 교차로 잡힌 내용 | 실선 |
| `claimed` | **교전 당사국 발표 · 독립 검증 없음** | 점선 |
| `unverified` | 한 경로만의 전언 | 점점선 |
| `model` | 우리가 계산한 점수 | 파선 |
| `synthetic` | 데모·플레이스홀더 — **프로덕션 자동 제외** | (미노출) |

`claimed` 는 ArmyInform(우크라 국방부 매체) 같은 당사자 발표용입니다.
관측과 시각적으로 구분되지 않으면 제품의 인식론이 무너집니다.

### 데이터 무결성 게이트

`npm run verify:data` — 빌드(`ci-build.js`)에서 자동 실행됩니다.
널섬(0,0) 좌표 · 빈/낡은 `.json.gz` · 합성 플레이스홀더 · 좌표 중복을 막습니다.
상세: [`docs/data-integrity.md`](docs/data-integrity.md) · 감사 원본: `DATA-AUDIT-2026-07-31.md`

> `status: "blocked"` 인 레이어는 출처 표기가 실제와 달라 **의도적으로 노출을 막은 것**입니다.
> 데이터 없음을 보여주는 편이, 잘못된 출처로 표기된 합성 데이터를 보여주는 것보다 낫습니다.

### 과거 스냅샷 (`?asOf=YYYY-MM-DD`)

하단 **기준일 스크러버**와 scene 딥링크의 `asOf`는 **일별 랭크·세계 긴장 지수(D1 `daily_entity_ranks`)** 를 그날로 바꿉니다.

- **재생하지 않는 것:** AIS · ADS-B · FIRMS · Telegram 등 라이브 점 (히스토리 모드에서 끄고, “현재 관측만” 고지)
- **다음 트렌치:** R2 `frames/{date}/{layerId}.json` 계약은 `historicalFrames.ts`에만 고정. 수집 cron은 아직 없음.

### 비공식(문서화되지 않은) 엔드포인트 사용 원칙

공식 API 문서가 없는 소스라도, 브라우저 네트워크 요청을 분석해 실제 사용 중인 엔드포인트를 확인하고 쓸 수 있다 — 단, 아래 원칙을 지킨다.

- **폴링 주기 여유 있게** — 신규 데이터 발생 빈도에 맞춰 최소 간격 설정 (며칠에 한 번 갱신되는 소스에 초 단위 폴링 금지)
- **User-Agent에 식별 정보 명시** — 익명 크롤러처럼 위장하지 않음
- **ToS·라이선스 우선 확인** — Open Government Licence 등 재사용 허용 근거가 있는지 먼저 확인, 명시적 금지가 있으면 사용 안 함
- **트래픽 규모 커지면 발행 기관에 공식 피드 문의** — 개인 프로젝트 수준을 넘어서면 리버스 엔지니어링 대신 정식 채널 요청
- **앱 내 「출처」 패널에 비공식 소스임을 명시** — 공식 경보 대체 불가 문구 포함 (NEPTUN·Tzeva Adom과 동일 원칙)

적용 사례: **UKMTO** (`sccd.royalnavy.mod.uk/api/ukmto/all`) — 공식 공개 API 없음, 클라이언트 JS 번들 분석으로 확인한 엔드포인트.

### ODbL — 출처·라이선스 링크 필수

| 대상 | 앱 내 사용 |
|------|------------|
| **VIINA** | 우크라 전선 — **렌더링 전용**, export 금지 |
| **OpenStreetMap** | 기지·DC·허브 등 |
| **OurAirports** | 공항 포인트 |

**VIINA 필수 문구 (ODbL 4.3)**  
> 본 지도에는 VIINA(ODbL v1.0)에 따라 제공된 정보가 포함됩니다. 데이터는 화면 렌더링 전용이며, 원본 추출·API 제공은 하지 않습니다.

### CC BY 4.0

| 대상 | 레이어 |
|------|--------|
| **Global Energy Monitor** | 유가스 파이프 · LNG |
| **World Bank Open Data** | 경제 중심지·양피지 보조 통계 |

### MIT License

| 저장소 | 사용 |
|--------|------|
| **[IRONSIGHT](https://github.com/NoblerWorks-HQ/IRONSIGHT)** | Telegram 채널 카탈로그 |

### 제공자 attribution · 이용약관

| 제공자 | 데이터 |
|--------|--------|
| **NEPTUN** | 우크라 드론·미사일·공습 |
| **GDELT** | 뉴스·사이버·선거 |
| **NASA FIRMS** | 위성 화재 |
| **UCDP** | 분쟁 사건 |
| **SIPRI** | 축 허브 무기거래 호·요약 (원 DB 재배포 없음) |
| **V-Dem** | 분쟁 외교사 렌즈 **개념 참고** (전수 데이터 미사용) |
| **Critical Node Atlas (MIT)** | 크리티컬 노드 |
| **TeleGeography** | 해저 케이블 |
| **PeeringDB** | IXP |
| **adsb.lol / AISstream** | 군용기·선박 |
| **Pikud HaOref** | 이스라엘 공습 |
| **UKMTO** (Royal Navy) | 홍해·호르무즈 등 상선 피습·나포 경보 (비공식 엔드포인트) |
| **The Space Devs** | 우주 발사 |
| **Freesound** | 긴장·경제·UI 앰비언트 |
| **Global Trade Alert** | 무역정책 조치 — 관세·보조금·수출제한 (CC BY 4.0) |
| **Yahoo Finance** | 티커 |
| **Google Translate** (비공식) | 뉴스·NEPTUN·TG 한국어 UI |

**OFAC / UN / EU / UK** — 제재·무기 금수 목록

### 이용 제한·면책

| 항목 | 내용 |
|------|------|
| **VIINA** | 렌더링 전용 · export 금지 |
| **NEPTUN · Tzeva Adom** | 비공식 피드 · **공식 경보 대체 불가** |
| **UKMTO** | 비공식(리버스 엔지니어링) 엔드포인트 · 예고 없이 변경/차단 가능 · **공식 경보 대체 불가** |
| **Telegram OSINT** | 채널 글은 운영자 소유 · AI/뉴스 파이프라인 **금지** |
| **사운드** | 시뮬레이션 UX용 · 실제 전장·경보 대체 아님 |

문자열 단일 출처: [`src/data/sourceCatalog.ts`](src/data/sourceCatalog.ts)

---

