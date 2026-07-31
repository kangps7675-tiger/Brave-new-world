# 한국 공공데이터 — 수집 가이드

> 공용 클라이언트: `scripts/lib/korea-open-data.js`
> 관세청 파서: `scripts/lib/kcs-trade-parse.js` · 테스트: `src/data/kcsTradeParse.test.ts`
> 라이선스: `docs/commercial-licensing.md` · `koglType` 필드

---

## 왜 이 데이터인가

**GTA 는 "어떤 조치가 있었나"(정책)를 준다. 관세청은 "그래서 물동량이 어떻게 움직였나"(실적)를 준다.**

둘을 잇는 키가 **HS 챕터(앞 2자리)** 다:

```
중국이 철강(72장) 수출제한 발표          [gta-interventions]
  → 한국 72장 수입이 실제로 줄었나        [kcs-trade]
    → 그 철강소가 어디 있나               [gem-steel]
```

이 세 단계를 잇는 곳은 흔치 않다. 그게 이 파이프라인의 존재 이유다.

> ⚠️ 관세청 수출입 속보는 세계적으로 주시되는 선행지표다 — **데이터 자체가 희귀한 게 아니다.**
> 차별점은 **결합과 한국어 해석**이지 데이터 소유가 아니다.

---

## "공공데이터"는 두 법 체계다

| | 공공데이터법 (data.go.kr) | 공공누리 (저작권법) |
|---|---|---|
| 대상 | **사실의 집합** | **저작물이 포함된** 공공데이터 |
| 상업 제한 | 없음 (저작권이 안 붙음) | 제2·4유형은 금지 |

관세청 금액·해수부 척수·ECOS 시계열은 **사실**이라 저작물성이 약하다.
저작물이 붙는 건 보고서 본문·사진·지도 이미지·설명 텍스트다.

**그래도 기관이 유형을 표시해뒀으면 그걸 따른다.** `koglType` 필드에 기록한다.

### 제3유형(변경금지)이 함정이다

우리 파이프라인은 데이터를 **실제로 변경한다**:

- `roundCoord(v, 2)` — 좌표를 1.1km 격자로 반올림
- `capArrayGeographic()` — 지리 층화 표본 추출
- `compactStaticPoint()` — 필드명 압축

"그대로 표시"가 아니라 가공이다. **제3유형도 유료 티어에서 막는다.**

---

## 폴링 정책

저작권법 제93조 2항 단서:

> "개별 소재 … 의 복제라도 **반복적이거나 특정한 목적을 위하여 체계적으로**
> 함으로써 해당 데이터베이스의 통상적 이용과 충돌하거나 제작자의 이익을
> 부당하게 해치는 경우 상당한 부분의 복제로 본다"

| 소스 | 갱신 주기 | 권장 cron |
|------|----------|----------|
| 관세청 무역통계 | 월간·10일 단위 | **1회/일** |
| 해수부 입출항 | 월간 통계 | 1회/일 |
| 한국은행 ECOS | 일·월 혼재 | 1회/일 |
| KOSIS | 월·분기 | 1회/일 |

**10분 크론에 절대 넣지 말 것.** 조문에 걸릴 뿐 아니라 개발계정 일일 한도(보통 1만 건)를 태운다.

---

## data.go.kr API 의 함정

공용 클라이언트가 흡수하는 것들:

**① JSON 파라미터명이 제각각이다** — `type` · `_type` · `resultType` · `dataType`.
어떤 건 XML 만 준다. 클라이언트가 변종을 순서대로 시도하고 XML 이면 파싱한다.

**② serviceKey 이중 인코딩**
data.go.kr 은 "인코딩 키"와 "디코딩 키" 두 개를 발급한다.
`URLSearchParams` 로 붙이면 이미 인코딩된 키가 **이중 인코딩**되어 401 이 난다.
→ 쿼리스트링을 직접 조립한다.

**③ 에러가 HTTP 200 으로 온다**
본문 `resultCode` 에 실패를 담아 보낸다. **조용한 실패**다 —
이 프로젝트가 이미 크게 당한 유형(빈 gzip, 널섬 좌표).
→ `extractResult()` 로 코드를 확인하고 실패를 예외로 올린다.

**④ 응답 중첩 깊이가 다르다**
`response.body.items.item` · `response.body.items` · `items` · 단건이면 객체.
→ `extractItems()` 가 흡수한다.

---

## 관세청 데이터의 함정

**① 금액 단위가 천 달러다**

```js
exportThousandUsd  // 원본 (천 달러)
exportUsd          // 달러 환산 — 화면·계산용
```

원본을 달러로 표기하면 **1000배 틀린다.**

**② HS 부호 앞자리 0 이 잘려 온다**

`"208"` ← 실제 `"0208"`. `normalizeHs()` 가 표준 자릿수(2·4·6·8·10)로 좌측 패딩한다.

**③ 결측을 0 으로 만들면 안 된다**

