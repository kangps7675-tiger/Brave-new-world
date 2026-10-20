import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

/** 중국 도련선 · 미군 태평양 기지망(거미줄) · 대만 화약고 펄스 */

/**
 * 하드코딩 정적 데이터 — 실제 기지 배치가 바뀌어도 자동으로 갱신되지 않는다.
 * 최소 반기(6개월)에 한 번은 EDCA/로테이션 배치 변경 여부를 재확인할 것.
 * @see docs/copyright-checklist.md
 */
export const ISLAND_CHAINS_DATA_UPDATED_AT = "2026-07-28";

/** 중국 도련선(島鏈線) 3개 — 실제 도서 지리 기준. 한반도는 이 호(arc)에 포함되지 않는다(반도이지 도련이 아님) */
export type IslandChainLineId = "1st-island-chain" | "2nd-island-chain" | "3rd-island-chain";

export type IslandChainFaction = "china" | "us";

export type UsForwardBase = {
  id: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  /** 탐지/영향 반경 (km) — 호버 시 레이더 원 */
  radarKm: number;
  /** 이 기지가 걸쳐 있는 중국 도련선 — 호버 시 해당 구간만 강조. 도련 호에 없는 기지(한국 등)는 빈 배열 */
  chinaChainIds: IslandChainLineId[];
};

/** 미군 태평양 기지망 간선(edge) — 사령부 허브(hub) ↔ 전방기지(spoke) 거미줄. 기지를 누르기 전엔 렌더되지 않는다 */
export type UsBaseNetworkEdge = {
  id: string;
  a: string;
  b: string;
  tier: "hub" | "spoke";
};

