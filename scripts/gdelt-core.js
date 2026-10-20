// GDELT 2.0 export 파싱 · rolling fetch 공통 로직
const AdmZip = require("adm-zip");

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
};

const ROOT_CATEGORY = {
  "11": "Strategic developments",
  "12": "Strategic developments",
  "13": "Strategic developments",
  "14": "Protests",
  "15": "Riots",
  "16": "Strategic developments",
  "17": "Strategic developments",
  "18": "Violence against civilians",
  "19": "Battles",
  "20": "Violence against civilians",
};

const CONFLICT_NAV_REGIONS = [
  { id: "taiwan", bbox: { minLat: 20, maxLat: 28, minLng: 115, maxLng: 128 }, actorCountries: [] },
  { id: "taiwan-strait", bbox: { minLat: 22, maxLat: 26, minLng: 117, maxLng: 122 }, actorCountries: ["TWN", "CHN", "USA"] },
  { id: "spratly", bbox: { minLat: 4, maxLat: 16, minLng: 108, maxLng: 120 }, actorCountries: ["CHN", "VNM", "PHL", "MYS"] },
  { id: "senkaku", bbox: { minLat: 24, maxLat: 30, minLng: 122, maxLng: 128 }, actorCountries: ["CHN", "JPN"] },
  { id: "korea", bbox: { minLat: 33, maxLat: 43, minLng: 124, maxLng: 132 }, actorCountries: [] },
  { id: "dmz", bbox: { minLat: 37.5, maxLat: 38.5, minLng: 126, maxLng: 128 }, actorCountries: ["KOR", "PRK"] },
  { id: "west-sea", bbox: { minLat: 37, maxLat: 38.5, minLng: 124, maxLng: 126.5 }, actorCountries: ["KOR", "PRK"] },
  { id: "dokdo", bbox: { minLat: 36, maxLat: 39, minLng: 130, maxLng: 133 }, actorCountries: ["KOR", "JPN"] },
  { id: "baltic", bbox: { minLat: 52, maxLat: 57, minLng: 18, maxLng: 30 }, actorCountries: ["RUS", "POL", "LTU", "LVA", "EST"] },
  { id: "iran", bbox: { minLat: 24, maxLat: 40, minLng: 44, maxLng: 64 }, actorCountries: [] },
  { id: "persian-gulf", bbox: { minLat: 24, maxLat: 30, minLng: 48, maxLng: 56 }, actorCountries: ["IRN", "SAU", "USA", "IRQ"] },
  { id: "levant", bbox: { minLat: 32, maxLat: 37, minLng: 34, maxLng: 42 }, actorCountries: ["ISR", "IRN", "SYR", "LBN"] },
  { id: "hormuz", bbox: { minLat: 25, maxLat: 28, minLng: 54, maxLng: 58 }, actorCountries: ["IRN", "USA", "OMN"] },
];

function inBBox(lat, lon, bbox) {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLng && lon <= bbox.maxLng;
}

const DIPLOMATIC_PAIRS = new Set([
  "USA|CHN", "CHN|USA", "CHN|TWN", "TWN|CHN", "CHN|JPN", "JPN|CHN", "CHN|KOR", "KOR|CHN",
  "CHN|PRK", "PRK|CHN", "PRK|KOR", "KOR|PRK", "IND|PAK", "PAK|IND",
  "IND|CHN", "CHN|IND", "CHN|VNM", "VNM|CHN", "CHN|PHL", "PHL|CHN", "CHN|MYS", "MYS|CHN",
  "RUS|DEU", "DEU|RUS", "RUS|POL", "POL|RUS", "ISR|IRN", "IRN|ISR", "SAU|IRN", "IRN|SAU",
  "USA|IRN", "IRN|USA", "USA|RUS", "RUS|USA",
]);

const ALLIANCE_BLOCS = [
  new Set(["USA", "GBR", "FRA", "DEU", "POL", "TUR", "NOR", "ITA", "ESP", "NLD", "BEL", "CAN", "DNK", "CZE", "ROU"]),
  new Set(["USA", "JPN", "KOR", "AUS"]),
  new Set(["DEU", "FRA", "ITA", "ESP", "POL", "NLD", "BEL", "AUT", "SWE", "FIN"]),
  new Set(["USA", "AUS", "GBR", "IND", "JPN"]),
  new Set(["USA", "ISR"]),
  new Set(["SAU", "ARE", "QAT", "BHR", "KWT", "OMN"]),
];

const DIPLOMATIC_HOTSPOTS = [
  { minLat: 20, maxLat: 42, minLng: 115, maxLng: 130 },
  { minLat: 44, maxLat: 53, minLng: 22, maxLng: 41 },
  { minLat: 24, maxLat: 40, minLng: 44, maxLng: 64 },
  { minLat: 33, maxLat: 43, minLng: 124, maxLng: 132 },
  { minLat: 4, maxLat: 22, minLng: 98, maxLng: 122 },
  { minLat: 24, maxLat: 37, minLng: 68, maxLng: 78 },
  { minLat: 26, maxLat: 37, minLng: 73, maxLng: 97 },
];

