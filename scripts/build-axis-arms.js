/**
 * SIPRI trade-register.csv → scripts/vendor/sipri/axis-arms.json (shelved).
 * Does NOT write to public/ until: node scripts/publish-axis-arms.js
 * Usage: node scripts/build-axis-arms.js [path-to-csv]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "trade-register.csv",
);

/**
 * SIPRI 국가 표기 → ISO3. 축 4개 허브와 거래가 잦은 나라를 넓게 담는다.
 * SIPRI 내려받기 범위를 넓혀도(수령국 추가 등) 스크립트를 고치지 않고 돌릴 수 있게.
 */
const NAME_TO_ISO = {
  // 허브
  China: "CHN",
  Russia: "RUS",
  "Soviet Union": "RUS",
  Iran: "IRN",
  "North Korea": "PRK",
  // 유럽·옛 소련권
  Belarus: "BLR",
  Ukraine: "UKR",
  Armenia: "ARM",
  Azerbaijan: "AZE",
  Georgia: "GEO",
  Kazakhstan: "KAZ",
  Kyrgyzstan: "KGZ",
  Tajikistan: "TJK",
  Turkmenistan: "TKM",
  Uzbekistan: "UZB",
  Mongolia: "MNG",
  Serbia: "SRB",
  Hungary: "HUN",
  Türkiye: "TUR",
  Turkey: "TUR",
  // 중동·북아프리카
  Syria: "SYR",
  Iraq: "IRQ",
  Lebanon: "LBN",
  Yemen: "YEM",
  "Saudi Arabia": "SAU",
  UAE: "ARE",
  "United Arab Emirates": "ARE",
  Qatar: "QAT",
  Oman: "OMN",
  Egypt: "EGY",
  Algeria: "DZA",
  Libya: "LBY",
  Sudan: "SDN",
  "South Sudan": "SSD",
  Israel: "ISR",
  Jordan: "JOR",
  // 남·동남·동아시아
  Myanmar: "MMR",
  Pakistan: "PAK",
  India: "IND",
  Bangladesh: "BGD",
  "Sri Lanka": "LKA",
  Afghanistan: "AFG",
  Laos: "LAO",
  Cambodia: "KHM",
  "Viet Nam": "VNM",
  Vietnam: "VNM",
  Thailand: "THA",
  Malaysia: "MYS",
  Indonesia: "IDN",
  Philippines: "PHL",
  "South Korea": "KOR",
  Japan: "JPN",
  // 아프리카
  Ethiopia: "ETH",
  Eritrea: "ERI",
  Nigeria: "NGA",
  Mali: "MLI",
  "Burkina Faso": "BFA",
  Niger: "NER",
  "Central African Republic": "CAF",
  Uganda: "UGA",
  Tanzania: "TZA",
  Angola: "AGO",
  Zimbabwe: "ZWE",
  "DR Congo": "COD",
  // 미주
  Venezuela: "VEN",
  Cuba: "CUB",
  Nicaragua: "NIC",
  Bolivia: "BOL",
  Peru: "PER",
  Brazil: "BRA",
  Argentina: "ARG",
  Mexico: "MEX",
};

/**
 * 비국가 행위자. SIPRI는 이름 끝에 `*`을 붙여 표시한다.
 * 국가 코드로 합치면 "이란 → 예멘(국가)"처럼 틀린 이야기가 되므로 따로 둔다.
 * `base`는 지도에 놓을 자리(호를 그릴 나라)일 뿐, 그 나라 정부와 같다는 뜻이 아니다.
 * 화면 쪽 이름표는 src/data/armsActors.ts — 여기에 추가하면 거기도 맞춰 넣는다.
 */
const NON_STATE_ACTORS = {
  "Houthi rebels (Yemen)*": { code: "YEM-HOUTHI", base: "YEM" },
  "Anti-Castro rebels (Cuba)*": { code: "CUB-ANTICASTRO", base: "CUB" },
  "Hezbollah (Lebanon)*": { code: "LBN-HEZBOLLAH", base: "LBN" },
  "Hamas (Palestine)*": { code: "PSE-HAMAS", base: "PSE" },
  "PIJ (Palestine)*": { code: "PSE-PIJ", base: "PSE" },
  "Popular Mobilization Forces (Iraq)*": { code: "IRQ-PMF", base: "IRQ" },
};

const HUBS = new Set(["CHN", "RUS", "IRN", "PRK"]);

