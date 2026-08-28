/**
 * Shared IMF PortWatch Daily Chokepoint Transit → choke-stress.json builder.
 * Used by parse-chokepoint-transit.js (CSV/GeoJSON) and fetch-chokepoint-transit.js (ArcGIS API).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "choke-stress.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "choke-stress.json");
const OUT_DAILY_SCRIPTS = path.join(ROOT, "scripts", "data", "chokepoint-transit-daily.json");
const OUT_DAILY_PUBLIC = path.join(ROOT, "public", "data", "crink", "chokepoint-transit-daily.json");
const DAILY_HISTORY_DAYS = 120;

const PORTNAME_TO_CHOKE_ID = {
  "suez canal": "choke-suez",
  "panama canal": "choke-panama",
  "bosporus strait": "choke-bosporus",
  "bab el-mandeb strait": "choke-bab-el-mandeb",
  "bab-el-mandeb strait": "choke-bab-el-mandeb",
  "bab al-mandab strait": "choke-bab-el-mandeb",
  "malacca strait": "choke-malacca",
  "strait of hormuz": "choke-hormuz",
  "hormuz strait": "choke-hormuz",
  "cape of good hope": "choke-good-hope",
  "gibraltar strait": "choke-gibraltar",
  "strait of gibraltar": "choke-gibraltar",
  "taiwan strait": "choke-taiwan",
};

const CHOKE_LITTORAL = {
  "choke-suez": ["EGY"],
  "choke-malacca": ["MYS", "IDN", "SGP"],
  "choke-hormuz": ["IRN", "OMN", "ARE"],
  "choke-taiwan": ["TWN", "CHN"],
  "choke-bab-el-mandeb": ["YEM", "DJI", "ERI"],
  "choke-panama": ["PAN"],
  "choke-gibraltar": ["ESP", "MAR"],
  "choke-bosporus": ["TUR"],
  "choke-good-hope": ["ZAF"],
};

function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function trendPct(yearMap) {
  const years = [...yearMap.keys()].sort((a, b) => a - b);
  if (years.length < 3) return null;
  const recentYears = years.slice(-2);
  const earlierYears = years.slice(-4, -2).length ? years.slice(-4, -2) : years.slice(0, Math.max(1, years.length - 2));
  const avg = (ys) => ys.reduce((s, y) => s + yearMap.get(y).sum / yearMap.get(y).n, 0) / ys.length;
  const recentAvg = avg(recentYears);
  const earlierAvg = avg(earlierYears);
  if (!(earlierAvg > 0)) return null;
  return { pct: ((recentAvg - earlierAvg) / earlierAvg) * 100, recentYears, earlierYears, recentAvg, earlierAvg };
}

/** 7d vs 30d daily transit window — mirrors src/lib/portWatch.ts computeTransitStress */
function shortTermTransitStress(dailyRows) {
  const sorted = [...dailyRows]
    .filter((r) => r.date && Number.isFinite(r.nTotal))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!sorted.length) {
    return {
      latestDate: null,
      latestDailyTransits: null,
      recentAvgDailyTransits: null,
      baselineAvgDailyTransits: null,
      changePct7vs30: null,
    };
  }
  const recent = sorted.slice(0, 7);
  const baseline = sorted.slice(0, 30);
  const avg = (xs) => (xs.length ? xs.reduce((s, r) => s + r.nTotal, 0) / xs.length : null);
  const recentAvg = avg(recent);
  const baselineAvg = avg(baseline);
  const changePct7vs30 =
    recentAvg != null && baselineAvg != null && baselineAvg > 0
      ? ((recentAvg - baselineAvg) / baselineAvg) * 100
      : null;
  return {
    latestDate: sorted[0].date,
    latestDailyTransits: sorted[0].nTotal,
    recentAvgDailyTransits: recentAvg != null ? Math.round(recentAvg * 10) / 10 : null,
    baselineAvgDailyTransits: baselineAvg != null ? Math.round(baselineAvg * 10) / 10 : null,
    changePct7vs30: changePct7vs30 != null ? Math.round(changePct7vs30 * 10) / 10 : null,
  };
}

