# 상업 라이선스 — 유료화 체크리스트

> 정본: `src/data/sourceCatalog.ts` 의 `commercialUse` 필드
> 게이트: `npm run verify:commercial` (빌드에서 자동 실행)
> 코드: `src/lib/licensing/commercialGate.ts`

---

## 먼저 짚을 오해

> ❌ "데이터를 팔지 않고 화면만 보여주니 상업적 이용이 아니다"

**틀렸다.** Creative Commons NonCommercial 정의는

> "not primarily intended for or directed towards commercial advantage
> **or monetary compensation**"

요금제는 그 자체로 monetary compensation 이다. **그려서 보여주기만 해도, 그 화면에 접근료를 받으면 상업적 이용이다.**

### 두 축을 혼동하지 말 것

| 축 | 질문 | 방어 장치 |
|----|------|----------|
| **재배포** | 원본 DB 를 넘기는가? | `viinaRenderGate` — 렌더 전용, export API 없음 |
| **상업성** | 그 화면으로 돈을 받는가? | `commercialGate` — 이 문서 |

**렌더 전용이어도 유료면 상업적 이용이다.** 두 게이트는 서로를 대체하지 않는다.

---

## 현재 상태 (2026-07-31)

| 구분 | 개수 | 유료 노출 |
|------|------|----------|
| `allowed` | 42 | ✅ 가능 |
| `license-required` | 13 | ❌ 계약 필요 |
| `prohibited` | 3 | ❌ 약관이 금지 |
| `unknown` | 6 | ❌ 확인 전까지 차단 |

**유료화를 켜면 21개가 빌드를 막는다.**

`unknown` 을 차단하는 건 의도적이다 — **"아직 안 알아봤다"와 "괜찮다"는 다르다.**

---

## 명시적으로 금지된 것 (3)

### `military-activity` · `air-traffic` — adsb.fi

> "adsb.fi open data is for **personal, non-commercial use only.**
> You may not license, sell, rent, or lease any part of the data or the service."

**해결책은 이미 있다:**
- `adsb.lol` 은 **ODbL** — 상업 이용 가능, 표기만 하면 된다
- `ADSBexchange` 상업 티어 — `.env` 에 `ADSBEXCHANGE_API_KEY` 이미 있음
- `airplanes.live` 는 독점 라이선스 — 확인 전까지 사용 금지

코드는 이미 배선돼 있다. `COMMERCIAL_TIER_ENABLED=true` 면
`adsb.fi` 와 `airplanes.live` 가 폴백에서 자동으로 빠진다
(`workers/cron-ingest/src/adsb.ts` · `src/lib/adsbClient.ts` · `src/lib/adsbWarmFetch.ts`).

> ⚠️ **요금제를 켜면 `COMMERCIAL_TIER_ENABLED` 도 반드시 켤 것.**
> 안 켜면 조용히 약관 위반이 계속된다.

### `hapi-conflict-casualties` — ACLED

> "Commercial entities may not access or use the Content and/or Platforms
> **without first obtaining a corporate license** from ACLED."

추가 제약: ACLED 콘텐츠로 **대체재를 만들거나 수익화하는 것**을 명시적으로 금지하고,
AI/ML 학습 사용도 제한한다.

→ 유료 제품에서 제외하거나 기업 라이선스 취득. 문의: `acleddata.com/eula`

---

## 라이선스를 사면 열리는 것 (13)

협상 우선순위 판단용. 값어치 대비 비용이 좋은 순:

| 레이어 | 상대 | 비고 |
|--------|------|------|
| `gta-interventions` | Global Trade Alert | 데이터는 CC BY 4.0, **서비스 약관**이 비상업. 상업 조건 문의 |
| `ais` | MarineTraffic | 상업 라이선스 존재. 해운 버티컬이면 필수 |
| `world-stats` | Statistics of the World | 이미 유료 API — 상업 플랜 확인 |
| `news-economy-rss` | 각 매체 | 제목+링크는 통상 허용, 본문 재배포는 별도 |
| `telegram-osint` | 채널 운영자 | 카탈로그 MIT. **절반 스니펫 + t.me CTA** (전문 비표시) |
| `ukmto-incidents` | Royal Navy | OGL 은 상업 허용이나 **비공식 엔드포인트**를 쓰는 중 → 정식 피드 요청 |
| `reef-watch` | OpenSky Network | ReefWatch 는 MIT, OpenSky 가 비상업·연구용 |
| `neptun` · `tzeva-adom` | 비공식 피드 | 상업 시 제공자 문의 |

