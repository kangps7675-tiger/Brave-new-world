/**
 * Korea peninsula historical overlay (authored / Claude pipeline).
 * Files: /data/historical/korea/manifest.json + snapshots/year_<Y>.geojson
 * Mount: 역사 toggle only, over worldwide Cliopatria (KR excluded there).
 *
 * Territory paint: follow GeoJSON research — prefer *-final / textbook / main
 * over stacking min/max hypotheses. Balhae peak → bh-ext-830-textbook
 * (Liaodong + Primorye mid-coast / Olga). Chinese context polities paint when uiDefault.
 */

import type { Feature, FeatureCollection, Geometry } from "geojson";
import { colorForKoreaFamily } from "@/lib/historical/polityColors";

export type KoreaYearEntry = {
  year: number;
  file: string;
  featureCount: number;
  fillCount?: number;
  uiFillCount?: number;
  sizeMB: number;
};

export type KoreaManifest = {
  version: number;
  builtAt: string;
  license: string;
  korea: string;
  stats: {
    sourceFeatures: number;
    layerCounts: Record<string, number>;
    licenseCounts: Record<string, number>;
    yearFloor: number;
  };
  years: KoreaYearEntry[];
};

export type KoreaHistoryProps = {
  id?: string | null;
  layer?: string | null;
  nameEn?: string | null;
  nameKo?: string | null;
  category?: string | null;
  role?: string | null;
  confidence?: string | null;
  uiDefault?: boolean;
  startYear?: number | null;
  endYear?: number | null;
  wikidata?: string | null;
  license?: string | null;
  source?: string | null;
};

export const KOREA_HISTORY_BASE = "/data/historical/korea";

export const KOREA_FILL_LAYERS = [
  "polity",
  "polity_prehistory",
  "hypothesis",
] as const;

/** Balhae peak — 요동 + 연해주 중부 해안(올가 방면). GeoJSON textbook 안. */
export const BALHAE_PEAK_FINAL_ID = "bh-ext-830-textbook";
/** Legacy id — south-coast “최종안”; ranked just under textbook. */
export const BALHAE_PEAK_SOUTH_FINAL_ID = "bh-ext-830-final";

export function koreaSnapshotUrl(year: number): string {
  return `${KOREA_HISTORY_BASE}/snapshots/year_${year}.geojson`;
}

export async function fetchKoreaManifest(
  init?: RequestInit
): Promise<KoreaManifest> {
  const res = await fetch(`${KOREA_HISTORY_BASE}/manifest.json`, init);
  if (!res.ok) throw new Error(`Korea history manifest ${res.status}`);
  return res.json() as Promise<KoreaManifest>;
}

export function isKoreaFillLayer(layer: string | null | undefined): boolean {
  return !!layer && (KOREA_FILL_LAYERS as readonly string[]).includes(layer);
}

/** @deprecated prefer selectKoreaTerritoryFeatures */
export function isKoreaFillFeature(props: {
  layer?: string | null;
  uiDefault?: boolean;
}): boolean {
  if (!isKoreaFillLayer(props.layer)) return false;
  return props.uiDefault !== false;
}

function blob(props: KoreaHistoryProps): string {
  return `${props.id || ""} ${props.nameKo || ""} ${props.nameEn || ""} ${props.category || ""}`;
}

/** Collapse competing polygons for the same polity into one family key. */
export function territoryFamilyKey(props: KoreaHistoryProps): string {
  const b = blob(props);
  if (/balhae|parhae|bohai|발해|bh-ext|bh-h-amur|clio-balhae/i.test(b)) {
    return "balhae";
  }
  if (/goguryeo|koguryo|고구려|clio-goguryeo|^gr-/i.test(b)) return "goguryeo";
  if (/baekje|paekche|백제|clio-baekje/i.test(b)) return "baekje";
  if (/unified\s*silla|통일신라|clio-unified-silla/i.test(b)) return "unified-silla";
  if (/\bsilla\b|신라|clio-silla/i.test(b)) return "silla";
  if (/gojoseon|고조선|^gj-/i.test(b)) return "gojoseon";
  if (/goryeo|koryo|고려|clio-goryeo/i.test(b)) return "goryeo";
  if (/joseon|choson|조선|clio-joseon/i.test(b)) return "joseon";
  if (/balhae|정안|jeongan|bh-jeongan/i.test(b)) return "jeongan";
  // Context / unique authored — do not collapse across dynasties
  return `id:${props.id || props.nameKo || props.nameEn || "unknown"}`;
}

