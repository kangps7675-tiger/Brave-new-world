import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

/** 중국 도련선 · 미군 인도·태평양 방어선 · 대만 화약고 펄스 */

export type IslandChainLineId =
  | "1st-island-chain"
  | "2nd-island-chain"
  | "3rd-island-chain"
  | "us-forward-containment"
  | "us-strategic-depth";

export type IslandChainFaction = "china" | "us";

export type UsForwardBase = {
  id: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  /** 탐지/영향 반경 (km) — 호버 시 레이더 원 */
  radarKm: number;
  lineIds: IslandChainLineId[];
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
       * 쿠릴 → 일본열도 → 류큐(오키나와) → 대만 → 필리핀 → 보르네오 → 말라카.
       * 실제 도서 호(arc)를 따라가도록 주요 섬·해협 좌표를 촘촘히 찍었다.
       */
      geometry: {
        type: "LineString",
        coordinates: [
          [156.0, 50.4], // 쿠릴 북단 (파라무시르)
          [152.0, 47.0], // 쿠릴 중부 (시무시르)
          [147.9, 45.0], // 쿠릴 남단 (이투루프)
          [145.6, 43.3], // 홋카이도 동안 (네무로)
          [141.6, 38.3], // 혼슈 동북 (센다이 앞바다)
          [140.3, 35.2], // 혼슈 동 (보소반도)
          [136.8, 33.5], // 기이반도 남
          [130.7, 31.0], // 규슈 남단 (사타곶)
          [130.9, 30.4], // 다네가시마·야쿠시마
          [129.5, 28.3], // 아마미오시마
          [127.7, 26.2], // 오키나와 (나하)
          [125.3, 24.8], // 미야코 해협
          [124.2, 24.4], // 이시가키
          [123.0, 24.45], // 요나구니 (대만 최근접)
          [121.9, 25.1], // 대만 북동 (지룽)
          [121.6, 23.5], // 대만 동안
          [120.9, 21.9], // 대만 남단 (어롼비곶)
          [121.0, 21.0], // 바시 해협
          [120.6, 18.2], // 루손 북서 (라오아그)
          [120.0, 15.0], // 루손 서 (수빅·마닐라 앞바다)
          [120.9, 12.5], // 민도로
          [120.2, 11.9], // 팔라완 북동 (코론)
          [118.7, 10.2], // 팔라완 중부
          [117.0, 8.0], // 팔라완 남서 (발라박)
          [115.5, 6.0], // 보르네오 북 (사바·코타키나발루)
          [113.0, 4.3], // 브루나이·사라왁
          [110.3, 1.8], // 사라왁 (쿠칭)
          [106.0, 1.0], // 나투나 해역
          [104.0, 1.3], // 싱가포르·말라카
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
      /** 일본 본토 → 이즈·오가사와라 → 마리아나(괌) → 팔라우 → 서파푸아 */
      geometry: {
        type: "LineString",
        coordinates: [
          [139.8, 35.3], // 도쿄만 (혼슈)
          [139.5, 34.1], // 이즈제도 (미야케지마)
          [139.8, 33.1], // 하치조지마
          [142.2, 27.1], // 오가사와라 (지치지마)
          [141.3, 24.8], // 이오지마 (화산열도)
          [144.9, 20.5], // 북마리아나 북단 (파하로스)
          [145.7, 15.2], // 사이판
          [145.6, 15.0], // 티니안
          [144.9, 13.6], // 괌 (앤더슨)
          [138.1, 9.5], // 야프
          [134.5, 7.3], // 팔라우 (코로르)
          [133.5, 3.0], // 팔라우 남 해역
          [131.3, -0.9], // 서파푸아 (소롱)
          [136.0, -3.5], // 파푸아 내륙 방면
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
       * 알류샨 → 하와이 → 남태평양 → 뉴질랜드.
       * ★ 날짜변경선을 넘으므로 경도를 180° 이상 연속값으로 표기한다
       *   (-176.6 → 183.4 식). 부호를 섞으면 지도를 가로지르는 선이 그려진다.
       */
      geometry: {
        type: "LineString",
        coordinates: [
          [172.9, 52.9], // 알류샨 서단 (애투)
          [183.4, 51.9], // 알류샨 중부 (애닥) = -176.6
          [193.5, 53.9], // 알류샨 동부 (우날래스카) = -166.5
          [202.1, 21.3], // 하와이 (호놀룰루) = -157.9
          [197.6, 5.9], // 라인제도 (팔미라) = -162.4
          [189.3, -14.3], // 사모아 (파고파고) = -170.7
          [178.4, -18.1], // 피지 (수바)
          [174.8, -36.9], // 뉴질랜드 (오클랜드)
        ],
      },
    },
  ],
};

export const US_CONTAINMENT_LINES: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "us-forward-containment",
        name: "US Forward Containment Line",
        nameKo: "미군 전방 포위선",
        faction: "us",
        color: "#3b82f6",
      },
      /** 주한미군 → 주일미군 → 오키나와 → 대만해협 → 필리핀 → 싱가포르(창이) */
      geometry: {
        type: "LineString",
        coordinates: [
          [127.03, 36.96], // 캠프 험프리스 (평택)
          [129.4, 35.1], // 부산·대한해협
          [130.4, 33.6], // 후쿠오카 (규슈 북)
          [139.67, 35.29], // 요코스카 (주일미군 사령부)
          [132.5, 33.2], // 시코쿠 남 회항
          [127.77, 26.34], // 가데나 (오키나와)
          [121.9, 24.6], // 대만 해협 동측
          [120.56, 15.19], // 클락 (필리핀)
          [120.28, 14.79], // 수빅만
          [115.0, 8.0], // 남중국해 남하
          [103.99, 1.32], // 창이 해군기지 (싱가포르)
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "us-strategic-depth",
        name: "US Strategic Depth Line",
        nameKo: "미군 전략 심도선",
        faction: "us",
        color: "#1d4ed8",
      },
      /**
       * 알래스카(엘멘도르프) → 하와이(인도·태평양사) → 괌(앤더슨) → 호주(다윈).
       * 하와이→괌 구간이 날짜변경선을 넘으므로 경도를 연속값(>180)으로 표기.
       */
      geometry: {
        type: "LineString",
        coordinates: [
          [-149.81, 61.25], // 엘멘도르프-리처드슨 (앵커리지)
          [-157.9, 21.38], // 캠프 H.M. 스미스 (인도·태평양사령부)
          [-215.07, 13.58], // 앤더슨 AFB (괌) = 144.93 − 360 (서쪽 방향 연속 표기)
          [-229.13, -12.41], // RAAF 다윈 (호주) = 130.87 − 360
        ],
      },
    },
  ],
};

