/**
 * 지경학 진영 국가 경계 — Natural Earth 110m.
 * allied-bloc-countries.json(군사 블록)과 별개 — 경제협력조약/플랫폼 회원국 전용.
 *
 * 캠프 우선순위:
 *   비동맹(강) ASEAN/Mercosur/AfCFTA
 *   > 혼합(SCO 인도·파키스탄)
 *   > 반서방(EAEU/SCO핵심/INSTC)
 *   > 서방(G7/EU/CPTPP/USMCA/IPEF/Chip4/MSP/I2U2)
 *   > 비동맹(약) NAM
 *   > 반서방(약) BRI MoU soft
 *   > 혼합(RCEP 잔여 — 절대 anti 금지)
 *
 * RCEP은 중국 주도이지만 일·한·호·뉴도 회원이라 절대 반서방으로 칠하지 않음.
 * NAM·BRI는 회원 폭이 넓어 메타데이터는 기록하되, 진영색은 위 우선순위로만 부여.
 * EAEU는 5개국(타지키스탄 제외 — CSTO와 회원 구성이 다름).
 *
 * Usage:
 *   node scripts/build-geoecon-bloc-countries.js [ne110.geojson]
 *   → public/data/{lite,full}/geoecon-bloc-countries.json(+.gz)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const SRC =
  process.argv[2] ||
  path.join(ROOT, "tmp", "ne_110m_admin_0_countries.geojson");

// ── 서방/우호권 ──────────────────────────────────────────────
const G7 = ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "JPN"];
const EU = [
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
  "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
  "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
];
const CPTPP = ["AUS", "BRN", "CAN", "CHL", "JPN", "MYS", "MEX", "NZL", "PER", "SGP", "VNM", "GBR"];
const USMCA = ["USA", "CAN", "MEX"];
const IPEF = ["AUS", "BRN", "FJI", "IND", "IDN", "JPN", "MYS", "NZL", "PHL", "SGP", "KOR", "THA", "USA", "VNM"];
/** Chip 4 — 미국·일본·한국·대만 */
const CHIP4 = ["USA", "JPN", "KOR", "TWN"];
/**
 * MSP(핵심광물안보파트너십) 파트너 15 — EU 기구는 국가 폴리곤에 없음.
 * Forum(생산국)은 메타데이터에만 넣지 않고 파트너만 서방진영 시드로 사용.
 */
const MSP = [
  "AUS", "CAN", "EST", "FIN", "FRA", "DEU", "IND", "ITA", "JPN", "NOR",
  "KOR", "SWE", "GBR", "USA",
];
/** I2U2 — India, Israel, UAE, USA */
const I2U2 = ["IND", "ISR", "ARE", "USA"];

// ── 반서방/CRINK 연계 ────────────────────────────────────────
/** EAEU 5 — 타지키스탄은 불포함(CSTO와 차이) */
const EAEU = ["RUS", "BLR", "KAZ", "ARM", "KGZ"];
/** SCO 정회원 중 인도·파키스탄은 혼합(아래 SCO_MIXED) */
const SCO_CORE = ["CHN", "RUS", "KAZ", "KGZ", "TJK", "UZB", "IRN", "BLR"];
const SCO_MIXED = ["IND", "PAK"];
/**
 * 일대일로 MoU — 활성 서명국 중심(이탈리아·에스토니아·파나마 등 탈퇴/만료 제외).
 * 진영색은 PRO/비동맹(강)/혼합이 없을 때만 soft anti.
 */
const BRI = [
  "AFG", "ALB", "DZA", "AGO", "ATG", "AZE", "BHR", "BGD", "BRB", "BLR",
  "BEN", "BOL", "BIH", "BWA", "BRN", "BGR", "BFA", "BDI", "KHM", "CMR",
  "CPV", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COG", "COD", "CRI",
  "CIV", "CUB", "CYP", "CZE", "DJI", "DMA", "DOM", "ECU", "EGY",
  "GNQ", "ERI", "ETH", "FJI", "GAB", "GMB", "GEO", "GHA", "GRD", "GIN",
  "GNB", "GUY", "HTI", "HND", "HUN", "IDN", "IRN", "IRQ", "JAM", "JOR",
  "KAZ", "KEN", "KWT", "KGZ", "LAO", "LBN", "LSO", "LBR", "LBY", "MDG",
  "MWI", "MYS", "MDV", "MLI", "MRT", "MUS", "MNG", "MNE", "MAR", "MOZ",
  "MMR", "NAM", "NPL", "NIC", "NER", "NGA", "MKD", "OMN", "PAK", "PNG",
  "PER", "PHL", "POL", "PRT", "QAT", "ROU", "RWA", "WSM", "STP",
  "SAU", "SEN", "SRB", "SYC", "SLE", "SGP", "SVK", "SVN", "SLB", "SOM",
  "ZAF", "SSD", "LKA", "SDN", "SUR", "SYR", "TJK", "TZA", "THA", "TLS",
  "TGO", "TTO", "TUN", "TUR", "TKM", "UGA", "ARE", "UZB", "VUT", "VEN",
  "VNM", "YEM", "ZMB", "ZWE", "GRC", "MLT", "LUX", "HRV",
];
/** INSTC — 이란·러시아·인도 남북교통회랑 (인도는 mixed) */
const INSTC = ["IRN", "RUS", "IND"];

