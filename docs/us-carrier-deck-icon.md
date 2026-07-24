# US 항공모함 갑판 아이콘 (CVN Deck Silhouette)

멋진 신세계 지도 마커용 **공중俯視 항모 실루엣** 설계 문서입니다.  
데이터·아이콘·렌더링을 바꿀 때 이 문서와 `src/data/usCarrierDeckSilhouette.ts`를 함께 참고하세요.

## 참조 이미지

| 항목 | 경로 |
|------|------|
| 공중샷 (원본) | `public/assets/reference/us-carrier-deck-aerial.png` |
| 코드 상수 | `src/data/usCarrierDeckSilhouette.ts` → `CARRIER_DECK_REFERENCE` |
| SVG 렌더 | `src/lib/usCarrierDeckIcon.ts` → `carrierDeckIconSvg()` |
| 지도 마커 | `src/lib/usCarrierMarkers.ts` → `createUsCarrierBadge()` |

원본 사진이 없으면 Nimitz/Ford급 **Top-down** 사진을 위 경로에 넣으면 됩니다.

## 실루엣에서 뽑은 형상 (공중샷 기준)

```
        [섬 island]                    함투(bow) →
    ┌────┐
────┘    └──────────────────────────────╮
    │    axial runway ────────────────► │
    │         ╲ angled deck             │
    └──────────╲________________________┘
   함수(stern)     (좌현/port 돌출)
```

| 요소 | 설명 |
|------|------|
| 함수 (좌) | 넓고 직선 절단 |
| 함투 (우) | 뾰족한 선수 |
| 좌현 (하단) | **사각 갑판** — 착함 대각선이 돌출된 비대칭 돌기 |
| 우현 (상단) | **섬(island)** — 함교·마스트 블록 |
| 활주로 | 축 방향 흰선 + 사각갑판 대각선 |
| 중앙선 | 노란 얇은 선 (참조 사진의 yellow centerline) |
| 레이더 돔 | 갑판 위 2개 원 (E-2 Hawkeye 위치 대략) |

## SVG 좌표계

- **viewBox**: `0 0 48 22` (`CARRIER_DECK_VIEWBOX`)
- **+X**: 함진행 방향 (함수 → 함투, 동쪽)
- **+Y**: 좌현(port, 사각갑판 쪽)

### Path 상수 (단일 소스)

```ts
import {
  CARRIER_HULL_OUTLINE_PATH,
  CARRIER_AXIAL_RUNWAY_PATH,
  CARRIER_ANGLED_RUNWAY_PATH,
  CARRIER_CENTERLINE_PATH,
  CARRIER_ISLAND_PATH,
} from "@/data/usCarrierDeckSilhouette";
```

## 상태별 색 (형광)

| status | 색 | 의미 |
|--------|-----|------|
| `deployed` | `#dc2626` | 배치·작전 |
| `home` | `#f59e0b` | 항구·주둔 |
| `maintenance` | `#6b7280` | 정비·대기 |

정의: `src/data/usCarriers.ts` → `US_CARRIER_STATUS_COLORS`

## 지도 마커 동작

1. 체크박스 **「미 항공모함 추적」** ON (`showUsCarriers`)
2. 각 함 좌표에 **갑판 아이콘 + 함명 라벨** (HTML overlay)
3. 동일 항구 좌표는 `carrierLabelOffsets()`로 라벨 세로错開
4. 클릭 → 상세 패널 + `flyTo`

## 위치 데이터

| 파일 | 용도 |
|------|------|
| `public/data/lite/us-carriers.json` | 정적 시드 (stub) |
| `public/data/full/us-carriers.json` | full 프로필 |
| `src/data/usCarriers.ts` | `US_CARRIERS_SEED` fallback |
| `src/app/api/us-carriers/route.ts` | API (`/api/us-carriers`) |

갱신: JSON의 `lat`/`lng`/`status` 수정 후 새로고침.

## 아이콘 크기 변경

`CARRIER_MARKER_ICON_SIZE` (`usCarrierDeckSilhouette.ts`)와  
`carrierMarkerAnchorOffsetPx()` (앵커 X 오프셋)를 함께 조정하세요.

## 변경 이력

- **2026-01-21** — 공중샷 참조 실루엣 v1 (angled deck + island + runway)
- **2026-07-10** — 문서·geometry 코드베이스 고정 (`usCarrierDeckSilhouette.ts`)
