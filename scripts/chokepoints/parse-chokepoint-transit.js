#!/usr/bin/env node
/**
 * IMF PortWatch "Daily Chokepoint Transit Calls and Trade Volume Estimates" → dynamic
 * chokepoint stress index + daily transit cache for /api/portwatch.
 *
 * Accepts CSV or GeoJSON bulk download from:
 *   https://portwatch.imf.org/datasets/42132aa4e2fc4d41bdaf9a445f688931_0/about
 *
 * Output:
 *   scripts/data/choke-stress.json + public/data/crink/choke-stress.json
 *   scripts/data/chokepoint-transit-daily.json + public/data/crink/chokepoint-transit-daily.json
 *
 * Usage:
 *   node scripts/chokepoints/parse-chokepoint-transit.js /path/to/Daily_Chokepoints_Data.geojson
 *   npm run corridors:chokepointtransit -- /path/to/Daily_Chokepoints_Data.geojson
 */
const fs = require("fs");
const path = require("path");
const {
  writeAllChokepointOutputs,
  logChokeStressResult,
  parseNumber,
  ROOT,
} = require("./chokepoint-transit-lib");

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function normalizeHeader(h) {
  return String(h || "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s./]+/g, "_");
}
function findCol(headers, exact) {
  return headers.indexOf(exact);
}

function parseCsvRecords(cliPath) {
  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error(`empty CSV: ${cliPath}`);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);

  const yearIdx = findCol(headers, "year");
  const portnameIdx = findCol(headers, "portname");
  const totalIdx = findCol(headers, "n_total");
  const dateIdx = findCol(headers, "date");
  const capacityIdx = findCol(headers, "capacity");
  const portidIdx = findCol(headers, "portid");
  if ([yearIdx, portnameIdx, totalIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized Daily_Chokepoints_Data headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }

  const records = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    records.push({
      year: Number(cols[yearIdx]),
      portname: cols[portnameIdx],
      n_total: parseNumber(cols[totalIdx]),
      date: dateIdx >= 0 ? cols[dateIdx] : null,
      capacity: capacityIdx >= 0 ? parseNumber(cols[capacityIdx]) : null,
      portid: portidIdx >= 0 ? cols[portidIdx] : null,
    });
  }
  return records;
}

function parseGeoJsonRecords(cliPath) {
  const raw = JSON.parse(fs.readFileSync(cliPath, "utf8"));
  const features = raw?.features;
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error(`empty GeoJSON FeatureCollection: ${cliPath}`);
  }
  const records = [];
  for (const feature of features) {
    const p = feature?.properties;
    if (!p) continue;
    records.push({
      year: Number(p.year),
      portname: p.portname,
      n_total: parseNumber(p.n_total),
      date: p.date ? String(p.date).slice(0, 10) : null,
      capacity: parseNumber(p.capacity),
      portid: p.portid ?? null,
    });
  }
  return records;
}

function parseRecords(cliPath) {
  const ext = path.extname(cliPath).toLowerCase();
  if (ext === ".geojson" || ext === ".json") return parseGeoJsonRecords(cliPath);
  return parseCsvRecords(cliPath);
}

function main() {
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error(
      "Usage: node scripts/chokepoints/parse-chokepoint-transit.js /path/to/Daily_Chokepoints_Data.{geojson,csv}\n" +
        "  Prefer: npm run corridors:chokepointtransit:fetch  (ArcGIS API, no manual download)\n" +
        "  Or download GeoJSON/CSV from https://portwatch.imf.org/datasets/42132aa4e2fc4d41bdaf9a445f688931_0/about",
    );
    process.exit(1);
  }

  const records = parseRecords(cliPath);
  const payload = writeAllChokepointOutputs(records, { sourceFile: path.basename(cliPath) });
  logChokeStressResult(payload, ROOT);
}

main();