// ── 비동맹권 ─────────────────────────────────────────────────
const ASEAN = ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"];
const MERCOSUR = ["ARG", "BRA", "PRY", "URY", "BOL"];
const AFCFTA = [
  "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
  "COM", "COG", "COD", "DJI", "EGY", "GNQ", "SWZ", "ETH", "GAB", "GMB",
  "GHA", "GIN", "GNB", "CIV", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI",
  "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA", "STP",
  "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN",
  "UGA", "ZMB", "ZWE",
];
/**
 * NAM — 상징적 성격이 강함. 진영색은 다른 캠프가 없을 때만 soft non-aligned.
 * NE110에 없는 소국은 빌드 시 자동 스킵.
 */
const NAM = [
  "AFG", "DZA", "AGO", "ATG", "AZE", "BHS", "BHR", "BGD", "BRB", "BLR",
  "BLZ", "BEN", "BTN", "BOL", "BWA", "BRN", "BFA", "BDI", "KHM", "CMR",
  "CPV", "CAF", "TCD", "CHL", "COL", "COM", "COG", "COD", "CUB", "DJI",
  "DMA", "DOM", "ECU", "EGY", "GNQ", "ERI", "SWZ", "ETH", "FJI", "GAB",
  "GMB", "GHA", "GRD", "GTM", "GIN", "GNB", "GUY", "HTI", "HND", "IND",
  "IDN", "IRN", "IRQ", "JAM", "JOR", "KEN", "KWT", "LAO", "LBN", "LSO",
  "LBR", "LBY", "MDG", "MWI", "MYS", "MDV", "MLI", "MRT", "MUS", "MNG",
  "MAR", "MOZ", "MMR", "NAM", "NPL", "NIC", "NER", "NGA", "PRK", "OMN",
  "PAK", "PAN", "PNG", "PER", "PHL", "QAT", "RWA", "KNA", "LCA", "VCT",
  "STP", "SAU", "SEN", "SYC", "SLE", "SGP", "SOM", "ZAF", "LKA", "SDN",
  "SUR", "SYR", "TZA", "THA", "TLS", "TGO", "TTO", "TUN", "TKM", "UGA",
  "ARE", "UZB", "VUT", "VEN", "VNM", "YEM", "ZMB", "ZWE",
];

// ── 혼합권 (주의) ────────────────────────────────────────────
/** RCEP — 진영색 anti 금지. JP/KR/AU/NZ 등은 서방 시드가 우선, 잔여만 mixed */
const RCEP = [
  "CHN", "IDN", "JPN", "PHL", "VNM", "THA", "MMR", "KOR", "MYS", "AUS",
  "KHM", "LAO", "SGP", "NZL", "BRN",
];

const PRO_WESTERN = new Set([
  ...G7, ...EU, ...CPTPP, ...USMCA, ...IPEF, ...CHIP4, ...MSP, ...I2U2,
]);
const ANTI_WESTERN = new Set([...SCO_CORE, ...EAEU, ...INSTC.filter((iso) => iso !== "IND")]);
const NON_ALIGNED_HARD = new Set([...ASEAN, ...MERCOSUR, ...AFCFTA]);
const MIXED_EXPLICIT = new Set(SCO_MIXED);
const BRI_SET = new Set(BRI);
const NAM_SET = new Set(NAM);
const RCEP_SET = new Set(RCEP);

const ALL_ISOS = new Set([
  ...PRO_WESTERN,
  ...ANTI_WESTERN,
  ...NON_ALIGNED_HARD,
  ...MIXED_EXPLICIT,
  ...RCEP_SET,
  ...BRI_SET,
  ...NAM_SET,
  ...INSTC,
]);

