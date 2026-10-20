/**
 * World Bank BRI Trade Costs Database (WPS8614) → bri-trade-connectivity.json
 *
 * Usage:
 *   node scripts/build-bri-trade.js
 *   BRI_GLOBAL_CSV=/path/to/bri_global_database.csv node scripts/build-bri-trade.js
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..");
const GLOBAL_CSV =
  process.env.BRI_GLOBAL_CSV ||
  path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "bri_global_database.csv");
const REGIONAL_CSV =
  process.env.BRI_REGIONAL_CSV ||
  path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "bri_regional_database.csv");

const OUT_SRC = path.join(ROOT, "src", "data", "bri-trade-connectivity.json");
const OUT_PUBLIC_FULL = path.join(ROOT, "public", "data", "full", "bri-trade-connectivity.json");
const OUT_PUBLIC_LITE = path.join(ROOT, "public", "data", "lite", "bri-trade-connectivity.json");

/** World Bank 3-letter codes → [lat, lng, nameEn, nameKo] */
const COUNTRY_CENTROIDS = {
  afg: [33.94, 67.71, "Afghanistan", "아프가니스탄"],
  alb: [41.33, 19.82, "Albania", "알바니아"],
  are: [24.45, 54.37, "UAE", "UAE"],
  arm: [40.18, 44.51, "Armenia", "아르메니아"],
  aus: [-35.28, 149.13, "Australia", "호주"],
  aze: [40.41, 49.87, "Azerbaijan", "아제르바이잔"],
  bgd: [23.81, 90.41, "Bangladesh", "방글라데시"],
  bhr: [26.23, 50.59, "Bahrain", "바레인"],
  blr: [53.9, 27.56, "Belarus", "벨라루스"],
  brn: [4.89, 114.94, "Brunei", "브루나이"],
  che: [46.95, 7.45, "Switzerland", "스위스"],
  chn: [39.9, 116.41, "China", "중국"],
  cyp: [35.17, 33.36, "Cyprus", "키프로스"],
  egy: [30.04, 31.24, "Egypt", "이집트"],
  esp: [40.42, -3.7, "Spain", "스페인"],
  eth: [9.03, 38.74, "Ethiopia", "에티오피아"],
  fin: [60.17, 24.94, "Finland", "핀란드"],
  fra: [48.86, 2.35, "France", "프랑스"],
  geo: [41.72, 44.78, "Georgia", "조지아"],
  deu: [52.52, 13.41, "Germany", "독일"],
  grc: [37.98, 23.73, "Greece", "그리스"],
  hkg: [22.32, 114.17, "Hong Kong", "홍콩"],
  idn: [-6.21, 106.85, "Indonesia", "인도네시아"],
  ind: [28.61, 77.21, "India", "인도"],
  irn: [35.69, 51.39, "Iran", "이란"],
  irq: [33.31, 44.37, "Iraq", "이라크"],
  isr: [31.77, 35.22, "Israel", "이스라엘"],
  ita: [41.9, 12.5, "Italy", "이탈리아"],
  jor: [31.95, 35.93, "Jordan", "요르단"],
  kaz: [51.17, 71.45, "Kazakhstan", "카자흐스탄"],
  ken: [-1.29, 36.82, "Kenya", "케냐"],
  kgz: [42.87, 74.59, "Kyrgyzstan", "키르기스스탄"],
  khm: [11.56, 104.93, "Cambodia", "캄보디아"],
  kor: [37.57, 126.98, "South Korea", "한국"],
  kwt: [29.38, 47.99, "Kuwait", "쿠웨이트"],
  lbn: [33.89, 35.5, "Lebanon", "레바논"],
  lka: [6.93, 79.85, "Sri Lanka", "스리랑카"],
  mdg: [-18.88, 47.51, "Madagascar", "마다가스카르"],
  mng: [47.92, 106.91, "Mongolia", "몽골"],
  moz: [-25.97, 32.57, "Mozambique", "모잠비크"],
  mus: [-20.16, 57.5, "Mauritius", "모리셔스"],
  mwi: [-13.96, 33.77, "Malawi", "말라위"],
  mys: [3.14, 101.69, "Malaysia", "말레이시아"],
  npl: [27.72, 85.32, "Nepal", "네팔"],
  omn: [23.59, 58.38, "Oman", "오만"],
  pak: [33.68, 73.05, "Pakistan", "파키스탄"],
  phl: [14.6, 120.98, "Philippines", "필리핀"],
  pol: [52.23, 21.01, "Poland", "폴란드"],
  qat: [25.29, 51.53, "Qatar", "카타르"],
  rus: [55.75, 37.62, "Russia", "러시아"],
  rwa: [-1.94, 30.06, "Rwanda", "르완다"],
  sau: [24.71, 46.68, "Saudi Arabia", "사우디"],
  sgp: [1.35, 103.82, "Singapore", "싱가포르"],
  srb: [44.82, 20.46, "Serbia", "세르비아"],
  syc: [-4.62, 55.45, "Seychelles", "세이셸"],
  syr: [33.51, 36.29, "Syria", "시리아"],
  tjk: [38.56, 68.77, "Tajikistan", "타지키스탄"],
  tkm: [37.96, 58.38, "Turkmenistan", "투르크메니스탄"],
  tur: [39.93, 32.86, "Turkey", "튀르키예"],
  tza: [-6.79, 39.28, "Tanzania", "탄자니아"],
  uga: [0.35, 32.58, "Uganda", "우간다"],
  ukr: [50.45, 30.52, "Ukraine", "우크라이나"],
  uzb: [41.3, 69.24, "Uzbekistan", "우즈베키스탄"],
  vnm: [21.03, 105.85, "Vietnam", "베트남"],
  yem: [15.35, 44.21, "Yemen", "예멘"],
  zaf: [-25.75, 28.19, "South Africa", "남아공"],
};