/** 방어선과 교차하는 전방 기지 — 호버 시 레이더 반경 */
export const US_FORWARD_BASES: UsForwardBase[] = [
  {
    id: "korea-humphreys",
    nameKo: "주한미군 · 캠프 험프리스/오산",
    nameEn: "USFK · Camp Humphreys / Osan",
    lat: 36.96,
    lng: 127.03,
    radarKm: 450,
    lineIds: ["us-forward-containment"],
  },
  {
    id: "japan-yokosuka",
    nameKo: "주일미군 · 요코스카",
    nameEn: "USFJ · Yokosuka",
    lat: 35.29,
    lng: 139.67,
    radarKm: 500,
    /** 도쿄만은 제1도련선이 지나가고 제2도련선이 시작되는 지점 */
    lineIds: ["us-forward-containment", "1st-island-chain", "2nd-island-chain"],
  },
  {
    id: "okinawa-kadena",
    nameKo: "오키나와 · 가데나",
    nameEn: "Okinawa · Kadena AB",
    lat: 26.34,
    lng: 127.77,
    radarKm: 500,
    lineIds: ["us-forward-containment", "1st-island-chain"],
  },
  {
    id: "taiwan-strait",
    nameKo: "대만 해협 우회선",
    nameEn: "Taiwan Strait hinge",
    lat: 24.4,
    lng: 119.6,
    radarKm: 380,
    lineIds: ["us-forward-containment", "1st-island-chain"],
  },
  {
    id: "philippines-clark",
    nameKo: "필리핀 · 클락/수빅",
    nameEn: "Philippines · Clark / Subic",
    lat: 15.19,
    lng: 120.56,
    radarKm: 420,
    lineIds: ["us-forward-containment", "1st-island-chain"],
  },
  {
    id: "singapore-changi",
    nameKo: "싱가포르 · 창이/말라카 거점",
    nameEn: "Singapore · Changi / Malacca hub",
    lat: 1.32,
    lng: 103.99,
    radarKm: 480,
    /** 제1도련선 남단 종점 = 말라카 해협 */
    lineIds: ["us-forward-containment", "1st-island-chain"],
  },
  {
    id: "alaska-elmendorf",
    nameKo: "알래스카 · 엘멘도르프-리처드슨",
    nameEn: "Alaska · JB Elmendorf-Richardson",
    lat: 61.25,
    lng: -149.81,
    radarKm: 700,
    /** 알류샨 = 제3도련선 북단 */
    lineIds: ["us-strategic-depth", "3rd-island-chain"],
  },
  {
    id: "hawaii-indopacom",
    nameKo: "하와이 · 인도·태평양 사령부",
    nameEn: "Hawaii · INDOPACOM",
    lat: 21.38,
    lng: -157.9,
    radarKm: 900,
    lineIds: ["us-strategic-depth", "3rd-island-chain"],
  },
  {
    id: "guam-anderson",
    nameKo: "괌 · 앤더슨",
    nameEn: "Guam · Andersen AFB",
    lat: 13.58,
    lng: 144.93,
    radarKm: 650,
    lineIds: ["us-strategic-depth", "2nd-island-chain"],
  },
  {
    id: "australia-darwin",
    nameKo: "호주 · 다윈",
    nameEn: "Australia · RAAF Darwin",
    lat: -12.41,
    lng: 130.87,
    radarKm: 550,
    lineIds: ["us-strategic-depth"],
  },
];

