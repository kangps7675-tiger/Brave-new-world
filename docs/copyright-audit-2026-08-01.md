# 저작권 · 라이선스 감사 보고서 (2026-08-01)

> 대상: `Brave-new-world` / geowatch (Conflict View)
> 방법: 코드 정적 분석 + 기존 문서(`copyright-checklist.md`, `commercial-licensing.md`) 대조 + 라이선스 원문 확인
> **법률 자문이 아닙니다.** 유료화 전 변호사 검토 필요.

---

## 0. 총평

기존 두 문서(`copyright-checklist.md` · `commercial-licensing.md`)는 이런 종류의 프로젝트에서 보기 드물게 잘 짜여 있다. 특히 **"렌더 전용이어도 유료면 상업적 이용"** 이라는 축 분리와 GPL-3 격리는 교과서적이다.

문제는 **문서가 선언한 원칙을 코드가 일부 지키지 않는다**는 것이다. 아래 발견 사항 중 상당수는 "몰라서 생긴 위반"이 아니라 **"문서에 써놓고 코드에 반영을 안 한" 불일치**다.

| 등급 | 건수 | 성격 |
|------|------|------|
| 🔴 즉시 조치 | 3 | 현재 무료 단계에서도 위반 상태 |
| 🟠 유료화 차단 | 3 | 유료화 시 확실히 문제 / 게이트 자체가 작동 안 함 |
| 🟡 점검 필요 | 4 | 문서에 있으나 상태가 갱신 안 됨 |
| 🟢 잘 된 것 | 6 | 유지할 것 |

---

## 조치 현황 (2026-08-01 반영)

| ID | 항목 | 상태 |
|----|------|------|
| R-1 | 폰트 라이선스 전문 동봉 · 크레딧 UI · 미사용 폰트 제거 | ✅ 완료 |
| R-2 | 브라우저 UA 위장 제거 (3곳) | ✅ 완료 (번역 엔드포인트 전환은 미완) |
| R-3 | RSS 스니펫 1000→220자 · `content:encoded` 최후순위 강등 | ✅ 완료 |
| O-1 | 상업 게이트 — CRLF 파싱 버그 + **런타임 배선** | ✅ 완료 (두 겹 모두) |
| Y-2b | ADS-B 레이어 등급 재판정 (prohibited → allowed) | ✅ 완료 |
| I-1 | webpack memory cache — prod 상시 memory 제거 (dev·OneDrive만) | ✅ 완료 (`next.config.mjs`) |
| I-2 | 배포 빌드(Vercel/CI)에서 next 내장 ESLint/tsc 게이트 복구 | ✅ 완료 (`NEXT_RELAX_BUILD_GATES`) |
| I-3 | 프로덕션 CSP에서 `unsafe-eval` 제거 (dev만 유지) | ✅ 완료 |
| O-2 | 지정학 뉴스 스트림 `sourceCatalog` 등재 | ✅ 완료 |
| O-3 | og:image robots.txt 준수 · 봇 UA 도메인 | ✅ 완료 |
| Y-2 | adsb.fi → adsb.lol 교체 | ✅ 완료 |

### R-1 완료 내역

- `public/licenses/OFL-1.1.txt` — SIL OFL 1.1 전문 + Pretendard·Geist·RIDIBatang 저작권 고지
- `public/licenses/fonts.md` — 서체별 권리자·출처 목록
- `public/licenses/GmarketSans.txt` · `SBAggro.txt` — 한국 무료 서체 이용 조건
- `src/lib/fontAttribution.ts` — UI 고지 정본 (`audioAttribution.ts` 와 동일 패턴)
- `MethodologySourcesPanel` 「서체 (저작권 고지)」 섹션 추가
- **`Griun_PolSensibility-Rg.ttf` 삭제** — 코드 어디에서도 참조되지 않았고 출처 불명이었음

### R-3 완료 내역

- `rssParser.ts` — `RSS_BODY_SNIPPET_MAX` 1000 → **220**
- `rssParser.ts` — 필드 우선순위를 `description → summary → content → content:encoded` 로 재배열
- `periodicBriefing.ts` — `LAMP_DISPLAY_SUMMARY_MIN/MAX` 300/520 → **110/200**
  (파싱 상한만 줄이고 표시 상한을 안 줄이면 정책이 반쪽이 되므로 함께 조정)

### O-2 완료 내역

