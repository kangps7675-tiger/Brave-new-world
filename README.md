# 멋진 신세계 (Brave New World)

Aldous Huxley 《Brave New World》를 모티브로 한 3D 지구본 관측대입니다. 한쪽에서는 포화가 울리고 공습 사이렌이 울려 대는데, 다른 한쪽에서는 누군가가 돈을 법니다—그 서사시를 한 지도 위에 겹쳐 둡니다.

> **한 줄:** 지정학으로 축과 전선을 보고, 지경학으로 돈과 물류를 본다.

- **npm 패키지명:** `geowatch` · **사용자 브랜드:** 멋진 신세계
- **스택:** Next.js 14 · React 18 · TypeScript · MapLibre GL · react-map-gl · Tailwind CSS
- **언어:** UI 기본 한국어 · 입장 주의창·레이어 패널에서 **English** 전환 (`labelLanguage`)
- **UX 시나리오 상세:** [`docs/ux-scenarios.md`](docs/ux-scenarios.md)
- **출처 표기 의무:** [출처 표기 · 라이선스 공개 의무](#출처-표기--라이선스-공개-의무) · 앱 UI 「출처」 패널 · [`docs/copyright-checklist.md`](docs/copyright-checklist.md)

---

## 제품 구조 요약

### 두 도메인 (뷰어 모드)

| 모드 | 초점 | 상단 nav | 하단 Intel |
|------|------|----------|------------|
| **지정학** | 전선·분쟁·GDELT·Telegram OSINT·공습 경보 | **반서방 4허브** (중국·러시아·북한·이란) | 속보·GDELT 범례 |
| **지경학** | 증시·유가·물류·에너지·제재 RSS | 검색 포커스 시 에너지·초크·금융 허브 메뉴 | 티커·경제 RSS |

`ViewModeSwitcher`로 전환하면 레이어 패키지·nav·하단 Intel·fetch 정책이 함께 바뀝니다. 스위처는 **허브 nav 아래** 고정(지정학 `top-[7.35rem]` / 지경학 `top-[4.35rem]`).

### 지정학 — 반서방 4허브 nav

상단 **중국 · 러시아 · 북한 · 이란** (`grid-cols-4` 한 줄). 각 허브 드롭다운:

1. **국경 · 우군 관계망** — soft fly → 양피지 브리프
2. **우군 국가** — 우군 좌표 fly → 양피지
3. **영유권 주장 및 영향** — claim 링 + 양피지 + 속보 타전음(SOS 모스)
4. **무기거래 (SIPRI)** — 호 + 양피지 → 접은 뒤 `AxisArmsPanel` 상세
5. **반서방국간 분쟁 외교사** — 11개 큐레이션 에피소드 (`frictionEpisodes.ts`) → `AxisRegimePanel` → 현장 fly + 전장 빗금·핀 + 양피지

- 입장·로딩 중에는 **허브/전장으로 자동 fly·양피지 금지** — 유저가 nav를 직접 열 때만 동작
- 구 「주요전선」 ExplorationTabs(대만/한반도/우크라/중동)는 **지정학에서 숨김**
- 부트 시 ModePicker 세부 전장 창 **없음** (`shouldShowModePicker(): false`)

### 지경학 — econ nav

검색 포커스 시 6그룹(에너지·초크포인트, 에너지 허브, 금리·통화, 금융·무역, 공급망·제조, 원자재·식량). 허브 선택 시 soft fly + **`EconInsightParchment`** (Risk / Impact / Market Link 스코어보드) + Critical Nodes 강조.

---

## 입장 UX

**순서 (1회 통과형, `entryOverview.ts`):**  
로딩(고도 ≈ 2.85) → **주의** → **환영 편지** → **도메인 선택** → 히어로 지구본

| 단계 | 컴포넌트 | 내용 |
|------|----------|------|
| 주의 | `EntryCautionOverlay` | 성능·사운드 규칙 · 벨 토글 · English / 한글모드 |
| 환영 | `WelcomeParchmentLetter` | 양피지 타이핑 · 펼침/접힘 사운드 (Freesound) |
| 도메인 | `DomainGateOverlay` | 지정학의 창 / 지경학의 창 · **초기화 모드(Ultra-Lite)** 토글 |
| 스킵 | 주의창 우상단 | 경고+편지 생략 → 도메인 직행 |
| 온보딩 | `ChromeOnboardingCoach` | 상단 nav·하단 뉴스 표지 (1회) |

- 재방문: `localStorage` welcome gate 완료 시 caution/welcome 생략
- 도메인 선택 직후 `buildDomainOverviewPrefs()`로 히어로 레이어 적용 (아래 표)
- 프로덕션만 레이어 prefs `localStorage` 유지; 개발은 매 새로고침 기본값 경향

### 히어로 기본 레이어

| 지정학 ON | 지경학 ON |
|-----------|-----------|
| 전쟁구역 · 동아시아 ADIZ · GDELT 4종 · 군용기 · AIS · 물류·초크 · 축 관계망 · 해저 케이블 | AIS · 민항 · 물류·초크 · 크리티컬 노드 · 케이블 · 유가스 파이프 · 원자력 · AI DC · 항구 · 공항 |

대부분 기타 레이어는 **기본 OFF** (성능). Ultra-Lite는 무거운 레이어에 **「클릭 주의」** 태그.

---

## 레이어 패널 (≡)

- **체크 즉시 지도 반영** — 패널을 닫을 때까지 기다리지 않음 (`handlePanelDraftPatch` → `applyLayerPrefs`)
- **KO / EN** 라벨 언어도 즉시 적용
- **동시 ON 상한:** 일반 모드 **무제한** · Ultra-Lite **12개** (`layerExclusiveCap.ts`)
- 카테고리 「전체」/「끔」 · Ultra-Lite 캡 초과 시 경고 UI (`LayerCategoryDraftHost`)
- **제거됨:** 「지나간 미사일·드론 궤적」체크박스 — 저장 시 강제 OFF (`layerPrefs` v21)

### 카테고리별 레이어

#### 지도 · 지명
| 레이어 | 설명 |
|--------|------|
| 도시명 | 주요 도시 라벨 (줌별 LOD) |
| 철도 | 철도 경로 글로우 |

#### 분쟁 · 영토
| 레이어 | 설명 |
|--------|------|
| **우크라이나 전선** | VIINA 기반 RU/UA 점령·주장 **경계선·빗금** (면 채움 제거) |
| **우크라 드론·미사일** | [NEPTUN](https://neptun.in.ua) 공중 위협·공습 경보 |
| **전쟁구역 / 외교적 긴장구역** | 분쟁 빗금 박스 — 레이어 분리 토글 |
| 동아시아 ADIZ | KADIZ/JADIZ/TAIDIZ/북한/CADIZ |
| 축 관계망 | IRN–CHN–RUS–PRK 외교·군수·하이브리드 호 |
| AI 전쟁지역 | GDELT·분쟁 데이터 휴리스틱 데모 (외부 AI API 없음) |
| 무기 금수 · 분쟁 사건(UCDP) | UN 등 · UCDP GED |
| GDELT 뉴스 | 전투·외교·동맹·시위 핀 |
| **텔레그램 채널** | 중동·우크라 공개 채널 OSINT (70+ 채널) |
| **이스라엘 / 우크라 공습 경보** | Tzeva Adom · NEPTUN 경보 구역 |

#### 에너지 · 자원
기름 파이프 · 가스관 · LNG · 광물·자원지 · 원자력 시설 (GEM·정적 빌드)

#### 운송 · 통신 · 인프라
| 레이어 | 설명 |
|--------|------|
| **항로** | 해운로 (정적 경로, 줌 LOD) |
| **해저 케이블 · 해저터널** | TeleGeography 계열 · 터널 D1 |
| **공항 · 항구** | OurAirports 등 — `infraStaticMarkers.ts` HTML 실루엣 |
| **초크포인트·물류 거점** | chokepoint + logistics-hub |
| **크리티컬 노드 (MIT Atlas)** | 양 모드 공통 (`criticalNodes.ts`) |
| **선박 위치 (AIS)** | 지정학=군용 함정, 지경학=민간 |
| **민간 항공 (ADS-B)** | 지경학 히어로 기본 ON |
| 인터넷 교환점 | PeeringDB |

#### 군사 · 안보
미군 기지 · **군사 항공기 (adsb.fi)** · 정보 수집 거점 · 난민 캠프 · **미 해군 항공모함**

#### 실시간 · 사건
NASA FIRMS 화재 · 사이버 공격 · 선거 · 우주 발사 (Launch Library 2)

#### 경제 · 제재
경제 중심지 · AI 데이터센터 · 제재 대상 (OFAC·UN·EU·UK)

---

## UI · 타이포그래피

| 용도 | 폰트 |
|------|------|
| 본문/UI 모노 | Geist Mono, IBM Plex Mono |
| 지경학 nav | Pretendard |
| 뉴스 헤드라인 | Gmarket Sans |
| 지경학 양피지 | Space Grotesk |
| 환영 편지 필체 | Griun PolSensibility |
| 영문 UI | IBM Plex Sans |

---

## 사운드 시스템

지휘소 매니페스트: [`src/data/audioManifest.ts`](src/data/audioManifest.ts) · 로컬: [`public/audio/`](public/audio/) · 프록시: `GET /api/sound-stream?eventId=…`

### 재생 규칙 (체크박스 ≠ 즉시 재생)

| 소리 | 트리거 |
|------|--------|
| **공습 사이렌** | 경보 칩·버튼 fly 시 (~10초, 로컬 Mega Siren) |
| **NEPTUN 폭발 · FIRMS** | 레이어 ON + 이벤트가 뷰포트 진입 |
| **전선 교전음** | 지정학 · 전장 위 · regional 이하 줌 |
| **긴장 rumble** | 전쟁/고긴장 구역 위 |
| **항모 갑판** | 미 항모가 화면에 있을 때 |
| **경제 앰비언트** | 지경학 · 파이프라인 → DC → 항구 → 경제중심 |
| **양피지 펼침/접힘** | 허브·환영·에피소드 브리프 |
| **속보 타전음** | 주장·영향 / 분쟁 외교사 양피지 (S급 속보와 동일 SOS 모스) |
| 티커 · 모드 전환 · 일반 UI 클릭 | **무음** |

벨 버튼(`SoundMuteControl`)으로 전역 음소거.

---

## 모바일 · Compact

- **트리거:** `max-width: 768px` 또는 coarse pointer + `max-width: 1024px`
- 자동 Ultra-Lite · ≡ 레이어 패널 비활성 · **Compact 칩** 프리셋
  - 지정학: 전선 · 뉴스 · 공습
  - 지경학: 항로 · 에너지 · 시장

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

전체: [`.env.local.example`](.env.local.example)

> **보안:** API 키·운영 플래그는 `NEXT_PUBLIC_` 없이 서버 전용. 클라이언트는 `initRuntimeConfig()` 경로만 사용.

---

## 핵심 모듈

### VIINA — 우크라이나 전선
- ODbL **렌더링 전용** · `GET /api/render/ukraine-control`
- 테두리·빗금·진격 화살 · `npm run viina:build`

### NEPTUN — 우크라이나 드론·미사일
- REST ≤5초 + WebSocket · `useNeptunStream`
- 줌 LOD: `flat` / `low` / `elevated` 궤적
- **지나간 궤적 UI 제거** — 아카이브는 내부만

### 반서방 허브 · 마찰 에피소드
- `hubNav.ts` · `hubBriefs.ts` · `ParchmentLetter`
- `frictionEpisodes.ts` — 11대 큐레이션 (전바오·랑선·갈완·츠힌발리·슈샤·샤트알아랍·톰브·프놈펜·바드메·백두산·두만강 등)
- V-Dem **전수 연표 아님** — 개념 프레임·출처 표기만 (`vdemPolicy.ts`)

### Telegram OSINT
- `telegramChannels.ts` (IRONSIGHT 카탈로그 MIT) · **LLM/뉴스 파이프라인과 분리**

### GDELT · Intel
- `GET /api/gdelt` · `GET /api/news-stream`
- 지경학: 거시·인프라·에너지·물류·반도체·시장 **장르 칩**

### API 요약

| API | 내용 |
|-----|------|
| `/api/ais` | AISstream 선박 |
| `/api/adsb-mil` | adsb.fi 군용기 |
| `/api/firms-fires` | NASA FIRMS |
| `/api/us-carriers` | 미 항모 |
| `/api/stock-tickers` | Yahoo Finance 티커 |
| `/api/sound-stream` | 로컬 audio / Freesound |
| `/api/data-sync` | 스냅샷 동기화 |

정적 레이어: `/api/layers/conflict-zones` · `arms-embargo-zones` · `ai-data-centers` · `economic-centers` · `sanctions-entities` · `ukraine-control`

---

## 성능 · 최적화

**데이터 2층:** [docs/data-architecture-2tier.md](docs/data-architecture-2tier.md) (R2/D1 창고 + 실시간 폴링)

| 항목 | 동작 |
|------|------|
| stub 모드 | `public/data/*-seed.json` |
| live 가드 | `liveRenderGuard` — stub off 시 폴링·상한 보수화 |
| lite / full | `DATA_PROFILE` — 창고 해상도 옵션 |
| gzip JSON | `fetchJsonPreferGzip` · `compress-data-gzip.js` |
| JSON 워커 | `jsonParse.worker.ts` |
| 레이어 캡 | 일반 무제한 · Ultra-Lite 12 |
| 뷰포트 LOD | NEPTUN·VIINA·정적 포인트 tier별 상한 |
| `cameraBusyGuard` | tween/드래그 중 무거운 갱신 pause |

---

## 데이터 빌드

```bash
npm run gdelt:fetch
npm run data:build:lite
npm run data:build:full
npm run gem:build
npm run viina:build
npm run data:sync
npm run telegram:sync
npm run dev:live
node scripts/compress-data-gzip.js all
```

---

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router + API
  components/
    GlobeDashboard.tsx    # 지구본·레이어·패널 통합
    EntryCautionOverlay · WelcomeParchmentLetter · DomainGateOverlay
    HoverNav.tsx          # 반서방 4허브 nav
    ViewModeSwitcher.tsx  # 지정학 ↔ 지경학
    LayerCategoryDraftHost.tsx · ParchmentLetter.tsx
    AxisRegimePanel.tsx · AxisArmsPanel.tsx · EconInsightParchment.tsx
    BottomIntelStack.tsx · ChromeOnboardingCoach.tsx
    ...
  data/
    hubNav.ts · hubBriefs.ts · frictionEpisodes.ts
    econNavRegions.ts · audioManifest.ts · sourceCatalog.ts
  hooks/
    useLayerPrefsController.ts · useGlobeStaticLayers.ts · useNeptunStream.ts
  lib/
    entryOverview.ts · layerExclusiveCap.ts · infraStaticMarkers.ts
    viewerChrome.ts · viewPackages.ts · ultraLiteMode.ts
    licensing/ (viina · sipri · vdem · telegram · ironsight)
docs/
  ux-scenarios.md         # UX 시나리오 (현행 제품 기준)
  cloudflare-deploy.md · data-architecture-2tier.md · vercel-cdn-and-workers-fs.md
public/audio/             # 로컬 전투·공습 샘플
```

---

## UI 조작 요약

| 동작 | 결과 |
|------|------|
| 드래그 / 스크롤 | 지구본 회전 · 줌 |
| 빈 바다 더블클릭 | 해당 지점 확대 |
| 분쟁 구역·뉴스 핀 클릭 | fly-to + Intel 시트 |
| NEPTUN 트랙 클릭 | 이동 + 우측 상세 패널 |
| 공습 경보 칩/버튼 | fly + 사이렌 + 지역 아웃라인 |
| 허브 nav 항목 | soft fly → 양피지 (+ SIPRI/분쟁 외교사는 패널) |
| ≡ 메뉴 레이어 체크 | **즉시** 지도 반영 |
| ViewModeSwitcher | 지정학 ↔ 지경학 |
| 벨 버튼 | 사운드 on/off |
| 중클릭 (빈 지도) | Intel 뉴스 시트 |

---

## 의도적으로 하지 않는 것

- 입구 **서방 대칭 4허브** 또는 **반서방↔서방 상단 토글**
- 지정학 히어로에 ADS-B/AIS **상시 ON**
- 분쟁 외교사 **전 연도 핀 살포·연속 자동 fly**
- **V-Dem으로 가짜 조약 연표** 생성
- **제3 모드 「축 전용 앱」** 입장
- Telegram → **LLM/뉴스 요약 파이프라인** 포함
- VIINA 원본 GeoJSON/API export
- NEPTUN·Tzeva Adom·사운드를 **공식 경보 대체**

---

## 출처 표기 · 라이선스 공개 의무

> Public Domain·무료 공개 API·일반 npm 라이브러리는 별도 표기 의무 없이 제외.  
> 상세: [`docs/copyright-checklist.md`](docs/copyright-checklist.md) · 앱 **「출처」** 패널 (`MethodologySourcesPanel`)

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
| **adsb.fi / AISstream** | 군용기·선박 |
| **Pikud HaOref** | 이스라엘 공습 |
| **UKMTO** (Royal Navy) | 홍해·호르무즈 등 상선 피습·나포 경보 (비공식 엔드포인트) |
| **The Space Devs** | 우주 발사 |
| **Freesound** | 긴장·경제·UI 앰비언트 |
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

## 개발 메모

- Windows·OneDrive: `next.config.mjs` dev 시 webpack 메모리 캐시 (청크 404 방지)
- `npm run dev:clean` — `.next` 삭제 후 dev
- 레이어: `localStorage` `geowatch-layers-v21`
- 사운드 on/off: `soundPrefs` / 벨 토글
- TypeScript·ESLint: Next.js 기본 설정