const CATEGORY_COLOR = {
  Missiles: "rgba(248,113,113,0.82)",
  Aircraft: "rgba(96,165,250,0.82)",
  "Armoured vehicles": "rgba(167,139,250,0.8)",
  Artillery: "rgba(251,146,60,0.8)",
  "Air-defence systems": "rgba(250,204,21,0.78)",
  Sensors: "rgba(125,211,252,0.78)",
  Engines: "rgba(148,163,184,0.75)",
  Other: "rgba(226,232,240,0.7)",
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * SIPRI 이름 → 코드. 비국가 행위자는 국가 코드로 떨어뜨리지 않는다
 * (예전엔 부분 일치로 "Anti-Castro rebels (Cuba)*"가 CUB로 합쳐졌다).
 * 모르는 이름은 null — 호출부가 모아서 경고한다.
 */
function toCode(name) {
  if (!name) return null;
  const clean = name.trim();
  if (NON_STATE_ACTORS[clean]) return NON_STATE_ACTORS[clean].code;
  if (clean.endsWith("*")) return null;
  return NAME_TO_ISO[clean] || null;
}

/** 축 허브인지 — 비국가 행위자는 허브가 될 수 없다. */
function isHub(code) {
  return HUBS.has(code);
}

function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/);
  let headerIdx = lines.findIndex((l) => l.startsWith("SIPRI AT Database ID"));
  if (headerIdx < 0) headerIdx = 11;
  const headers = parseCsvLine(lines[headerIdx]);
  const col = (name) => headers.indexOf(name);

  const iSupplier = col("Supplier");
  const iRecipient = col("Recipient");
  const iDesig = col("Designation");
  const iDesc = col("Description");
  const iCat = col("Armament category");
  const iOrder = col("Order date");
  const iDeliv = col("Delivery year");
  const iTiv = col("TIV delivery values");

  /** @type {Map<string, any>} */
  const pairAgg = new Map();
  const deals = [];
  /** @type {Map<string, number>} 매핑에 없는 SIPRI 이름 → 건수 */
  const unknown = new Map();

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cells = parseCsvLine(line);
    const supplierName = cells[iSupplier];
    const recipientName = cells[iRecipient];
    const s = toCode(supplierName);
    const r = toCode(recipientName);
    if (!s) unknown.set(supplierName, (unknown.get(supplierName) || 0) + 1);
    if (!r) unknown.set(recipientName, (unknown.get(recipientName) || 0) + 1);
    if (!s || !r) continue;
    if (!isHub(s) && !isHub(r)) continue;

    const tiv = Number(cells[iTiv]) || 0;
    const category = cells[iCat] || "Other";
    const year = Number(cells[iDeliv]) || Number(cells[iOrder]) || null;
    const designation = cells[iDesig] || "";
    const description = cells[iDesc] || "";

    const pairKey = `${s}|${r}`;
    const prev = pairAgg.get(pairKey) || {
      supplier: s,
      recipient: r,
      tiv: 0,
      count: 0,
      categories: {},
      years: new Set(),
    };
    prev.tiv += tiv;
    prev.count += 1;
    prev.categories[category] = (prev.categories[category] || 0) + tiv;
    if (year) prev.years.add(year);
    pairAgg.set(pairKey, prev);

    deals.push({
      supplier: s,
      recipient: r,
      designation,
      description,
      category,
      year,
      tiv,
    });
  }

  const pairs = [...pairAgg.values()].map((p) => {
    const topCat =
      Object.entries(p.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
    return {
      supplier: p.supplier,
      recipient: p.recipient,
      tiv: Math.round(p.tiv * 100) / 100,
      count: p.count,
      topCategory: topCat,
      color: CATEGORY_COLOR[topCat] || CATEGORY_COLOR.Other,
      years: [...p.years].sort((a, b) => a - b),
    };
  });

  deals.sort((a, b) => (b.tiv || 0) - (a.tiv || 0));

  const payload = {
    source: "SIPRI Arms Transfers Database",
    generatedAt: new Date().toISOString(),
    yearRange: [2018, 2025],
    citation: "SIPRI Arms Transfers Database © SIPRI. https://www.sipri.org/databases/armstransfers",
    pairs,
    deals: deals.slice(0, 120),
  };

  const vendorDir = path.join(__dirname, "vendor", "sipri");
  fs.mkdirSync(vendorDir, { recursive: true });
  const vendorPath = path.join(vendorDir, "axis-arms.json");
  fs.writeFileSync(vendorPath, JSON.stringify(payload));
  console.log(
    "shelved",
    vendorPath,
    `${pairs.length} pairs`,
    `${payload.deals.length} deals`,
  );
  const nonState = pairs.filter((p) => p.supplier.includes("-") || p.recipient.includes("-"));
  if (nonState.length) {
    console.log(
      "non-state pairs:",
      nonState.map((p) => `${p.supplier}→${p.recipient} (${p.count})`).join(", "),
    );
  }
  if (unknown.size) {
    console.warn(
      "skipped unmapped names (add to NAME_TO_ISO / NON_STATE_ACTORS):",
      [...unknown.entries()].map(([n, c]) => `${n} ×${c}`).join(", "),
    );
  }
  console.log("To expose after clearance: node scripts/publish-axis-arms.js");
}

main();
