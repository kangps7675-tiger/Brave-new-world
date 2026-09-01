/**
 * 지경학 진영(서방/우호권 · 반서방/CRINK연계 · 비동맹권) 국가 경계 — Natural Earth 110m.
 * allied-bloc-countries.json(군사 블록)과 별개 — 경제협력조약/플랫폼 회원국 전용.
 *
 * 다중 소속 우선순위: 비동맹권역(ASEAN/Mercosur/AfCFTA) > 반서방(EAEU/SCO핵심) > 서방(G7/EU/CPTPP/USMCA/IPEF).
 * 이유: 베트남처럼 ASEAN이면서 동시에 IPEF/CPTPP 회원인 나라를 "서방 진영"으로 칠하면
 * ASEAN 특유의 비동맹 정체성을 지우게 됨 — RCEP을 반서방으로 칠하면 안 되는 것과 같은 이유.
 *
 * RCEP·SCO의 인도/파키스탄은 "진영색"을 매기지 않고 memberships 메타데이터로만 기록
 * (중국·러시아 주도 조직 회원이라고 자동으로 반서방으로 칠하는 건 인도의 Quad/IPEF 소속과 모순).
 *
 * 출처 (모두 2026년 기준 확인, 상세는 각 배열 옆 주석):
 *  - G7/EU/USMCA: 공식 고정 회원 (수십 년간 불변)
 *  - CPTPP: 영국 2024-12-15 가입 포함 12개국 (Wikipedia: Accession of the UK to CPTPP)
 *  - IPEF: 14개국, 피지 2023-05-27 합류 (Wikipedia: Indo-Pacific Economic Framework)
 *  - EAEU: 5개국 — 러시아·벨라루스·카자흐스탄·아르메니아·키르기스스탄 (Wikipedia: Eurasian Economic Union)
 *  - SCO: 10개 정회원, 이란 2023 · 벨라루스 2024 가입 (Wikipedia: Member states of the SCO)
 *  - ASEAN: 10개국 (동티모르는 가입 절차 진행 중이라 미포함)
 *  - Mercosur: 정회원 5(아르헨티나·브라질·파라과이·우루과이·볼리비아), 베네수엘라는 자격정지 중이라 제외
 *  - RCEP: 15개국 — 진영색 없음, memberships만 기록 (mercosur.int, worldpopulationreview 등)
 *  - AfCFTA: AU 54개 서명국(에리트레아만 미서명) 중 UN 승인 주권국 53개 — 분쟁지역(서사하라)은 제외
 *
 * Usage: node build-geoecon-bloc-countries.js ne110_countries.geojson
 */
const fs = require("fs");

const SRC = process.argv[2] || "ne110_countries.geojson";

const G7 = ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "JPN"];
const EU = [
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
  "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
  "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
];
const CPTPP = ["AUS", "BRN", "CAN", "CHL", "JPN", "MYS", "MEX", "NZL", "PER", "SGP", "VNM", "GBR"];
const USMCA = ["USA", "CAN", "MEX"];
const IPEF = ["AUS", "BRN", "FJI", "IND", "IDN", "JPN", "MYS", "NZL", "PHL", "SGP", "KOR", "THA", "USA", "VNM"];

const EAEU = ["RUS", "BLR", "KAZ", "ARM", "KGZ"];
// SCO 정회원 10개국 중 인도·파키스탄은 진영색 부여 안 함(아래 SCO_MIXED)
const SCO_CORE = ["CHN", "RUS", "KAZ", "KGZ", "TJK", "UZB", "IRN", "BLR"];
const SCO_MIXED = ["IND", "PAK"];

const ASEAN = ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"];
const MERCOSUR = ["ARG", "BRA", "PRY", "URY", "BOL"]; // 베네수엘라 자격정지 — 제외
const AFCFTA = [
  "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
  "COM", "COG", "COD", "DJI", "EGY", "GNQ", "SWZ", "ETH", "GAB", "GMB",
  "GHA", "GIN", "GNB", "CIV", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI",
  "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA", "STP",
  "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN",
  "UGA", "ZMB", "ZWE",
];
// 진영색 없음 — memberships 메타데이터로만 기록 (RCEP은 중국 주도이나 일본·한국·호주·뉴질랜드도 회원)
const RCEP = ["CHN", "IDN", "JPN", "PHL", "VNM", "THA", "MMR", "KOR", "MYS", "AUS", "KHM", "LAO", "SGP", "NZL", "BRN"];

const PRO_WESTERN = new Set([...G7, ...EU, ...CPTPP, ...USMCA, ...IPEF]);
const ANTI_WESTERN = new Set(SCO_CORE.concat(EAEU));
const NON_ALIGNED = new Set([...ASEAN, ...MERCOSUR, ...AFCFTA]);

const ALL_ISOS = new Set([
  ...PRO_WESTERN, ...ANTI_WESTERN, ...NON_ALIGNED, ...SCO_MIXED, ...RCEP,
]);

function membershipsOf(iso) {
  const m = [];
  if (G7.includes(iso)) m.push("g7");
  if (EU.includes(iso)) m.push("eu");
  if (CPTPP.includes(iso)) m.push("cptpp");
  if (USMCA.includes(iso)) m.push("usmca");
  if (IPEF.includes(iso)) m.push("ipef");
  if (EAEU.includes(iso)) m.push("eaeu");
  if (SCO_CORE.includes(iso) || SCO_MIXED.includes(iso)) m.push("sco");
  if (ASEAN.includes(iso)) m.push("asean");
  if (MERCOSUR.includes(iso)) m.push("mercosur");
  if (AFCFTA.includes(iso)) m.push("afcfta");
  if (RCEP.includes(iso)) m.push("rcep");
  return m;
}

function camp(iso) {
  // 우선순위: 비동맹권역 > 반서방 > 서방 > (색 없음)
  if (NON_ALIGNED.has(iso)) return "non-aligned";
  if (ANTI_WESTERN.has(iso)) return "anti-western";
  if (PRO_WESTERN.has(iso)) return "pro-western";
  return "none"; // SCO_MIXED(인도·파키스탄), RCEP 단독 소속국 등
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

function main() {
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

  const missing = [...ALL_ISOS].filter((iso) => !byIso.has(iso));
  if (missing.length) {
    console.error("MISSING:", missing.join(", "));
    process.exit(1);
  }

  const features = [...ALL_ISOS].map((iso) => {
    const f = byIso.get(iso);
    f.properties.camp = camp(iso);
    f.properties.memberships = membershipsOf(iso);
    return f;
  });

  const out = { type: "FeatureCollection", name: "geoecon-bloc-countries-ne110m", features };
  const json = `${JSON.stringify(out)}\n`;
  fs.writeFileSync("/tmp/geoecon-bloc-countries.json", json);
  console.log("features:", features.length, "bytes:", json.length);
  const byCamp = {};
  for (const f of features) {
    byCamp[f.properties.camp] = (byCamp[f.properties.camp] || 0) + 1;
  }
  console.log("camp counts:", byCamp);
}

main();
