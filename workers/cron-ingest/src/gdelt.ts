import type { GdeltPointRow } from "./env";

/**
 * GDELT 2.0 Geo API (GeoJSON) — Worker-friendly (no ZIP/adm-zip).
 * @see https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/
 */
const GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

/**
 * 지정학 경쟁 전반 — 전장 핫스팟 + 육·해·공·전략·하이브리드·동맹 도메인.
 * 키워드 범위만 넓힘. 폴링은 아래 하드캡으로 렉·API 남용 방지.
 */
export const GDELT_QUERIES: { tag: string; query: string }[] = [
  // —— 전장 핫스팟 ——
  {
    tag: "ukraine",
    query:
      "(ukraine OR donetsk OR kharkiv OR zaporizhzhia OR crimea OR kursk OR frontline OR artillery)",
  },
  {
    tag: "middle-east",
    query:
      '(gaza OR lebanon OR hezbollah OR houthi OR "red sea" OR hormuz OR "bab el-mandeb" OR iran OR israel OR yemen OR syria)',
  },
  {
    tag: "taiwan",
    query:
      '(taiwan OR "taiwan strait" OR pla OR spratly OR paracel OR "south china sea" OR senkaku OR diaoyu)',
  },
  {
    tag: "korea",
    query:
      '("north korea" OR pyongyang OR dprk OR DMZ OR KADIZ OR JADIZ OR "west sea" OR "yellow sea")',
  },

  // —— 도메인: 육상 ——
  {
    tag: "land-war",
    query:
      "(theme:ARMEDCONFLICT OR theme:MILITARY OR theme:TERROR OR \"ground offensive\" OR shelling OR bombardment OR \"missile strike\" OR occupation OR annexation OR \"troop deployment\" OR \"border clash\" OR militia OR \"proxy war\" OR \"front line\")",
  },

  // —— 도메인: 해상 ——
  {
    tag: "maritime",
    query:
      '(theme:MARITIME OR "freedom of navigation" OR FONOP OR warship OR "aircraft carrier" OR submarine OR "naval drill" OR "coast guard" OR EEZ OR chokepoint OR "shipping lane" OR piracy OR "sea mine" OR "submarine cable" OR Hormuz OR Malacca OR Suez OR Baltic OR "black sea" OR pacific OR atlantic OR arctic OR "indo-pacific")',
  },

  // —— 대양 지정학 경쟁·외교 ——
  {
    tag: "pacific",
    query:
      '(pacific OR "indo-pacific" OR AUKUS OR QUAD OR FONOP OR "philippine sea" OR guam OR "naval exercise" OR "great power" OR "strategic competition")',
  },
  {
    tag: "atlantic",
    query:
      '(atlantic OR NATO OR "north atlantic" OR "giuk gap" OR "carrier strike" OR "undersea cable" OR "naval exercise")',
  },
  {
    tag: "arctic",
    query:
      '(arctic OR "northern sea route" OR "northwest passage" OR "high north" OR icebreaker OR "arctic council" OR "polar silk")',
  },

  // —— 도메인: 공중·ADIZ ——
  {
    tag: "air-adiz",
    query:
      '(theme:AERIAL OR airspace OR ADIZ OR "air defense" OR "no-fly zone" OR "fighter jet" OR scramble OR intercept OR airstrike OR "drone strike" OR UAV OR "cruise missile" OR hypersonic OR "airspace violation" OR KADIZ OR JADIZ OR CADIZ OR PLAAF)',
  },

  // —— 도메인: 핵·미사일·우주 ——
  {
    tag: "strategic",
    query:
      '(theme:NUCLEAR OR "ballistic missile" OR ICBM OR IRBM OR SLBM OR "missile test" OR "missile launch" OR ASAT OR "anti-satellite" OR "space force" OR "military satellite" OR "nuclear facility" OR enrichment OR "hypersonic glide")',
  },

  // —— 도메인: 사이버·정보·경제안보·사보타주 ——
  {
    tag: "hybrid",
    query:
      '(theme:CYBER OR theme:RANSOMWARE OR cyberattack OR disinformation OR "influence operation" OR "hybrid warfare" OR "hybrid threat" OR "gray zone" OR "grey zone" OR sabotage OR "suspected sabotage" OR "undersea cable" OR "subsea cable" OR "submarine cable" OR "Nord Stream" OR Balticconnector OR "GPS jamming" OR "GNSS jamming" OR "electronic warfare" OR espionage OR SIGINT OR sanctions OR embargo OR "export control" OR "critical minerals" OR semiconductor OR "entity list" OR "critical infrastructure" OR BRI OR "belt and road")',
  },

  // —— 도메인: 동맹·군사외교 + 강대국 경쟁 ——
  {
    tag: "alliance",
    query:
      '(theme:ALLIANCE OR NATO OR AUKUS OR QUAD OR SCO OR "joint exercise" OR "arms sale" OR "security assistance" OR "defense ministers" OR "status of forces" OR "naval visit" OR "great power" OR "strategic competition" OR deterrence OR containment OR "force posture")',
  },

  // —— 축 관계망: 이란·중·러·북 + 스포크·사보타주 ——
  {
    tag: "axis-network",
    query:
      '((("north korea" OR dprk OR pyongyang) AND (russia OR china OR iran OR belarus OR syria OR yemen OR cuba OR venezuela OR "arms shipment")) OR ((iran OR tehran) AND (china OR russia OR "north korea" OR syria OR hezbollah OR houthi OR iraq OR "shadow fleet")) OR ((china OR beijing) AND (iran OR russia OR kazakhstan OR uzbekistan OR turkmenistan OR "central asia" OR pakistan OR "belt and road" OR CPEC)) OR ((russia OR moscow) AND (belarus OR iran OR "north korea" OR kazakhstan OR uzbekistan OR syria OR "shadow fleet" OR wagner OR "arms deal")) OR ((sabotage OR "hybrid warfare" OR "grey zone" OR "gray zone" OR "sanctions evasion" OR "arms transfer") AND (iran OR russia OR china OR "north korea" OR belarus)))',
  },
];