export const CHINA_ISLAND_CHAINS: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "1st-island-chain",
        name: "1st Island Chain",
        nameKo: "제1도련선",
        faction: "china",
        color: "#ef4444",
      },
      /**
       * 캄차카(로파트카곶) → 쿠릴열도 → 홋카이도 → 혼슈 → 규슈 → 오스미제도 →
       * 아마미·오키나와(류큐) → 미야코 해협 → 야에야마 → 대만 → 바시 해협 →
       * 루손 → 팔라완 → 발라박 해협 → 보르네오(사바) → 나투나 → 말라카 해협.
       * 실제 해협·도서 좌표 기준으로 촘촘히 찍었다 (웹 검색으로 좌표 재검증, 2026-07-28).
       */
      geometry: {
        type: "LineString",
        coordinates: [
          [156.67, 50.92], // 로파트카곶 (캄차카 남단, 도련 기점)
          [156.33, 50.68], // 파라무시르 (쿠릴 북단)
          [154.8, 48.88], // 우루프 (쿠릴 중북부)
          [152.0, 46.97], // 시무시르 (쿠릴 중부)
          [147.9, 45.0], // 이투루프 (쿠릴 남단)
          [145.59, 43.33], // 네무로 (홋카이도 동단)
          [143.23, 41.95], // 에리모곶 (홋카이도 남단)
          [142.03, 39.35], // 산리쿠 연안 (혼슈 동북)
          [140.87, 36.34], // 이바라키 연안
          [139.9, 34.9], // 보소반도 (혼슈 동)
          [135.77, 33.45], // 시오노미사키 (기이반도 남단)
          [132.0, 32.7], // 시코쿠 남안 (아시즈리곶)
          [130.66, 30.99], // 사타곶 (규슈 남단)
          [130.99, 30.73], // 다네가시마
          [130.51, 30.34], // 야쿠시마
          [129.5, 28.3], // 아마미오시마
          [127.68, 26.2], // 오키나와 (나하)
          [125.4, 25.9], // 미야코 해협 (PLAN 태평양 진출 핵심 통로)
          [125.28, 24.8], // 미야코지마
          [124.16, 24.34], // 이시가키
          [123.0, 24.45], // 요나구니 (대만 최근접)
          [121.74, 25.13], // 대만 북동 (지룽)
          [121.6, 23.5], // 대만 동안
          [120.85, 21.9], // 어롼비곶 (대만 남단)
          [121.0, 21.0], // 바시 해협 (대만–루손)
          [120.59, 18.2], // 라오아그 (루손 북서)
          [120.0, 14.8], // 마닐라·수빅 앞바다 (루손 서안)
          [120.2, 11.9], // 코론 (팔라완 북동)
          [118.75, 10.2], // 팔라완 중부
          [117.06, 7.98], // 발라박 (팔라완 남서단)
          [116.07, 5.98], // 코타키나발루 (보르네오 사바)
          [114.9, 4.9], // 브루나이·사라왁
          [110.35, 1.55], // 쿠칭 (사라왁)
          [108.5, 3.5], // 나투나 해역
          [103.85, 1.29], // 말라카 해협 (싱가포르, 도련 종점)
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "2nd-island-chain",
        name: "2nd Island Chain",
        nameKo: "제2도련선",
        faction: "china",
        color: "#b91c1c",
      },
      /** 도쿄만 → 이즈제도 → 오가사와라(보닌) → 이오지마 → 북마리아나 → 사이판·티니안 → 괌 → 야프 → 팔라우 → 서파푸아 */
      geometry: {
        type: "LineString",
        coordinates: [
          [139.8, 35.3], // 도쿄만 (혼슈)
          [139.39, 34.75], // 이즈오시마
          [139.53, 34.08], // 미야케지마
          [139.79, 33.11], // 하치조지마
          [142.19, 27.09], // 지치지마 (오가사와라)
          [141.32, 24.78], // 이오지마 (화산열도)
          [144.9, 20.53], // 파하로스 (북마리아나 북단)
          [145.75, 15.18], // 사이판
          [145.63, 14.97], // 티니안
          [144.79, 13.44], // 괌
          [138.13, 9.5], // 야프
          [134.48, 7.34], // 팔라우 (코로르)
          [133.5, 3.0], // 팔라우 남 해역
          [131.25, -0.88], // 서파푸아 (소롱)
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "3rd-island-chain",
        name: "3rd Island Chain",
        nameKo: "제3도련선",
        faction: "china",
        color: "#7f1d1d",
      },
      /**
       * 알류샨 → 미드웨이 → 하와이 → 라인제도 → 남태평양(사모아·피지) → 뉴질랜드.
       * ★ 날짜변경선을 넘으므로 경도를 180° 이상 연속값으로 표기한다
       *   (-176.6 → 183.4 식). 부호를 섞으면 지도를 가로지르는 선이 그려진다.
       */
      geometry: {
        type: "LineString",
        coordinates: [
          [172.9, 52.9], // 애투 (알류샨 서단)
          [183.34, 51.88], // 애닥 (알류샨 중부) = -176.66
          [193.46, 53.89], // 우날래스카 (알류샨 동부) = -166.54
          [182.65, 28.2], // 미드웨이 환초 = -177.35
          [202.14, 21.3], // 호놀룰루 (하와이) = -157.86
          [197.92, 5.88], // 팔미라 (라인제도) = -162.08
          [189.3, -14.28], // 파고파고 (사모아) = -170.7
          [178.44, -18.14], // 수바 (피지)
          [174.76, -36.85], // 오클랜드 (뉴질랜드)
        ],
      },
    },
  ],
};

