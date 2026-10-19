import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { LiveuamapEvent, LiveuamapRegionId } from "@/lib/liveuamap/types";

/**
 * 전쟁 중인 나라 — liveuamap에서 최근 사건이 이어지는 지역의 나라 전체를 국경 폴리곤으로 칠한다.
 * 우크라이나는 통제면(점령지)이 이미 있어 제외하고, 이스라엘은 별도 파일(war-extra-countries.json)의 국경을 쓴다.
 */
const WAR_REGION_ISO: Partial<Record<LiveuamapRegionId, string>> = {
  iran: "IRN",
  yemen: "YEM",
  lebanon: "LBN",
  "israel-palestine": "ISR",
};

/** 최근 72시간에 사건이 3건 이상이면 전쟁 중으로 본다. */
const WINDOW_MS = 72 * 60 * 60 * 1000;
const MIN_EVENTS = 3;

export function warCountryIsos(
  events: readonly Pick<LiveuamapEvent, "regionId" | "publishedAt">[],
  now: number = Date.now(),
): string[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    const iso = WAR_REGION_ISO[ev.regionId];
    if (!iso) continue;
    const at = Date.parse(ev.publishedAt);
    if (!Number.isFinite(at) || now - at > WINDOW_MS) continue;
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= MIN_EVENTS).map(([iso]) => iso);
}

/** 이미 불러온 국경 폴리곤 묶음에서 해당 나라를 찾아, 통제면과 같은 색·스타일의 피처로 만든다. */
export function buildWarCountryFeatures(
  isos: readonly string[],
  sources: readonly (FeatureCollection<Geometry, GeoJsonProperties> | null | undefined)[],
): Feature<Geometry, GeoJsonProperties>[] {
  const out: Feature<Geometry, GeoJsonProperties>[] = [];
  for (const iso of isos) {
    const found = sources
      .flatMap((fc) => fc?.features ?? [])
      .find((f) => f.properties?.iso === iso && f.geometry);
    if (!found) continue;
    out.push({
      type: "Feature",
      id: `liveua-war-country-${iso}-macro`,
      geometry: found.geometry,
      properties: {
        name: String(found.properties?.name ?? iso),
        region: "war-country",
        source: "liveuamap",
        role: "war-country",
        fill: "#a52714",
        fillOpacity: 0.2,
        stroke: "#ef9a9a",
      },
    });
  }
  return out;
}
