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
const OCEAN_TRADE_PATHS = [
  path.join(ROOT, "scripts", "data", "ocean-trade-bilateral.json"),
  path.join(ROOT, "public", "data", "crink", "ocean-trade-bilateral.json"),
  path.join(ROOT, "src", "data", "ocean-trade-bilateral.json"),
];
const LSBCI_PATHS = [
  path.join(ROOT, "scripts", "data", "lsbci-bilateral.json"),
  path.join(ROOT, "public", "data", "crink", "lsbci-bilateral.json"),
  path.join(ROOT, "src", "data", "lsbci-bilateral.json"),
];
const OCEAN_SERVICES_PATHS = [
  path.join(ROOT, "scripts", "data", "ocean-services-throughput.json"),
  path.join(ROOT, "public", "data", "crink", "ocean-services-throughput.json"),
  path.join(ROOT, "src", "data", "ocean-services-throughput.json"),
];
const LSCI_PATHS = [
  path.join(ROOT, "scripts", "data", "lsci-country.json"),
  path.join(ROOT, "public", "data", "crink", "lsci-country.json"),
  path.join(ROOT, "src", "data", "lsci-country.json"),
];
const PLSCI_PATHS = [
  path.join(ROOT, "scripts", "data", "plsci-country-max.json"),
  path.join(ROOT, "public", "data", "crink", "plsci-country-max.json"),
  path.join(ROOT, "src", "data", "plsci-country-max.json"),
];
const SDG_PORFVOL_PATHS = [
  path.join(ROOT, "scripts", "data", "sdg-porfvol.json"),
  path.join(ROOT, "public", "data", "crink", "sdg-porfvol.json"),
  path.join(ROOT, "src", "data", "sdg-porfvol.json"),
];
const BULK_TONNAGE_PATHS = [
  path.join(ROOT, "scripts", "data", "bulk-tonnage.json"),
  path.join(ROOT, "public", "data", "crink", "bulk-tonnage.json"),
  path.join(ROOT, "src", "data", "bulk-tonnage.json"),
];
const CHOKE_STRESS_PATHS = [
  path.join(ROOT, "scripts", "data", "choke-stress.json"),
  path.join(ROOT, "public", "data", "crink", "choke-stress.json"),
  path.join(ROOT, "src", "data", "choke-stress.json"),
];
const SHADOW_FLEET_PATHS = [
  path.join(ROOT, "scripts", "data", "shadow-fleet-index.json"),
  path.join(ROOT, "public", "data", "crink", "shadow-fleet-index.json"),
  path.join(ROOT, "src", "data", "shadow-fleet-index.json"),
];
const LSCI_ANOMALY_PATHS = [
  path.join(ROOT, "scripts", "data", "lsci-anomalies.json"),
  path.join(ROOT, "public", "data", "crink", "lsci-anomalies.json"),
  path.join(ROOT, "src", "data", "lsci-anomalies.json"),
];
const CONFIDENCE_LAYER_PATHS = [
  path.join(ROOT, "scripts", "data", "confidence-layer.json"),
  path.join(ROOT, "public", "data", "crink", "confidence-layer.json"),
  path.join(ROOT, "src", "data", "confidence-layer.json"),
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
function resolvePortThroughput(unctad, portwatch, sdgPorfvol, corridorId, endpointCountries, comtradePair) {
  const matched = matchUnctadCorridorTeu(unctad, {
    corridorId,
    endpointCountries,
    comtradePair,
  });
  if (matched) return matched;
  const porfvol = sdgPorfvolForCountries(sdgPorfvol, endpointCountries);
  if (porfvol != null) {
    return { value: porfvol, source: "sdg-porfvol", unit: "TEU" };
  }
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
function railFreightRow(railFreight, railFreightPair) {
  if (!railFreight?.pairs || !railFreightPair?.geo || !railFreightPair?.partner) return null;
  const key = `${String(railFreightPair.geo).toUpperCase()}|${String(railFreightPair.partner).toUpperCase()}`;
  const row = railFreight.pairs[key];
  if (!row || typeof row.avgRecentTkm !== "number" || row.avgRecentTkm < 0) return null;
  return row;
}

function railFreightTkm(railFreight, railFreightPair) {
  return railFreightRow(railFreight, railFreightPair)?.avgRecentTkm ?? null;
}

/**
 * Comtrade USD norm vs Eurostat ton-km norm.
 * trade high + physical low → "price_over_volume" (제재·환적·우회 가설)
 * physical high + trade low → "volume_over_price"
 */
function dualSignalKind(bilateralTradeNorm, corridorTeuNorm) {
  if (bilateralTradeNorm == null || corridorTeuNorm == null) return null;
  const delta = bilateralTradeNorm - corridorTeuNorm;
  if (Math.abs(delta) < 0.18) return "aligned";
  return delta > 0 ? "price_over_volume" : "volume_over_price";
}

/** LSCI/PLSCI connectivity vs Eurostat physical ton-km */
function connectivityDualKind(lsciNorm, corridorTeuNorm) {
  if (lsciNorm == null || corridorTeuNorm == null) return null;
  const delta = lsciNorm - corridorTeuNorm;
  if (Math.abs(delta) < 0.18) return "aligned";
  return delta > 0 ? "sea_over_rail" : "rail_over_sea";
}

function loadFirstJson(paths, label) {
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      console.log(`[corridor-ranks] ${label}: ${path.relative(ROOT, p)}`);
      return data;
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  return null;
}

function loadLsciAnomalies() {
  const data = loadFirstJson(LSCI_ANOMALY_PATHS, "LSCI anomalies");
  if (!data?.anomalies) {
    console.log("[corridor-ranks] no LSCI anomalies — modalStress.lsciDrops empty");
    return null;
  }
  return data;
}

/** Recent LSCI_M drops for ISO3 endpoints (convert common ISO2 meta codes). */
const ISO2_TO_ISO3 = {
  PL: "POL",
  LT: "LTU",
  LV: "LVA",
  EE: "EST",
  FI: "FIN",
  HU: "HUN",
  SK: "SVK",
  RO: "ROU",
  EL: "GRC",
  GR: "GRC",
  TR: "TUR",
  BY: "BLR",
  UA: "UKR",
  RU: "RUS",
  CN: "CHN",
  DE: "DEU",
  NL: "NLD",
  EG: "EGY",
};

function toIso3(code) {
  const u = String(code || "").toUpperCase();
  if (u.length === 3) return u;
  return ISO2_TO_ISO3[u] || u;
}

function recentLsciDropsForCountries(anomaliesPayload, endpointCountries, limit = 3) {
  if (!anomaliesPayload?.anomalies || !endpointCountries?.length) return [];
  const set = new Set(endpointCountries.map(toIso3));
  return anomaliesPayload.anomalies
    .filter((a) => set.has(toIso3(a.iso)) && typeof a.pctChange === "number")
    .filter((a) => String(a.month || "") >= "2022")
    .sort((a, b) => a.pctChange - b.pctChange)
    .slice(0, limit)
    .map((a) => ({
      iso: toIso3(a.iso),
      month: a.month,
      pctChange: a.pctChange,
    }));
}

function modalNarrative(family, stress, en = false) {
  if (!family || !stress) return null;
  const rail = stress.railShockPct;
  const sea = stress.seaChokeStress;
  const surge = stress.familyMaxRailShockPct;
  if (family === "china-europe") {
    if (rail != null && rail <= -0.4 && sea != null && sea >= 0.5) {
      return en
        ? "Sea choke stress + northern rail collapse — dual pressure on China–Europe."
        : "해상 초크 스트레스 + 북방 철도 붕괴 — China–Europe 이중 압력.";
    }
    if (rail != null && rail <= -0.4) {
      return en
        ? "Northern EU rail gateway ton-km collapsed vs 2021 — check UA gateways / Middle Corridor."
        : "북방 EU 철도 게이트 ton-km가 2021 대비 붕괴 — UA 게이트·미들코리도 확인.";
    }
  }
  if (family === "ukraine-eu" && rail != null && rail >= 0.5) {
    return en
      ? "UA–EU rail gateway surge vs 2021 — modal substitute for northern collapse / Black Sea disruption."
      : "UA–EU 철도 게이트 급증 — 북방 붕괴·흑해 차질의 모달 대체 후보.";
  }
  if (family === "middle-corridor") {
    return en
      ? "Caspian/TITR family — pair Bosporus choke stress with EL→TR Eurostat rail leg."
      : "카스피해/TITR 패밀리 — 보스포루스 초크와 EL→TR Eurostat 철도 레그를 함께 보세요.";
  }
  if (surge != null && surge >= 1 && rail != null && rail <= -0.3) {
    return en
      ? "Peer gateways surging while this leg collapses — reroute signal."
      : "이 레그는 붕괴·동료 게이트는 급증 — 우회 신호.";
  }
  return null;
}

/**
 * Attach modalFamily stress: Eurostat rail shock × choke stress × LSCI drops × peer links.
 */
function attachModalStress(scored, metaById, lsciAnomalies) {
  const byId = new Map(scored.map((r) => [r.corridorId, r]));
  for (const row of scored) {
    const meta = metaById.get(row.corridorId);
    if (!meta?.modalFamily) {
      row.modalFamily = null;
      row.relatedCorridorIds = [];
      row.modalStress = null;
      continue;
    }
    const relatedIds = Array.isArray(meta.relatedCorridorIds) ? meta.relatedCorridorIds : [];
    const peers = relatedIds.map((id) => byId.get(id)).filter(Boolean);
    const railShockPct =
      typeof row.components?.railFreightShockPct === "number"
        ? row.components.railFreightShockPct
        : null;
    const peerShocks = peers
      .map((p) => p.components?.railFreightShockPct)
      .filter((v) => typeof v === "number");
    const familyMaxRailShockPct = peerShocks.length ? Math.max(...peerShocks, railShockPct ?? -Infinity) : railShockPct;
    const familyMinRailShockPct = peerShocks.length ? Math.min(...peerShocks, railShockPct ?? Infinity) : railShockPct;
    const seaChokeStress = (() => {
      const own = row.components?.chokeStressNorm;
      if (typeof own === "number") return own;
      let max = null;
      for (const p of peers) {
        const v = p.components?.chokeStressNorm;
        if (typeof v === "number" && (max == null || v > max)) max = v;
      }
      return max;
    })();
    const lsciDrops = recentLsciDropsForCountries(lsciAnomalies, row.endpointCountries);
    const connectivityDual = connectivityDualKind(
      row.components?.lsciNorm ?? null,
      row.components?.corridorTeuNorm ?? null,
    );
    let hypothesis = null;
    if (
      typeof seaChokeStress === "number" &&
      seaChokeStress >= 0.45 &&
      typeof railShockPct === "number" &&
      railShockPct <= -0.35
    ) {
      hypothesis = "dual_pressure";
    } else if (
      typeof railShockPct === "number" &&
      railShockPct <= -0.35 &&
      typeof familyMaxRailShockPct === "number" &&
      familyMaxRailShockPct >= 0.5
    ) {
      hypothesis = "reroute_to_peer_gateway";
    } else if (typeof railShockPct === "number" && railShockPct >= 0.5) {
      hypothesis = "gateway_surge";
    } else if (lsciDrops.length && typeof railShockPct === "number" && Math.abs(railShockPct) >= 0.25) {
      hypothesis = "sea_connectivity_and_rail_shift";
    }

    const stress = {
      family: meta.modalFamily,
      relatedCorridorIds: relatedIds,
      railShockPct,
      familyMinRailShockPct: Number.isFinite(familyMinRailShockPct) ? familyMinRailShockPct : null,
      familyMaxRailShockPct: Number.isFinite(familyMaxRailShockPct) ? familyMaxRailShockPct : null,
      seaChokeStress,
      lsciDrops,
      connectivityDual,
      hypothesis,
    };
    stress.narrativeKo = modalNarrative(meta.modalFamily, stress, false);
    stress.narrativeEn = modalNarrative(meta.modalFamily, stress, true);

    row.modalFamily = meta.modalFamily;
    row.relatedCorridorIds = relatedIds;
    row.modalStress = stress;
    row.components.connectivityDual = connectivityDual;
  }
}

function loadOceanTrade() {
  for (const p of OCEAN_TRADE_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.pairs && typeof data.pairs === "object") {
        console.log(`[corridor-ranks] Ocean trade cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} pairs with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no ocean trade cache — oceanTradeNorm null (run npm run corridors:oceantrade)");
  return null;
}

/** comtradePair 재사용 — mode==="sea" corridor 만 실제로 매칭된다 (ocean-trade-bilateral.json 이 그 국가쌍만 담고 있음). */
function oceanTradeUsd(oceanTrade, pair) {
  if (!oceanTrade?.pairs || !pair || pair.length < 2) return null;
  const row = oceanTrade.pairs[pairKey(pair[0], pair[1])];
  if (!row || typeof row.usd !== "number" || !(row.usd > 0)) return null;
  return row.usd;
}

function loadLsbci() {
  for (const p of LSBCI_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.pairs && typeof data.pairs === "object") {
        console.log(`[corridor-ranks] LSBCI cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} pairs with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no LSBCI cache — lsbciNorm null (run npm run corridors:lsbci -- /path/to/US_LSBCI.csv)");
  return null;
}

/** comtradePair 재사용 — LSBCI 는 이미 진짜 양자(bilateral) 지표라 geoMean 프록시가 필요 없다 (0~1 스케일 index, A→B/B→A 평균 완료된 캐시). */
function lsbciIndex(lsbci, pair) {
  if (!lsbci?.pairs || !pair || pair.length < 2) return null;
  const row = lsbci.pairs[pairKey(pair[0], pair[1])];
  if (!row || typeof row.index !== "number" || !(row.index > 0)) return null;
  return row.index;
}

function loadOceanServices() {
  for (const p of OCEAN_SERVICES_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] Ocean services cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} countries with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no ocean services cache — oceanServicesNorm null (run npm run corridors:oceanservices -- /path/to/US_OceanServices.csv)");
  return null;
}

/** Country-level totals (SC12 maritime freight services, USD) — no Partner dimension, so corridor
 * pairs are proxied via geoMean(endpointCountries), same convention as ContPortThroughput. */
function oceanServicesUsd(oceanServices, endpointCountries) {
  if (!oceanServices?.countries || !endpointCountries || endpointCountries.length === 0) return null;
  const vals = [];
  for (const iso of endpointCountries) {
    const row = oceanServices.countries[String(iso).toUpperCase()];
    if (row && typeof row.valueUsd === "number" && row.valueUsd > 0) vals.push(row.valueUsd);
  }
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  const logSum = vals.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / vals.length);
}

function loadLsciCountry() {
  for (const p of LSCI_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] LSCI cache: ${path.relative(ROOT, p)} (${data.countryCount ?? "?"} countries)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no LSCI cache — lsciNorm null (run npm run corridors:lsci -- /path/to/US_LSCI.csv)");
  return null;
}

function loadPlsciCountryMax() {
  for (const p of PLSCI_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] PLSCI cache: ${path.relative(ROOT, p)} (${data.countryCount ?? "?"} countries)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no PLSCI cache — plsciNorm null (run npm run corridors:plsci -- /path/to/US_PLSCI.csv)");
  return null;
}

function loadSdgPorfvol() {
  for (const p of SDG_PORFVOL_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] SDG_PORFVOL cache: ${path.relative(ROOT, p)} (${data.countryCount ?? "?"} countries)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no SDG_PORFVOL cache (run npm run corridors:sdgporfvol -- /path/to/US_SDG_PORFVOL.csv)");
  return null;
}

function loadBulkTonnage() {
  for (const p of BULK_TONNAGE_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] Bulk tonnage cache: ${path.relative(ROOT, p)} (${data.withData ?? "?"} countries with data)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no bulk tonnage cache — bulkTonnageNorm/crudeOilNorm null (run npm run corridors:bulktonnage -- ...)");
  return null;
}

function loadChokeStress() {
  for (const p of CHOKE_STRESS_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.chokepoints && typeof data.chokepoints === "object") {
        console.log(`[corridor-ranks] Choke stress cache: ${path.relative(ROOT, p)}`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no choke stress cache — chokeStressNorm null (run npm run corridors:chokestress -- ...)");
  return null;
}

function loadShadowFleet() {
  for (const p of SHADOW_FLEET_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = readJson(p);
      if (data && data.countries && typeof data.countries === "object") {
        console.log(`[corridor-ranks] Shadow fleet cache: ${path.relative(ROOT, p)} (${data.countryCount ?? "?"} countries)`);
        return data;
      }
    } catch (err) {
      console.warn(`[corridor-ranks] skip ${p}: ${err.message}`);
    }
  }
  console.log("[corridor-ranks] no shadow fleet cache — shadowFleetAgeNorm/crudeOilNorm sanctions-boost null (run npm run corridors:shadowfleet -- ...)");
  return null;
}

/** geoMean(endpointCountries[field]) — shared by the country-level (non-bilateral) sources added
 * alongside oceanServicesUsd()'s hand-written version; new sources use this instead of duplicating it. */
function geoMeanEndpointValues(dataByCountry, endpointCountries, field) {
  if (!dataByCountry || !endpointCountries || endpointCountries.length === 0) return null;
  const vals = [];
  for (const iso of endpointCountries) {
    const row = dataByCountry[String(iso).toUpperCase()];
    const v = row ? row[field] : null;
    if (typeof v === "number" && v > 0) vals.push(v);
  }
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  const logSum = vals.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / vals.length);
}

function maxEndpointValue(dataByCountry, endpointCountries, field) {
  if (!dataByCountry || !endpointCountries || endpointCountries.length === 0) return null;
  let max = null;
  for (const iso of endpointCountries) {
    const row = dataByCountry[String(iso).toUpperCase()];
    const v = row ? row[field] : null;
    if (typeof v === "number" && v > 0 && (max == null || v > max)) max = v;
  }
  return max;
}

function lsciIndexForCountries(lsci, endpointCountries) {
  return geoMeanEndpointValues(lsci?.countries, endpointCountries, "index");
}

function plsciValueForCountries(plsci, endpointCountries) {
  return geoMeanEndpointValues(plsci?.countries, endpointCountries, "value");
}

function sdgPorfvolForCountries(sdgPorfvol, endpointCountries) {
  return maxEndpointValue(sdgPorfvol?.countries, endpointCountries, "teu");
}

function bulkTonnageForCountries(bulkTonnage, endpointCountries) {
  return geoMeanEndpointValues(bulkTonnage?.countries, endpointCountries, "totalTonnage");
}

function crudeOilForCountries(bulkTonnage, endpointCountries) {
  return maxEndpointValue(bulkTonnage?.countries, endpointCountries, "crudeOilLoadedTonnage");
}

function shadowFleetAgeForCountries(shadowFleet, endpointCountries) {
  return maxEndpointValue(shadowFleet?.countries, endpointCountries, "avgAgeAsFlagYears");
}

/** average stressNorm (0-1, from build-choke-stress.js) across a corridor's chokeIds. */
function chokeStressForIds(chokeStress, chokeIds) {
  if (!chokeStress?.chokepoints || !chokeIds || chokeIds.length === 0) return null;
  const vals = [];
  for (const id of chokeIds) {
    const row = chokeStress.chokepoints[id];
    if (row && typeof row.stressNorm === "number") vals.push(row.stressNorm);
  }
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
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

function scoreTrade(components, category) {
  const length = components.lengthNorm ?? 0;
  const bri = components.briImpactNorm ?? 0;
  const choke = components.chokeNorm ?? 0;
  const status = components.statusWeight ?? 0.2;
  // corridorTeuNorm (Eurostat rail_go_intgong 톤km) 은 별도 가중치 슬롯을 새로
  // 만들지 않고, bilateralTradeNorm 과 같은 "trade" 항목 안에서 평균한다 —
  // 두 소스가 서로 다른 통화/단위(USD vs 톤km)라 그냥 하나를 고르기보다는
  // 있는 것들을 평균해 "무역량 근거"라는 하나의 신호로 합친다. lsciNorm/plsciNorm/
  // bulkTonnageNorm 도 같은 이유로 이 평균에 합류한다 (LSBCI·oceanServices 등과
  // 마찬가지로 "겹치는 신호는 배타적으로 고르지 않고 평균한다"는 기존 관례).
  const tradeParts = [
    components.bilateralTradeNorm,
    components.corridorTeuNorm,
    components.oceanTradeNorm,
    components.lsbciNorm,
    components.oceanServicesNorm,
    components.lsciNorm,
    components.plsciNorm,
    components.bulkTonnageNorm,
  ].filter((v) => typeof v === "number");
  const trade = tradeParts.length ? tradeParts.reduce((a, b) => a + b, 0) / tradeParts.length : null;
  const port = components.portThroughputNorm;
  const osm = components.osmMainlineNorm;
  let score;
  if (trade != null || port != null || osm != null) {
    score =
      0.4 * (trade ?? 0) +
      0.25 * (port ?? 0) +
      0.15 * bri +
      0.1 * (osm ?? length) +
      0.1 * status;
  } else {
    score = 0.4 * length + 0.3 * bri + 0.2 * choke + 0.1 * status;
  }

  // 동적 초크포인트 스트레스(B) — 정적 CHOKE_CAPACITY와 별개로, 최근 PortCalls/
  // PortCallsArrivals 추세가 나쁜(정체·기항 감소) 초크포인트를 지나는 corridor는
  // 소폭 감점한다. 데이터 없으면 그대로 통과(무영향).
  if (typeof components.chokeStressNorm === "number") {
    score *= 1 - 0.12 * components.chokeStressNorm;
  }

  const isSanctionsCategory = category === "sanctions-evasion" || category === "military-logistics";
  if (isSanctionsCategory) {
    // 그림자함대(A) — endpoint 국가의 자국기 선단 평균 선령이 높을수록(노후선↑) 가중.
    if (typeof components.shadowFleetAgeNorm === "number") {
      score *= 1 + 0.08 * components.shadowFleetAgeNorm;
    }
    // 원유 톤수(SeaborneTrade CargoType=11) — TEU 기반 신호에 안 잡히는 유조선 물동량 보정.
    if (typeof components.crudeOilNorm === "number") {
      score *= 1 + 0.08 * components.crudeOilNorm;
    }
  }

  return score;
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
  const oceanTrade = loadOceanTrade();
  const lsbci = loadLsbci();
  const oceanServices = loadOceanServices();
  const lsci = loadLsciCountry();
  const plsci = loadPlsciCountryMax();
  const sdgPorfvol = loadSdgPorfvol();
  const bulkTonnage = loadBulkTonnage();
  const chokeStress = loadChokeStress();
  const shadowFleet = loadShadowFleet();
  const lsciAnomalies = loadLsciAnomalies();
  const metaById = new Map((meta.corridors || []).map((c) => [c.id, c]));
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
  const oceanTradeValues = [];
  const lsbciValues = [];
  const oceanServicesValues = [];
  const lsciValues = [];
  const plsciValues = [];
  const bulkTonnageValues = [];
  const crudeOilValues = [];
  const shadowFleetAgeValues = [];
  for (const c of meta.corridors) {
    const v = briImpactForCodes(briByDest, c.briDestCodes);
    if (v != null) briValues.push(v);
    const usd = comtradeUsd(comtrade, c.comtradePair);
    if (usd != null) tradeValues.push(usd);
    const port = resolvePortThroughput(
      unctad,
      portwatch,
      sdgPorfvol,
      c.id,
      c.endpointCountries,
      c.comtradePair,
    );
    if (port != null) portValues.push(port.value);
    const tkm = railFreightTkm(railFreight, c.railFreightPair);
    if (tkm != null) railFreightValues.push(tkm);
    const oceanUsd = oceanTradeUsd(oceanTrade, c.comtradePair);
    if (oceanUsd != null) oceanTradeValues.push(oceanUsd);
    const lsbciRawPre = lsbciIndex(lsbci, c.comtradePair);
    if (lsbciRawPre != null) lsbciValues.push(lsbciRawPre);
    const oceanServicesRawPre = oceanServicesUsd(oceanServices, c.endpointCountries);
    if (oceanServicesRawPre != null) oceanServicesValues.push(oceanServicesRawPre);
    const lsciRawPre = lsciIndexForCountries(lsci, c.endpointCountries);
    if (lsciRawPre != null) lsciValues.push(lsciRawPre);
    const plsciRawPre = plsciValueForCountries(plsci, c.endpointCountries);
    if (plsciRawPre != null) plsciValues.push(plsciRawPre);
    const bulkTonnageRawPre = bulkTonnageForCountries(bulkTonnage, c.endpointCountries);
    if (bulkTonnageRawPre != null) bulkTonnageValues.push(bulkTonnageRawPre);
    const crudeOilRawPre = crudeOilForCountries(bulkTonnage, c.endpointCountries);
    if (crudeOilRawPre != null) crudeOilValues.push(crudeOilRawPre);
    const shadowFleetAgeRawPre = shadowFleetAgeForCountries(shadowFleet, c.endpointCountries);
    if (shadowFleetAgeRawPre != null) shadowFleetAgeValues.push(shadowFleetAgeRawPre);
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
  const maxLogOceanTrade = oceanTradeValues.length
    ? Math.log10(Math.max(...oceanTradeValues) + 1)
    : 0;
  const maxLsbci = lsbciValues.length ? Math.max(...lsbciValues) : 0;
  const maxLogOceanServices = oceanServicesValues.length
    ? Math.log10(Math.max(...oceanServicesValues) + 1)
    : 0;
  const maxLsci = lsciValues.length ? Math.max(...lsciValues) : 0;
  const maxPlsci = plsciValues.length ? Math.max(...plsciValues) : 0;
  const maxLogBulkTonnage = bulkTonnageValues.length
    ? Math.log10(Math.max(...bulkTonnageValues) + 1)
    : 0;
  const maxLogCrudeOil = crudeOilValues.length
    ? Math.log10(Math.max(...crudeOilValues) + 1)
    : 0;
  const maxShadowFleetAge = shadowFleetAgeValues.length ? Math.max(...shadowFleetAgeValues) : 0;

  let comtradeHits = 0;
  let unctadHits = 0;
  let unctadHardBindHits = 0;
  let portwatchHits = 0;
  let railFreightHits = 0;
  let oceanTradeHits = 0;
  let lsbciHits = 0;
  let oceanServicesHits = 0;
  let lsciHits = 0;
  let plsciHits = 0;
  let sdgPorfvolHits = 0;
  let bulkTonnageHits = 0;
  let crudeOilHits = 0;
  let shadowFleetHits = 0;
  let chokeStressHits = 0;
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
      sdgPorfvol,
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
    } else if (portSource === "sdg-porfvol") {
      sdgPorfvolHits += 1;
    } else if (portSource === "portwatch") {
      portwatchHits += 1;
    }
    const railRow = railFreightRow(railFreight, c.railFreightPair);
    const railFreightTkmRaw = railRow?.avgRecentTkm ?? null;
    const railFreightShockPct =
      typeof railRow?.shockPct === "number" ? railRow.shockPct : null;
    const railFreightShareOfWorld =
      typeof railRow?.shareOfWorld === "number" ? railRow.shareOfWorld : null;
    const corridorTeuNorm =
      railFreightTkmRaw != null && maxLogRailFreight > 0
        ? Math.log10(railFreightTkmRaw + 1) / maxLogRailFreight
        : null;
    if (railFreightTkmRaw != null) railFreightHits += 1;
    const oceanTradeUsdRaw = oceanTradeUsd(oceanTrade, c.comtradePair);
    const oceanTradeNorm =
      oceanTradeUsdRaw != null && maxLogOceanTrade > 0
        ? Math.log10(oceanTradeUsdRaw + 1) / maxLogOceanTrade
        : null;
    if (oceanTradeUsdRaw != null) oceanTradeHits += 1;
    const lsbciRaw = lsbciIndex(lsbci, c.comtradePair);
    const lsbciNorm = lsbciRaw != null && maxLsbci > 0 ? lsbciRaw / maxLsbci : null;
    if (lsbciRaw != null) lsbciHits += 1;
    const oceanServicesRaw = oceanServicesUsd(oceanServices, c.endpointCountries);
    const oceanServicesNorm =
      oceanServicesRaw != null && maxLogOceanServices > 0
        ? Math.log10(oceanServicesRaw + 1) / maxLogOceanServices
        : null;
    if (oceanServicesRaw != null) oceanServicesHits += 1;
    const lsciRaw = lsciIndexForCountries(lsci, c.endpointCountries);
    const lsciNorm = lsciRaw != null && maxLsci > 0 ? lsciRaw / maxLsci : null;
    if (lsciRaw != null) lsciHits += 1;
    const plsciRaw = plsciValueForCountries(plsci, c.endpointCountries);
    const plsciNorm = plsciRaw != null && maxPlsci > 0 ? plsciRaw / maxPlsci : null;
    if (plsciRaw != null) plsciHits += 1;
    const bulkTonnageRaw = bulkTonnageForCountries(bulkTonnage, c.endpointCountries);
    const bulkTonnageNorm =
      bulkTonnageRaw != null && maxLogBulkTonnage > 0
        ? Math.log10(bulkTonnageRaw + 1) / maxLogBulkTonnage
        : null;
    if (bulkTonnageRaw != null) bulkTonnageHits += 1;
    const crudeOilRaw = crudeOilForCountries(bulkTonnage, c.endpointCountries);
    const crudeOilNorm =
      crudeOilRaw != null && maxLogCrudeOil > 0 ? Math.log10(crudeOilRaw + 1) / maxLogCrudeOil : null;
    if (crudeOilRaw != null) crudeOilHits += 1;
    const shadowFleetAgeRaw = shadowFleetAgeForCountries(shadowFleet, c.endpointCountries);
    const shadowFleetAgeNorm =
      shadowFleetAgeRaw != null && maxShadowFleetAge > 0 ? shadowFleetAgeRaw / maxShadowFleetAge : null;
    if (shadowFleetAgeRaw != null) shadowFleetHits += 1;
    const chokeStressNorm = chokeStressForIds(chokeStress, c.chokeIds);
    if (chokeStressNorm != null) chokeStressHits += 1;

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
      railFreightShockPct,
      railFreightShareOfWorld,
      dualSignal: dualSignalKind(bilateralTradeNorm, corridorTeuNorm),
      oceanTradeUsd: oceanTradeUsdRaw,
      oceanTradeNorm,
      lsbci: lsbciRaw,
      lsbciNorm,
      oceanServicesUsd: oceanServicesRaw,
      oceanServicesNorm,
      lsci: lsciRaw,
      lsciNorm,
      plsci: plsciRaw,
      plsciNorm,
      bulkTonnage: bulkTonnageRaw,
      bulkTonnageNorm,
      crudeOilLoadedTonnage: crudeOilRaw,
      crudeOilNorm,
      shadowFleetAvgAgeYears: shadowFleetAgeRaw,
      shadowFleetAgeNorm,
      chokeStressNorm,
      euRailGateway: Boolean(c.euRailGateway),
      gaugeBreak: Boolean(c.gaugeBreak),
    };

    const score = scoreTrade(components, c.category);
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
    } else if (portSource === "sdg-porfvol") {
      sources.push("UNCTADstat SDG_PORFVOL TEU (independent series, country-level max)");
    } else if (portSource === "portwatch") {
      sources.push("IMF PortWatch Daily_Ports_Data (AIS-derived, country-level max)");
    }
    if (railFreightTkmRaw != null) {
      sources.push("Eurostat rail_go_intgong (MIO_TKM, EU→partner direction)");
    }
    if (railFreightShareOfWorld != null) {
      sources.push("Eurostat WORLD CSV shareOfWorld (partner / all unload destinations)");
    }
    if (oceanTradeUsdRaw != null) sources.push("UNCTADstat ocean-based sectors trade (O_TOT, sea-mode corridor pairs only)");
    if (lsbciRaw != null) sources.push("UNCTADstat US.LSBCI (Liner Shipping Bilateral Connectivity Index, avg of most recent 8 quarters)");
    if (oceanServicesRaw != null) sources.push("UNCTADstat US.OceanServices SC12 maritime freight services trade (geoMean of endpoint countries)");
    if (lsciRaw != null) sources.push("UNCTADstat US.LSCI (country-level Liner Shipping Connectivity Index, geoMean of endpoints)");
    if (plsciRaw != null) sources.push("UNCTADstat US.PLSCI (best-connected port per endpoint country, geoMean)");
    if (bulkTonnageRaw != null) sources.push("UNCTADstat SeaborneTrade/SDG_LULFRG bulk cargo tonnage (geoMean of endpoints)");
    if (crudeOilRaw != null) sources.push("UNCTADstat SeaborneTrade crude oil loaded tonnage (sanctions-evasion corridors only)");
    if (shadowFleetAgeRaw != null) sources.push("UNCTADstat shadow-fleet avg vessel age by flag (sanctions-evasion/military-logistics corridors only)");
    if (chokeStressNorm != null) sources.push("Dynamic chokepoint stress: UNCTAD PortCalls/PortCallsArrivals trend vs static CHOKE_CAPACITY");
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
      euRailGateway: Boolean(c.euRailGateway),
      gaugeBreak: Boolean(c.gaugeBreak),
      modalFamily: c.modalFamily || null,
      relatedCorridorIds: Array.isArray(c.relatedCorridorIds) ? c.relatedCorridorIds : [],
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

  attachModalStress(scored, metaById, lsciAnomalies);
  const modalStressHits = scored.filter((r) => r.modalStress?.hypothesis).length;
  const modalFamilyHits = scored.filter((r) => r.modalFamily).length;

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
      ...(oceanTradeHits > 0
        ? [`UNCTADstat ocean-based sectors trade (${oceanTrade?.generatedAt ?? "cache"}) — ${oceanTradeHits} corridor hits, sea-mode pairs only`]
        : []),
      ...(lsbciHits > 0
        ? [`UNCTADstat US.LSBCI (${lsbci?.generatedAt ?? "cache"}) — ${lsbciHits} corridor hits, genuinely bilateral (not a geoMean proxy)`]
        : []),
      ...(oceanServicesHits > 0
        ? [`UNCTADstat US.OceanServices SC12 (${oceanServices?.generatedAt ?? "cache"}) — ${oceanServicesHits} corridor hits, country-level geoMean proxy`]
        : []),
      ...(lsciHits > 0
        ? [`UNCTADstat US.LSCI (${lsci?.generatedAt ?? "cache"}) — ${lsciHits} corridor hits, country-level geoMean`]
        : []),
      ...(plsciHits > 0
        ? [`UNCTADstat US.PLSCI (${plsci?.generatedAt ?? "cache"}) — ${plsciHits} corridor hits, best-connected-port geoMean`]
        : []),
      ...(sdgPorfvolHits > 0
        ? [`UNCTADstat US.SDG_PORFVOL (${sdgPorfvol?.generatedAt ?? "cache"}) — ${sdgPorfvolHits} corridor hits, portThroughputNorm fallback`]
        : []),
      ...(bulkTonnageHits > 0
        ? [`UNCTADstat SeaborneTrade/SDG_LULFRG bulk tonnage (${bulkTonnage?.generatedAt ?? "cache"}) — ${bulkTonnageHits} corridor hits`]
        : []),
      ...(crudeOilHits > 0
        ? [`UNCTADstat SeaborneTrade crude oil loaded tonnage — ${crudeOilHits} sanctions-evasion corridor hits`]
        : []),
      ...(shadowFleetHits > 0
        ? [`UNCTADstat shadow-fleet index (${shadowFleet?.generatedAt ?? "cache"}) — ${shadowFleetHits} sanctions-evasion/military-logistics corridor hits`]
        : []),
      ...(chokeStressHits > 0
        ? [`Dynamic chokepoint stress index (${chokeStress?.generatedAt ?? "cache"}) — ${chokeStressHits} corridor hits`]
        : []),
      ...(modalFamilyHits > 0
        ? [
            `Modal substitution stress (Eurostat rail shock × chokeStress × LSCI_M anomalies) — ${modalFamilyHits} tagged / ${modalStressHits} with hypothesis`,
          ]
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
    oceanTrade: oceanTrade
      ? {
          generatedAt: oceanTrade.generatedAt,
          withData: oceanTrade.withData,
          corridorHits: oceanTradeHits,
          caveat: oceanTrade.caveat,
        }
      : null,
    lsbci: lsbci
      ? {
          generatedAt: lsbci.generatedAt,
          withData: lsbci.withData,
          pairCount: lsbci.pairCount,
          corridorHits: lsbciHits,
          unit: lsbci.unit,
        }
      : null,
    oceanServices: oceanServices
      ? {
          generatedAt: oceanServices.generatedAt,
          withData: oceanServices.withData,
          countryCount: oceanServices.countryCount,
          corridorHits: oceanServicesHits,
          caveat: oceanServices.caveat,
        }
      : null,
    lsci: lsci
      ? { generatedAt: lsci.generatedAt, countryCount: lsci.countryCount, corridorHits: lsciHits, unit: lsci.unit }
      : null,
    plsci: plsci
      ? { generatedAt: plsci.generatedAt, countryCount: plsci.countryCount, corridorHits: plsciHits, unit: plsci.unit }
      : null,
    sdgPorfvol: sdgPorfvol
      ? { generatedAt: sdgPorfvol.generatedAt, countryCount: sdgPorfvol.countryCount, corridorHits: sdgPorfvolHits }
      : null,
    bulkTonnage: bulkTonnage
      ? {
          generatedAt: bulkTonnage.generatedAt,
          withData: bulkTonnage.withData,
          withOilData: bulkTonnage.withOilData,
          corridorHits: bulkTonnageHits,
          oilCorridorHits: crudeOilHits,
          crossCheck: bulkTonnage.crossCheck,
        }
      : null,
    chokeStress: chokeStress
      ? { generatedAt: chokeStress.generatedAt, corridorHits: chokeStressHits, method: chokeStress.method }
      : null,
    shadowFleet: shadowFleet
      ? {
          generatedAt: shadowFleet.generatedAt,
          sourceDataYear: shadowFleet.sourceDataYear,
          countryCount: shadowFleet.countryCount,
          corridorHits: shadowFleetHits,
          method: shadowFleet.method,
        }
      : null,
    crossValidation: (() => {
      for (const p of CONFIDENCE_LAYER_PATHS) {
        if (!fs.existsSync(p)) continue;
        try {
          return readJson(p);
        } catch {
          /* fall through to next path */
        }
      }
      return null;
    })(),
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
      oceanTradeHits,
      lsbciHits,
      oceanServicesHits,
      lsciHits,
      plsciHits,
      sdgPorfvolHits,
      bulkTonnageHits,
      crudeOilHits,
      shadowFleetHits,
      chokeStressHits,
      modalFamilyHits,
      modalStressHits,
    },
    corridors: scored,
  };

  writeJson(OUT_SRC, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[corridor-ranks] ${scored.length} corridors → rank1=${payload.counts.rank1} rank2=${payload.counts.rank2} rank3=${payload.counts.rank3} rank4+=${payload.counts.rank4plus} comtradeHits=${comtradeHits} unctadHits=${unctadHits}(hard=${unctadHardBindHits}) portwatchHits=${portwatchHits} railFreightHits=${railFreightHits} oceanTradeHits=${oceanTradeHits} lsbciHits=${lsbciHits} oceanServicesHits=${oceanServicesHits} lsciHits=${lsciHits} plsciHits=${plsciHits} sdgPorfvolHits=${sdgPorfvolHits} bulkTonnageHits=${bulkTonnageHits} crudeOilHits=${crudeOilHits} shadowFleetHits=${shadowFleetHits} chokeStressHits=${chokeStressHits} modalFamilyHits=${modalFamilyHits} modalStressHits=${modalStressHits}`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SRC)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