const CN_HUBS = new Set([
  "Beijing",
  "Shanghai",
  "Guangzhou",
  "Shenzhen",
  "Urumqi",
  "Lanzhou",
  "Chongqing",
  "Chengdu",
  "Wuhan",
  "Xian",
  "Xi'an",
  "Nanjing",
  "Qingdao",
  "Dalian",
]);

/** BRI regional city coordinates (capital / major hub approx.) */
const CITY_COORDS = {
  Beijing: [39.9042, 116.4074],
  Shanghai: [31.2304, 121.4737],
  Guangzhou: [23.1291, 113.2644],
  Shenzhen: [22.5431, 114.0579],
  Urumqi: [43.8256, 87.6168],
  Lanzhou: [36.0611, 103.8343],
  Chongqing: [29.4316, 106.9123],
  Chengdu: [30.5728, 104.0668],
  Wuhan: [30.5928, 114.3055],
  Xian: [34.3416, 108.9398],
  "Xi'an": [34.3416, 108.9398],
  Nanjing: [32.0603, 118.7969],
  Qingdao: [36.0671, 120.3826],
  Dalian: [38.914, 121.6147],
  "Kazan'": [55.79, 49.12],
  "Moscow": [55.75, 37.62],
  "Almaty": [43.24, 76.95],
  "Astana": [51.13, 71.43],
  "Tashkent": [41.3, 69.24],
  "Islamabad": [33.68, 73.05],
  "Karachi": [24.86, 67.01],
  "Tehran": [35.69, 51.39],
  "Istanbul": [41.01, 28.98],
  "Singapore": [1.35, 103.82],
  "Jakarta": [-6.21, 106.85],
  "Mumbai": [19.08, 72.88],
  "Colombo": [6.93, 79.85],
  "Dhaka": [23.81, 90.41],
  "Hamburg": [53.55, 9.99],
  "Rotterdam": [51.92, 4.48],
  "Piraeus": [37.94, 23.64],
  "Minsk": [53.9, 27.56],
  "Warsaw": [52.23, 21.01],
  "Bishkek": [42.87, 74.59],
  "Dushanbe": [38.56, 68.77],
  "Ashgabat": [37.96, 58.38],
  "Helsinki": [60.17, 24.94],
  "Madrid": [40.42, -3.7],
  "Lisbon": [38.72, -9.14],
  "Nairobi": [-1.29, 36.82],
  "Dar es Salaam": [-6.79, 39.28],
  "Dubai": [25.2, 55.27],
  "Abu Dhabi": [24.45, 54.37],
  "Bangkok": [13.76, 100.5],
  "Ho Chi Minh City": [10.82, 106.63],
  "Hanoi": [21.03, 105.85],
  "Manila": [14.6, 120.98],
  "Sydney": [-33.87, 151.21],
  "Melbourne": [-37.81, 144.96],
};