/** 대만 — 1도련×전방포위 교차 화약고 (대만해협 중앙, 대만섬 서쪽) */
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

/** 해당 기지가 걸쳐 있는 선 id 목록 */
function lineIdsForBase(baseId: string | null): IslandChainLineId[] {
  if (!baseId) return [];
  return US_FORWARD_BASES.find((b) => b.id === baseId)?.lineIds ?? [];
}

function filterLines(
  source: FeatureCollection<LineString>,
  lineIds: IslandChainLineId[],
): FeatureCollection<LineString> {
  if (lineIds.length === 0) return EMPTY_LINES;
  const wanted = new Set<string>(lineIds);
  return {
    type: "FeatureCollection",
    features: source.features.filter((f) => wanted.has(String(f.properties?.id))),
  };
}

/**
 * 중국 도련선 전체 — 체크박스가 켜져 있으면 상시 표시(은은하게).
 * 호버 강조는 아래 Highlight 함수가 따로 그린다.
 */
export function islandChainsChinaGeoJson(): FeatureCollection<LineString> {
  return CHINA_ISLAND_CHAINS;
}

/** 미군 방어선 전체 — 상시 표시(은은하게) */
export function islandChainsUsGeoJson(): FeatureCollection<LineString> {
  return US_CONTAINMENT_LINES;
}

/**
 * 호버·탭한 기지가 걸쳐 있는 도련선만 — 상시 선 위에 겹쳐 그려 강조한다.
 * baseId가 null이면 빈 컬렉션.
 */
export function islandChainsChinaHighlightGeoJson(
  hoveredBaseId: string | null,
): FeatureCollection<LineString> {
  return filterLines(CHINA_ISLAND_CHAINS, lineIdsForBase(hoveredBaseId));
}

/** 호버·탭한 기지가 걸쳐 있는 미군 방어선만 */
export function islandChainsUsHighlightGeoJson(
  hoveredBaseId: string | null,
): FeatureCollection<LineString> {
  return filterLines(US_CONTAINMENT_LINES, lineIdsForBase(hoveredBaseId));
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
  if (!baseId) {
    return { type: "FeatureCollection", features: [] };
  }
  const base = US_FORWARD_BASES.find((b) => b.id === baseId);
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
