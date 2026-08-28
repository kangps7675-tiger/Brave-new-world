#!/usr/bin/env node
/**
 * Fetch IMF PortWatch Daily Chokepoint Transit from ArcGIS FeatureServer and
 * write choke-stress.json (replaces littoral-country UNCTAD proxy for all 9 chokepoints).
 *
 * Source layer:
 *   https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0
 *
 * Usage:
 *   node scripts/chokepoints/fetch-chokepoint-transit.js
 *   npm run corridors:chokepointtransit:fetch
 */
const {
  writeAllChokepointOutputs,
  logChokeStressResult,
  ROOT,
} = require("./chokepoint-transit-lib");

const QUERY_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";
const PAGE_SIZE = 1000;
const SLEEP_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(offset) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "year,portname,n_total",
    returnGeometry: "false",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    f: "json",
  });
  const res = await fetch(`${QUERY_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`ArcGIS query failed (${res.status}) offset=${offset}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`ArcGIS error offset=${offset}: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function fetchAllRecords() {
  const records = [];
  let offset = 0;
  let page = 0;
  while (true) {
    page += 1;
    const data = await fetchPage(offset);
    const features = data.features || [];
    if (!features.length) break;
    for (const f of features) {
      const a = f.attributes || {};
      records.push({
        year: a.year,
        portname: a.portname,
        n_total: a.n_total,
        date: a.date ? String(a.date).slice(0, 10) : null,
        capacity: a.capacity,
        portid: a.portid ?? null,
      });
    }
    process.stdout.write(`\r[fetch] page ${page}, ${records.length} rows...`);
    const hasMore = Boolean(data.exceededTransferLimit) || features.length >= PAGE_SIZE;
    if (!hasMore) break;
    offset += features.length;
    await sleep(SLEEP_MS);
  }
  process.stdout.write("\n");
  return records;
}

async function main() {
  console.log("[fetch] IMF PortWatch Daily_Chokepoints_Data …");
  const records = await fetchAllRecords();
  if (!records.length) {
    console.error("[fetch] no records returned");
    process.exit(1);
  }

  const payload = writeAllChokepointOutputs(records, {
    sourceUrl: QUERY_URL,
    fetchedRows: records.length,
  });
  logChokeStressResult(payload, ROOT);
}

main().catch((err) => {
  console.error("[fetch] failed:", err.message);
  process.exit(1);
});
