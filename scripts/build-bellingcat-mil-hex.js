/**
 * Extract military ICAO hex codes from Bellingcat/Turnstone modes.csv.
 * Source: https://github.com/bellingcat/adsb-history.git (MIT)
 *
 * Usage:
 *   node scripts/build-bellingcat-mil-hex.js [path/to/modes.csv]
 */
const fs = require("fs");
const path = require("path");

const SOURCE = "https://github.com/bellingcat/adsb-history.git";
const DEFAULT_CSV =
  process.env.BELLINGCAT_MODES_CSV ||
  path.join(process.env.TEMP || "/tmp", "adsb-history", "backend-data-loading", "modes.csv");

function parseCsvRow(line) {
  const fields = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  fields.push(cur);
  return fields;
}

function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("modes.csv not found:", csvPath);
    process.exit(1);
  }

  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/);
  const header = parseCsvRow(lines[0]);
  const mi = header.indexOf("military");
  const hi = header.indexOf("hex");
  const ri = header.indexOf("registration");
  const ti = header.indexOf("typecode");
  const ci = header.indexOf("category");
  if (mi < 0 || hi < 0) {
    console.error("Unexpected header:", header);
    process.exit(1);
  }

  const hexes = [];
  const byHex = {};
  let bad = 0;

  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const f = parseCsvRow(lines[i]);
    if (f.length !== header.length) {
      bad += 1;
      continue;
    }
    if (String(f[mi]).toLowerCase() !== "t") continue;
    const hex = String(f[hi] || "")
      .toLowerCase()
      .trim();
    if (!/^[0-9a-f]{6}$/.test(hex)) continue;
    hexes.push(hex);
    byHex[hex] = [
      String(f[ri] || "").trim(),
      String(f[ti] || "").trim(),
      String(f[ci] || "").trim(),
    ];
  }

  hexes.sort();
  const outDir = path.join(__dirname, "..", "src", "data", "generated");
  fs.mkdirSync(outDir, { recursive: true });

  const hexPayload = {
    source: SOURCE,
    license: "MIT",
    note: "military=t rows from backend-data-loading/modes.csv (Turnstone / Bellingcat adsb-history)",
    generatedAt: new Date().toISOString(),
    count: hexes.length,
    hexes,
  };
  const hexFile = path.join(outDir, "bellingcat-mil-hexes.json");
  fs.writeFileSync(hexFile, JSON.stringify(hexPayload));

  // Worker-local copy (no shared path with Next app)
  const workerDir = path.join(__dirname, "..", "workers", "cron-ingest", "src", "data");
  fs.mkdirSync(workerDir, { recursive: true });
  fs.writeFileSync(
    path.join(workerDir, "bellingcat-mil-hexes.json"),
    JSON.stringify({ source: SOURCE, count: hexes.length, hexes }),
  );

  console.log(
    JSON.stringify(
      {
        mil: hexes.length,
        badRows: bad,
        enrichedMetaSkipped: Object.keys(byHex).length,
        hexFile,
        hexKb: Math.round(fs.statSync(hexFile).size / 1024),
      },
      null,
      2,
    ),
  );
}

main();