/**
 * @param {Array<{ year: number, portname: string, n_total: number, date?: string, capacity?: number, portid?: string }>} records
 */
function buildDailyTransitCache(records) {
  /** @type {Map<string, { date: string, nTotal: number, capacity: number, portid: string|null }[]>} */
  const byChoke = new Map();
  for (const rec of records) {
    const portname = String(rec.portname || "").trim();
    const chokeId = PORTNAME_TO_CHOKE_ID[portname.toLowerCase()];
    if (!chokeId || !rec.date) continue;
    const nTotal = parseNumber(rec.n_total);
    if (nTotal == null || nTotal < 0) continue;
    if (!byChoke.has(chokeId)) byChoke.set(chokeId, []);
    byChoke.get(chokeId).push({
      date: String(rec.date).slice(0, 10),
      nTotal,
      capacity: parseNumber(rec.capacity) ?? 0,
      portid: rec.portid ? String(rec.portid) : null,
    });
  }

  const byChokeId = {};
  let latestDate = null;
  for (const chokeId of Object.keys(CHOKE_LITTORAL)) {
    const rows = byChoke.get(chokeId) || [];
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    const trimmed = rows.slice(0, DAILY_HISTORY_DAYS);
    byChokeId[chokeId] = trimmed.map(({ date, nTotal, capacity, portid }) => ({
      date,
      nTotal,
      capacity,
      ...(portid ? { portid } : {}),
    }));
    if (trimmed[0]?.date && (!latestDate || trimmed[0].date > latestDate)) {
      latestDate = trimmed[0].date;
    }
  }
  return { byChokeId, latestDate, historyDays: DAILY_HISTORY_DAYS };
}

/**
 * @param {Array<{ year: number, portname: string, n_total: number }>} records
 */
function buildChokeStressPayload(records, meta = {}) {
  const dailyCache = buildDailyTransitCache(records);
  const byChoke = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;
  const unmatchedPortnames = new Set();

  for (const rec of records) {
    rowsScanned += 1;
    const portname = String(rec.portname || "").trim();
    const chokeId = PORTNAME_TO_CHOKE_ID[portname.toLowerCase()];
    if (!chokeId) {
      if (portname) unmatchedPortnames.add(portname);
      continue;
    }
    const year = Number(rec.year);
    const total = parseNumber(rec.n_total);
    if (!Number.isFinite(year) || total == null || total < 0) continue;

    rowsKept += 1;
    if (!byChoke.has(chokeId)) byChoke.set(chokeId, new Map());
    const yearMap = byChoke.get(chokeId);
    const cur = yearMap.get(year) || { sum: 0, n: 0 };
    cur.sum += total;
    cur.n += 1;
    yearMap.set(year, cur);
  }

  const chokepoints = {};
  const stressValues = [];
  for (const chokeId of Object.keys(CHOKE_LITTORAL)) {
    const yearMap = byChoke.get(chokeId);
    const trend = yearMap ? trendPct(yearMap) : null;
    const shortTerm = shortTermTransitStress(dailyCache.byChokeId[chokeId] || []);
    const stressRaw = trend ? Math.max(0, -trend.pct) : null;
    if (stressRaw != null) stressValues.push(stressRaw);
    chokepoints[chokeId] = {
      littoral: CHOKE_LITTORAL[chokeId],
      transitTrendPct: trend ? Math.round(trend.pct * 10) / 10 : null,
      recentAvgDailyTransits: trend ? Math.round(trend.recentAvg * 10) / 10 : null,
      earlierAvgDailyTransits: trend ? Math.round(trend.earlierAvg * 10) / 10 : null,
      recentYears: trend ? trend.recentYears : null,
      earlierYears: trend ? trend.earlierYears : null,
      yearsOfData: yearMap ? yearMap.size : 0,
      latestDate: shortTerm.latestDate,
      latestDailyTransits: shortTerm.latestDailyTransits,
      recent7dAvgDailyTransits: shortTerm.recentAvgDailyTransits,
      baseline30dAvgDailyTransits: shortTerm.baselineAvgDailyTransits,
      changePct7vs30: shortTerm.changePct7vs30,
      stressRaw,
    };
  }
  const maxStress = stressValues.length ? Math.max(...stressValues, 1e-9) : 1;
  for (const row of Object.values(chokepoints)) {
    row.stressNorm = row.stressRaw != null ? Math.min(1, row.stressRaw / maxStress) : null;
  }

  const matchedCount = Object.values(chokepoints).filter((r) => r.stressNorm != null).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      "IMF PortWatch Daily Chokepoint Transit Calls and Trade Volume Estimates (AIS-derived daily vessel transit counts measured at each chokepoint itself)",
    method:
      "Per chokepoint: pct change in (avg daily n_total transits, most recent 2 years) vs (avg daily n_total, the 2 years before that). Stress = max(0, -pctChange) — only a drop in transit volume counts as stress (rerouting/disruption); rising traffic scores 0. Max-normalized across the 9 chokepoints to 0-1. Supersedes the littoral-country UNCTAD PortCalls proxy (build-choke-stress.js) for all 9 chokepoints, not just the 5 that proxy couldn't reach.",
    rowsScanned,
    rowsKept,
    matchedCount,
    totalChokepoints: Object.keys(CHOKE_LITTORAL).length,
    unmatchedPortnames: [...unmatchedPortnames].sort(),
    chokepoints,
    latestDate: dailyCache.latestDate,
    ...meta,
  };
  return { payload, dailyCache };
}

