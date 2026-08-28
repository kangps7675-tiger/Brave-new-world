/**
 * Build corridor-ranks.json from BRI + Comtrade bilateral + PortWatch + Eurostat rail
 * freight (EU entry-leg corridors only) + choke proxies + status/length.
 *
 * Trade score (when Comtrade/rail-freight present):
 *   0.40·tradeNorm + 0.25·portNorm + 0.15·briNorm + 0.10·(osm|length) + 0.10·status
 * Fallback (no Comtrade/port/OSM):
 *   0.40·length + 0.30·bri + 0.20·choke + 0.10·status
 *
 * portNorm 우선순위 (UNCTAD phase 2 matching):
 *   1) unctad-corridor-teu.csv 하드바인딩 (INSTC/TITR 등 corridor 단위 TEU)
 *   2) ContPortThroughput 국가 TEU → comtradePair/endpoints 기하평균 (양자 프록시)
 *   3) IMF PortWatch Daily_Ports (AIS 추정, 국가 max)
 *
 * Usage:
 *   python scripts/comtrade/fetch_bilateral.py       # optional, fills Comtrade cache
 *   node scripts/unctad/parse-cont-port-throughput.js # optional, UNCTAD bulk CSV
 *   node scripts/portwatch/fetch-ports.js            # optional, fills PortWatch cache
 *   node scripts/eurostat-rail/fetch-rail-freight.js # optional, fills rail freight cache
 *   node scripts/build-corridor-ranks.js
 *   npm run corridors:ranks
 */
const fs = require("fs");
const path = require("path");
const { matchUnctadCorridorTeu } = require("./unctad/match-corridor-teu");