/** 태평양 미군 전방·후방 기지 — 호버 시 레이더 반경 + 도련선 강조 */
export const US_FORWARD_BASES: UsForwardBase[] = [
  {
    id: "korea-humphreys",
    nameKo: "주한미군 · 캠프 험프리스/오산",
    nameEn: "USFK · Camp Humphreys / Osan",
    lat: 36.96,
    lng: 127.03,
    radarKm: 450,
    /** 한반도는 도서(島)가 아니라 반도라 도련선 호에는 포함되지 않는다 — 기지망(거미줄)으로만 연결 */
    chinaChainIds: [],
  },
  {
    id: "japan-yokosuka",
    nameKo: "주일미군 · 요코스카 (7함대 사령부)",
    nameEn: "USFJ · Yokosuka (7th Fleet HQ)",
    lat: 35.29,
    lng: 139.67,
    radarKm: 500,
    /** 도쿄만은 제1도련선이 지나가고 제2도련선이 시작되는 지점 */
    chinaChainIds: ["1st-island-chain", "2nd-island-chain"],
  },
  {
    id: "okinawa-kadena",
    nameKo: "오키나와 · 가데나",
    nameEn: "Okinawa · Kadena AB",
    lat: 26.34,
    lng: 127.77,
    radarKm: 500,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "taiwan-strait",
    nameKo: "대만 해협 우회선",
    nameEn: "Taiwan Strait hinge",
    lat: 24.4,
    lng: 119.6,
    radarKm: 380,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "philippines-clark",
    nameKo: "필리핀 · 클락/수빅",
    nameEn: "Philippines · Clark / Subic",
    lat: 15.19,
    lng: 120.56,
    radarKm: 420,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "singapore-changi",
    nameKo: "싱가포르 · 창이/말라카 거점",
    nameEn: "Singapore · Changi / Malacca hub",
    lat: 1.32,
    lng: 103.99,
    radarKm: 480,
    /** 제1도련선 남단 종점 = 말라카 해협 */
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "alaska-elmendorf",
    nameKo: "알래스카 · 엘멘도르프-리처드슨",
    nameEn: "Alaska · JB Elmendorf-Richardson",
    lat: 61.25,
    lng: -149.81,
    radarKm: 700,
    /** 알류샨 = 제3도련선 북단 */
    chinaChainIds: ["3rd-island-chain"],
  },
  {
    id: "hawaii-indopacom",
    nameKo: "하와이 · 인도·태평양 사령부",
    nameEn: "Hawaii · INDOPACOM",
    lat: 21.38,
    lng: -157.9,
    radarKm: 900,
    chinaChainIds: ["3rd-island-chain"],
  },
  {
    id: "guam-anderson",
    nameKo: "괌 · 앤더슨 (전력투사 허브)",
    nameEn: "Guam · Andersen AFB (power projection hub)",
    lat: 13.58,
    lng: 144.93,
    radarKm: 650,
    chinaChainIds: ["2nd-island-chain"],
  },
  {
    id: "australia-darwin",
    nameKo: "호주 · 다윈",
    nameEn: "Australia · RAAF Darwin",
    lat: -12.41,
    lng: 130.87,
    radarKm: 550,
    chinaChainIds: [],
  },
  {
    id: "australia-tindal",
    nameKo: "호주 · 틴덜 (B-52 순환배치, 2024~)",
    nameEn: "Australia · RAAF Tindal (rotational B-52s, 2024–)",
    lat: -14.52,
    lng: 132.38,
    radarKm: 550,
    chinaChainIds: [],
  },
  {
    id: "indian-ocean-diego-garcia",
    nameKo: "디에고가르시아 (인도양 · 전략 심도)",
    nameEn: "Diego Garcia (Indian Ocean · strategic depth)",
    lat: -7.3195,
    lng: 72.4229,
    radarKm: 800,
    chinaChainIds: [],
  },
  {
    id: "philippines-edca-cagayan-camilo-osias",
    nameKo: "필리핀 · 카밀로 오시아스 해군기지 (EDCA 2023 신규, 산타아나·카가얀)",
    nameEn: "Philippines · Naval Base Camilo Osias (EDCA 2023, Sta. Ana, Cagayan)",
    lat: 18.5,
    lng: 122.15,
    radarKm: 350,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "philippines-edca-lal-lo",
    nameKo: "필리핀 · 랄로 공항 (EDCA 2023 신규, 카가얀)",
    nameEn: "Philippines · Lal-lo Airport (EDCA 2023, Cagayan)",
    lat: 18.15,
    lng: 121.65,
    radarKm: 350,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "philippines-edca-camp-melchor-dela-cruz",
    nameKo: "필리핀 · 멜초르 델라 크루즈 기지 (EDCA 2023 신규, 이사벨라)",
    nameEn: "Philippines · Camp Melchor Dela Cruz (EDCA 2023, Isabela)",
    lat: 16.9,
    lng: 121.87,
    radarKm: 350,
    chinaChainIds: ["1st-island-chain"],
  },
  {
    id: "philippines-edca-balabac",
    nameKo: "필리핀 · 발라박 (EDCA 2023 신규, 팔라완 최남단)",
    nameEn: "Philippines · Balabac (EDCA 2023, southern Palawan)",
    lat: 7.98,
    lng: 117.06,
    radarKm: 350,
    /** 팔라완 남서단 — 제1도련선 남중국해 구간과 접함 */
    chinaChainIds: ["1st-island-chain"],
  },
];