/**
 * Higher = preferred paint. Research “최종안” beats Cliopatria stub and
 * min/max speculative stacks.
 */
export function territoryPaintRank(props: KoreaHistoryProps): number {
  const id = props.id || "";
  const name = props.nameKo || "";
  const conf = props.confidence || "";

  if (id === BALHAE_PEAK_FINAL_ID || /교과서형/.test(name)) return 100;
  if (id === BALHAE_PEAK_SOUTH_FINAL_ID || /전성기 최종안/.test(name)) return 96;
  if (/-final$/i.test(id)) return 95;
  if (/-textbook$/i.test(id)) return 90;
  if (/-main$/i.test(id) || /통설형/.test(name)) return 80;
  if (/-mid$/i.test(id)) return 70;
  if (props.layer === "polity" || props.layer === "polity_prehistory") return 60;
  if (/-min$/i.test(id) || /최소형/.test(name)) return 40;
  if (
    /-max$/i.test(id) ||
    /최대형/.test(name) ||
    conf === "speculative" ||
    /^\[소수|^\[논쟁|^\[상한|^\[검증|^\[가능성/.test(name)
  ) {
    return 12;
  }
  if (props.layer === "hypothesis") return 50;
  return 30;
}

function isPolygonGeom(geom: Geometry | null | undefined): boolean {
  return geom?.type === "Polygon" || geom?.type === "MultiPolygon";
}

/**
 * Pick one territory polygon per family (Balhae → textbook: Liaodong + mid Primorye coast).
 * Includes Korean fills + Chinese/neighbor context when uiDefault.
 */
export function selectKoreaTerritoryFeatures(
  features: Feature[]
): Feature[] {
  type Cand = { feature: Feature; props: KoreaHistoryProps; rank: number; family: string };
  const cands: Cand[] = [];

  for (const feature of features) {
    if (!isPolygonGeom(feature.geometry)) continue;
    const props = (feature.properties || {}) as KoreaHistoryProps;
    if (!isKoreaFillLayer(props.layer)) continue;

    const role = props.role || "korean";
    // Context (당·요·한…) — only when GeoJSON marks uiDefault
    if (role === "context" && props.uiDefault === false) continue;
    // Korean / authored — skip explicit uiDefault false
    if (role !== "context" && props.uiDefault === false) continue;

    cands.push({
      feature,
      props,
      rank: territoryPaintRank(props),
      family: territoryFamilyKey(props),
    });
  }

  const best = new Map<string, Cand>();
  for (const c of cands) {
    const prev = best.get(c.family);
    if (!prev || c.rank > prev.rank) best.set(c.family, c);
  }

  // Drop weak speculative-only picks when rank is very low and family had alternatives rejected
  return [...best.values()]
    .filter((c) => c.rank >= 40 || c.props.layer === "polity")
    .map((c) => c.feature);
}

export function paintKoreaTerritoryFeature(feature: Feature): Feature {
  const props = (feature.properties || {}) as KoreaHistoryProps;
  const role = props.role || "korean";
  const family = territoryFamilyKey(props);
  const paint = colorForKoreaFamily(family, {
    role,
    layer: props.layer,
    nameBlob: blob(props),
  });

  return {
    ...feature,
    properties: {
      ...props,
      fill: paint.fill,
      fillOpacity: paint.fillOpacity,
      stroke: paint.stroke,
      label: props.nameKo || props.nameEn || props.id || "",
    },
  };
}

export function buildKoreaTerritoryGeoJson(
  raw: FeatureCollection | null | undefined
): FeatureCollection {
  if (!raw?.features?.length) {
    return { type: "FeatureCollection", features: [] };
  }
  const selected = selectKoreaTerritoryFeatures(raw.features as Feature[]);
  return {
    type: "FeatureCollection",
    features: selected.map(paintKoreaTerritoryFeature),
  };
}

export function nearestHistoryYear(target: number, years: number[]): number {
  if (!years.length) return target;
  let best = years[0]!;
  let bestDist = Math.abs(best - target);
  for (const y of years) {
    const d = Math.abs(y - target);
    if (d < bestDist) {
      best = y;
      bestDist = d;
    }
  }
  return best;
}
