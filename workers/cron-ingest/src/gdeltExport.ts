import { strFromU8, unzipSync } from "fflate";
import type { GdeltPointRow } from "./env";

const LASTUPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

const COLUMN = {
  globalEventId: 0,
  actor1Country: 7,
  actor2Country: 17,
  eventRootCode: 28,
  goldsteinScale: 30,
  numMentions: 31,
  actionGeoLat: 56,
  actionGeoLng: 57,
  sourceUrl: 60,
} as const;

type TensionRegion = {
  id: "ukraine" | "middle-east" | "taiwan" | "korea" | "pacific" | "atlantic" | "arctic";
  label: string;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  center: { lat: number; lng: number };
  regionalActors: readonly string[];
  actorPairs: ReadonlyArray<readonly [string, string]>;
  /** 대양 전장 — 지터 폭·날짜선 wrap */
  ocean?: boolean;
};

const TENSION_REGIONS: TensionRegion[] = [
  {
    id: "ukraine",
    label: "우크라이나 지정학 긴장",
    bbox: { minLat: 43, maxLat: 53, minLng: 22, maxLng: 41 },
    center: { lat: 48.5, lng: 34.5 },
    regionalActors: ["UKR", "RUS"],
    actorPairs: [
      ["UKR", "RUS"],
      ["UKR", "USA"],
      ["RUS", "USA"],
      ["RUS", "POL"],
    ],
  },
  {
    id: "middle-east",
    label: "중동 지정학 긴장",
    bbox: { minLat: 24, maxLat: 38, minLng: 34, maxLng: 60 },
    center: { lat: 29.2, lng: 42.5 },
    regionalActors: ["ISR", "IRN", "PSE", "LBN", "SYR", "YEM", "SAU"],
    actorPairs: [
      ["ISR", "IRN"],
      ["ISR", "PSE"],
      ["ISR", "LBN"],
      ["ISR", "SYR"],
      ["USA", "IRN"],
      ["SAU", "IRN"],
      ["YEM", "SAU"],
    ],
  },
  {
    id: "taiwan",
    label: "중국-대만 지정학 긴장",
    bbox: { minLat: 21, maxLat: 27, minLng: 117, maxLng: 124 },
    center: { lat: 23.7, lng: 121.2 },
    regionalActors: ["CHN", "TWN"],
    actorPairs: [
      ["CHN", "TWN"],
      ["USA", "TWN"],
      ["CHN", "JPN"],
      ["CHN", "PHL"],
    ],
  },
  {
    id: "korea",
    label: "한반도 지정학 긴장",
    bbox: { minLat: 33.2, maxLat: 43, minLng: 124.3, maxLng: 133 },
    center: { lat: 38, lng: 127.3 },
    regionalActors: ["PRK", "KOR"],
    actorPairs: [
      ["PRK", "KOR"],
      ["PRK", "USA"],
      ["PRK", "JPN"],
      ["PRK", "CHN"],
    ],
  },
  {
    id: "pacific",
    label: "태평양 지정학 경쟁·외교",
    bbox: { minLat: -50, maxLat: 62, minLng: 120, maxLng: -70 },
    center: { lat: 18, lng: 160 },
    regionalActors: ["USA", "CHN", "JPN", "AUS", "PHL", "TWN", "KOR"],
    actorPairs: [
      ["USA", "CHN"],
      ["USA", "RUS"],
      ["CHN", "JPN"],
      ["CHN", "AUS"],
      ["USA", "AUS"],
      ["CHN", "PHL"],
      ["USA", "PHL"],
    ],
    ocean: true,
  },
  {
    id: "atlantic",
    label: "대서양 지정학 경쟁·외교",
    bbox: { minLat: -50, maxLat: 70, minLng: -80, maxLng: 20 },
    center: { lat: 35, lng: -40 },
    regionalActors: ["USA", "GBR", "FRA", "DEU", "RUS", "CAN"],
    actorPairs: [
      ["USA", "RUS"],
      ["GBR", "RUS"],
      ["USA", "CHN"],
      ["FRA", "RUS"],
      ["DEU", "RUS"],
      ["USA", "GBR"],
    ],
    ocean: true,
  },
  {
    id: "arctic",
    label: "북극해 지정학 경쟁·외교",
    bbox: { minLat: 66, maxLat: 90, minLng: -180, maxLng: 180 },
    center: { lat: 78, lng: 20 },
    regionalActors: ["RUS", "USA", "CAN", "NOR", "DNK", "CHN"],
    actorPairs: [
      ["USA", "RUS"],
      ["CAN", "RUS"],
      ["NOR", "RUS"],
      ["USA", "CHN"],
      ["RUS", "CHN"],
    ],
    ocean: true,
  },
];

