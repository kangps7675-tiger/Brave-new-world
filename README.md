# Strait Desk

**해협을 지켜보는 해운 위험 상황실.** 홍해·호르무즈·말라카 같은 해운 길목에서 어느 배가 맞았는지, 그 바다가 지금 얼마나 위험한지, 전쟁위험 보험료와 날씨가 어느 쪽으로 움직이는지를 3D 지구본 한 화면에 모았습니다.

> 피격 경보가 뜬 직후 "이 바다는 지금 다닐 만한가"라는 질문에 근거를 갖춘 답을 가장 먼저 건네는 것이 목표입니다.

- **상태:** 베타 — 지금은 가입 없이 볼 수 있습니다. 정식 출시 후 알림·해역 판단 같은 일부 기능은 유료가 될 예정입니다.
- **이름:** Strait Desk (구 Brave New World / 멋진 신세계 / GeoWatch). 패키지명 `brave-new-world`, localStorage 키 `geowatch-*`, 설정 파일 `geowatch.config.ts`는 호환을 위해 그대로 둡니다.
- **스택:** Next.js 14 · React 18 · TypeScript · MapLibre GL · Cesium(위성 보기) · Tailwind CSS
- **언어:** UI 기본 한국어, 레이어 패널에서 English 전환
- **출처 표기 의무:** [출처 표기 · 라이선스 공개 의무](#출처-표기--라이선스-공개-의무) · 앱 「출처」 패널 · [`docs/copyright-checklist.md`](docs/copyright-checklist.md)

---

## 무엇을 보여주나

해역 하나를 고르면 다섯 가지가 한 흐름으로 나옵니다.

| # | 정보 | 내용 |
|---|------|------|
| 1 | **피격 선박** | UKMTO 피습 경보 시각 주변을 지나던 선박의 AIS 항적을 분석해 사건 직후 멈추거나 방향을 틀거나 신호가 끊긴 배를 찾고, IMO 번호로 식별합니다. Datalastic으로 제원(톤수·길이·건조년도 등)을 보강합니다. |
| 2 | **해역 상황** | 바브엘만데브·호르무즈·흑해 등 해협별 최근 피격 이력, 항행 경보, 통항량 변화. |
| 3 | **전쟁위험 보험료 동향** | 공개 시세가 없어 해운·보험 매체 보도에서 해역별로 추출해 날짜순으로 쌓고, 출처와 근거 문장을 함께 제시합니다. |
| 4 | **날씨** | 해역의 기상·해상 상태(Datalastic 날씨 + NOAA GFS-Wave 파고 예보). 우회나 대기 판단용. 공식 항해 예보를 대체하지 않습니다. |
| 5 | **지정학 뉴스** | 해당 해역에 영향을 주는 군사·외교 소식을 위치별로 태깅. |

### 판정과 한계를 같이 표시합니다

- 피격 선박은 선명이 일치할 때만 **확인**, 정황이 하나로 좁혀질 때 **유력**, 그 밖은 **가능** 또는 판정 보류로 구분합니다.
- AIS 수신이 끊긴 구간은 "배가 없었다"가 아니라 **"자료가 없다"** 로 표시합니다.
- 보험료는 추출한 기사 문장과 출처 링크가 없으면 올리지 않습니다.

### 누구를 위한 것인가

- **해운사** — 통항 강행 / 희망봉 우회 / 출항 연기 판단
- **해운 관련 중소기업·화주** — 선적·납기 계획
- **보험업계** — 해역별 위험 평가와 요율 판단의 참고 자료

---

## 화면 구성

- **첫 화면:** 신규 방문자는 해운 화면으로 들어옵니다. 선박(AIS)·해협 길목 콜아웃·피격 사건이 켜지고, 지정학 개관(핵탄두 수 등)은 숨깁니다. 레이어 기본값은 `src/lib/firstScreenLayers.ts` (`FIRST_SCREEN_MARITIME_ON/OFF`)가 정합니다.
- **전체 지정학 버전:** 메뉴·「무엇을 볼까요」로 바꿀 수 있습니다. 무료로 넓게 보여주는 층이고, 그 위에 해역 판단·알림 같은 프리미엄을 얹는 구조입니다.
- **사건 카드:** 피격 사건 카드에서 선박 사진·제원, 지도, 「위성으로 보기」(Cesium으로 수백 미터 상공까지 하강)로 들어갑니다. 위성 화면에는 선박(AIS)을 그리지 않습니다.
- **페이지:** `/strikes`(피격 목록·판정), `/chokepoints/[slug]`(해협별 상황)
- **새 레이어 기준:** 케이스 파일(기사 확인)의 증거·판정에 연결될 때만 노출하고, 아니면 `src/lib/layerLab.ts` 실험실로 숨깁니다(`NEXT_PUBLIC_LAB=1`로 해제).

---

## 데이터 소스

키는 서버 전용 환경 변수로만 둡니다(`NEXT_PUBLIC_` 금지).

| 용도 | 소스 | 변수 |
|------|------|------|
| 피습·나포 경보 | UKMTO (비공식 엔드포인트) | — |
| 항행 경보 | NAVAREA | — |
| 선박 위치 | AISstream · Datalastic | `DATALASTIC_API_KEY` 등 |
| 선박 제원·이력 | Datalastic `vessel_info` / `vessel_history` | `DATALASTIC_API_KEY` |
| 선박 사진 | Wikimedia Commons (Datalastic은 사진 미제공) | — |
| 항공기 | ADS-B Exchange(RapidAPI), 실패 시 adsb.lol | `ADSBEXCHANGE_API_KEY` |
| 날씨 | Datalastic Weather (`/api/sea-weather`) · NOAA NCEP GFS-Wave (`/api/marine-weather`) | `DATALASTIC_API_KEY` |
| 전쟁위험 보험료 | 해운·보험 매체 보도 추출 → D1 적재 (`/api/war-risk`, 읽기 전용) | `INGEST_CRON_SECRET` (cron) |
| 뉴스 | GDELT · RSS | — |

`API_STUB_MODE=false` 일 때 실데이터를 씁니다. `true`면 외부 호출 없이 `public/data/*-seed.json` 시드를 씁니다(운영 `.env.production`은 `false`).

---

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

[http://localhost:3000](http://localhost:3000) 을 엽니다.

```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
npm test        # vitest
npm run verify:product-spec   # README·상한·폴링 수치 가드
```

### 배포

- **Vercel:** 저장소 연결 후 환경 변수 설정 ([`docs/vercel-cdn-and-workers-fs.md`](docs/vercel-cdn-and-workers-fs.md))
- **Cloudflare Workers:** `npx wrangler login` → `npm run cf:app:deploy` (OpenNext) · Cron ingest `npm run cf:ingest:deploy` · [`docs/cloudflare-deploy.md`](docs/cloudflare-deploy.md)

---

## 환경 변수 (`.env.local`)

| 변수 | 기본 | 설명 |
|------|------|------|
| `API_STUB_MODE` | `true` | stub 정책 (외부 API 차단, 시드 JSON). 운영은 `false` |
| `DATA_PROFILE` | `lite` | `lite` \| `full` — 서버 전용 |
| `DATALASTIC_API_KEY` | — | 선박 제원·이력·반경 조회 |
| `AISSTREAM_API_KEY` | — | AISstream 선박 위치 |
| `INGEST_CRON_SECRET` | — | Cron ingest 인증 |
| `ADSBEXCHANGE_API_KEY` | — | ADS-B Exchange (RapidAPI). 없으면 adsb.lol |
| `TELEGRAM_OSINT_ENABLED` | `true` | 텔레그램 OSINT |
| `FIRMS_MAP_KEY` | — | NASA FIRMS (있으면 라이브) |
| `FREESOUND_API_KEY` | — | 사운드 프록시 |
| `SYNC_POLL_MS` | `300000` | `/api/data-sync` 폴링 |
| `NEWS_TRANSLATE_KO` / `TELEGRAM_TRANSLATE_KO` | `true` | 자동 한국어 번역 |

전체 목록·템플릿: [`.env.example`](.env.example) · [`.env.local.example`](.env.local.example) · [`.dev.vars.example`](.dev.vars.example)

> **보안:** API 키·운영 플래그는 서버 전용. 클라이언트는 `initRuntimeConfig()` 경로만 사용합니다.

---

## 성능 · 최적화

**데이터 2층:** [docs/data-architecture-2tier.md](docs/data-architecture-2tier.md) (R2/D1 창고 + 실시간 폴링)

| 항목 | 동작 |
|------|------|
| stub 모드 | `public/data/*-seed.json` |
| live 가드 | `liveRenderGuard` — stub off 시 폴링·상한 보수화 (AIS 표시 상한 1500) |
| lite / full | `DATA_PROFILE` — 창고 해상도 옵션 |
| gzip JSON | `fetchJsonPreferGzip` · `compress-data-gzip.js` |
| JSON 워커 | `jsonParse.worker.ts` |
| 레이어 캡 | 일반 **30** · Ultra-Lite **16** — SSOT [`src/config/geowatch.config.ts`](src/config/geowatch.config.ts) → `layerExclusiveCap` · 패키지 hard **64** |
| `cameraBusyGuard` | tween/드래그 중 무거운 갱신 pause |

(위 레이어 캡 줄은 `npm run verify:product-spec`이 검사합니다.)

---

## 프로젝트 구조

```
src/
  app/                  # Next.js App Router + API (/api/strikes, /api/strikes/:id …)
  components/
    GlobeDashboard.tsx  # 지구본·레이어·패널 통합
    globe/ShipIncidentCard.tsx
    landing/            # 랜딩(해운 위험 상황실)
  hooks/
  lib/
    brand.ts            # 서비스명 SSOT
    strikeMatch/        # 피격 선박 매칭 (확인/유력/가능)
    firstScreenLayers.ts · layerLab.ts · viewerModePolicy.ts
    liveRenderGuard.ts · cesiumObserveDescend.ts
docs/                   # 설계·체크리스트
public/data/            # stub 시드
```

---

## 데이터 빌드

```bash
npm run data:build:lite
npm run data:build:full
npm run data:sync
npm run dev:live
node scripts/compress-data-gzip.js all
```

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
| **Datalastic** | 선박 제원·이력·반경, 해역 날씨 (유료 API) |
| **NOAA NCEP GFS-Wave** | 해상 파고 예보 (미 정부 자료, 퍼블릭 도메인) |
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

---

## 개발 메모

- Windows·OneDrive: `next.config.mjs` dev 시 webpack 메모리 캐시 (청크 404 방지)
- `npm run dev:clean` — `.next` 삭제 후 dev
- 레이어: `localStorage` `geowatch-layers-v21`
- 사운드 on/off: `soundPrefs` / 벨 토글
- TypeScript·ESLint: Next.js 기본 설정
