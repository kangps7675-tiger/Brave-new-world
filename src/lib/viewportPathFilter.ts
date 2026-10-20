import type { TransportPath } from "@/data/geoTypes";
import { bboxNearView } from "@/lib/viewportCull";

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** 클라이언트·서버 공용 — scalerank · 뷰포트 · 상한으로 path cull */
export function filterTransportPathsForViewport(
  paths: TransportPath[],
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    maxCount: number;
    maxScalerank?: number;
    arterialMaxRank?: number;
  },
): TransportPath[] {
  const {
    lat,
    lng,
    radiusDeg,
    maxCount,
    maxScalerank = 99,
    arterialMaxRank = 99,
  } = options;
  if (maxCount <= 0) return [];

  const view = { lat, lng, altitude: 1 };
  type Ranked = { path: TransportPath; arterial: boolean; dist: number };
  const ranked: Ranked[] = [];

  for (const path of paths) {
    if (path.scalerank > maxScalerank) continue;
    const isArterial = path.scalerank <= arterialMaxRank;
    if (!isArterial && radiusDeg > 0 && !bboxNearView(path.bbox, view, radiusDeg)) {
      continue;
    }
    const midLat = (path.bbox.minLat + path.bbox.maxLat) / 2;
    const midLng = (path.bbox.minLng + path.bbox.maxLng) / 2;
    const dist = Math.sqrt(
      (midLat - lat) ** 2 + longitudeDistance(midLng, lng) ** 2,
    );
    ranked.push({ path, arterial: isArterial, dist });
  }

  ranked.sort((a, b) => {
    const aIn = radiusDeg <= 0 || a.dist <= radiusDeg || a.arterial ? 0 : 1;
    const bIn = radiusDeg <= 0 || b.dist <= radiusDeg || b.arterial ? 0 : 1;
    if (radiusDeg > 0) {
      const aNear = a.dist <= radiusDeg ? 0 : 1;
      const bNear = b.dist <= radiusDeg ? 0 : 1;
      if (aNear !== bNear) return aNear - bNear;
    } else if (aIn !== bIn) {
      return aIn - bIn;
    }
    if (a.path.scalerank !== b.path.scalerank) {
      return a.path.scalerank - b.path.scalerank;
    }
    return a.dist - b.dist;
  });

  return ranked.slice(0, maxCount).map((item) => item.path);
}