function isAggregateCode(code) {
  return code.startsWith("x");
}

async function aggregateGlobal(csvPath) {
  const agg = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });
  let header = false;
  for await (const line of rl) {
    if (!header) {
      header = true;
      continue;
    }
    const parts = line.split(",");
    const origin = parts[0];
    const dest = parts[1];
    if (origin !== "chn" || dest === "chn" || isAggregateCode(dest)) continue;
    const corridors = parseFloat(parts[10]);
    if (!corridors || corridors <= 0) continue;
    const cur = agg.get(dest) || { sum: 0, n: 0 };
    cur.sum += corridors;
    cur.n += 1;
    agg.set(dest, cur);
  }
  return [...agg.entries()]
    .map(([code, v]) => ({ code, impactPct: Math.round((v.sum / v.n) * 1000) / 1000 }))
    .filter((row) => COUNTRY_CENTROIDS[row.code])
    .sort((a, b) => b.impactPct - a.impactPct)
    .slice(0, 55);
}

async function aggregateRegional(csvPath) {
  const rows = [];
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });
  let header = false;
  for await (const line of rl) {
    if (!header) {
      header = true;
      continue;
    }
    const m = line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)$/);
    if (!m) continue;
    const [, originCity, originCountry, destCity, destCountry, , lowerRaw] = m;
    if (originCountry !== "CN" || destCountry === "CN" || !CN_HUBS.has(originCity)) continue;
    const impact = parseFloat(lowerRaw);
    if (!impact || impact < 3) continue;
    const o = CITY_COORDS[originCity];
    const d = CITY_COORDS[destCity];
    if (!o || !d) continue;
    rows.push({
      originCity,
      destCity,
      destCountry,
      impactPct: Math.round(impact * 1000) / 1000,
      olat: o[0],
      olng: o[1],
      dlat: d[0],
      dlng: d[1],
    });
  }
  rows.sort((a, b) => b.impactPct - a.impactPct);
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${row.originCity}|${row.destCity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= 28) break;
  }
  return out;
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  if (!fs.existsSync(GLOBAL_CSV)) {
    console.error(`Missing global CSV: ${GLOBAL_CSV}`);
    process.exit(1);
  }

  const countryRows = await aggregateGlobal(GLOBAL_CSV);
  let cityRows = [];
  if (fs.existsSync(REGIONAL_CSV)) {
    cityRows = await aggregateRegional(REGIONAL_CSV);
  } else {
    console.warn(`Regional CSV not found, skipping city links: ${REGIONAL_CSV}`);
  }

  const [chnLat, chnLng] = COUNTRY_CENTROIDS.chn;
  const countryLinks = countryRows.map((row) => {
    const [lat, lng, nameEn, nameKo] = COUNTRY_CENTROIDS[row.code];
    return {
      id: `bri-chn-${row.code}`,
      destCode: row.code,
      nameEn,
      nameKo,
      impactPct: row.impactPct,
      lat,
      lng,
      olat: chnLat,
      olng: chnLng,
    };
  });

  const cityLinks = cityRows.map((row, i) => ({
    id: `bri-city-${i}-${row.originCity.toLowerCase()}-${row.destCity.toLowerCase().replace(/[^a-z0-9]+/gi, "")}`,
    ...row,
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "World Bank BRI Trade Costs Database (WPS8614)",
    attribution: "de Soyres, Mulabdic, Ruta (2019); World Bank Policy Research Working Paper 8614",
    countryLinks,
    cityLinks,
  };

  writeJson(OUT_SRC, payload);
  writeJson(OUT_PUBLIC_FULL, payload);
  writeJson(OUT_PUBLIC_LITE, payload);

  console.log(`BRI trade connectivity: ${countryLinks.length} country links, ${cityLinks.length} city links`);
  console.log(`  → ${path.relative(ROOT, OUT_SRC)}`);
  console.log(`  → ${path.relative(ROOT, OUT_PUBLIC_FULL)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