function membershipsOf(iso) {
  const m = [];
  if (G7.includes(iso)) m.push("g7");
  if (EU.includes(iso)) m.push("eu");
  if (CPTPP.includes(iso)) m.push("cptpp");
  if (USMCA.includes(iso)) m.push("usmca");
  if (IPEF.includes(iso)) m.push("ipef");
  if (CHIP4.includes(iso)) m.push("chip4");
  if (MSP.includes(iso)) m.push("msp");
  if (I2U2.includes(iso)) m.push("i2u2");
  if (EAEU.includes(iso)) m.push("eaeu");
  if (SCO_CORE.includes(iso) || SCO_MIXED.includes(iso)) m.push("sco");
  if (BRI_SET.has(iso)) m.push("bri");
  if (INSTC.includes(iso)) m.push("instc");
  if (ASEAN.includes(iso)) m.push("asean");
  if (NAM_SET.has(iso)) m.push("nam");
  if (MERCOSUR.includes(iso)) m.push("mercosur");
  if (AFCFTA.includes(iso)) m.push("afcfta");
  if (RCEP_SET.has(iso)) m.push("rcep");
  return m;
}

function camp(iso) {
  // 1) 강 비동맹 FTA/지역기구
  if (NON_ALIGNED_HARD.has(iso)) return "non-aligned";
  // 2) 혼합 — SCO 인도·파키스탄 (IPEF/MSP/I2U2가 있어도 단정 금지)
  if (MIXED_EXPLICIT.has(iso)) return "mixed";
  // 3) 반서방 핵심 (EAEU·SCO·INSTC 허브)
  if (ANTI_WESTERN.has(iso)) return "anti-western";
  // 4) 서방/우호권 (BRI soft보다 먼저 — EU/G7 등 유지)
  if (PRO_WESTERN.has(iso)) return "pro-western";
  // 5) NAM soft (BRI보다 먼저 — 쿠바 등 상징적 비동맹 유지)
  if (NAM_SET.has(iso)) return "non-aligned";
  // 6) BRI soft — PRO/NAM이 아닐 때만
  if (BRI_SET.has(iso)) return "anti-western";
  // 7) RCEP 잔여 — 절대 anti 아님
  if (RCEP_SET.has(iso)) return "mixed";
  return "none";
}

function round(n) {
  const f = 10 ** 3;
  return Math.round(Number(n) * f) / f;
}
function roundPos([lng, lat]) {
  return [round(lng), round(lat)];
}
function closeRing(ring) {
  if (ring.length < 3) return null;
  const out = ring.map(roundPos);
  const a = out[0];
  const b = out[out.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  return out.length >= 4 ? out : null;
}
function splitAntimeridianRing(ring) {
  const closed = closeRing(ring);
  if (!closed) return [];
  const unwrapped = [[closed[0][0], closed[0][1]]];
  for (let i = 1; i < closed.length; i += 1) {
    let lng = closed[i][0];
    const prev = unwrapped[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    unwrapped.push([lng, closed[i][1]]);
  }
  let umin = Infinity;
  let umax = -Infinity;
  for (const [lng] of unwrapped) {
    umin = Math.min(umin, lng);
    umax = Math.max(umax, lng);
  }
  if (umax - umin <= 180) {
    const normalized = closeRing(
      unwrapped.map(([lng, lat]) => {
        let x = lng;
        while (x > 180) x -= 360;
        while (x < -180) x += 360;
        return [x, lat];
      }),
    );
    return normalized ? [normalized] : [];
  }
  const pieces = [];
  let current = [];
  const flush = () => {
    if (current.length >= 2) {
      const norm = closeRing(
        current.map(([lng, lat]) => {
          let x = lng;
          while (x > 180) x -= 360;
          while (x < -180) x += 360;
          return [x, lat];
        }),
      );
      if (norm) pieces.push(norm);
    }
    current = [];
  };
  for (let i = 0; i < unwrapped.length - 1; i += 1) {
    const [x0, y0] = unwrapped[i];
    const [x1, y1] = unwrapped[i + 1];
    if (!current.length) current.push([x0, y0]);
    const crosses180 =
      (x0 < 180 && x1 > 180) ||
      (x0 > 180 && x1 < 180) ||
      (x0 < -180 && x1 > -180) ||
      (x0 > -180 && x1 < -180);
    if (!crosses180) {
      current.push([x1, y1]);
      continue;
    }
    const target = x1 > x0 ? (x0 < 180 && x1 > 180 ? 180 : -180) : x0 > 180 && x1 < 180 ? 180 : -180;
    const t = (target - x0) / (x1 - x0);
    const yx = y0 + t * (y1 - y0);
    current.push([target, yx]);
    flush();
    current.push([target === 180 ? -180 : 180, yx]);
    current.push([x1, y1]);
  }
  flush();
  return pieces;
}
function processPolygonRings(coords) {
  const outers = splitAntimeridianRing(coords[0] || []);
  const holes = [];
  for (const hole of coords.slice(1) || []) {
    holes.push(...splitAntimeridianRing(hole));
  }
  return outers.map((outer, i) => (i === 0 && holes.length ? [outer, ...holes] : [outer]));
}
function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const parts = processPolygonRings(geometry.coordinates);
    if (!parts.length) return null;
    if (parts.length === 1) return { type: "Polygon", coordinates: parts[0] };
    return { type: "MultiPolygon", coordinates: parts };
  }
  if (geometry.type === "MultiPolygon") {
    const parts = [];
    for (const poly of geometry.coordinates) {
      parts.push(...processPolygonRings(poly));
    }
    if (!parts.length) return null;
    if (parts.length === 1) return { type: "Polygon", coordinates: parts[0] };
    return { type: "MultiPolygon", coordinates: parts };
  }
  return null;
}
function pickIso(props) {
  for (const key of ["ISO_A3", "ADM0_A3", "ISO_A3_EH", "BRK_A3"]) {
    const v = props[key];
    if (typeof v === "string" && ALL_ISOS.has(v.trim())) return v.trim();
  }
  return null;
}
function countPts(geometry) {
  let n = 0;
  const walk = (c) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      n += 1;
      return;
    }
    c.forEach(walk);
  };
  walk(geometry.coordinates);
  return n;
}

