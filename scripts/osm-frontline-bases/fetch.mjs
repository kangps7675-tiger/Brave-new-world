/**
 * Overpass → scripts/data/osm-frontline-bases.json
 * 한국·일본·필리핀·동유럽 NATO 전선 부근, 이름 있는 공군·해군·기지.
 *
 * node scripts/osm-frontline-bases/fetch.mjs
 * node scripts/osm-frontline-bases/fetch.mjs --only=PH
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outPath = path.join(root, "scripts", "data", "osm-frontline-bases.json");

const COUNTRIES = [
  { iso: "KR", name: "South Korea", theater: "korea-japan", bbox: [33.0, 124.4, 38.75, 129.55], cap: 70 },
  { iso: "JP", name: "Japan", theater: "korea-japan", bbox: [24.0, 122.9, 45.8, 146.2], cap: 90 },
  { iso: "TW", name: "Taiwan", theater: "taiwan-strait", bbox: [21.85, 119.25, 25.35, 122.05], cap: 55 },
  { iso: "PH", name: "Philippines", theater: "south-china-sea", bbox: [4.6, 114.0, 21.3, 126.8], cap: 50 },
  { iso: "AU", name: "Australia", theater: "indo-pacific", bbox: [-39.5, 113.0, -10.5, 153.8], cap: 55 },
  { iso: "PL", name: "Poland", theater: "eastern-nato", bbox: [49.0, 14.1, 54.9, 24.2], cap: 50 },
  { iso: "EE", name: "Estonia", theater: "eastern-nato", bbox: [57.5, 21.7, 59.8, 28.3], cap: 25 },
  { iso: "LV", name: "Latvia", theater: "eastern-nato", bbox: [55.6, 20.9, 58.1, 28.3], cap: 25 },
  { iso: "LT", name: "Lithuania", theater: "eastern-nato", bbox: [53.9, 20.9, 56.5, 26.9], cap: 25 },
  { iso: "FI", name: "Finland", theater: "eastern-nato", bbox: [59.7, 19.3, 70.1, 31.6], cap: 40 },
  { iso: "RO", name: "Romania", theater: "eastern-nato", bbox: [43.6, 20.2, 48.3, 29.8], cap: 40 },
  { iso: "SK", name: "Slovakia", theater: "eastern-nato", bbox: [47.7, 16.8, 49.7, 22.6], cap: 20 },
];

const KEEP_MILITARY = new Set(["airfield", "naval_base", "base"]);
const SKIP_NAME_RE =
  /\b(range|shooting|paintball|cadet|recruiting|museum|memorial)\b|사격장|예비군|동원훈련|비상활주로/i;

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

const UA = "BraveTheWorld/0.2 (frontline military OSM extract; local dashboard build)";

function displayName(tags) {
  const name =
    tags["name:en"] || tags.name || tags["name:ko"] || tags.official_name || tags.ref || tags.icao || "";
  const trimmed = String(name).trim();
  if (!trimmed || SKIP_NAME_RE.test(trimmed)) return null;
  return trimmed;
}

function militaryKind(tags) {
  const military = String(tags.military || "").toLowerCase();
  if (KEEP_MILITARY.has(military)) return military;
  const aeroway = String(tags.aeroway || "").toLowerCase();
  if (aeroway === "aerodrome" && (military === "yes" || military === "airfield")) return "airfield";
  return null;
}

function keep(tags) {
  if (tags.abandoned === "yes" || tags.disused === "yes") return false;
  if (String(tags.military || "").toLowerCase() === "abandoned") return false;
  return militaryKind(tags) != null && displayName(tags) != null;
}

function tierOf(kind) {
  return kind === "airfield" || kind === "naval_base" ? 1 : 2;
}

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

function overpassQuery(bbox) {
  const [s, w, n, e] = bbox;
  return `
[out:json][timeout:90];
(
  nwr["military"="airfield"](${s},${w},${n},${e});
  nwr["military"="naval_base"](${s},${w},${n},${e});
  nwr["military"="base"]["name"](${s},${w},${n},${e});
  nwr["aeroway"="aerodrome"]["military"~"^(airfield|yes)$"]["name"](${s},${w},${n},${e});
);
out center tags;
`.trim();
}

async function queryOverpass(bbox) {
  const body = `data=${encodeURIComponent(overpassQuery(bbox))}`;
  let lastError = null;
  for (const url of OVERPASS_URLS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 95_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const json = await res.json();
      return Array.isArray(json.elements) ? json.elements : [];
    } catch (error) {
      lastError = error;
      console.warn(`   overpass fail ${url}: ${error.message || error}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("Overpass failed");
}

function elementCenter(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center && Number.isFinite(el.center.lat) && Number.isFinite(el.center.lon)) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function slugify(value) {
  return String(value || "base")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onlyIso() {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  return arg ? arg.slice("--only=".length).toUpperCase() : null;
}

function inCountry(country, lat, lng) {
  if (country.iso !== "PH") return true;
  if (lat < 7.5 && lng < 119.0) return false;
  return true;
}

async function main() {
  const isoFilter = onlyIso();
  const countries = isoFilter ? COUNTRIES.filter((c) => c.iso === isoFilter) : COUNTRIES;
  if (isoFilter && countries.length === 0) {
    throw new Error(`unknown --only=${isoFilter}`);
  }

  const existing =
    isoFilter && fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
  const points = isoFilter ? existing.filter((p) => p.meta?.iso !== isoFilter) : [];
  const seen = new Set(points.map((p) => coordKey(p.lat, p.lng)));

  for (const country of countries) {
    process.stdout.write(`[osm-frontline] ${country.iso} ${country.name} … `);
    let elements = [];
    try {
      elements = await queryOverpass(country.bbox);
    } catch (error) {
      console.log(`FAIL ${error.message || error}`);
      continue;
    }

    const ranked = [];
    for (const el of elements) {
      const tags = el.tags || {};
      if (!keep(tags)) continue;
      const center = elementCenter(el);
      if (!center) continue;
      if (!inCountry(country, center.lat, center.lng)) continue;
      const kind = militaryKind(tags);
      const name = displayName(tags);
      ranked.push({
        el,
        tags,
        center,
        kind,
        name,
        tier: tierOf(kind),
      });
    }

    ranked.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

    let added = 0;
    for (const item of ranked) {
      if (added >= country.cap) break;
      const key = coordKey(item.center.lat, item.center.lng);
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `osm-${country.iso.toLowerCase()}-${item.el.type[0]}${item.el.id}-${slugify(item.name)}`;
      points.push({
        id,
        kind: "military-base",
        name: item.name,
        lat: Math.round(item.center.lat * 1e4) / 1e4,
        lng: Math.round(item.center.lng * 1e4) / 1e4,
        tier: item.tier,
        meta: {
          country: country.name,
          iso: country.iso,
          theater: country.theater,
          branch: item.kind,
          operator: item.tags.operator || item.tags["operator:en"] || null,
          source: "osm-frontline",
        },
      });
      added += 1;
    }
    console.log(`${elements.length} raw → ${added} kept`);
    await sleep(4000);
  }

  points.sort(
    (a, b) => a.tier - b.tier || String(a.meta.country).localeCompare(String(b.meta.country)) || a.name.localeCompare(b.name),
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(points, null, 2)}\n`);
  console.log(`[osm-frontline] wrote ${points.length} → ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
