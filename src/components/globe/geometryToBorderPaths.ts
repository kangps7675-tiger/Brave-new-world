import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";

/** Polygon / MultiPolygon 외곽을 닫힌 path 링으로 변환 (면 없이 테두리만) */
export function geometryToBorderPaths(
  idPrefix: string,
  name: string | null,
  geometry: GeoJsonGeometry,
  kind: TransportPath["kind"] = "arms-embargo",
): TransportPath[] {
  const rings: number[][][] = [];
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates;
    if (Array.isArray(coords) && Array.isArray(coords[0])) {
      const outer = coords[0] as number[][];
      if (outer.length >= 2) rings.push(outer);
    }
  } else if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates;
    if (Array.isArray(polygons)) {
      for (const polygon of polygons) {
        if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) continue;
        const outer = polygon[0] as number[][];
        if (outer.length >= 2) rings.push(outer);
      }
    }
  }

  const paths: TransportPath[] = [];
  rings.forEach((ring, index) => {
    const points = ring
      .map(([lng, lat]) => ({
        lat: Number(lat),
        lng: Number(lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length < 2) return;
    const stride = points.length > 80 ? Math.ceil(points.length / 64) : 1;
    const simplified =
      stride <= 1
        ? points
        : points.filter((_, i) => i % stride === 0 || i === points.length - 1);
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
      simplified.push({ ...first });
    }
    const lats = simplified.map((p) => p.lat);
    const lngs = simplified.map((p) => p.lng);
    paths.push({
      id: `${idPrefix}-${index}`,
      kind,
      name,
      scalerank: 1,
      lengthKm: null,
      bbox: {
        minLat: Math.min(...lats),
        minLng: Math.min(...lngs),
        maxLat: Math.max(...lats),
        maxLng: Math.max(...lngs),
      },
      points: simplified,
    });
  });
  return paths;
}
