import type { ConflictEvent, EventCategory, EventTier } from "@/data/geoTypes";
import { classifyEventTier, getGreatPowerScope, getTensionScore } from "@/data/eventTiers";
import { CONFLICT_ZONE_GROUP, type RegionBBox } from "@/data/navRegions";

const LASTUPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const EXPORT_BASE = "http://data.gdeltproject.org/gdeltv2";

const DEFAULT_ROLLING_SLICES =
  Number.parseInt(process.env.GDELT_ROLLING_SLICES || "32", 10) || 32;

const COLUMN_INDEX = {
  GlobalEventID: 0,
  Day: 1,
  Actor1CountryCode: 5,
  Actor2CountryCode: 17,
  EventRootCode: 28,
  GoldsteinScale: 30,
  ActionGeo_CountryCode: 51,
  ActionGeo_Lat: 56,
  ActionGeo_Long: 57,
  SOURCEURL: 60,
} as const;

const ROOT_CATEGORY: Record<string, EventCategory> = {
  "14": "Protests",
  "15": "Riots",
  "17": "Strategic developments",
  "18": "Violence against civilians",
  "19": "Battles",
  "20": "Violence against civilians",
};

const ALLOWED_ROOT_CODES = new Set(Object.keys(ROOT_CATEGORY));

type FilterStats = {
  rawRows: number;
  invalidCoords: number;
  disallowedRootCode: number;
  unclassifiedTier: number;
  outsideConflictNav: number;
  nonCoreGeopolitical: number;
  kept: number;
};

type ConflictNavRegion = {
  id: string;
  bbox: RegionBBox;
  actorCountries: string[];
};

// 타이완 관련 이슈는 위치 기반으로만 매칭한다.
// (중국/미국/TWN 액터코드만으로 전세계 이벤트가 섞이는 현상 방지)
const STRICT_GEO_REGION_IDS = new Set(["taiwan", "taiwan-strait"]);

const CONFLICT_NAV_REGIONS: ConflictNavRegion[] = CONFLICT_ZONE_GROUP.items.flatMap((item) => {
  const base: ConflictNavRegion = {
    id: item.id,
    bbox: item.bbox,
    actorCountries: item.actorCountries || [],
  };

  const subs: ConflictNavRegion[] = item.subItems.map((sub) => ({
    id: sub.id,
    bbox: sub.bbox,
    actorCountries: sub.actorCountries || [],
  }));

  return [base, ...subs];
});