`sourceCatalog.ts` 에 두 항목 신설 — 레이어 68 → **70개**.

| 신규 layerId | commercialUse | 사유 |
|---|---|---|
| `news-geopolitics-rss` | `license-required` | 매체별 RSS 약관. NYT·WSJ·Reuters 는 개인·비상업 한정. 본문 스니펫 + 한국어 번역은 제목·링크 인용과 별개 권리 |
| `news-video-youtube` | `unknown` | YouTube ToS 는 API Services / 공식 embed 외 프로그램적 접근을 제한. 공개 Atom 피드는 회색지대 — 구현(embed + 썸네일 핫링크)은 준수 패턴 |

`unknown` 을 그대로 둔 건 의도적이다 — 카탈로그 주석의 원칙("모르면 unknown, 확인 전까지 유료 노출 차단")을 그대로 적용했다.

### O-3 완료 내역

- **`src/lib/news/robotsTxt.ts` 신설** — RFC 9309 준수 파서
  - `User-agent` 그룹 매칭 (우리 토큰 우선 → `*` 폴백), 연속 UA 줄 그룹 공유
  - **가장 긴 패턴 우선**, 동률 시 `Allow` 우선 (§2.2.2)
  - `*` · `$` 와일드카드, 주석·대소문자 혼용 처리
  - 4xx → 전체 허용 / **5xx·타임아웃 → 전체 차단** (§2.3.1.4)
  - `Crawl-delay` 준수 — 오리진별 마지막 요청 시각 추적, 최대 10초 캡
  - origin 단위 12시간 캐시
- `enrichArticleImage.ts` — fetch 직전 `canFetchArticle()` 관문 추가. 차단이면 이미지 없이 진행(스트림 안 죽임)
- 봇 UA `+https://localhost` → **`SITE_URL` 기반 실제 도메인**
- `robotsTxt.test.ts` — 18개 케이스

### Y-2 완료 내역

**adsb.fi 와 airplanes.live 를 런타임에서 완전 제거.** 남은 소스는 adsb.lol(ODbL) + ADSBexchange(상업 키).

바꾼 이유가 핵심이다 — 기존 구현은 `COMMERCIAL_TIER_ENABLED` 로 갈라서
**무료 모드에서만** adsb.fi 를 폴백에 넣었다. 그건 약관의 두 요건 중
"non-commercial" 한쪽만 본 것이다.

> `"for **personal**, non-commercial use only"`

**공개 웹서비스는 무료여도 "personal" 이 아니다.** 두 요건을 모두 충족해야 하므로
무료 단계에서도 쓸 수 없다. airplanes.live 는 독점 라이선스로 조건 미확인 상태라
카탈로그 원칙("확인 전까지 차단")을 동일하게 적용해 함께 뺐다.

수정: `src/lib/adsbClient.ts` · `src/lib/adsbWarmFetch.ts` · `workers/cron-ingest/src/adsb.ts`

> 남은 과제: `sourceCatalog` 의 `military-activity` · `air-traffic` 은 아직
> `prohibited` 다. 실제 폴백에서 adsb.fi 가 빠졌으므로 `allowed` 로 상향할 수
> 있는지 재판정이 필요하다 (attribution 문구도 함께 갱신).

---

## 🔴 즉시 조치

### R-1. 폰트 바이너리를 저장소에 커밋 · 라이선스 전문 미동봉

**사실관계**

`git ls-files src/app/fonts/` 결과 — 아래 폰트 **파일 자체가 저장소에 추적 중**이다.

```
GeistVF.woff / GeistMonoVF.woff
GmarketSansBold.otf / GmarketSansLight.otf / GmarketSansMedium.otf
Griun_PolSensibility-Rg.ttf
PretendardVariable.ttf
RIDIBatang.otf
SBAgro-Bold.otf / SBAgro-Bold.ttf
```

`public/licenses/` 에는 **`ironsight-MIT.txt` 단 하나**뿐이다. `src/app/fonts/` 안에도 라이선스 텍스트가 없다.

**왜 문제인가**

- **RIDIBatang · Pretendard · Geist 는 SIL Open Font License 1.1** 이다. OFL 제2조는 폰트 파일을 재배포할 때 **저작권 고지와 라이선스 전문을 반드시 동봉**하도록 요구한다. 현재 상태는 형식 요건 위반이다.
- `next/font/local` 로 로드하면 폰트가 **웹폰트로 서빙**된다. 이건 "사용"이 아니라 **"배포"** 축에 가깝다. 저장소 커밋은 더 명확한 배포다.
- GitHub 저장소(`kangps7675-tiger/Brave-new-world`)가 공개라면 즉시 노출된다.
- **Griun_PolSensibility-Rg.ttf** 는 출처·라이선스가 코드 어디에도 기록돼 있지 않다. 가장 위험한 항목이다.

