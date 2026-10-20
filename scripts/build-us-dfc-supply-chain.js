/**
 * U.S. International Development Finance Corporation ActiveProjects.xlsx
 * → country-level development-finance links for the geoeconomics globe.
 *
 * Usage:
 *   node scripts/build-us-dfc-supply-chain.js
 *   DFC_ACTIVE_PROJECTS_XLSX=/path/ActiveProjects.xlsx node scripts/build-us-dfc-supply-chain.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const XLSX_PATH =
  process.env.DFC_ACTIVE_PROJECTS_XLSX ||
  path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "ActiveProjects.xlsx");
const COUNTRIES_PATH = path.join(ROOT, "public", "data", "lite", "countries.json");
const OUTPUTS = [
  path.join(ROOT, "src", "data", "us-dfc-supply-chain.json"),
  path.join(ROOT, "public", "data", "lite", "us-dfc-supply-chain.json"),
  path.join(ROOT, "public", "data", "full", "us-dfc-supply-chain.json"),
];

const COUNTRY_ALIASES = {
  Burma: "Myanmar",
  "Democratic Republic Of Congo": "Democratic Republic of the Congo",
  "St. Vincent and the Grenadines": "Saint Vincent and the Grenadines",
  "Trinidad & Tobago": "Trinidad and Tobago",
  "West Bank And Gaza": "Palestine",
};

const COUNTRY_ISO_ALIASES = {
  "Cote D'Ivoire": "CIV",
};

const NON_COUNTRY = new Set([
  "Africa Regional",
  "Asia Regional",
  "Europe Regional",
  "Latin America Regional",
  "Middle East Regional",
  "Redacted",
  "Worldwide",
]);

function unzipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Invalid XLSX: ZIP directory not found");

  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Invalid XLSX: malformed ZIP directory");
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8")
      .replace(/\\/g, "/");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid XLSX: local entry missing for ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const payload =
      method === 0
        ? compressed
        : method === 8
          ? zlib.inflateRawSync(compressed)
          : null;
    if (payload) entries.set(name, payload);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const values = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const text = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]))
      .join("");
    values.push(text);
  }
  return values;
}

function parseRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const column = /^[A-Z]+/.exec(ref)?.[0];
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? "";
      const inline = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(cellMatch[2])?.[1];
      row[column] =
        type === "s" && raw !== ""
          ? sharedStrings[Number(raw)] ?? ""
          : type === "inlineStr" && inline != null
            ? decodeXml(inline)
            : decodeXml(raw);
    }
    rows.push(row);
  }
  return rows;
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) throw new Error(`Missing workbook: ${XLSX_PATH}`);
  if (!fs.existsSync(COUNTRIES_PATH)) throw new Error(`Missing country centers: ${COUNTRIES_PATH}`);

  const entries = unzipEntries(fs.readFileSync(XLSX_PATH));
  const shared = parseSharedStrings(entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  const sheet = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!sheet) throw new Error("ActiveProjects workbook is missing Sheet1");
  const rows = parseRows(sheet, shared);
  const header = rows.shift();
  if (header?.A !== "Fiscal Year" || header?.E !== "Country" || header?.I !== "Committed") {
    throw new Error("Unexpected ActiveProjects workbook schema");
  }

  const countries = JSON.parse(fs.readFileSync(COUNTRIES_PATH, "utf8"));
  const countryByName = new Map();
  const countryByIso = new Map();
  for (const country of countries) {
    countryByName.set(normalizeName(country.name), country);
    countryByName.set(normalizeName(country.nameLong), country);
    countryByIso.set(country.isoA3, country);
  }

  const aggregates = new Map();
  let excludedProjects = 0;
  let mappedProjects = 0;
  let mappedCommitmentUsd = 0;
  for (const row of rows) {
    const sourceCountry = String(row.E || "").trim();
    if (!sourceCountry || NON_COUNTRY.has(sourceCountry)) {
      excludedProjects += 1;
      continue;
    }
    const lookupName = COUNTRY_ALIASES[sourceCountry] || sourceCountry;
    const country =
      countryByIso.get(COUNTRY_ISO_ALIASES[sourceCountry]) ||
      countryByName.get(normalizeName(lookupName));
    if (!country) {
      console.warn(`Unmapped DFC country: ${sourceCountry}`);
      excludedProjects += 1;
      continue;
    }

    const committedUsd = Number(row.I || 0);
    const amount = Number.isFinite(committedUsd) ? Math.max(0, committedUsd) : 0;
    const sector = String(row.J || "Unspecified").trim() || "Unspecified";
    const projectName = String(row.H || "Unnamed project").trim() || "Unnamed project";
    const fiscalYear = Number(row.A || 0);
    let agg = aggregates.get(country.isoA3);
    if (!agg) {
      agg = {
        isoA3: country.isoA3,
        country: country.name,
        lat: country.center.lat,
        lng: country.center.lng,
        projectCount: 0,
        committedUsd: 0,
        latestFiscalYear: 0,
        sectors: new Map(),
        projects: new Map(),
      };
      aggregates.set(country.isoA3, agg);
    }
    agg.projectCount += 1;
    agg.committedUsd += amount;
    agg.latestFiscalYear = Math.max(agg.latestFiscalYear, fiscalYear);
    agg.sectors.set(sector, (agg.sectors.get(sector) || 0) + amount);
    agg.projects.set(projectName, Math.max(agg.projects.get(projectName) || 0, amount));
    mappedProjects += 1;
    mappedCommitmentUsd += amount;
  }

  const origin = { lat: 38.9072, lng: -77.0369 };
  const links = [...aggregates.values()]
    .map((agg) => {
      const [topSector] = topEntry(agg.sectors);
      const [topProject] = topEntry(agg.projects);
      return {
        id: `us-dfc-${String(agg.isoA3).toLowerCase()}`,
        isoA3: agg.isoA3,
        country: agg.country,
        projectCount: agg.projectCount,
        committedUsd: Math.round(agg.committedUsd),
        latestFiscalYear: agg.latestFiscalYear,
        topSector,
        topProject,
        lat: agg.lat,
        lng: agg.lng,
        olat: origin.lat,
        olng: origin.lng,
      };
    })
    .sort((a, b) => b.committedUsd - a.committedUsd);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "U.S. International Development Finance Corporation Active Projects",
    attribution: "U.S. International Development Finance Corporation (DFC)",
    methodology:
      "Country-level aggregation of active DFC projects; regional, worldwide, and redacted locations excluded.",
    summary: {
      sourceProjects: rows.length,
      mappedProjects,
      excludedProjects,
      mappedCountries: links.length,
      mappedCommitmentUsd: Math.round(mappedCommitmentUsd),
    },
    links,
  };

  for (const output of OUTPUTS) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  console.log(
    `U.S. DFC network: ${mappedProjects}/${rows.length} projects, ${links.length} countries, $${(
      mappedCommitmentUsd / 1e9
    ).toFixed(1)}B`,
  );
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
