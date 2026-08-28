// archive/military-bases.csv → public military-bases + military-base-areas
// node scripts/convert-military-bases-csv.js

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const { writeJsonArrayFile, roundCoord, compactStaticPoint } = require("./compact-json");

const LOCAL_CSV = path.join(__dirname, "data", "military-bases.csv");
const DEFAULT_CSV = path.join(
  "c:",
  "Users",
  "Administrator",
  "Downloads",
  "archive",
  "military-bases.csv",
);
const CSV_PATH =
  process.env.MILITARY_BASES_CSV ||
  (fs.existsSync(DEFAULT_CSV) ? DEFAULT_CSV : LOCAL_CSV);

function parseLine(line, delim) {
  const cols = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        q = !q;
      }
      continue;
    }
    if (ch === delim && !q) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

function parseGeoPoint(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => Number(part.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  return { lat: parts[0], lng: parts[1] };
}

function parseGeoShape(raw) {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  text = text.replace(/""/g, '"');
  try {
    const geometry = JSON.parse(text);
    if (!geometry || !geometry.type || !geometry.coordinates) return null;
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return null;
    return geometry;
  } catch {
    return null;
  }
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(x - projX, y - projY);
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points.slice();
  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, index + 1), tolerance);
    const right = douglasPeucker(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function closeRing(ring) {
  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
}

function simplifyRing(ring, options) {
  const { maxPoints, minTolerance, maxTolerance } = options;
  if (!Array.isArray(ring) || ring.length < 4) return null;

  let points = ring.map(([lng, lat]) => [Number(lng), Number(lat)]);
  points = points.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (points.length < 4) return null;

  // 닫힌 링이면 마지막 중복점 제거 후 단순화
  const open =
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
      ? points.slice(0, -1)
      : points;

  if (open.length <= maxPoints) {
    return closeRing(open.map(([lng, lat]) => [roundCoord(lng, 5), roundCoord(lat, 5)]));
  }

  let lo = minTolerance;
  let hi = maxTolerance;
  let best = open;

  for (let iter = 0; iter < 12; iter += 1) {
    const mid = (lo + hi) / 2;
    const simplified = douglasPeucker(open, mid);
    if (simplified.length > maxPoints) {
      lo = mid;
    } else {
      best = simplified;
      hi = mid;
    }
  }

  if (best.length > maxPoints) {
    const step = Math.ceil(best.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < best.length; i += step) sampled.push(best[i]);
    if (sampled[sampled.length - 1] !== best[best.length - 1]) {
      sampled.push(best[best.length - 1]);
    }
    best = sampled;
  }

  return closeRing(best.map(([lng, lat]) => [roundCoord(lng, 5), roundCoord(lat, 5)]));
}

function simplifyGeometry(geometry, options) {
  if (geometry.type === "Polygon") {
    const rings = [];
    for (const [index, ring] of geometry.coordinates.entries()) {
      // 외곽 링만 유지 (홀은 글로브 fill에 거의 안 쓰임) — lite는 외곽만
      if (index > 0 && options.outerOnly) continue;
      const simplified = simplifyRing(ring, {
        maxPoints: index === 0 ? options.maxOuter : options.maxHole,
        minTolerance: options.minTolerance,
        maxTolerance: options.maxTolerance,
      });
      if (simplified) rings.push(simplified);
    }
    if (!rings.length) return null;
    return { type: "Polygon", coordinates: rings };
  }

  const polygons = [];
  for (const polygon of geometry.coordinates) {
    const rings = [];
    for (const [index, ring] of polygon.entries()) {
      if (index > 0 && options.outerOnly) continue;
      const simplified = simplifyRing(ring, {
        maxPoints: index === 0 ? options.maxOuter : options.maxHole,
        minTolerance: options.minTolerance,
        maxTolerance: options.maxTolerance,
      });
      if (simplified) rings.push(simplified);
    }
    if (rings.length) polygons.push(rings);
  }
  if (!polygons.length) return null;
  if (polygons.length === 1) return { type: "Polygon", coordinates: polygons[0] };
  return { type: "MultiPolygon", coordinates: polygons };
}

function baseTier(area, component) {
  if (area >= 200) return 1;
  if (area >= 40) return 2;
  if (area >= 5) return 3;
  if (/Active/i.test(component || "")) return 3;
  return 4;
}

function slugify(value) {
  return String(value || "base")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV 없음: ${CSV_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = parseLine(lines[0].replace(/^\uFEFF/, ""), ";").map((h) => h.trim());

  const simplifyOptions = IS_LITE
    ? {
        maxOuter: 36,
        maxHole: 12,
        outerOnly: true,
        minTolerance: 0.00005,
        maxTolerance: 0.05,
      }
    : {
        maxOuter: 72,
        maxHole: 24,
        outerOnly: true,
        minTolerance: 0.00002,
        maxTolerance: 0.03,
      };

  const areas = [];
  const points = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cols = parseLine(line, ";");
    if (cols.length < header.length) {
      skipped += 1;
      continue;
    }
    const row = Object.fromEntries(header.map((key, index) => [key, (cols[index] || "").trim()]));
    const operStat = row["Oper Stat"] || "";
    if (operStat && operStat.toLowerCase() !== "active") continue;

    const center = parseGeoPoint(row["Geo Point"]);
    const geometryRaw = parseGeoShape(row["Geo Shape"]);
    if (!center || !geometryRaw) {
      skipped += 1;
      continue;
    }

    const geometry = simplifyGeometry(geometryRaw, simplifyOptions);
    if (!geometry) {
      skipped += 1;
      continue;
    }

    const objectId = row.OBJECTID || row.OBJECTID_1 || `${center.lat},${center.lng}`;
    const name = row["Site Name"] || `US Base ${objectId}`;
    const component = row.COMPONENT || null;
    const jointBase = row["Joint Base"] && row["Joint Base"] !== "N/A" ? row["Joint Base"] : null;
    const state = row["State Terr"] || null;
    const country = row.COUNTRY || "United States";
    const areaValue = Number(row.AREA);
    const area = Number.isFinite(areaValue) ? areaValue : 0;
    const id = `us-base-${objectId}-${slugify(name)}`;
    const tier = baseTier(area, component);

    const outerRings =
      geometry.type === "Polygon"
        ? [geometry.coordinates[0]]
        : geometry.coordinates.map((poly) => poly[0]);
    const footprint = outerRings.reduce((sum, ring) => sum + ringArea(ring), 0);

    areas.push({
      id,
      kind: "military-base-area",
      name,
      center: {
        lat: roundCoord(center.lat, 5),
        lng: roundCoord(center.lng, 5),
      },
      geometry,
      component,
      jointBase,
      state,
      country,
      area,
      footprint,
      tier,
    });

    points.push({
      id,
      kind: "military-base",
      name,
      lat: roundCoord(center.lat, 5),
      lng: roundCoord(center.lng, 5),
      tier,
      meta: {
        country,
        branch: component,
        state,
        ...(jointBase ? { jointBase } : {}),
        area: area ? Number(area.toFixed(3)) : null,
        source: "military-bases-csv",
      },
    });
  }

  points.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(b.meta.area || 0) - Number(a.meta.area || 0) ||
      a.name.localeCompare(b.name),
  );

  // CSV는 NTAD 본토·괌·PR 위주 → 시드의 미국 해외 거점 + 전선 OSM
  const existing = new Set(points.map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`));
  try {
    const seed = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "military-bases-seed.json"), "utf8"),
    );
    let seedAdded = 0;
    for (const item of seed) {
      if (item.kind !== "military-base") continue;
      const country = String(item.meta?.country || "");
      // 미국 운용 거점만 (비교용 타국 기지는 별도 시드 유지하되 여기선 제외)
      if (!/^(USA|United States|US)$/i.test(country)) continue;
      const key = `${Number(item.lat).toFixed(2)},${Number(item.lng).toFixed(2)}`;
      if (existing.has(key)) continue;
      points.push({
        id: item.id,
        kind: "military-base",
        name: item.name,
        lat: roundCoord(item.lat, 5),
        lng: roundCoord(item.lng, 5),
        tier: item.tier || 2,
        meta: {
          country: "USA",
          hostCountry: item.meta?.hostCountry || null,
          branch: item.meta?.branch || null,
          source: "seed-overseas",
        },
      });
      existing.add(key);
      seedAdded += 1;
    }
    if (seedAdded) console.log(`   +overseas seed markers: ${seedAdded}`);
  } catch (_) {
    // seed optional
  }

  // 전선 부근 OSM + 동유럽 NATO 1선 시드 — 미군 시드와 좌표가 겹치면 건너뜀
  const frontlineFiles = [
    "osm-frontline-bases.json",
    "eastern-nato-frontline-seed.json",
    "philippines-frontline-seed.json",
  ];
  for (const fileName of frontlineFiles) {
    try {
      const frontPath = path.join(__dirname, "data", fileName);
      if (!fs.existsSync(frontPath)) continue;
      const extra = JSON.parse(fs.readFileSync(frontPath, "utf8"));
      let extraAdded = 0;
      for (const item of extra) {
        if (item.kind !== "military-base") continue;
        const lat = Number(item.lat);
        const lng = Number(item.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (item.meta?.iso === "KR" && lng > 129.55) continue;
        if (item.meta?.iso === "PH" && lat < 7.5 && lng < 119.0) continue;
        if (/비상활주로/i.test(String(item.name || ""))) continue;
        const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
        if (existing.has(key)) continue;
        points.push({
          id: item.id,
          kind: "military-base",
          name: item.name,
          lat: roundCoord(lat, 5),
          lng: roundCoord(lng, 5),
          tier: item.tier || 2,
          meta: {
            country: item.meta?.country || null,
            iso: item.meta?.iso || null,
            theater: item.meta?.theater || null,
            branch: item.meta?.branch || null,
            operator: item.meta?.operator || null,
            source: item.meta?.source || "osm-frontline",
          },
        });
        existing.add(key);
        extraAdded += 1;
      }
      if (extraAdded) console.log(`   +${fileName}: ${extraAdded}`);
    } catch (_) {
      /* optional */
    }
  }

  points.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(b.meta?.area || 0) - Number(a.meta?.area || 0) ||
      a.name.localeCompare(b.name),
  );

  // lite: 해외 미군·전선 OSM을 우선 보존하고, 본토는 tier/면적으로 채움
  let cappedPoints = points;
  if (IS_LITE) {
    const CAP = 560;
    const overseas = points.filter((p) => p.meta?.source === "seed-overseas");
    const osmFront = points.filter(
      (p) => p.meta?.source === "osm-frontline" || p.meta?.source === "seed-frontline",
    );
    const rest = points.filter(
      (p) =>
        p.meta?.source !== "seed-overseas" &&
        p.meta?.source !== "osm-frontline" &&
        p.meta?.source !== "seed-frontline",
    );
    cappedPoints = [...overseas, ...osmFront, ...rest].slice(0, CAP);
  }
  const pointIds = new Set(cappedPoints.map((p) => p.id));
  const orderedAreas = areas
    .filter((area) => pointIds.has(area.id))
    .sort((a, b) => b.area - a.area || a.name.localeCompare(b.name));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeJsonArrayFile(
    path.join(OUT_DIR, "military-bases.json"),
    cappedPoints.map(compactStaticPoint),
  );
  writeJsonArrayFile(path.join(OUT_DIR, "military-base-areas.json"), orderedAreas);

  const localCopy = path.join(__dirname, "data", "military-bases.csv");
  if (CSV_PATH !== localCopy) {
    try {
      fs.copyFileSync(CSV_PATH, localCopy);
      console.log(`   copied CSV → ${localCopy}`);
    } catch (error) {
      console.warn("   CSV 로컬 복사 생략:", error.message);
    }
  }

  console.log(
    `military bases (${IS_LITE ? "lite" : "full"}): points=${cappedPoints.length}, areas=${orderedAreas.length}, skipped=${skipped}`,
  );
}

main();
