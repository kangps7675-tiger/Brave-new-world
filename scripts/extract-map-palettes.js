/**
 * 원지도 JPG/PNG에서 색을 추출해 벡터 팔레트 JSON 생성.
 * node scripts/extract-map-palettes.js
 */
const fs = require("fs");
const path = require("path");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "..");
const TEXTURE_DIR = path.join(ROOT, "public", "textures");
const APP_DATA = path.join(ROOT, "public", "data", "lite", "app-data.json");
const OUT_JSON = path.join(ROOT, "src", "data", "map-palettes.json");

const MODES = {
  night: { file: "earth-night.jpg" },
  satellite: { file: "earth-blue-marble.jpg" },
  topo: { file: "earth-etopo-topo.jpg" },
};

const REMOTE = {
  "earth-night.jpg": "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  "earth-blue-marble.jpg": "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  "earth-etopo-topo.jpg": "https://unpkg.com/three-globe/example/img/earth-water.png",
};

/** equirectangular: lng -180..180, lat -90..90 */
const OCEAN_SAMPLES = [
  [0, 0],
  [25, -20],
  [-35, 30],
  [165, -10],
  [-140, 35],
  [75, -40],
];

const OCEAN_SAMPLES_NIGHT = [
  [-165, 12],
  [-125, -28],
  [25, -38],
  [155, -32],
  [-25, 48],
  [110, -8],
];

function brightness([r, g, b]) {
  return r + g + b;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function lngLatToPx(lng, lat, width, height) {
  const x = Math.round(((lng + 180) / 360) * (width - 1));
  const y = Math.round(((90 - lat) / 180) * (height - 1));
  return [clamp(x, 0, width - 1), clamp(y, 0, height - 1)];
}

function readPixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function avgRgb(samples) {
  if (samples.length === 0) return [0, 0, 0];
  const sum = samples.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]);
  return sum.map((v) => Math.round(v / samples.length));
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function toRgba([r, g, b], a = 0.95) {
  return `rgba(${r},${g},${b},${a})`;
}

function darken([r, g, b], amt = 12) {
  return [Math.max(0, r - amt), Math.max(0, g - amt), Math.max(0, b - amt)];
}

function lighten([r, g, b], amt = 35) {
  return [Math.min(255, r + amt), Math.min(255, g + amt), Math.min(255, b + amt)];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

async function ensureTexture(name) {
  const dest = path.join(TEXTURE_DIR, name);
  if (fs.existsSync(dest)) return dest;
  const url = REMOTE[name];
  if (!url) throw new Error(`No remote URL for ${name}`);
  fs.mkdirSync(TEXTURE_DIR, { recursive: true });
  process.stdout.write(`Downloading ${name}... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log("OK");
  return dest;
}

function decodeImage(filePath) {
  const buf = fs.readFileSync(filePath);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (isPng) {
    const png = PNG.sync.read(buf);
    return { data: png.data, width: png.width, height: png.height };
  }
  const img = jpeg.decode(buf, { useTArray: true });
  const data = Buffer.alloc(img.width * img.height * 4);
  for (let i = 0, j = 0; i < img.data.length; i += 3, j += 4) {
    data[j] = img.data[i];
    data[j + 1] = img.data[i + 1];
    data[j + 2] = img.data[i + 2];
    data[j + 3] = 255;
  }
  return { data, width: img.width, height: img.height };
}

function sampleAt(data, width, height, lng, lat) {
  const [x, y] = lngLatToPx(lng, lat, width, height);
  return readPixel(data, width, x, y);
}

function sampleCountryLand(data, width, height, country, mode) {
  const { lat, lng } = country.center;
  const span = mode === "night" ? 2.5 : 1.2;
  const steps = mode === "night" ? 5 : 3;
  const samples = [];

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const dLat = (i / (steps - 1) - 0.5) * span;
      const dLng = (j / (steps - 1) - 0.5) * span;
      samples.push(sampleAt(data, width, height, lng + dLng, lat + dLat));
    }
  }

  if (mode === "night") {
    const sorted = [...samples].sort((a, b) => brightness(a) - brightness(b));
    const darkest = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.45)));
    let rgb = avgRgb(darkest);
    const max = Math.max(...rgb);
    if (max > 48) {
      const scale = 48 / max;
      rgb = rgb.map((v) => Math.round(v * scale));
    }
    return rgb;
  }

  return avgRgb(samples);
}

function sampleOcean(data, width, height, mode) {
  const points = mode === "night" ? OCEAN_SAMPLES_NIGHT : OCEAN_SAMPLES;
  const samples = points.map(([lng, lat]) => sampleAt(data, width, height, lng, lat));

  if (mode === "night") {
    const dark = samples.filter((c) => brightness(c) < 90);
    const pool = dark.length >= 3 ? dark : samples;
    const sorted = [...pool].sort((a, b) => brightness(a) - brightness(b));
    return avgRgb(sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.5))));
  }

  return avgRgb(samples);
}

async function extractMode(mode, config, countries) {
  const filePath = await ensureTexture(config.file);
  const { data, width, height } = decodeImage(filePath);

  const ocean = sampleOcean(data, width, height, mode);
  const background = darken(ocean, mode === "night" ? 6 : 10);

  const landSamples = [];
  const countriesMap = {};

  for (const country of countries) {
    const key = country.isoA3 || country.id;
    if (!key) continue;
    const rgb = sampleCountryLand(data, width, height, country, mode);
    countriesMap[key] = toHex(rgb);
    landSamples.push(rgb);
  }

  const avgLand = avgRgb(landSamples.slice(0, 120));
  const coastline =
    mode === "night"
      ? mix(avgLand, lighten(ocean, 40), 0.25)
      : mix(avgLand, lighten(ocean, 25), 0.35);
  const border = lighten(coastline, mode === "night" ? 45 : 28);

  return {
    backgroundColor: toHex(background),
    oceanColor: toHex(ocean),
    landFillColor: toRgba(avgLand),
    coastlineColor: toRgba(coastline, 0.85),
    borderColor: toRgba(border, 0.9),
    countries: countriesMap,
  };
}

async function main() {
  if (!fs.existsSync(APP_DATA)) {
    throw new Error(`Missing ${APP_DATA} — run data:build:lite first`);
  }

  const appData = JSON.parse(fs.readFileSync(APP_DATA, "utf8"));
  const countries = appData.countries.filter((c) => c.center && (c.isoA3 || c.id));

  const output = {
    generatedAt: new Date().toISOString(),
    source: "three-globe example textures + lite/app-data.json country centers",
    modes: {},
  };

  for (const [mode, config] of Object.entries(MODES)) {
    process.stdout.write(`Extracting ${mode}... `);
    output.modes[mode] = await extractMode(mode, config, countries);
    console.log(`OK (${Object.keys(output.modes[mode].countries).length} countries)`);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUT_JSON}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