/** 쿼리당 Geo API maxpoints 상한 */
const PER_QUERY_HARD_CAP = 24;
/** 전체 수집 포인트 하드캡 (D1·클라 부하) */
const TOTAL_HARD_CAP = 280;
/** GDELT API 연타 방지 — 쿼리 사이 간격(ms) */
const QUERY_STAGGER_MS = 150;
/** 전장 핫스팟에 예산 가중 (나머지 도메인과 합쳐도 TOTAL 초과 안 함) */
const HOTSPOT_TAGS = new Set([
  "ukraine",
  "middle-east",
  "taiwan",
  "korea",
  "pacific",
  "atlantic",
  "arctic",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function budgetPerQuery(tag: string, maxPoints: number, queryCount: number): number {
  const base = Math.floor(maxPoints / Math.max(1, queryCount));
  const boosted = HOTSPOT_TAGS.has(tag) ? base + 4 : base;
  return Math.max(12, Math.min(PER_QUERY_HARD_CAP, boosted));
}

type GeoJsonFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    name?: string;
    count?: number;
    url?: string;
    shareimage?: string;
  };
};

type GeoJsonFc = {
  type?: string;
  features?: GeoJsonFeature[];
};

function stableId(tag: string, lat: number, lng: number, name: string | null, url: string | null) {
  const key = `${tag}|${lat.toFixed(3)}|${lng.toFixed(3)}|${name || ""}|${url || ""}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `gdelt-${tag}-${(hash >>> 0).toString(16)}`;
}

export function parseGdeltGeoJson(payload: GeoJsonFc, queryTag: string): GdeltPointRow[] {
  const features = Array.isArray(payload.features) ? payload.features : [];
  const out: GdeltPointRow[] = [];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const name = feature.properties?.name?.trim() || null;
    const url = feature.properties?.url?.trim() || null;
    const countRaw = feature.properties?.count;
    const mention =
      typeof countRaw === "number" && Number.isFinite(countRaw) ? countRaw : null;

    out.push({
      id: stableId(queryTag, lat, lng, name, url),
      lat,
      lng,
      name,
      url,
      mention_count: mention,
      share_image: feature.properties?.shareimage?.trim() || null,
      query_tag: queryTag,
    });
  }

  return out;
}

export async function fetchGdeltPoints(options: {
  maxPoints: number;
  timespan?: string;
}): Promise<{ points: GdeltPointRow[]; errors: string[] }> {
  const timespan = options.timespan ?? "60min";
  const totalCap = Math.min(TOTAL_HARD_CAP, Math.max(80, options.maxPoints));
  const points: GdeltPointRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < GDELT_QUERIES.length; i += 1) {
    if (points.length >= totalCap) break;

    const { tag, query } = GDELT_QUERIES[i]!;
    const remaining = totalCap - points.length;
    const perQuery = Math.min(
      remaining,
      budgetPerQuery(tag, totalCap, GDELT_QUERIES.length),
    );
    if (perQuery <= 0) break;

    if (i > 0 && QUERY_STAGGER_MS > 0) {
      await sleep(QUERY_STAGGER_MS);
    }

    try {
      const url = new URL(GEO_API);
      url.searchParams.set("query", query);
      url.searchParams.set("mode", "PointData");
      url.searchParams.set("format", "GeoJSON");
      url.searchParams.set("timespan", timespan);
      url.searchParams.set("maxpoints", String(perQuery));

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json,application/geo+json,*/*" },
      });
      const text = await response.text();
      if (!response.ok) {
        errors.push(`${tag}: HTTP ${response.status}`);
        continue;
      }
      if (!text.trim().startsWith("{")) {
        errors.push(`${tag}: non-JSON body`);
        continue;
      }
      const json = JSON.parse(text) as GeoJsonFc;
      for (const point of parseGdeltGeoJson(json, tag)) {
        if (points.length >= totalCap) break;
        if (seen.has(point.id)) continue;
        seen.add(point.id);
        points.push(point);
      }
    } catch (error) {
      errors.push(`${tag}: ${error instanceof Error ? error.message : "fetch failed"}`);
    }
  }

  return { points, errors };
}
