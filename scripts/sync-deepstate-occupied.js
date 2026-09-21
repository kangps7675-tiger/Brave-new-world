/**
 * DeepState history/last → public/data/ukraine-occupied-deepstate.json
 *
 * news_project occupiedUkraine.json 과 같이 좌표만 넣는다.
 * 기본: 3일 주기로 쓸 원본을 DeepState에서 직접 가져온다.
 *   node scripts/sync-deepstate-occupied.js
 * 로컬 덤프:
 *   node scripts/sync-deepstate-occupied.js C:\temp\deepstate-last.json
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_URL = "https://deepstatemap.live/api/history/last";
const DEST = path.join(__dirname, "..", "public", "data", "ukraine-occupied-deepstate.json");
const UA = { minLng: 22, maxLng: 42, minLat: 44, maxLat: 53 };
const USER_AGENT = "BraveNewWorld/0.2 (+deepstate-occupied-snapshot/3d)";

function strip(coords) {
  if (typeof coords[0] === "number") return [Number(coords[0]), Number(coords[1])];
  return coords.map(strip);
}

function ringInTheater(ring) {
  let n = 0;
  let ok = 0;
  for (const c of ring) {
    const lng = +c[0];
    const lat = +c[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    n += 1;
    if (lng >= UA.minLng && lng <= UA.maxLng && lat >= UA.minLat && lat <= UA.maxLat) ok += 1;
  }
  return n > 0 && ok / n >= 0.4;
}

function classify(name) {
  const n = String(name || "");
  if (/geoJSON\.status\.dismissed|Liberated/i.test(n)) return null;
  if (/geoJSON\.territories\.(crimea|ordlo|tuzla)/i.test(n)) return "annexed";
  if (/geoJSON\.status\.occupied/i.test(n)) return "occupied";
  if (/geoJSON\.status\.unknown/i.test(n)) return "unknown";
  if (/geoJSON\.territories\./i.test(n)) return null;
  return null;
}

function toFeatures(d) {
  const feats = [];
  for (const [i, f] of (d.map?.features || d.features || []).entries()) {
    if (f.geometry?.type !== "Polygon" && f.geometry?.type !== "MultiPolygon") continue;
    const kind = classify(f.properties?.name);
    if (!kind) continue;
    const geom = { type: f.geometry.type, coordinates: strip(f.geometry.coordinates) };
    const rings =
      geom.type === "Polygon" ? [geom.coordinates[0]] : geom.coordinates.map((p) => p[0]);
    if (!rings.some((r) => ringInTheater(r))) continue;

    const role = kind === "unknown" ? "ru-claimed" : "ru-occupied";
    const fill = kind === "annexed" ? "#880e4f" : kind === "unknown" ? "#bcaaa4" : "#a52714";
    const stroke = kind === "annexed" ? "#f48fb1" : kind === "unknown" ? "#d7ccc8" : "#ef9a9a";
    const fillOpacity = kind === "unknown" ? 0.28 : 0.32;
    const label = String(f.properties?.name || "")
      .split("///")[1]
      ?.trim()
      .replace(/\s+/g, " ") || "Occupied";

    feats.push({
      type: "Feature",
      id: `ds-${i}`,
      properties: {
        role,
        tier: "macro",
        name: label,
        fill,
        stroke,
        fillOpacity,
        source: "deepstate-temp",
      },
      geometry: geom,
    });
  }
  return feats;
}

async function loadSource() {
  const arg = process.argv[2];
  if (arg && !/^https?:/i.test(arg) && fs.existsSync(arg)) {
    return JSON.parse(fs.readFileSync(arg, "utf8"));
  }
  const url = arg && /^https?:/i.test(arg) ? arg : DEFAULT_URL;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`DeepState HTTP ${res.status}`);
  }
  return res.json();
}

async function main() {
  const d = await loadSource();
  const feats = toFeatures(d);
  if (feats.length === 0) {
    throw new Error("no occupied features after filter");
  }
  const out = {
    type: "FeatureCollection",
    features: feats,
    meta: {
      source: "deepstate",
      deepstateId: d.id ?? null,
      fetchedAt: new Date().toISOString(),
      count: feats.length,
      refreshDays: 3,
    },
  };
  fs.writeFileSync(DEST, JSON.stringify(out));
  const roles = feats.reduce((a, f) => {
    a[f.properties.role] = (a[f.properties.role] || 0) + 1;
    return a;
  }, {});
  console.log(
    JSON.stringify(
      {
        dest: DEST,
        wrote: feats.length,
        bytes: fs.statSync(DEST).size,
        deepstateId: d.id,
        roles,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