function writeDailyTransitOutputs(dailyCache, meta = {}) {
  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      "IMF PortWatch Daily Chokepoint Transit Calls (local bulk cache for /api/portwatch — last 120 days per chokepoint)",
    historyDays: dailyCache.historyDays,
    latestDate: dailyCache.latestDate,
    byChokeId: dailyCache.byChokeId,
    ...meta,
  };
  writeJson(OUT_DAILY_SCRIPTS, payload);
  writeJson(OUT_DAILY_PUBLIC, payload);
  return payload;
}

function writeAllChokepointOutputs(records, meta = {}) {
  const { payload, dailyCache } = buildChokeStressPayload(records, meta);
  writeChokeStressOutputs(payload);
  writeDailyTransitOutputs(dailyCache, {
    sourceFile: meta.sourceFile,
    sourceUrl: meta.sourceUrl,
  });
  return { ...payload, dailyCacheMeta: { latestDate: dailyCache.latestDate, historyDays: dailyCache.historyDays } };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeChokeStressOutputs(payload) {
  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  return { OUT_SCRIPTS, OUT_PUBLIC, ROOT };
}

function logChokeStressResult(payload, root = ROOT) {
  console.log(
    "[chokepoint-transit] " +
      Object.entries(payload.chokepoints)
        .map(([id, r]) => `${id}=${r.stressNorm != null ? r.stressNorm.toFixed(2) : "null"}`)
        .join(" "),
  );
  console.log(
    `  ${payload.matchedCount}/${payload.totalChokepoints} chokepoints matched, ${payload.rowsKept}/${payload.rowsScanned} rows kept`,
  );
  if (payload.dailyCacheMeta?.latestDate) {
    console.log(`  daily cache latest=${payload.dailyCacheMeta.latestDate} (${payload.dailyCacheMeta.historyDays}d window)`);
  }
  if (payload.unmatchedPortnames?.length) {
    console.log(`  unmatched portnames seen (not one of our 9): ${payload.unmatchedPortnames.join(", ")}`);
  }
  console.log(`  wrote ${path.relative(root, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(root, OUT_PUBLIC)}`);
  console.log(`  wrote ${path.relative(root, OUT_DAILY_PUBLIC)}`);
}

module.exports = {
  ROOT,
  OUT_SCRIPTS,
  OUT_PUBLIC,
  OUT_DAILY_SCRIPTS,
  OUT_DAILY_PUBLIC,
  PORTNAME_TO_CHOKE_ID,
  CHOKE_LITTORAL,
  buildChokeStressPayload,
  buildDailyTransitCache,
  writeChokeStressOutputs,
  writeDailyTransitOutputs,
  writeAllChokepointOutputs,
  logChokeStressResult,
  parseNumber,
};
