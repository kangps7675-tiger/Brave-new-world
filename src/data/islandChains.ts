import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

/** 중국 도련선 · 미군 인도·태평양 방어선 · 대만 화약고 펄스 */

export type IslandChainLineId =
  | "1st-island-chain"
  | "2nd-island-chain"
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
      geometry: {
        type: "LineString",
        coordinates: [
          [146.0, 44.0],
          [139.7, 35.6],
          [127.8, 26.3],
          [121.5, 25.0],
          [121.0, 14.6],
          [114.0, 4.0],
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
      geometry: {
        type: "LineString",
        coordinates: [
          [142.2, 27.1],
          [144.7, 13.4],
          [134.5, 7.5],
          [140.0, -2.5],
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
      geometry: {
        type: "LineString",
        coordinates: [
          [127.0, 37.5],
          [139.7, 35.3],
          [121.5, 25.0],
          [120.5, 15.1],
          [103.8, 1.3],
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
      geometry: {
        type: "LineString",
        coordinates: [
          [-149.9, 61.2],
          [-157.8, 21.3],
          [144.7, 13.4],
          [130.8, -12.4],
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
    lat: 37.5,
    lng: 127.0,
    radarKm: 450,
    lineIds: ["us-forward-containment"],
  },
  {
    id: "japan-yokosuka",
    nameKo: "주일미군 · 요코스카",
    nameEn: "USFJ · Yokosuka",
    lat: 35.3,
    lng: 139.7,
    radarKm: 500,
    lineIds: ["us-forward-containment"],
  },
  {
    id: "taiwan-strait",
    nameKo: "대만 해협 우회선",
    nameEn: "Taiwan Strait hinge",
    lat: 25.0,
    lng: 121.5,
    radarKm: 380,
    lineIds: ["us-forward-containment", "1st-island-chain"],
  },
  {
    id: "philippines-clark",
    nameKo: "필리핀 · 클락/수빅",
    nameEn: "Philippines · Clark / Subic",
    lat: 15.1,
    lng: 120.5,
    radarKm: 420,
    lineIds: ["us-forward-containment"],
  },
  {
    id: "singapore-changi",
    nameKo: "싱가포르 · 말라카 거점",
    nameEn: "Singapore · Malacca hub",
    lat: 1.3,
    lng: 103.8,
    radarKm: 480,
    lineIds: ["us-forward-containment"],
  },
  {
    id: "alaska-elmendorf",
    nameKo: "알래스카 · 엘멘도르프",
    nameEn: "Alaska · Elmendorf",
    lat: 61.2,
    lng: -149.9,
    radarKm: 700,
    lineIds: ["us-strategic-depth"],
  },
  {
    id: "hawaii-indopacom",
    nameKo: "하와이 · 인도·태평양 사령부",
    nameEn: "Hawaii · INDOPACOM",
    lat: 21.3,
    lng: -157.8,
    radarKm: 900,
    lineIds: ["us-strategic-depth"],
  },
  {
    id: "guam-anderson",
    nameKo: "괌 · 앤더슨",
    nameEn: "Guam · Andersen AFB",
    lat: 13.4,
    lng: 144.7,
    radarKm: 650,
    lineIds: ["us-strategic-depth", "2nd-island-chain"],
  },
  {
    id: "australia-darwin",
    nameKo: "호주 · 다윈",
    nameEn: "Australia · Darwin",
    lat: -12.4,
    lng: 130.8,
    radarKm: 550,
    lineIds: ["us-strategic-depth"],
  },
];

/** 대만 — 1도련×전방포위 교차 화약고 */
export const TAIWAN_CHOKE = {
  lat: 23.7,
  lng: 121.0,
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

export function islandChainsChinaGeoJson(): FeatureCollection<LineString> {
  return CHINA_ISLAND_CHAINS;
}

export function islandChainsUsGeoJson(): FeatureCollection<LineString> {
  return US_CONTAINMENT_LINES;
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