/**
 * 미군 태평양 기지망 — 거미줄(spiderweb) 간선.
 * hub 간선(굵게) = 사령부 간 지휘·병참선(INDOPACOM 하와이 ↔ 7함대 요코스카 ↔ 괌).
 * spoke 간선(가늘게) = 사령부 → 전방 배치 기지.
 * 항상 그리지 않고, 기지를 호버·탭했을 때 그 기지가 걸린 간선만 그린다.
 */
export const US_PACIFIC_BASE_EDGES: UsBaseNetworkEdge[] = [
  // —— 사령부 간 간선 (hub) ——
  { id: "hub-hawaii-yokosuka", a: "hawaii-indopacom", b: "japan-yokosuka", tier: "hub" },
  { id: "hub-hawaii-guam", a: "hawaii-indopacom", b: "guam-anderson", tier: "hub" },
  { id: "hub-hawaii-alaska", a: "hawaii-indopacom", b: "alaska-elmendorf", tier: "hub" },
  { id: "hub-hawaii-darwin", a: "hawaii-indopacom", b: "australia-darwin", tier: "hub" },
  { id: "hub-hawaii-diego-garcia", a: "hawaii-indopacom", b: "indian-ocean-diego-garcia", tier: "hub" },
  { id: "hub-guam-yokosuka", a: "guam-anderson", b: "japan-yokosuka", tier: "hub" },

  // —— 요코스카(7함대) → 동북아 전방기지 (spoke) ——
  { id: "spoke-yokosuka-korea", a: "japan-yokosuka", b: "korea-humphreys", tier: "spoke" },
  { id: "spoke-yokosuka-kadena", a: "japan-yokosuka", b: "okinawa-kadena", tier: "spoke" },
  { id: "spoke-kadena-taiwan-strait", a: "okinawa-kadena", b: "taiwan-strait", tier: "spoke" },

  // —— 대만해협 → 필리핀 전방기지 (spoke) ——
  { id: "spoke-taiwan-strait-clark", a: "taiwan-strait", b: "philippines-clark", tier: "spoke" },
  { id: "spoke-clark-edca-camilo-osias", a: "philippines-clark", b: "philippines-edca-cagayan-camilo-osias", tier: "spoke" },
  { id: "spoke-clark-edca-lal-lo", a: "philippines-clark", b: "philippines-edca-lal-lo", tier: "spoke" },
  { id: "spoke-clark-edca-melchor", a: "philippines-clark", b: "philippines-edca-camp-melchor-dela-cruz", tier: "spoke" },
  { id: "spoke-clark-edca-balabac", a: "philippines-clark", b: "philippines-edca-balabac", tier: "spoke" },
  { id: "spoke-clark-changi", a: "philippines-clark", b: "singapore-changi", tier: "spoke" },

  // —— 괌 → 오세아니아 (spoke) ——
  { id: "spoke-guam-tindal", a: "guam-anderson", b: "australia-tindal", tier: "spoke" },
  { id: "spoke-darwin-tindal", a: "australia-darwin", b: "australia-tindal", tier: "spoke" },
];

