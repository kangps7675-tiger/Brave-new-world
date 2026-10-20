import type { TransportPath, UkraineControlZone } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";
import { buildUkraineFrontRender } from "@/lib/ukraineFrontPaths";
import type { NewUkraineControlPathRow } from "@/db/schema";

export type UkraineHatchLod = "overview" | "detail";

export type UkraineHatchCachePayload = {
  generatedAt: string;
  controlDate: string;
  lodTier: UkraineHatchLod;
  pathCount: number;
  paths: TransportPath[];
};

const UKRAINE_CENTER = { lat: 48.45, lng: 35.2 };

export function lodTierToHatchLod(tier: GlobeLodTier): UkraineHatchLod {
  if (tier === "global" || tier === "continent") return "overview";
  return "detail";
}

export function hatchLodToBuildOptions(lod: UkraineHatchLod): {
  maxZones: number;
  lodTier: GlobeLodTier;
} {
  if (lod === "overview") {
    // 전장 전체 덩어리용 — 셀 메시가 아니라 dissolve 그리드
    return { maxZones: 3200, lodTier: "continent" };
  }
  return { maxZones: 4200, lodTier: "near" };
}

/**
 * 뷰포트 무관 전장 전체 빗금·테두리 사전계산.
 * 클라이언트의 존별 geometry hatch 생성을 서버/빌드로 옮긴다.
 */
export function precomputeUkraineHatchPaths(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
  lod: UkraineHatchLod,
  controlDate: string,
): UkraineHatchCachePayload {
  const options = hatchLodToBuildOptions(lod);
  const { paths } = buildUkraineFrontRender(
    ruZones,
    uaZones,
    contestedZones,
    UKRAINE_CENTER,
    options,
  );

  return {
    generatedAt: new Date().toISOString(),
    controlDate: controlDate || "",
    lodTier: lod,
    pathCount: paths.length,
    paths,
  };
}

export function transportPathsToD1Rows(
  payload: UkraineHatchCachePayload,
): NewUkraineControlPathRow[] {
  const builtAt = payload.generatedAt;
  return payload.paths.map((path) => {
    const zoneMatch = path.id.match(
      /^ukraine-(?:ru|ua)-(?:occupied|claim)(?:-hatch)?-(.+?)-\d+$/,
    );
    const zoneId = zoneMatch?.[1] ?? path.id;
    return {
      id: `${payload.lodTier}:${path.id}`,
      zoneId,
      kind: path.kind,
      name: path.name,
      accentColor: path.accentColor ?? null,
      lodTier: payload.lodTier,
      controlDate: payload.controlDate,
      pointsJson: JSON.stringify(path.points),
      pointCount: path.points.length,
      minLat: path.bbox.minLat,
      minLng: path.bbox.minLng,
      maxLat: path.bbox.maxLat,
      maxLng: path.bbox.maxLng,
      builtAt,
    };
  });
}

export function d1RowsToTransportPaths(
  rows: Array<{
    id: string;
    kind: string;
    name: string | null;
    accentColor: string | null;
    pointsJson: string;
    minLat: number | null;
    minLng: number | null;
    maxLat: number | null;
    maxLng: number | null;
    pointCount: number;
  }>,
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const row of rows) {
    let points: TransportPath["points"] = [];
    try {
      const parsed = JSON.parse(row.pointsJson) as TransportPath["points"];
      if (Array.isArray(parsed)) points = parsed;
    } catch {
      continue;
    }
    if (points.length < 2) continue;
    const pathId = row.id.includes(":") ? row.id.slice(row.id.indexOf(":") + 1) : row.id;
    out.push({
      id: pathId,
      kind: row.kind as TransportPath["kind"],
      name: row.name,
      scalerank: 1,
      lengthKm: null,
      accentColor: row.accentColor ?? undefined,
      bbox: {
        minLat: row.minLat ?? points[0]!.lat,
        minLng: row.minLng ?? points[0]!.lng,
        maxLat: row.maxLat ?? points[0]!.lat,
        maxLng: row.maxLng ?? points[0]!.lng,
      },
      points,
    });
  }
  return out;
}

/** 카메라 주변만 남기는 가벼운 필터 (지오메트리 재계산 없음) */
export function filterHatchPathsByView(
  paths: TransportPath[],
  view: { lat: number; lng: number },
  radiusDeg: number,
  maxPaths: number,
): TransportPath[] {
  // 근접 줌에서 큰 분쟁 박스(이란 등) 가장자리 빗금이 잘리지 않게 여유
  const effectiveRadius = Math.max(radiusDeg, 12);
  const scored = paths
    .map((path) => {
      // 중심점만 보면 큰 Iran/ME 박스가 가장자리 줌에서 통째로 탈락함 → bbox 최근접점
      const clampedLat = Math.min(
        Math.max(view.lat, path.bbox.minLat),
        path.bbox.maxLat,
      );
      let clampedLng = view.lng;
      if (view.lng < path.bbox.minLng || view.lng > path.bbox.maxLng) {
        const dMin = Math.abs(view.lng - path.bbox.minLng);
        const dMax = Math.abs(view.lng - path.bbox.maxLng);
        const wrapMin = Math.min(dMin, 360 - dMin);
        const wrapMax = Math.min(dMax, 360 - dMax);
        clampedLng = wrapMin <= wrapMax ? path.bbox.minLng : path.bbox.maxLng;
      }
      const dLat = Math.abs(clampedLat - view.lat);
      const dLng = Math.min(
        Math.abs(clampedLng - view.lng),
        360 - Math.abs(clampedLng - view.lng),
      );
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      return { path, dist };
    })
    .filter((item) => item.dist <= effectiveRadius)
    .sort((a, b) => a.dist - b.dist);

  return scored.slice(0, maxPaths).map((item) => item.path);
}