const ROOT = path.join(__dirname, "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const BRI_PATH = path.join(ROOT, "src", "data", "bri-trade-connectivity.json");
const COMTRADE_PATHS = [
  path.join(ROOT, "scripts", "data", "comtrade-bilateral.json"),
  path.join(ROOT, "public", "data", "crink", "comtrade-bilateral.json"),
  path.join(ROOT, "src", "data", "comtrade-bilateral.json"),
];
const PORTWATCH_PATHS = [
  path.join(ROOT, "scripts", "data", "portwatch-throughput.json"),
  path.join(ROOT, "public", "data", "crink", "portwatch-throughput.json"),
  path.join(ROOT, "src", "data", "portwatch-throughput.json"),
];
const UNCTAD_PATHS = [
  path.join(ROOT, "scripts", "data", "unctad-port-throughput.json"),
  path.join(ROOT, "public", "data", "crink", "unctad-port-throughput.json"),
  path.join(ROOT, "src", "data", "unctad-port-throughput.json"),
];
const RAIL_FREIGHT_PATHS = [
  path.join(ROOT, "scripts", "data", "rail-freight-bilateral.json"),
  path.join(ROOT, "public", "data", "crink", "rail-freight-bilateral.json"),
  path.join(ROOT, "src", "data", "rail-freight-bilateral.json"),
];
const OUT_SRC = path.join(ROOT, "src", "data", "corridor-ranks.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "corridor-ranks.json");

const CHOKE_CAPACITY = {
  "choke-suez": 1.0,
  "choke-malacca": 0.95,
  "choke-hormuz": 0.9,
  "choke-taiwan": 0.75,
  "choke-bab-el-mandeb": 0.7,
  "choke-panama": 0.6,
  "choke-gibraltar": 0.55,
  "choke-bosporus": 0.5,
  "choke-good-hope": 0.4,
};

const STATUS_WEIGHT = {
  operational: 1,
  partial: 0.6,
  "under-construction": 0.35,
  proposed: 0.2,
  reported: 0.45,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function loadComtradePairs() {
  for (const p of COMTRADE_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.pairs && typeof data.pairs === "object") {
        console.log(`[corridor-ranks] Comtrade cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} pairs with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no Comtrade cache — tradeNorm null (run npm run corridors:comtrade)");
  return null;
}

function pairKey(a, b) {
  const [x, y] = [String(a).toUpperCase(), String(b).toUpperCase()].sort();
  return `${x}|${y}`;
}

function comtradeUsd(comtrade, pair) {
  if (!comtrade?.pairs || !pair || pair.length < 2) return null;
  const row = comtrade.pairs[pairKey(pair[0], pair[1])];
  if (!row || typeof row.usd !== "number" || !(row.usd > 0)) return null;
  return row.usd;
}

function loadPortwatch() {
  for (const p of PORTWATCH_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] PortWatch cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} countries with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no PortWatch cache — portThroughputNorm null (run npm run corridors:portwatch)");
  return null;
}

function loadUnctad() {
  for (const p of UNCTAD_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(
          `[corridor-ranks] UNCTAD cache: ${path.relative(ROOT, p)} (${data.countryCount ?? "?"} countries, hardBind=${data.hardBindCount ?? 0}${data.usingFixture ? ", fixture" : ""})`,
        );
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no UNCTAD cache — run npm run corridors:unctad");
  return null;
}

/**
 * port throughput for a corridor (phase-2 UNCTAD matching):
 *   1–2) matchUnctadCorridorTeu — hard-bind → geoMean(pair|endpoints) → single
 *   3) PortWatch country throughputScore max
 * Returns { value, source, unit, method?, countriesUsed? } | null
 */
function resolvePortThroughput(unctad, portwatch, corridorId, endpointCountries, comtradePair) {
  const matched = matchUnctadCorridorTeu(unctad, {
    corridorId,
    endpointCountries,
    comtradePair,
  });
  if (matched) return matched;
  const pw = portThroughputForCountries(portwatch, endpointCountries);
  if (pw != null) {
    return { value: pw, source: "portwatch", unit: "throughputScore" };
  }
  return null;
}

/** corridor.endpointCountries 중 항만 처리량이 가장 큰 나라 값을 그 corridor 의 노출도로 쓴다 (briImpactForCodes 와 같은 max-of-endpoints 방식). */
function portThroughputForCountries(portwatch, endpointCountries) {
  if (!portwatch?.countries || !endpointCountries || endpointCountries.length === 0) return null;
  let max = null;
  for (const iso of endpointCountries) {
    const row = portwatch.countries[String(iso).toUpperCase()];
    if (row && typeof row.throughputScore === "number" && row.throughputScore > 0) {
      if (max == null || row.throughputScore > max) max = row.throughputScore;
    }
  }
  return max;
}

function loadRailFreight() {
  for (const p of RAIL_FREIGHT_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.pairs && typeof data.pairs === "object") {
        console.log(`[corridor-ranks] Rail freight cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} pairs with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no rail freight cache — corridorTeuNorm null (run npm run corridors:railfreight)");
  return null;
}

/** railFreightPair: {geo, partner} — Eurostat rail_go_intgong 은 방향성이 있다 (EU 보고국 geo → 파트너국 partner). comtradePair 처럼 정렬하지 않는다. */
function railFreightTkm(railFreight, railFreightPair) {
  if (!railFreight?.pairs || !railFreightPair?.geo || !railFreightPair?.partner) return null;
  const key = `${String(railFreightPair.geo).toUpperCase()}|${String(railFreightPair.partner).toUpperCase()}`;
  const row = railFreight.pairs[key];
  if (!row || typeof row.avgRecentTkm !== "number" || !(row.avgRecentTkm > 0)) return null;
  return row.avgRecentTkm;
}

function percentileRank(sortedAsc, value) {
  if (sortedAsc.length === 0) return 0;
  let below = 0;
  for (const v of sortedAsc) {
    if (v < value) below += 1;
    else break;
  }
  return below / sortedAsc.length;
}

function briImpactForCodes(briByDest, codes) {
  if (!codes || codes.length === 0) return null;
  let max = null;
  for (const code of codes) {
    const v = briByDest.get(String(code).toLowerCase());
    if (typeof v === "number" && (max == null || v > max)) max = v;
  }
  return max;
}

function chokeScore(chokeIds) {
  if (!chokeIds || chokeIds.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const id of chokeIds) {
    const w = CHOKE_CAPACITY[id];
    if (typeof w === "number") {
      sum += w;
      n += 1;
    }
  }
  if (n === 0) return null;
  return sum / n;
}

function scoreTrade(components) {
  const length = components.lengthNorm ?? 0;
  const bri = components.briImpactNorm ?? 0;
  const choke = components.chokeNorm ?? 0;
  const status = components.statusWeight ?? 0.2;
  // corridorTeuNorm (Eurostat rail_go_intgong 톤km) 은 별도 가중치 슬롯을 새로
  // 만들지 않고, bilateralTradeNorm 과 같은 "trade" 항목 안에서 평균한다 —
  // 두 소스가 서로 다른 통화/단위(USD vs 톤km)라 그냥 하나를 고르기보다는
  // 있는 것들을 평균해 "무역량 근거"라는 하나의 신호로 합친다.
  const tradeParts = [components.bilateralTradeNorm, components.corridorTeuNorm].filter(
    (v) => typeof v === "number",
  );
  const trade = tradeParts.length ? tradeParts.reduce((a, b) => a + b, 0) / tradeParts.length : null;
  const port = components.portThroughputNorm;
  const osm = components.osmMainlineNorm;
  if (trade != null || port != null || osm != null) {
    return (
      0.4 * (trade ?? 0) +
      0.25 * (port ?? 0) +
      0.15 * bri +
      0.1 * (osm ?? length) +
      0.1 * status
    );
  }
  return 0.4 * length + 0.3 * bri + 0.2 * choke + 0.1 * status;
}

function scalerankFromPercentile(p, category) {
  let rank;
  if (p >= 0.75) rank = 1;
  else if (p >= 0.5) rank = 2;
  else if (p >= 0.25) rank = 3;
  else rank = 4;
  if (category === "military-logistics" || category === "sanctions-evasion") {
    return Math.max(rank, 3);
  }
  return rank;
}

function main() {
  const meta = readJson(META_PATH);
  const bri = readJson(BRI_PATH);
  const comtrade = loadComtradePairs();
  const unctad = loadUnctad();
  const portwatch = loadPortwatch();
  const railFreight = loadRailFreight();
  const briByDest = new Map();
  for (const row of bri.countryLinks || []) {
    if (row.destCode && typeof row.impactPct === "number") {
      briByDest.set(String(row.destCode).toLowerCase(), row.impactPct);
    }
  }

  const lengths = meta.corridors.map((c) => c.lengthKmApprox || 1);
  const maxLogLen = Math.log10(Math.max(...lengths) + 1);
  const briValues = [];
  const tradeValues = [];
  const portValues = [];
  const railFreightValues = [];
  for (const c of meta.corridors) {
    const v = briImpactForCodes(briByDest, c.briDestCodes);
    if (v != null) briValues.push(v);
    const usd = comtradeUsd(comtrade, c.comtradePair);
    if (usd != null) tradeValues.push(usd);
    const port = resolvePortThroughput(
      unctad,
      portwatch,
      c.id,
      c.endpointCountries,
      c.comtradePair,
    );
    if (port != null) portValues.push(port.value);
    const tkm = railFreightTkm(railFreight, c.railFreightPair);
    if (tkm != null) railFreightValues.push(tkm);
  }
  const maxBri = briValues.length ? Math.max(...briValues) : 1;
  const maxLogTrade = tradeValues.length
    ? Math.log10(Math.max(...tradeValues) + 1)
    : 0;
  const maxLogPort = portValues.length
    ? Math.log10(Math.max(...portValues) + 1)
    : 0;
  const maxLogRailFreight = railFreightValues.length
    ? Math.log10(Math.max(...railFreightValues) + 1)
    : 0;

  let comtradeHits = 0;
  let unctadHits = 0;
  let unctadHardBindHits = 0;
  let portwatchHits = 0;
  let railFreightHits = 0;
  const scored = meta.corridors.map((c) => {
    const lengthKm = c.lengthKmApprox || 1;
    const lengthNorm = maxLogLen > 0 ? Math.log10(lengthKm + 1) / maxLogLen : 0;
    const briRaw = briImpactForCodes(briByDest, c.briDestCodes);
    const briImpactNorm = briRaw != null && maxBri > 0 ? briRaw / maxBri : null;
    const chokeRaw = chokeScore(c.chokeIds);
    const chokeNorm = chokeRaw;
    const statusWeight = STATUS_WEIGHT[c.status] ?? 0.2;
    const tradeUsd = comtradeUsd(comtrade, c.comtradePair);
    const bilateralTradeNorm =
      tradeUsd != null && maxLogTrade > 0
        ? Math.log10(tradeUsd + 1) / maxLogTrade
        : null;
    if (tradeUsd != null) comtradeHits += 1;
    const portResolved = resolvePortThroughput(
      unctad,
      portwatch,
      c.id,
      c.endpointCountries,
      c.comtradePair,
    );
    const portRaw = portResolved?.value ?? null;
    const portSource = portResolved?.source ?? null;
    const portThroughputNorm =
      portRaw != null && maxLogPort > 0 ? Math.log10(portRaw + 1) / maxLogPort : null;
    if (portSource === "unctad-hard-bind") {
      unctadHits += 1;
      unctadHardBindHits += 1;
    } else if (
      portSource === "unctad-cont-port-geomean" ||
      portSource === "unctad-cont-port-single" ||
      portSource === "unctad-cont-port"
    ) {
      unctadHits += 1;
    } else if (portSource === "portwatch") {
      portwatchHits += 1;
    }
    const railFreightTkmRaw = railFreightTkm(railFreight, c.railFreightPair);
    const corridorTeuNorm =
      railFreightTkmRaw != null && maxLogRailFreight > 0
        ? Math.log10(railFreightTkmRaw + 1) / maxLogRailFreight
        : null;
    if (railFreightTkmRaw != null) railFreightHits += 1;

    const components = {
      bilateralTradeUsd: tradeUsd,
      bilateralTradeNorm,
      portThroughput: portRaw,
      portThroughputNorm,
      portThroughputSource: portSource,
      briImpactPct: briRaw,
      briImpactNorm,
      chokeCapacity: chokeRaw,
      chokeNorm,
      osmMainlineKm: null,
      osmMainlineNorm: null,
      lengthKm,
      lengthNorm,
      statusWeight,
      corridorTeu: railFreightTkmRaw,
      corridorTeuNorm,
    };

    const score = scoreTrade(components);
    const sources = ["status · lengthKmApprox"];
    if (tradeUsd != null) sources.push("UN Comtrade bilateral TOTAL (USD)");
    if (portSource === "unctad-hard-bind") {
      sources.push("UNCTAD corridor hard-bind TEU (unctad-corridor-teu.csv)");
    } else if (portSource === "unctad-cont-port-geomean") {
      sources.push(
        `UNCTADstat ContPortThroughput TEU (geoMean ${portResolved?.method || "endpoints"}: ${(portResolved?.countriesUsed || []).join("·") || "n/a"})`,
      );
    } else if (portSource === "unctad-cont-port-single") {
      sources.push(
        `UNCTADstat ContPortThroughput TEU (single endpoint ${(portResolved?.countriesUsed || [])[0] || "?"})`,
      );
    } else if (portSource === "unctad-cont-port") {
      sources.push("UNCTADstat ContPortThroughput TEU (country-level proxy)");
    } else if (portSource === "portwatch") {
      sources.push("IMF PortWatch Daily_Ports_Data (AIS-derived, country-level max)");
    }
    if (railFreightTkmRaw != null) sources.push("Eurostat rail_go_intgong (MIO_TKM, EU→partner direction)");
    if (briRaw != null) sources.push("World Bank BRI WPS8614 impactPct");
    if (chokeRaw != null) sources.push("IMF PortWatch choke capacity proxy (static)");
    if (tradeUsd == null) {
      sources.push("Comtrade pending/missing for this pair");
    }
    if (portRaw == null) {
      sources.push("UNCTAD/PortWatch pending/missing for endpoint countries");
    }
    if (c.railFreightPair && railFreightTkmRaw == null) {
      sources.push("Rail freight pending/missing for this geo→partner pair");
    }

    return {
      corridorId: c.id,
      category: c.category,
      status: c.status,
      mode: c.mode,
      endpointCountries: c.endpointCountries || [],
      comtradePair: c.comtradePair || [],
      railFreightPair: c.railFreightPair || null,
      score,
      scalerank: 4,
      components,
      sources,
    };
  });

  const tradeScores = scored
    .filter((r) => r.category === "trade")
    .map((r) => r.score)
    .sort((a, b) => a - b);

  for (const row of scored) {
    const p =
      row.category === "trade"
        ? percentileRank(tradeScores, row.score)
        : percentileRank(
            scored.map((r) => r.score).sort((a, b) => a - b),
            row.score,
          );
    row.scorePercentile = Math.round(p * 1000) / 1000;
    row.scalerank = scalerankFromPercentile(p, row.category);
  }

  scored.sort((a, b) => a.scalerank - b.scalerank || b.score - a.score);

  const portMethod =
    unctadHits > 0
      ? "portThroughputNorm(UNCTAD ContPortThroughput→country max|hard-bind, else PortWatch)"
      : portwatchHits > 0
        ? "portThroughputNorm(PortWatch)"
        : null;
  const methodParts = [
    comtradeHits > 0 || unctadHits > 0 || portwatchHits > 0
      ? `bilateralTradeNorm(Comtrade)·${portMethod || "portThroughputNorm"}·BRI·length/status`
      : "lengthNorm·BRI·chokeCapacityProxy·statusWeight",
    "→ percentile → scalerank",
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    version: 1,
    method: methodParts.join(" "),
    attribution: [
      ...(comtradeHits > 0
        ? [`UN Comtrade (${comtrade?.generatedAt ?? "cache"}) — ${comtradeHits} corridor hits`]
        : []),
      ...(unctadHits > 0
        ? [
            `UNCTADstat ContPortThroughput (${unctad?.generatedAt ?? "cache"}${unctad?.usingFixture ? ", fixture" : ""}) — ${unctadHits} corridor hits (hard-bind=${unctadHardBindHits}); country TEU ≠ corridor TEU`,
          ]
        : []),
      ...(portwatchHits > 0
        ? [`IMF PortWatch (${portwatch?.generatedAt ?? "cache"}) — ${portwatchHits} corridor hits, AIS-derived estimate`]
        : []),
      ...(railFreightHits > 0
        ? [`Eurostat rail_go_intgong (${railFreight?.generatedAt ?? "cache"}) — ${railFreightHits} corridor hits, EU→partner direction only`]
        : []),
      "World Bank BRI Trade Costs (WPS8614) where matched",
      "Static choke capacity proxies aligned with IMF PortWatch choke set",
    ],
    comtrade: comtrade
      ? {
          generatedAt: comtrade.generatedAt,
          mode: comtrade.mode,
          withData: comtrade.withData,
          corridorHits: comtradeHits,
        }
      : null,
    unctad: unctad
      ? {
          generatedAt: unctad.generatedAt,
          usingFixture: Boolean(unctad.usingFixture),
          countryCount: unctad.countryCount,
          hardBindCount: unctad.hardBindCount,
          corridorHits: unctadHits,
          hardBindHits: unctadHardBindHits,
          caveat:
            "Country-level ContPortThroughput TEU matched via max(endpointCountries); optional corridor hard-bind CSV for INSTC/TITR.",
        }
      : null,
    portwatch: portwatch
      ? {
          generatedAt: portwatch.generatedAt,
          windowDays: portwatch.windowDays,
          withData: portwatch.withData,
          corridorHits: portwatchHits,
          caveat: portwatch.caveat,
        }
      : null,
    railFreight: railFreight
      ? {
          generatedAt: railFreight.generatedAt,
          unit: railFreight.unit,
          withData: railFreight.withData,
          corridorHits: railFreightHits,
          caveat: railFreight.caveat,
        }
      : null,
    counts: {
      total: scored.length,
      rank1: scored.filter((r) => r.scalerank === 1).length,
      rank2: scored.filter((r) => r.scalerank === 2).length,
      rank3: scored.filter((r) => r.scalerank === 3).length,
      rank4plus: scored.filter((r) => r.scalerank >= 4).length,
      comtradeHits,
      unctadHits,
      unctadHardBindHits,
      portwatchHits,
      railFreightHits,
    },
    corridors: scored,
  };

  writeJson(OUT_SRC, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[corridor-ranks] ${scored.length} corridors → rank1=${payload.counts.rank1} rank2=${payload.counts.rank2} rank3=${payload.counts.rank3} rank4+=${payload.counts.rank4plus} comtradeHits=${comtradeHits} unctadHits=${unctadHits}(hard=${unctadHardBindHits}) portwatchHits=${portwatchHits} railFreightHits=${railFreightHits}`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SRC)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