"수출 없음"과 "데이터 없음"은 다르다. 결측은 `null`.

**④ 변화율 기저가 0 이면 `null`**

`Infinity` 를 화면에 그리면 안 된다. 화면에서는 "신규"로 표기한다.

---

## 발급 절차

```bash
# 관세청
# 1) data.go.kr 회원가입
# 2) '관세청_품목별 수출입실적(GW)' 활용신청
#    https://www.data.go.kr/data/15101609/openapi.do
# 3) ⚠️ 페이지 하단 공공누리 유형 확인 → sourceCatalog 의 koglType 에 기록
# 4) .env: KCS_TRADE_API_KEY=... (일반 인증키)
npm run kcs:fetch

# 일부 관세청 API 는 UNIPASS 별도 가입 필요
#   unipass.customs.go.kr → My Menu > 서비스 관리 > Open API 이용관리
```

수집 후:

```bash
node scripts/compress-data-gzip.js all
npm run verify:data
npm run verify:commercial
```

---

## 붙인 소스 4종

| 소스 | 스크립트 | 파서 | 레이어 |
|------|---------|------|--------|
| 관세청 무역통계 | `npm run kcs:fetch` | `kcs-trade-parse.js` | `kcs-trade` |
| 해수부 항만 입출항 | `npm run korea:fetch` | `mof-port-parse.js` | `mof-port-flows` |
| 한국은행 ECOS | `npm run korea:fetch` | `ecos-kosis-parse.js` | `korea-macro-ecos` |
| 통계청 KOSIS | `npm run korea:fetch` | `ecos-kosis-parse.js` | `korea-macro-kosis` |

`korea:fetch` 는 **키가 있는 소스만** 수집한다. 하나만 발급받아도 그만큼은 들어온다.

```bash
# 필요한 키 (없으면 해당 소스만 건너뜀)
MOF_PORT_API_KEY=   # data.go.kr 활용신청
ECOS_API_KEY=       # ecos.bok.or.kr 회원가입 시 자동 발급
KOSIS_API_KEY=      # kosis.kr/openapi 신청
KOSIS_TABLE_ID=     # 조회할 통계표
KOSIS_ORG_ID=101    # 기본 통계청
```

### 해수부가 특히 값어치 있는 이유

「한중일물류 입출항정보」는 **화물량 · 다음 항구 · 목적지**를 포함한다.

- **신고 기반**이라 AIS 보다 정확하다 (AIS 는 암전·스푸핑 가능)
- 공공데이터라 `ais` 레이어의 MarineTraffic 상업 라이선스 문제를 부분적으로 우회
- "이 배가 지금 어디 있나"가 아니라 **"물량이 어디로 흐르나"** — 해운 B2B 가 실제로 묻는 질문

`aggregateFlows()` 가 `부산 → 로테르담` 형태로 집계해 초크포인트 레이어에 붙인다.

### 해수부 데이터의 함정

- **톤수 단위가 셋** — G/T(총톤수) · D/W/T(재화중량톤수) · 실화물톤.
  **섞어 합산하면 무의미한 숫자가 나온다.** 별도 필드로 분리 보존한다.
- **입출항 방향 표기가 제각각** — `I`/`O` · `입항`/`출항` · `ENTRY`/`DEPARTURE`.
  못 알아보면 `null` 로 둔다 (추측 금지).
- **항구 코드 체계 혼재** — UN/LOCODE(`KRPUS`) · 자체 코드 · 한글 항구명.

### ECOS·KOSIS 는 자체 포털이다

**data.go.kr 이 아니다.** 응답 구조도 에러 규약도 다르다.

| | ECOS | KOSIS |
|---|---|---|
| 정상 | `{ StatisticSearch: { row: [...] } }` | **최상위가 배열** |
| 실패 | `{ RESULT: { CODE, MESSAGE } }` | `{ err, errMsg }` |

둘 다 **실패를 HTTP 200 으로 준다.** data.go.kr 과 같은 함정이다.
→ 파서가 에러를 감지하면 **예외를 던진다.** 조용히 빈 배열을 돌려주지 않는다.

**시계열 함정:**
- **주기가 섞인다.** ECOS 분기는 `20261`(5자리)로 와서 월(`202601`, 6자리)과 헷갈린다
- **결측을 0 으로 만들면 안 된다.** "환율 0원"이 되어 차트가 무너진다 → `null`
- **단위(UNIT_NM)가 행마다 다를 수 있다.** 버리면 다른 지표를 같은 축에 그리게 된다

`latestChange()` 는 결측 구간을 건너뛰고 **몇 개를 건너뛰었는지 보고**한다 —
가짜 급락을 만들지 않기 위해서다.

> ⚠️ ECOS·KOSIS 는 이용약관이 data.go.kr 과 별도다. 유료화 전에 각각 확인할 것.
> 현재 셋 다 `commercialUse: "unknown"` 이라 유료 티어에서 자동 차단된다.