function writeOutputs(out) {
  const json = `${JSON.stringify(out)}\n`;
  const gz = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  for (const tier of ["lite", "full"]) {
    const dir = path.join(ROOT, "public", "data", tier);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, "geoecon-bloc-countries.json");
    fs.writeFileSync(dest, json);
    fs.writeFileSync(`${dest}.gz`, gz);
    console.log("wrote", path.relative(ROOT, dest), json.length, "bytes; gz", gz.length);
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing Natural Earth source:", SRC);
    process.exit(1);
  }
  const fc = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const byIso = new Map();
  for (const feature of fc.features || []) {
    const iso = pickIso(feature.properties || {});
    if (!iso) continue;
    const geometry = normalizeGeometry(feature.geometry);
    if (!geometry) continue;
    const name = feature.properties.NAME || feature.properties.ADMIN || iso;
    const prev = byIso.get(iso);
    if (prev && countPts(prev.geometry) >= countPts(geometry)) continue;
    byIso.set(iso, { type: "Feature", id: iso, properties: { iso, name }, geometry });
  }

  const missing = [...ALL_ISOS].filter((iso) => !byIso.has(iso)).sort();
  const fallbackPath = path.join(ROOT, "tmp", "geoecon-prev.json");
  if (missing.length && fs.existsSync(fallbackPath)) {
    const prev = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
    let filled = 0;
    for (const feature of prev.features || []) {
      const iso = feature?.properties?.iso;
      if (!iso || !missing.includes(iso) || byIso.has(iso)) continue;
      if (!feature.geometry) continue;
      byIso.set(iso, {
        type: "Feature",
        id: iso,
        properties: { iso, name: feature.properties.name || iso },
        geometry: feature.geometry,
      });
      filled += 1;
    }
    if (filled) console.warn(`Backfilled ${filled} geometries from ${path.relative(ROOT, fallbackPath)}`);
  }
  const stillMissing = [...ALL_ISOS].filter((iso) => !byIso.has(iso)).sort();
  if (stillMissing.length) {
    console.warn(
      "SKIP (not in NE110 / unresolved ISO):",
      stillMissing.join(", "),
      `(${stillMissing.length})`,
    );
  }

  const present = [...ALL_ISOS].filter((iso) => byIso.has(iso)).sort();
  const features = present.map((iso) => {
    const f = byIso.get(iso);
    f.properties.camp = camp(iso);
    f.properties.memberships = membershipsOf(iso);
    return f;
  });

  const out = {
    type: "FeatureCollection",
    name: "geoecon-bloc-countries-ne110m",
    features,
  };
  writeOutputs(out);

  const byCamp = {};
  for (const f of features) {
    byCamp[f.properties.camp] = (byCamp[f.properties.camp] || 0) + 1;
  }
  console.log("features:", features.length, "camp counts:", byCamp);
  for (const iso of ["USA", "TWN", "NOR", "ISR", "ARE", "IND", "PAK", "CHN", "JPN", "KOR", "AUS", "RUS", "IRN", "SRB", "CUB"]) {
    const f = features.find((x) => x.properties.iso === iso);
    if (f) console.log(iso, f.properties.camp, f.properties.memberships.join("+"));
  }
}

main();