/** 대만 — 1도련×전방기지망 교차 화약고 (대만해협 중앙, 대만섬 서쪽) */
export const TAIWAN_CHOKE = {
  lat: 24.2,
  lng: 119.5,
  nameKo: "대만 해협 · 화약고",
  nameEn: "Taiwan Strait · choke point",
} as const;

function ringPolygon(lng: number, lat: number, radiusKm: number, steps = 64): Polygon {
  const coords: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * Math.PI * 2;
    const dLat = (radiusKm / 111.32) * Math.cos(bearing);
    const dLng = (radiusKm / (111.32 * Math.max(0.2, Math.cos(latRad)))) * Math.sin(bearing);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

const EMPTY_LINES: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [],
};

function baseById(baseId: string | null): UsForwardBase | null {
  if (!baseId) return null;
  return US_FORWARD_BASES.find((b) => b.id === baseId) ?? null;
}

/**
 * 중국 도련선 전체 — 체크박스가 켜져 있으면 상시 표시(은은하게).
 * 호버 강조는 아래 Highlight 함수가 따로 그린다.
 */
export function islandChainsChinaGeoJson(): FeatureCollection<LineString> {
  return CHINA_ISLAND_CHAINS;
}

/**
 * 호버·탭한 기지가 걸쳐 있는 도련선만 — 상시 선 위에 겹쳐 그려 강조한다.
 * baseId가 null이면 빈 컬렉션.
 */
export function islandChainsChinaHighlightGeoJson(
  hoveredBaseId: string | null,
): FeatureCollection<LineString> {
  const base = baseById(hoveredBaseId);
  if (!base || base.chinaChainIds.length === 0) return EMPTY_LINES;
  const wanted = new Set<string>(base.chinaChainIds);
  return {
    type: "FeatureCollection",
    features: CHINA_ISLAND_CHAINS.features.filter((f) => wanted.has(String(f.properties?.id))),
  };
}

/**
 * 미군 태평양 기지망(거미줄) — 기지를 호버·탭했을 때만 그 기지가 걸린 간선을 그린다.
 * baseId가 null이면 빈 컬렉션 (상시 표시 없음).
 */
export function islandChainsUsHighlightGeoJson(
  hoveredBaseId: string | null,
): FeatureCollection<LineString> {
  if (!hoveredBaseId) return EMPTY_LINES;
  const edges = US_PACIFIC_BASE_EDGES.filter(
    (e) => e.a === hoveredBaseId || e.b === hoveredBaseId,
  );
  if (edges.length === 0) return EMPTY_LINES;
  const features: Feature<LineString>[] = [];
  for (const edge of edges) {
    const a = baseById(edge.a);
    const b = baseById(edge.b);
    if (!a || !b) continue;
    features.push({
      type: "Feature",
      properties: {
        id: edge.id,
        tier: edge.tier,
        color: edge.tier === "hub" ? "#1d4ed8" : "#3b82f6",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function islandChainsBasesGeoJson(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: US_FORWARD_BASES.map(
      (b): Feature<Point> => ({
        type: "Feature",
        properties: {
          id: b.id,
          nameKo: b.nameKo,
          nameEn: b.nameEn,
          radarKm: b.radarKm,
        },
        geometry: { type: "Point", coordinates: [b.lng, b.lat] },
      }),
    ),
  };
}

export function islandChainsRadarGeoJson(baseId: string | null): FeatureCollection<Polygon> {
  const base = baseById(baseId);
  if (!base) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: base.id,
          nameKo: base.nameKo,
          nameEn: base.nameEn,
          radarKm: base.radarKm,
        },
        geometry: ringPolygon(base.lng, base.lat, base.radarKm),
      },
    ],
  };
}

export function islandChainsTaiwanPulseGeoJson(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: "taiwan-choke",
          nameKo: TAIWAN_CHOKE.nameKo,
          nameEn: TAIWAN_CHOKE.nameEn,
        },
        geometry: {
          type: "Point",
          coordinates: [TAIWAN_CHOKE.lng, TAIWAN_CHOKE.lat],
        },
      },
    ],
  };
}