function clean(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function pairKey(a, b) {
  if (!a || !b || a === b) return null;
  return `${a}|${b}`;
}

function inHotspot(lat, lng) {
  return DIPLOMATIC_HOTSPOTS.some(
    (box) => lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng,
  );
}

function isDiplomaticPair(a, b) {
  const key = pairKey(a, b);
  return key ? DIPLOMATIC_PAIRS.has(key) : false;
}

function isAlliancePair(a, b) {
  if (!a || !b || a === b) return false;
  return ALLIANCE_BLOCS.some((bloc) => bloc.has(a) && bloc.has(b));
}

function isGreatPower(code) {
  return ["USA", "CHN", "RUS", "GBR", "FRA", "DEU", "JPN", "IND"].includes(code || "");
}

function getGreatPowerScope(event) {
  const a1 = event.actor1_country;
  const a2 = event.actor2_country;
  const gp1 = isGreatPower(a1);
  const gp2 = isGreatPower(a2);
  if (gp1 && gp2 && a1 !== a2 && !isAlliancePair(a1, a2)) return "rivalry";
  if (!gp1 && !gp2) return null;

  const tier = event.event_tier || classifyEventTier(event);
  const isConflict =
    tier === "war" ||
    tier === "diplomatic" ||
    tier === "alliance" ||
    event.category === "Battles" ||
    event.category === "Violence against civilians" ||
    event.category === "Strategic developments" ||
    event.category === "Riots";
  if (isConflict || inHotspot(event.lat, event.lon)) return "intervention";
  return null;
}

function inferSeverity(goldsteinScale) {
  const conflictWeight = Math.max(0, -Math.min(0, goldsteinScale));
  return Math.max(1, Math.min(5, Math.ceil(conflictWeight / 2)));
}

function isDestructiveWar(event) {
  const gs = event.goldstein_scale ?? 0;
  if (event.category === "Battles") return gs <= -4;
  if (event.category === "Violence against civilians") return gs <= -7;
  return false;
}

function classifyEventTier(event) {
  const { actor1_country: a1, actor2_country: a2, lat, lon, goldstein_scale: gs, category } = event;

  if (event.event_tier === "riot" || event.event_tier === "intraBloc") {
    return isAlliancePair(a1, a2) ? "alliance" : null;
  }
  if (event.event_tier && ["war", "diplomatic", "alliance", "protest"].includes(event.event_tier)) {
    if (event.event_tier === "war" && !isDestructiveWar(event)) return null;
    if (event.event_tier === "diplomatic" && isAlliancePair(a1, a2)) return "alliance";
    return event.event_tier;
  }

  if (category === "Battles" || category === "Violence against civilians") {
    return isDestructiveWar(event) ? "war" : null;
  }
  if (category === "Protests") return "protest";
  if (category === "Riots") return isAlliancePair(a1, a2) ? "alliance" : null;

  if (category === "Strategic developments") {
    if (isAlliancePair(a1, a2)) return "alliance";
    if (isDiplomaticPair(a1, a2)) return "diplomatic";
    if (inHotspot(lat, lon)) return "diplomatic";
    if ((gs ?? 0) < -1 && a1 && a2 && a1 !== a2) return "diplomatic";
  }

  return null;
}

function getTensionScore(event, tier) {
  const goldstein = event.goldstein_scale ?? 0;
  const conflictFactor = Math.max(0, -Math.min(goldstein, 0)) / 10;
  const severityFactor = (event.severity - 1) / 4;
  const tierBoost = { war: 18, diplomatic: 8, alliance: 10, protest: 4 };
  const raw = conflictFactor * 62 + severityFactor * 28 + (tierBoost[tier] || 0);
  return Math.max(1, Math.min(99, Math.round(raw)));
}

function matchesConflictNavRegion(event) {
  const codes = new Set([event.country, event.actor1_country, event.actor2_country].filter(Boolean));
  return CONFLICT_NAV_REGIONS.some((region) => {
    if (inBBox(event.lat, event.lon, region.bbox)) return true;
    if (!region.actorCountries.length || codes.size === 0) return false;
    return region.actorCountries.some((code) => codes.has(code));
  });
}

function isCoreGeopoliticalEvent(event, tier) {
  if (tier === "war" || tier === "diplomatic" || tier === "alliance") return true;
  if (getGreatPowerScope({ ...event, event_tier: tier })) return true;

  const crossBorder =
    Boolean(event.actor1_country && event.actor2_country) &&
    event.actor1_country !== event.actor2_country;
  const goldstein = event.goldstein_scale ?? 0;

  if (tier === "protest") return crossBorder && goldstein <= -2;
  return false;
}

function normalizeDate(yyyymmdd) {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function extractExportTimestamp(value) {
  const match = String(value).match(/(\d{14})\.export\.CSV\.zip/i);
  return match ? match[1] : null;
}

function formatGdeltTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function shiftTimestampBack15Min(timestamp) {
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

function buildRollingExportUrls(latestTimestamp, sliceCount) {
  const urls = [];
  let ts = latestTimestamp;

  for (let index = 0; index < sliceCount; index += 1) {
    urls.push(`${EXPORT_BASE}/${ts}.export.CSV.zip`);
    ts = shiftTimestampBack15Min(ts);
  }

  return urls;
}

async function fetchLatestExportTimestamp() {
  const res = await fetch(LASTUPDATE_URL);
  if (!res.ok) throw new Error(`lastupdate.txt 요청 실패: ${res.status}`);

  const text = await res.text();
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

async function downloadAndExtractZip(url) {
  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) return null;

  return entries[0].getData().toString("utf-8");
}

function parseEvents(tsvText) {
  const rows = tsvText.trim().split("\n");
  const events = [];
  const stats = {
    rawRows: 0,
    invalidCoords: 0,
    disallowedRootCode: 0,
    unclassifiedTier: 0,
    outsideConflictNav: 0,
    nonCoreGeopolitical: 0,
    kept: 0,
  };

  for (const row of rows) {
    stats.rawRows += 1;
    const cols = row.split("\t");
    const lat = Number.parseFloat(cols[COLUMN_INDEX.ActionGeo_Lat]);
    const lon = Number.parseFloat(cols[COLUMN_INDEX.ActionGeo_Long]);
    const goldsteinScale = Number.parseFloat(cols[COLUMN_INDEX.GoldsteinScale]);
    const rootCode = cols[COLUMN_INDEX.EventRootCode];

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      stats.invalidCoords += 1;
      continue;
    }
    if (!ROOT_CATEGORY[rootCode]) {
      stats.disallowedRootCode += 1;
      continue;
    }

    const gs = Number.isNaN(goldsteinScale) ? null : goldsteinScale;
    const draft = {
      global_event_id: cols[COLUMN_INDEX.GlobalEventID],
      event_date: normalizeDate(cols[COLUMN_INDEX.Day]),
      country: clean(cols[COLUMN_INDEX.ActionGeo_CountryCode]),
      lat,
      lon,
      category: ROOT_CATEGORY[rootCode],
      severity: inferSeverity(gs ?? -2),
      goldstein_scale: gs,
      source_url: clean(cols[COLUMN_INDEX.SOURCEURL]),
      title: null,
      created_at: new Date().toISOString(),
      actor1_country: clean(cols[COLUMN_INDEX.Actor1CountryCode]),
      actor2_country: clean(cols[COLUMN_INDEX.Actor2CountryCode]),
    };

    const eventTier = classifyEventTier(draft);
    if (!eventTier) {
      stats.unclassifiedTier += 1;
      continue;
    }
    if (!matchesConflictNavRegion(draft)) {
      stats.outsideConflictNav += 1;
      continue;
    }
    if (!isCoreGeopoliticalEvent(draft, eventTier)) {
      stats.nonCoreGeopolitical += 1;
      continue;
    }

    events.push({
      ...draft,
      event_tier: eventTier,
      tension_score: getTensionScore(draft, eventTier),
    });
    stats.kept += 1;
  }

  return { events, stats };
}

function mergeEventsById(eventLists) {
  const merged = new Map();

  for (const events of eventLists) {
    for (const event of events) {
      merged.set(String(event.global_event_id), event);
    }
  }

  return Array.from(merged.values());
}

async function fetchRollingGdeltEvents(sliceCount = DEFAULT_ROLLING_SLICES) {
  const { url: latestUrl, timestamp } = await fetchLatestExportTimestamp();
  const urls = buildRollingExportUrls(timestamp, sliceCount);
  const parsedSlices = [];
  let downloaded = 0;
  let skipped = 0;
  const filterStats = {
    rawRows: 0,
    invalidCoords: 0,
    disallowedRootCode: 0,
    unclassifiedTier: 0,
    outsideConflictNav: 0,
    nonCoreGeopolitical: 0,
    kept: 0,
  };
  const batchSize = 4;

  for (let offset = 0; offset < urls.length; offset += batchSize) {
    const batch = urls.slice(offset, offset + batchSize);
    const texts = await Promise.all(batch.map((url) => downloadAndExtractZip(url)));

    for (const tsvText of texts) {
      if (!tsvText) {
        skipped += 1;
        continue;
      }

      downloaded += 1;
      const parsed = parseEvents(tsvText);
      parsedSlices.push(parsed.events);
      for (const key of Object.keys(filterStats)) {
        filterStats[key] += parsed.stats[key];
      }
    }
  }

  const events = mergeEventsById(parsedSlices);

  return {
    events,
    latestUrl,
    latestTimestamp: timestamp,
    sliceCount,
    downloadedSlices: downloaded,
    skippedSlices: skipped,
    fetchedAt: new Date().toISOString(),
    filterStats,
  };
}

module.exports = {
  DEFAULT_ROLLING_SLICES,
  fetchRollingGdeltEvents,
  parseEvents,
  mergeEventsById,
};