**조치**

1. `public/licenses/` 에 폰트별 라이선스 전문 추가 — `OFL-RIDIBatang.txt`, `OFL-Pretendard.txt`, `OFL-Geist.txt`, `GmarketSans-license.txt`, `SBAggro-license.txt`
2. `Griun_PolSensibility` 출처 확인 — **확인 안 되면 제거**
3. `MethodologySourcesPanel` 에 폰트 크레딧 섹션 추가 (Freesound 섹션과 동일 패턴)
4. 저장소 루트에 `LICENSE` 파일 생성 — 현재 없어서 자체 코드가 "all rights reserved" 상태이고, MIT인 `IRONSIGHT/` 서브트리와 섞여 경계가 불명확하다

---

### R-2. 비공식 Google Translate 엔드포인트 + User-Agent 위장

**사실관계** — `src/lib/koreanTranslate.ts:34-40`

```ts
const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${...}`;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; BraveNewWorld/1.0)" },
```

**왜 문제인가**

- `translate_a/single?client=gtx` 는 **공개 API가 아니라 웹 UI 내부 엔드포인트**다. Google 서비스 약관은 자동화 수단(로봇·스파이더·스크레이퍼)을 통한 접근을 금지한다. 정식 경로는 Cloud Translation API다.
- **User-Agent 를 브라우저(`Mozilla/5.0`)로 위장한 것**이 가중 요소다. 단순 ToS 위반과 "우회 의도"는 분쟁 시 다르게 평가된다.
- 더 큰 문제: 이 경로로 **모든 뉴스 제목과 최대 1000자 본문 스니펫이 제3자(Google)로 전송**된다. R-3 과 결합하면 "타사 기사 본문을 무단으로 제3자 서비스에 투입"이라는 별도 축이 생긴다.

**조치**

- `commercial-licensing.md` 는 이걸 "수익화가 커지면 재검토"로 분류해뒀으나 **한 단계 올려야 한다.** UA 위장 라인은 지금 제거하고, DeepL API 또는 Cloud Translation 으로 전환. 최소한 UA를 정직한 봇 신원으로 바꿀 것.

---

### R-3. RSS `content:encoded` 1000자 추출 + 한국어 번역 = 2차적저작물 작성

**사실관계** — `src/lib/news/rssParser.ts:48, 81-94`

```ts
const RSS_BODY_SNIPPET_MAX = 1000;