function normalizeDate(yyyymmdd: string) {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function inferSeverity(goldsteinScale: number) {
  const conflictWeight = Math.max(0, -Math.min(0, goldsteinScale));
  return Math.max(1, Math.min(5, Math.ceil(conflictWeight / 2)));
}

function clean(value: string | undefined) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

function inBBox(lat: number, lng: number, bbox: RegionBBox) {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

function collectCountryCodes(event: ConflictEvent) {
  return new Set(
    [event.country, event.actor1Country, event.actor2Country].filter(Boolean) as string[],
  );
}

export function matchesConflictNavRegion(event: ConflictEvent): boolean {
  const countryCodes = collectCountryCodes(event);

  return CONFLICT_NAV_REGIONS.some((region) => {
    if (inBBox(event.lat, event.lng, region.bbox)) return true;
    if (STRICT_GEO_REGION_IDS.has(region.id)) return false;
    if (!region.actorCountries.length || countryCodes.size === 0) return false;

    return region.actorCountries.some((code) => countryCodes.has(code));
  });
}

export function isCoreGeopoliticalEvent(event: ConflictEvent, tier: EventTier): boolean {
  if (tier === "war" || tier === "diplomatic" || tier === "alliance") return true;

  const scope = getGreatPowerScope({ ...event, eventTier: tier });
  if (scope) return true;

  const goldstein = event.goldsteinScale ?? 0;

  // 시위: 분쟁 지역 내 부정적 Goldstein 집회 위주 (국경 교차 조건 완화)
  if (tier === "protest") return goldstein <= -1.5;
  return false;
}

function extractExportTimestamp(value: string) {
  const match = value.match(/(\d{14})\.export\.CSV\.zip/i);
  return match ? match[1] : null;
}

function formatGdeltTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function shiftTimestampBack15Min(timestamp: string) {
  const y = Number(timestamp.slice(0, 4));
  const mo = Number(timestamp.slice(4, 6)) - 1;
  const d = Number(timestamp.slice(6, 8));
  const h = Number(timestamp.slice(8, 10));
  const mi = Number(timestamp.slice(10, 12));
  const s = Number(timestamp.slice(12, 14));
  const date = new Date(Date.UTC(y, mo, d, h, mi, s));
  date.setUTCMinutes(date.getUTCMinutes() - 15);
  return formatGdeltTimestamp(date);
}

function buildRollingExportUrls(latestTimestamp: string, sliceCount: number) {
  const urls: string[] = [];
  let ts = latestTimestamp;

  for (let index = 0; index < sliceCount; index += 1) {
    urls.push(`${EXPORT_BASE}/${ts}.export.CSV.zip`);
    ts = shiftTimestampBack15Min(ts);
  }

  return urls;
}

async function fetchLatestExportTimestamp() {
  const lastRes = await fetch(LASTUPDATE_URL, { cache: "no-store" });
  if (!lastRes.ok) throw new Error(`lastupdate.txt 요청 실패: ${lastRes.status}`);

  const text = await lastRes.text();
  const eventLine = text
    .trim()
    .split("\n")
    .find((line) => line.includes(".export.CSV.zip"));

  if (!eventLine) throw new Error("이벤트 파일 URL을 찾을 수 없음");

  const url = eventLine.trim().split(/\s+/)[2];
  const timestamp = extractExportTimestamp(url);
  if (!timestamp) throw new Error("export 타임스탬프 파싱 실패");

  return { url, timestamp };
}

async function downloadZipTsv(url: string) {
  const zipRes = await fetch(url, { cache: "no-store" });
  if (!zipRes.ok) return null;

  const buffer = Buffer.from(await zipRes.arrayBuffer());
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) return null;

  return entries[0].getData().toString("utf-8");
}

function createEmptyFilterStats(): FilterStats {
  return {
    rawRows: 0,
    invalidCoords: 0,
    disallowedRootCode: 0,
    unclassifiedTier: 0,
    outsideConflictNav: 0,
    nonCoreGeopolitical: 0,
    kept: 0,
  };
}

function accumulateStats(target: FilterStats, source: FilterStats) {
  target.rawRows += source.rawRows;
  target.invalidCoords += source.invalidCoords;
  target.disallowedRootCode += source.disallowedRootCode;
  target.unclassifiedTier += source.unclassifiedTier;
  target.outsideConflictNav += source.outsideConflictNav;
  target.nonCoreGeopolitical += source.nonCoreGeopolitical;
  target.kept += source.kept;
}

function parseGdeltTsvWithStats(tsvText: string): { events: ConflictEvent[]; stats: FilterStats } {
  const rows = tsvText.trim().split("\n");
  const events: ConflictEvent[] = [];
  const stats = createEmptyFilterStats();

  for (const row of rows) {
    stats.rawRows += 1;
    const cols = row.split("\t");
    const lat = Number.parseFloat(cols[COLUMN_INDEX.ActionGeo_Lat]);
    const lng = Number.parseFloat(cols[COLUMN_INDEX.ActionGeo_Long]);
    const goldsteinScale = Number.parseFloat(cols[COLUMN_INDEX.GoldsteinScale]);
    const rootCode = cols[COLUMN_INDEX.EventRootCode];

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      stats.invalidCoords += 1;
      continue;
    }
    if (!ALLOWED_ROOT_CODES.has(rootCode)) {
      stats.disallowedRootCode += 1;
      continue;
    }

    const category = ROOT_CATEGORY[rootCode];
    const actor1Country = clean(cols[COLUMN_INDEX.Actor1CountryCode]);
    const actor2Country = clean(cols[COLUMN_INDEX.Actor2CountryCode]);
    const gs = Number.isNaN(goldsteinScale) ? null : goldsteinScale;

    const draft: ConflictEvent = {
      id: cols[COLUMN_INDEX.GlobalEventID],
      globalEventId: cols[COLUMN_INDEX.GlobalEventID],
      eventDate: normalizeDate(cols[COLUMN_INDEX.Day]),
      country: clean(cols[COLUMN_INDEX.ActionGeo_CountryCode]),
      lat,
      lng,
      category,
      severity: inferSeverity(gs ?? -2),
      goldsteinScale: gs,
      sourceUrl: clean(cols[COLUMN_INDEX.SOURCEURL]),
      title: null,
      createdAt: new Date().toISOString(),
      actor1Country,
      actor2Country,
    };

    const tier = classifyEventTier(draft);
    if (!tier) {
      stats.unclassifiedTier += 1;
      continue;
    }
    if (!matchesConflictNavRegion(draft)) {
      stats.outsideConflictNav += 1;
      continue;
    }
    if (!isCoreGeopoliticalEvent(draft, tier)) {
      stats.nonCoreGeopolitical += 1;
      continue;
    }

    events.push({
      ...draft,
      eventTier: tier,
      tensionScore: getTensionScore(draft, tier),
    });
    stats.kept += 1;
  }

  return { events, stats };
}

export function parseGdeltTsv(tsvText: string): ConflictEvent[] {
  return parseGdeltTsvWithStats(tsvText).events;
}

function mergeEventsById(eventLists: ConflictEvent[][]) {
  const merged = new Map<string, ConflictEvent>();

  for (const events of eventLists) {
    for (const event of events) {
      merged.set(event.globalEventId, event);
    }
  }

  return Array.from(merged.values());
}

export async function fetchLatestGdeltEvents(options?: {
  sliceCount?: number;
}): Promise<{
  events: ConflictEvent[];
  sourceUrl: string;
  fetchedAt: string;
  sliceCount: number;
  downloadedSlices: number;
  skippedSlices: number;
  latestTimestamp: string;
  filterStats: FilterStats;
}> {
  const sliceCount = options?.sliceCount ?? DEFAULT_ROLLING_SLICES;
  const { url: sourceUrl, timestamp } = await fetchLatestExportTimestamp();
  const urls = buildRollingExportUrls(timestamp, sliceCount);
  const parsedSlices: ConflictEvent[][] = [];
  let downloadedSlices = 0;
  let skippedSlices = 0;
  const filterStats = createEmptyFilterStats();
  const batchSize = 4;

  for (let offset = 0; offset < urls.length; offset += batchSize) {
    const batch = urls.slice(offset, offset + batchSize);
    const texts = await Promise.all(batch.map((url) => downloadZipTsv(url)));

    for (const tsvText of texts) {
      if (!tsvText) {
        skippedSlices += 1;
        continue;
      }

      downloadedSlices += 1;
      const parsed = parseGdeltTsvWithStats(tsvText);
      parsedSlices.push(parsed.events);
      accumulateStats(filterStats, parsed.stats);
    }
  }

  const events = mergeEventsById(parsedSlices);

  return {
    events,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    sliceCount,
    downloadedSlices,
    skippedSlices,
    latestTimestamp: timestamp,
    filterStats,
  };
}

export type { EventTier };
