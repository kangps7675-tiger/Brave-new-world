/**
 * NE 110m land → 1° 마스크 생성.
 * 출력: scripts/data/land-mask-1deg.json + src/data/landMask1deg.ts
 *
 * usage: node scripts/build-land-mask.js
 */
const fs = require("fs");
const path = require("path");
const { rasterizeLandGeoJson } = require("./lib/landMaskGrid");

const LAND_URLS = [
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson",
];

const OUT_JSON = path.join(__dirname, "data", "land-mask-1deg.json");
const OUT_TS = path.join(__dirname, "..", "src", "data", "landMask1deg.ts");
const CACHE_GEO = path.join(__dirname, "data", "ne_110m_land.geojson");

async function fetchLand() {
  if (fs.existsSync(CACHE_GEO)) {
    console.log("using cached", CACHE_GEO);
    return JSON.parse(fs.readFileSync(CACHE_GEO, "utf8"));
  }
  let lastErr = null;
  for (const url of LAND_URLS) {
    try {
      console.log("fetch", url);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      fs.mkdirSync(path.dirname(CACHE_GEO), { recursive: true });
      fs.writeFileSync(CACHE_GEO, JSON.stringify(json));
      return json;
    } catch (e) {
      lastErr = e;
      console.warn("fail", url, e.message);
    }
  }
  throw lastErr || new Error("land fetch failed");
}

async function main() {
  const geo = await fetchLand();
  console.log("rasterizing 1° land mask…");
  const { width, height, bits, land } = rasterizeLandGeoJson(geo);
  let landCount = 0;
  for (let i = 0; i < land.length; i += 1) if (land[i]) landCount += 1;
  const packed = {
    width,
    height,
    bits,
    source: "Natural Earth 110m land",
    generatedAt: new Date().toISOString(),
    landCells: landCount,
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(packed));
  console.log("wrote", OUT_JSON, `land=${landCount}/${width * height}`);

  const ts = `/**
 * Natural Earth 110m land → 1° occupancy bitmask (build-land-mask.js).
 * 운하·해협 corridor는 바다로 강제 개방.
 * DO NOT EDIT — regenerate via: node scripts/build-land-mask.js
 */
export const LAND_MASK_1DEG = {
  width: ${width} as const,
  height: ${height} as const,
  bits: ${JSON.stringify(bits)},
  source: ${JSON.stringify(packed.source)},
  landCells: ${landCount},
};
`;
  fs.writeFileSync(OUT_TS, ts);
  console.log("wrote", OUT_TS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