---

## 확인만 하면 되는 것 (6) — 가장 싸게 늘릴 수 있다

`intel-hotspots` · `nuclear-sites` · `missile-silos` ·
`strategic-missile-bases` · `missile-launch-tests` · `reference-monitor`

원저작자 재배포 조건만 확인하면 `allowed` 로 올릴 수 있다.
**메일 한 통 값이다.**

---

## 유료화해도 되는 자산 (42)

핵심만:

**지경학 뼈대** — GEM 파이프라인·LNG(CC BY 4.0) · 크리티컬 노드(MIT) ·
경제 중심지(Wikidata CC0 + OSM ODbL) · 초크포인트(자체) · 무역로

**지정학 뼈대** — VIINA 전선(ODbL, 렌더 전용 유지) · 군사기지(OSM) ·
GDELT 계열 전부 · 분쟁구역 · 제재·무기금수

**자체 저작물 — 여기가 진짜 상품이다**
- `escalation-signals` — 확전 판정
- `resource-deposits` · `tunnels` — 자체 큐레이션
- 초크포인트 브리프 · 마찰 에피소드 · 허브 브리프 · GTI 지수
- EvidenceTier 프레임

> **유료화의 정당한 근거는 "남의 데이터 접근권"이 아니라 "우리 판단"이다.**
> 지도는 판단의 근거를 보여주는 화면이지 상품이 아니다.

---

## 새 레이어를 추가할 때

1. `sourceCatalog.ts` 에 `commercialUse` 를 **반드시** 지정
   — 모르면 `"unknown"`. 그러면 유료 노출만 막히고 무료는 정상 동작한다
2. `allowed` 가 아니면 `commercialNote` 에 **약관 원문 인용**
   — 나중에 왜 막았는지 다시 조사하지 않도록
3. `npm run verify:commercial` 통과 확인
4. 유료 상품 패키지는 `commercialSafeLayerIds()` 에서만 고를 것

---

## 유료화 전 최종 점검

```bash
# 1) 유료 모드에서 게이트가 통과하는지
npm run verify:commercial:paid

# 2) 통과하면 환경변수 켜기
#    .env: COMMERCIAL_TIER_ENABLED=true
#    wrangler: COMMERCIAL_TIER_ENABLED = "true"

# 3) 데이터 무결성도 함께
npm run verify:data && npm test
```

**게이트 우회는 `LICENSE_GATE_SKIP=1`** 이지만, 이건 법적 리스크라
데이터 게이트(`DATA_GATE_SKIP`)와 **별도 플래그**로 분리해뒀다.
우회할 일이 있으면 사유를 커밋 메시지에 반드시 남길 것.

---

## 수익화가 커지면 재검토할 것

- **SIPRI** — 현재 shelve. fair use 는 **비상업 + 10% 미만** 둘 다 만족해야 한다.
  유료화하면 비상업 요건이 깨진다. 로열티 경로가 약관에 명시돼 있다
- **Freesound** — 음원마다 라이선스가 다르다. CC BY-NC 음원 색출 후 CC0 교체 필요
- **Yahoo Finance** — ToS. `FRED_API_KEY` 가 이미 있으니 FRED(미 정부, 퍼블릭 도메인) 우선으로
- **Google Translate 비공식** — 유료 API 로 전환
- **무료 티어로 회피 불가** — CC 정의가 "directed towards commercial advantage" 라
  유료 전환을 유도하는 무료 티어도 상업 목적에 종속된 것으로 본다

---

> 이 문서는 약관·조문 확인에 기반한 정리이지 법률 자문이 아니다.
> 실제 유료화 전에 변호사 검토를 받을 것.