function extractSummary(block: string, title: string) {
  const description =
    tagContent(block, "content:encoded") ||   // ← 전문(full text) 필드를 최우선
    tagContent(block, "content") ||
    tagContent(block, "description") || ...
  return truncateSummary(plain, RSS_BODY_SNIPPET_MAX);
}
```

그리고 `src/lib/news/translateNews.ts:10-12` 가 이 스니펫을 한국어로 번역한다.

```ts
const summary = item.summary ? await translateTextToKorean(item.summary) : undefined;
```

**왜 문제인가 — 세 겹이다**

1. **`content:encoded` 우선 선택.** 이 필드는 RSS 규격상 **기사 전문**을 담는 자리다. `description`(요약)이 아니라 전문 필드를 1순위로 고른 것은 의도적으로 더 많은 본문을 가져오는 설계다. 짧은 속보 기사라면 1000자는 **사실상 전문**이다.

2. **번역은 별개의 배타적 권리다.** 한국 저작권법 제5조상 번역물은 2차적저작물이고, 제22조 2차적저작물작성권은 저작재산권자의 배타적 권리다. **"인용은 원문 그대로"** 라는 통념과 달리, 번역해서 싣는 것은 인용(제28조) 항변이 더 어려워진다.

3. **매체 구성이 최악의 조합이다.** `feedCatalog.ts` 의 64개 피드에 NYT(`rss.nytimes.com`, L56), WSJ(`feeds.content.dowjones.io`, L61), Reuters(L58), Bloomberg 계열이 들어 있다. 이들 RSS 약관은 대체로 **개인·비상업 사용**으로 한정하며 본문 재배포를 명시적으로 제한한다.

**문서와 코드의 불일치**

`commercial-licensing.md` 는 스스로 이렇게 적어놨다.

> `news-economy-rss` | 각 매체 | **제목+링크는 통상 허용, 본문 재배포는 별도**

원칙은 정확한데, **코드가 그 선을 넘고 있다.** 한국 법원은 "사실의 전달에 불과한 시사보도"(제7조 5호)는 보호 대상에서 제외하지만, 기자의 개성·해석·전망이 드러나는 기사는 저작물성을 인정한다. War on the Rocks·Bellingcat·Crisis Group 같은 분석 매체는 명백히 후자다.

**조치**

- `RSS_BODY_SNIPPET_MAX` 를 **200자 내외로 축소**, `content:encoded` 를 **최후순위로 강등** (`description` → `summary` → `content` 순)
- 번역 대상을 **제목만으로 제한**하거나, 요약은 "AI 요약(참고용)" 형태의 자체 저작 문장으로 대체 — `docs/llm-news-digest.md` 가 이미 그 설계를 갖고 있다. 그쪽이 법적으로도 더 안전하다
- Telegram 에 적용한 **`TELEGRAM_SNIPPET_MAX_CHARS = 280` + 절반 스니펫 + 원문 CTA** 정책이 이미 있다. RSS 에도 같은 기준을 적용하면 일관된다

---

## 🟠 유료화 차단 요인

### O-1. 상업 게이트가 두 겹으로 작동하지 않았다

#### (a) 빌드 게이트가 CRLF 때문에 **한 번도 검사를 수행한 적이 없다** — 패치 완료

`scripts/verify-commercial-licensing.js` 는 카탈로그를 이렇게 잘랐다.

```js
const chunks = src.split(/\n  \{\n/).slice(1);
```

그런데 저장소에 **`.gitattributes` 가 없어서** Windows 체크아웃 시 파일이 CRLF 로 변환된다.
실제 확인 결과:

```
$ file src/data/sourceCatalog.ts
src/data/sourceCatalog.ts: UTF-8 text, ... with CRLF line terminators
```

CRLF 에서는 `\r\n  {\r\n` 이므로 `\n  {\n` 이 **한 번도 매치되지 않는다.**
→ `layers = []` → 즉시 `exit(1)` 로 종료.

```
$ node scripts/verify-commercial-licensing.js
[verify:commercial] 카탈로그를 파싱하지 못했다 — 형식이 바뀌었는지 확인할 것
```

`ci-build.js:56` 이 이 스크립트를 빌드에 물려 놨으므로, **빌드가 통과했다면
게이트를 우회했거나 스크립트가 실행되지 않는 경로였다는 뜻**이다. 어느 쪽이든
"게이트가 지켜주고 있다"는 전제는 성립한 적이 없다.

**조치 (완료)**

- 파서에 `replace(/\r\n/g, "\n")` 추가 → CRLF 내성
- 루트에 `.gitattributes` 추가 → 소스 파일 LF 고정, 폰트·이미지 `binary` 표시
  (기존 체크아웃 적용은 `git add --renormalize .` 단독 커밋 권장)

패치 후 정상 동작 확인:

```
[verify:commercial] 레이어 68개
   상업 가능 42 · 라이선스 필요 13 · 금지 3 · 미확인 10
   유료화를 켜면 아래 21개가 빌드를 막는다: …
[verify:commercial] ✅ 통과 (무료 운영 중)
```

> 이 실행 결과가 **Y-1 의 "문서는 unknown 6, 실제 10" 불일치를 확정**한다.

#### (b) 런타임 배선이 없다 — 패치 완료

**사실관계**

`src/lib/licensing/commercialGate.ts` 의 `isCommercialSafe()` · `commercialSafeLayerIds()` 호출처를 전수 검색한 결과:

```
src/lib/licensing/commercialGate.test.ts   (테스트)
src/lib/licensing/commercialGate.ts        (자기 자신)
```

**`src/app/**` · `src/components/**` 어디에도 호출이 없다.**

**왜 문제인가**

`commercial-licensing.md` 는 이렇게 적었다.

> **코드는 이미 배선돼 있다.** `COMMERCIAL_TIER_ENABLED=true` 면 adsb.fi 와 airplanes.live 가 폴백에서 자동으로 빠진다

이건 **ADS-B 폴백에 한정된 사실**이다(`adsbClient.ts` 등). 나머지 20개 레이어(ACLED·MarineTraffic·GTA·Telegram 등)는 **유료 티어를 켜도 실제 화면에서 안 빠진다.** 막는 건 빌드 스크립트(`verify-commercial-licensing.js:98-105`)의 `process.exit(1)` 뿐이고, 그건 `LICENSE_GATE_SKIP=1` 로 우회 가능하다.

즉 **"게이트"라고 부르지만 방어선이 빌드 시점 한 겹뿐**이다.

**조치 (완료) — `src/lib/licensing/layerPrefGate.ts` 신설**

배선 지점을 **`LayerPrefs` 층**으로 잡았다. 레이어 표시 여부는 결국 이 불리언
하나로 수렴하므로, 여기서 한 번 거르면 아래 렌더 경로 전체가 안전해진다.
렌더 컴포넌트마다 심으면 새 컴포넌트가 생길 때 반드시 빠뜨린다.

```
loadLayerPrefsRaw()          저장된 prefs (게이트 적용 전, private)
        ↓
enforceCommercialTier()      유료 티어면 상업 불가 레이어 강제 OFF
        ↓
loadLayerPrefs()             공개 API — 호출부 전부가 게이트를 통과
```

- `PREF_TO_LAYER_ID` — LayerPrefs 키 ↔ `sourceCatalog` layerId 매핑 **15개**
  (이 매핑이 없어서 지금까지 배선이 불가능했다)
- `enforceCommercialTier(prefs, tier)` — 유료 티어에서 비안전 레이어 강제 OFF.
  **사용자가 켜둔 설정보다 우선한다** — UX 문제가 아니라 계약 문제이기 때문
- 무료 티어면 원본 참조를 그대로 반환 (React 리렌더 유발 안 함)
- `currentProductTier()` — `COMMERCIAL_TIER_ENABLED` 는 서버 전용이라
  `NEXT_PUBLIC_` 쌍을 함께 본다. **유료화 시 둘 다 설정할 것**

검증 결과 — 유료 티어에서 **13개 레이어가 실제로 차단**된다:

```
차단  ais · reef-watch · tzeva-adom · neptun · ukmto-incidents ·
      military-exercises · gps-interference · telegram-osint  [license-required]
      intel-hotspots · nuclear-sites · missile-silos ·
      strategic-missile-bases · missile-launch-tests           [unknown]

유지  military-activity · air-traffic                          [allowed]
```

**사각지대 감시** — `layerPrefGate.test.ts` 가 "비-allowed 레이어는 매핑되거나
예외 목록(`NOT_PREF_CONTROLLED`)에 있어야 한다"를 검사한다. 새 레이어를 추가하며
매핑을 빠뜨리면 게이트가 **조용히 통과시키는데**, 조용한 실패가 가장 위험하다.

> ⚠️ **남은 사각지대** — pref 불리언으로 제어되지 않고 API 라우트에서 직접 오는
> 13개 레이어(`news-geopolitics-rss` · `world-stats` · `hapi-conflict-casualties`
> · `gta-interventions` 등)는 이 게이트가 못 잡는다. 유료화 시 각 라우트에서
> 별도로 막아야 한다. 테스트의 `NOT_PREF_CONTROLLED` 가 그 목록이다.

---

### O-2. 주력 지정학 뉴스 스트림이 `sourceCatalog` 에 아예 없다

**사실관계**

- `feedCatalog.ts` — RSS 피드 **64개** (BBC·NYT·Reuters·WSJ·Al Jazeera·TASS·RT·Haaretz·JPost·PressTV·Kyiv Independent·Meduza…)
- `sourceCatalog.ts` — 뉴스 관련 항목은 **`news-economy-rss` 하나뿐**. 그것도 경제 피드용

**왜 문제인가**

가장 저작권 민감한 자산(64개 매체 기사 본문 스니펫 + 번역)이 **상업화 게이트의 관할 밖**에 있다. `npm run verify:commercial` 이 "✅ 통과"를 찍어도, 그건 **점검되지 않은 것을 통과시킨 것**이다.

`sourceCatalog.ts` 의 주석은 이렇게 경고한다.

> `unknown` — 미확인. **유료 티어 노출 금지.** 확인 전까지 allowed 로 올리지 말 것

원칙은 맞는데, 카탈로그에 **등재조차 안 된 소스**는 이 원칙의 보호를 못 받는다.

**조치** — `news-geopolitics-rss` 항목 신설, `commercialUse: "license-required"`, `commercialNote` 에 매체별 약관 인용. 티어별로 쪼개는 것도 방법(T1 통신사 / T2 분석매체 / T3 관영).

---

### O-3. og:image 스크래핑 — robots.txt 미준수 + 무효한 봇 신원

**사실관계** — `src/lib/news/enrichArticleImage.ts:80-88`

```ts
const res = await fetch(articleUrl, {
  headers: {
    "User-Agent": "ConflictViewLampBot/1.0 (+https://localhost; briefing image enrich)",
  },
```

`src` · `scripts` · `workers` 전체에서 `robots` 문자열 **0건** — robots.txt 를 읽는 코드가 없다.

**평가 — 두 축을 나눠야 한다**

| 축 | 상태 | 판단 |
|----|------|------|
| **복제권** | `<img src={item.imageUrl}>` (`NewsArticleCard.tsx:104`) — 원본 서버 직접 핫링크, **자체 서버 저장 없음** | 🟢 **잘한 설계.** 이미지 파일을 복제하지 않으므로 복제권 침해 구성이 어렵다. Telegram 미디어에 적용한 embed-only 원칙과 같은 사상이다 |
| **접근 방법** | robots.txt 무시 + 연락처가 `localhost` 인 봇 | 🟠 문제 |

핫링크 자체도 상대 서버 대역폭을 소모시키므로 다수 매체 약관이 금지한다. 다만 저작권보다는 **계약 위반 / 업무방해** 영역이다.

**조치**

1. robots.txt 확인 로직 추가 — 최소한 도메인별 캐시 + `Disallow` 준수
2. UA 의 `+https://localhost` 를 **실제 서비스 도메인**으로 교체. 봇 신원은 매체가 차단 여부를 판단할 유일한 수단이고, `localhost` 는 신원을 밝히지 않은 것과 같다
3. `Crawl-delay` 준수 또는 도메인당 요청 간격 도입 (현재 `concurrency: 4` 무제한)

---

## 🟡 점검 필요

### Y-1. `unknown` 개수가 문서와 다르다 — 6 vs 10

`commercial-licensing.md` 는 "확인만 하면 되는 것 (6)" 이라 적었으나, 실제 `sourceCatalog.ts` 카운트는 **10개**다.

```
intel-hotspots · nuclear-sites · missile-silos · strategic-missile-bases
missile-launch-tests · reference-monitor · korea-macro-kosis  … 외
```

문서의 현황표(`allowed 42 / license-required 13 / prohibited 3 / unknown 6`)도 실제(`43 / 13 / 3 / 10`)와 어긋난다. **문서를 정본으로 신뢰할 수 없는 상태**다. 카운트를 `verify:commercial` 출력에서 자동 생성하도록 바꾸는 게 낫다.

### Y-2. adsb.fi — 무료 단계에서도 이미 약관 위반

약관 원문이 `"personal, non-commercial use only"` 다. **개인적 이용**을 요구하므로, 공개 웹서비스로 재제공하는 것은 무료여도 "personal" 요건을 벗어난다. 기존 문서는 "무료 단계는 관행상 허용 범위"로 봤는데, 이건 **"personal"과 "non-commercial"을 하나로 뭉뚱그린 것**이다. 두 요건 모두 충족해야 한다.

대안(`adsb.lol`, ODbL)이 이미 코드에 있으므로 **지금 바꾸는 게 비용이 가장 싸다.**

### Y-3. ACLED — 법인화 시점에 무료여도 문제

`"Commercial entities may not access or use the Content ... without first obtaining a corporate license"` — 금지 대상이 **"상업적 이용"이 아니라 "상업 주체의 접근"** 이다. 법인을 세우는 순간 무료 운영이어도 저촉된다. 개인 프로젝트 단계에서만 안전하다.

### Y-4. `public/data` 113MB 정적 배포 — OSM 파생물의 ODbL Share-Alike

VIINA는 `public/` 에 원본이 없음을 확인했다(검색 결과 0건). 잘 막았다.

그런데 같은 기준이 **OSM 파생 데이터에는 적용되지 않았다.** `sourceCatalog` 는 경제 중심지를 "Wikidata CC0 + OSM ODbL", 군사기지를 "OSM" 으로 표시한다. 이것들이 `public/data/` 에 정적 GeoJSON 으로 배포되면 **Derivative Database 배포**로 볼 여지가 있고, ODbL 4.4/4.6 상 **ODbL 하에 제공 + 소스 제공 의무**가 붙는다.

> VIINA에 적용한 "렌더 전용, 정적 배포 금지" 논리는 ODbL 소스 전체에 동일하게 적용돼야 한다. 한쪽만 막은 건 일관성 문제다.

참고: `roads.json` · `railroads.json` 은 확인 결과 **Natural Earth**(`ne_10m_roads.shp`, `simplify-natural-earth.js:33-39`) — 퍼블릭 도메인이라 안전하다.

---

## 🟢 잘 되어 있는 것 — 유지할 것

| 항목 | 근거 | 평가 |
|------|------|------|
| **GPL-3 격리** | `vendor/cross-strait-signal` 이 `.gitignore:56` 에 등록 → `git ls-files vendor/` **0건**. HTTP API 프록시로만 소비(`api/cross-strait-signal/route.ts`). 판단 근거를 `docs/third-party/` 에 문서화 | 교과서적. 이 정도로 GPL 경계를 정확히 잡은 사례는 드물다 |
| **YouTube** | 공식 embed 플레이어(`VideoNewsPanel.tsx:174`) + `i.ytimg.com` 썸네일 핫링크(`videoPipeline.ts:58`). 영상 파일 다운로드 없음 | YouTube ToS 가 요구하는 정확한 패턴 |
| **Telegram 미디어** | embed-only, 재호스팅 없음, 클릭 게이트, 경고 문구 | 저작권자 특정이 불가능한 콘텐츠에 대한 최선의 방어 |
| **VIINA** | `public/` 원본 0건, 렌더 게이트(`viinaRenderGate.ts`), export API 부재 | 재배포 축 방어 완결 |
| **베이스맵 attribution** | `MapAttributionBar.tsx` — OSM·OpenFreeMap 링크 **상시 하드코딩**, 레이어별 크레딧 동적 부착 | ODbL/CC BY 표기 의무 충족 |
| **Freesound** | `audioAttribution.ts` 에 ID·저작자·작품명·라이선스 URL 전부 기록, `MethodologySourcesPanel.tsx:147-170` 에 UI 노출. CC0 는 의무 없으므로 제외한 판단도 정확 | CC BY 표기 요건 정확히 충족 |

한 가지 사소한 건: `MapAttributionBar` 의 `MAX_SHOWN = 6` 으로 크레딧이 잘린다. CC BY 는 "매체에 합리적인 방식"을 허용하므로 **전체 패널로 클릭 연결되면 통상 문제없다** — 현재 그렇게 돼 있다.

---

## 우선순위 요약

| 순위 | 항목 | 상태 | 노력 |
|------|------|------|------|
| 1 | 폰트 라이선스 전문 동봉 + 미사용 폰트 제거 | ✅ 완료 | — |
| 2 | `RSS_BODY_SNIPPET_MAX` 축소 + `content:encoded` 강등 | ✅ 완료 | — |
| 3 | Google Translate UA 위장 제거 | ✅ 완료 | — |
| 4 | 상업 게이트 CRLF 파싱 버그 + `.gitattributes` | ✅ 완료 | — |
| 5 | 뉴스 스트림 `sourceCatalog` 등재 | ✅ 완료 | — |
| 6 | og:image robots.txt 준수 + 봇 UA 도메인 수정 | ✅ 완료 | — |
| 7 | adsb.fi → adsb.lol 교체 | ✅ 완료 | — |
| 8 | `commercialGate` 런타임 배선 (prefs 층) | ✅ 완료 | — |
| 9 | ADS-B 레이어 등급 재판정 (prohibited → allowed) | ✅ 완료 | — |
| 10 | **API 라우트 직결 레이어 13개 게이트** | ⬜ | 반나절 (유료화 필수) |
| 11 | Google Translate → Cloud Translation / DeepL 전환 | ⬜ | 반나절 (유료화 필수) |
| 12 | ACLED 제거 또는 기업 라이선스 (Y-3) | ⬜ | 법인화 전 |
| 13 | ODbL 파생물(`public/data`) Share-Alike 재검토 (Y-4) | ⬜ | 반나절 |
| 14 | `unknown` 11개 원저작자 확인 (Y-1) | ⬜ | 메일 한 통씩 |
| 15 | 루트 `LICENSE` 파일 · `unknown` 카운트 문서 자동화 | ⬜ | 1시간 |

**🔴·🟠 등급은 전부 해소됐다.** 상업 게이트는 이제 **두 겹**(빌드 + 런타임)으로 작동한다.

남은 것 중 **10·11·12 는 유료화 스위치를 켜기 전에 반드시** 끝나야 한다.
특히 10번이 현재 게이트의 유일한 사각지대이고, 뉴스 스트림처럼 저작권이
가장 민감한 자산이 거기 몰려 있다.

---

## 이번 감사에서 바뀐 파일

```
신규
  docs/copyright-audit-2026-08-01.md      이 문서
  public/licenses/OFL-1.1.txt             SIL OFL 전문 + 저작권 고지
  public/licenses/fonts.md                서체별 권리자·출처 목록
  public/licenses/GmarketSans.txt
  public/licenses/SBAggro.txt
  src/lib/fontAttribution.ts              UI 고지 정본
  src/lib/news/robotsTxt.ts               RFC 9309 파서 + Crawl-delay
  src/lib/news/robotsTxt.test.ts          18 케이스
  src/lib/licensing/layerPrefGate.ts      상업 게이트 런타임 배선
  src/lib/licensing/layerPrefGate.test.ts 매핑 무결성 + 사각지대 감시
  .gitattributes                          줄바꿈·바이너리 정책

수정
  src/lib/news/rssParser.ts               스니펫 220자 · 필드 우선순위 역전
  src/lib/news/periodicBriefing.ts        표시 길이 110/200
  src/lib/news/enrichArticleImage.ts      robots.txt 관문 + 봇 UA 정정
  src/lib/koreanTranslate.ts              UA 위장 제거 + 경고 주석
  src/lib/telegramEmbedScrape.ts          UA 위장 제거
  workers/cron-ingest/src/telegram.ts     UA 위장 제거
  src/lib/adsbClient.ts                   adsb.fi 제거 → adsb.lol 고정
  src/lib/adsbWarmFetch.ts                동일
  workers/cron-ingest/src/adsb.ts         adsb.fi · airplanes.live 제거
  src/data/sourceCatalog.ts               뉴스 RSS · YouTube 신설 (68→70)
                                          ADS-B 2개 prohibited→allowed
  src/lib/layerPrefs.ts                   loadLayerPrefs 에 게이트 배선
  src/lib/licensing/commercialGate.test.ts  ADS-B 불변조건 재작성
  src/components/MethodologySourcesPanel.tsx   서체 고지 섹션
  scripts/verify-commercial-licensing.js  CRLF 내성

삭제
  src/app/fonts/Griun_PolSensibility-Rg.ttf    미사용 · 출처 불명
```

### 검증 결과

```
verify:commercial (무료)   ✅ 통과 — 레이어 70개 / 44·14·1·11
verify:commercial (유료)   exit 1 — 21개 차단 (빌드 게이트 정상)
layerPrefGate 매핑          15개 · 무결성 통과 (카탈로그·pref 키 양방향 확인)
layerPrefGate 런타임        유료 티어에서 13개 차단 / 2개 유지 확인
robotsTxt 파서             18/18 통과
타입 검사 (변경 파일)       오류 없음
```

`금지` 가 3 → **1** 로 줄었다 (ADS-B 2건 해소, ACLED 만 남음).

> ⚠️ `vitest` 전체 스위트는 이번 감사 환경에서 실행하지 못했다
> (`node_modules` 가 Windows 네이티브 바이너리라 리눅스에서 로드 불가).
> **개발 머신에서 `npm test` 를 한 번 돌려 확인할 것.**

---

## 참고 출처

- SIL Open Font License 1.1 — https://openfontlicense.org/
- 리디바탕 (RIDI Corporation, OFL 1.1) — https://ridicorp.com/ridibatang/
- SB 어그로체 (Sandbox Network) — https://sandbox.co.kr/font
- Google APIs 서비스 약관 — https://developers.google.com/terms/
- 저작권법 제7조(보호받지 못하는 저작물)·제22조(2차적저작물작성권)·제28조(공표된 저작물의 인용)
- 뉴스저작물 합법 이용 체크리스트, 한국언론진흥재단 — https://www.kcopa.or.kr
- ODbL 1.0 — https://opendatacommons.org/licenses/odbl/1-0/
- 프로젝트 내부: `docs/copyright-checklist.md` · `docs/commercial-licensing.md` · `src/data/sourceCatalog.ts`
