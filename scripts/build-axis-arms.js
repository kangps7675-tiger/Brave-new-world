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

const NAME_TO_ISO = {
  China: "CHN",
  Russia: "RUS",
  Iran: "IRN",
  "North Korea": "PRK",
  Belarus: "BLR",
  Syria: "SYR",
  Myanmar: "MMR",
  Venezuela: "VEN",
  Cuba: "CUB",
  "Houthi rebels (Yemen)*": "YEM",
  "Anti-Castro rebels (Cuba)*": "CUB",
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

function toIso(name) {
  if (!name) return null;
  if (NAME_TO_ISO[name]) return NAME_TO_ISO[name];
  const key = Object.keys(NAME_TO_ISO).find((k) => name.includes(k.replace("*", "")));
  return key ? NAME_TO_ISO[key] : null;
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

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cells = parseCsvLine(line);
    const supplierName = cells[iSupplier];
    const recipientName = cells[iRecipient];
    const s = toIso(supplierName);
    const r = toIso(recipientName);
    if (!s || !r) continue;
    if (!HUBS.has(s) && !HUBS.has(r)) continue;

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
  console.log("To expose after clearance: node scripts/publish-axis-arms.js");
}

main();