const TENSION_ROOT_CODES = new Set(["10", "11", "12", "13", "15", "16", "17", "18", "19", "20"]);

const ROOT_LABELS: Record<string, string> = {
  "10": "요구·압박",
  "11": "비판·반발",
  "12": "거부·대립",
  "13": "위협",
  "15": "군사력 과시",
  "16": "관계 축소",
  "17": "강압",
  "18": "공격",
  "19": "무력 충돌",
  "20": "대규모 폭력",
};

function normalizeLng(lng: number): number {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function inBBox(
  lat: number,
  lng: number,
  bbox: TensionRegion["bbox"],
): boolean {
  if (lat < bbox.minLat || lat > bbox.maxLat) return false;
  const n = normalizeLng(lng);
  const min = normalizeLng(bbox.minLng);
  const max = normalizeLng(bbox.maxLng);
  if (min <= max) return n >= min && n <= max;
  return n >= min || n <= max;
}

function actorPairMatches(
  actor1: string | null,
  actor2: string | null,
  pairs: TensionRegion["actorPairs"],
): boolean {
  if (!actor1 || !actor2 || actor1 === actor2) return false;
  return pairs.some(
    ([a, b]) =>
      (actor1 === a && actor2 === b) ||
      (actor1 === b && actor2 === a),
  );
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function centerJitter(
  region: TensionRegion,
  eventId: string,
): { lat: number; lng: number } {
  const hash = hashText(`${region.id}|${eventId}`);
  const latSpan = region.ocean ? 8 : 2.2;
  const lngSpan = region.ocean ? 14 : 2.8;
  const latOffset = ((hash & 0xffff) / 0xffff - 0.5) * latSpan;
  const lngOffset = (((hash >>> 16) & 0xffff) / 0xffff - 0.5) * lngSpan;
  return {
    lat: Math.max(-85, Math.min(85, region.center.lat + latOffset)),
    lng: normalizeLng(region.center.lng + lngOffset),
  };
}

function regionForEvent(
  lat: number,
  lng: number,
  actor1: string | null,
  actor2: string | null,
): { region: TensionRegion; geoMatched: boolean } | null {
  for (const region of TENSION_REGIONS) {
    const hasRegionalActor =
      (actor1 != null && region.regionalActors.includes(actor1)) ||
      (actor2 != null && region.regionalActors.includes(actor2));
    if (hasRegionalActor && inBBox(lat, lng, region.bbox)) {
      return { region, geoMatched: true };
    }
  }
  for (const region of TENSION_REGIONS) {
    if (actorPairMatches(actor1, actor2, region.actorPairs)) {
      return { region, geoMatched: false };
    }
  }
  return null;
}

function latestExportUrl(lastUpdateText: string): string | null {
  const line = lastUpdateText
    .trim()
    .split("\n")
    .find((entry) => entry.includes(".export.CSV.zip"));
  return line?.trim().split(/\s+/)[2] || null;
}

/**
 * 최신 export URL의 타임스탬프를 15분씩 뒤로 물려 후보 URL을 만든다.
 * GDELT는 lastupdate.txt에 올라온 직후 파일이 잠시 404가 나므로,
 * 최신 것이 실패하면 직전 슬라이스로 폴백한다.
 */
function buildExportUrlCandidates(latestUrl: string, count: number): string[] {
  const match = latestUrl.match(/\/(\d{14})\.export\.CSV\.zip$/);
  if (!match) return [latestUrl];
  const ts = match[1];
  const year = Number(ts.slice(0, 4));
  const month = Number(ts.slice(4, 6));
  const day = Number(ts.slice(6, 8));
  const hour = Number(ts.slice(8, 10));
  const minute = Number(ts.slice(10, 12));
  let time = Date.UTC(year, month - 1, day, hour, minute, 0);

  const urls: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(time);
    const stamp =
      `${d.getUTCFullYear()}` +
      `${String(d.getUTCMonth() + 1).padStart(2, "0")}` +
      `${String(d.getUTCDate()).padStart(2, "0")}` +
      `${String(d.getUTCHours()).padStart(2, "0")}` +
      `${String(d.getUTCMinutes()).padStart(2, "0")}00`;
    urls.push(`http://data.gdeltproject.org/gdeltv2/${stamp}.export.CSV.zip`);
    time -= 15 * 60 * 1000;
  }
  return urls;
}

function unzipFirstText(buffer: ArrayBuffer): string {
  const entries = unzipSync(new Uint8Array(buffer));
  const first = Object.values(entries)[0];
  if (!first) throw new Error("GDELT export ZIP is empty");
  return strFromU8(first);
}

function clean(value: string | undefined): string | null {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function parseTensionRows(tsv: string, maxPoints: number): GdeltPointRow[] {
  const candidates: Array<GdeltPointRow & { score: number }> = [];
  const seen = new Set<string>();

  for (const row of tsv.split("\n")) {
    if (!row) continue;
    const cols = row.split("\t");
    const eventId = clean(cols[COLUMN.globalEventId]);
    const rootCode = clean(cols[COLUMN.eventRootCode]);
    if (!eventId || !rootCode || !TENSION_ROOT_CODES.has(rootCode)) continue;

    const goldstein = Number(cols[COLUMN.goldsteinScale]);
    if (!Number.isFinite(goldstein) || goldstein > -1) continue;

    const lat = Number(cols[COLUMN.actionGeoLat]);
    const lng = Number(cols[COLUMN.actionGeoLng]);
    const actor1 = clean(cols[COLUMN.actor1Country]);
    const actor2 = clean(cols[COLUMN.actor2Country]);
    const matched = regionForEvent(lat, lng, actor1, actor2);
    if (!matched) continue;

    const id = `gdelt-${matched.region.id}-tension-${eventId}`;
    const sourceUrl = clean(cols[COLUMN.sourceUrl]);
    const duplicateKey = `${matched.region.id}|${sourceUrl || eventId}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);

    const coords =
      matched.geoMatched && Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : centerJitter(matched.region, eventId);
    const mentionCount = Math.max(1, Number(cols[COLUMN.numMentions]) || 1);
    const actors = [actor1, actor2].filter(Boolean).join(" ↔ ");
    const category = ROOT_LABELS[rootCode] || "지정학 긴장";
    candidates.push({
      id,
      lat: coords.lat,
      lng: coords.lng,
      name: `${matched.region.label} · ${category}${actors ? ` · ${actors}` : ""}`,
      url: sourceUrl,
      mention_count: mentionCount,
      share_image: null,
      query_tag: `${matched.region.id}-tension`,
      score: mentionCount * 10 + Math.abs(goldstein),
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPoints)
    .map(({ score: _score, ...point }) => point);
}

export async function fetchGdeltTensionPoints(options: {
  maxPoints: number;
}): Promise<{ points: GdeltPointRow[]; errors: string[] }> {
  try {
    const updateResponse = await fetch(LASTUPDATE_URL, {
      headers: { Accept: "text/plain" },
    });
    if (!updateResponse.ok) {
      return {
        points: [],
        errors: [`lastupdate: HTTP ${updateResponse.status}`],
      };
    }
    const exportUrl = latestExportUrl(await updateResponse.text());
    if (!exportUrl) {
      return { points: [], errors: ["lastupdate: export URL missing"] };
    }

    const candidates = buildExportUrlCandidates(exportUrl, 4);
    const errors: string[] = [];
    for (const url of candidates) {
      try {
        const exportResponse = await fetch(url);
        if (!exportResponse.ok) {
          errors.push(`export: HTTP ${exportResponse.status}`);
          continue;
        }
        const tsv = unzipFirstText(await exportResponse.arrayBuffer());
        return {
          points: parseTensionRows(tsv, Math.max(120, options.maxPoints)),
          errors: [],
        };
      } catch (error) {
        errors.push(
          `export: ${error instanceof Error ? error.message : "fetch failed"}`,
        );
      }
    }
    return { points: [], errors };
  } catch (error) {
    return {
      points: [],
      errors: [
        `export: ${error instanceof Error ? error.message : "fetch failed"}`,
      ],
    };
  }
}
