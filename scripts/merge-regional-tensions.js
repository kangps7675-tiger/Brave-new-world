// Merge regional tension / combat seeds into app-data + boost known NE disputes.
// node scripts/merge-regional-tensions.js

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SEED_FILES = [
  path.join(__dirname, "data", "east-asia-tensions-seed.json"),
  path.join(__dirname, "data", "regional-tensions-seed.json"),
  path.join(__dirname, "data", "ironsight-middle-east-zones-seed.json"),
  path.join(__dirname, "data", "ukraine-combat-zones-seed.json"),
];

/** Superseded by ironsight-middle-east-zones-seed.json (IRONSIGHT regionBoxes) */
const DEPRECATED_DISPUTE_IDS = new Set([
  "combat-me-iran-israel",
  "combat-me-iran-heartland",
]);
const {
  CHUNK_FILES,
  readDisputesFromDir,
  writeAppDataChunks,
  isChunkManifest,
} = require("./app-data-chunks");

const OVERVIEW_SEED = path.join(__dirname, "data", "dispute-overviews-seed.json");

const APP_DATA_PATHS = [
  path.join(ROOT, "public", "data", "app-data.json"),
  path.join(ROOT, "public", "data", "full", "app-data.json"),
  path.join(ROOT, "public", "data", "lite", "app-data.json"),
];

const OVERVIEW_PATHS = [
  path.join(ROOT, "public", "data", "full", "dispute-overviews.json"),
  path.join(ROOT, "public", "data", "lite", "dispute-overviews.json"),
];

/** Existing Natural Earth disputes — raise tension + notes */
const TENSION_OVERRIDES = [
  { match: /taiwan/i, tension: "high", note: "대만 문제 · 해협 위기 리스크 (상시 회색지대)" },
  { match: /korean demilitarized|dmz/i, tension: "high", note: "한반도 DMZ · 군사분계 긴장" },
  { match: /korean islands under un/i, tension: "high", note: "서해 접경·NLL 연계 섬 관할" },
  { match: /pinnacle|senkaku|diaoyu/i, tension: "high", note: "센카쿠/댜오위 · 동중국해 영유권" },
  { match: /dokdo|takeshima/i, tension: "medium", note: "독도/다케시마 영유권" },
  { match: /spratly/i, tension: "high", note: "스프래틀리 · 남중국해 다자 분쟁" },
  { match: /paracel/i, tension: "medium", note: "파라셀 · 군사화 거점" },
  { match: /scarborough/i, tension: "high", note: "스카버러 암초 대치" },
  { match: /kuril/i, tension: "medium", note: "남쿠릴/북방영토" },
  { match: /kashmir|jammu|line of control|aksai chin|arunachal/i, tension: "high", note: "남아시아 영토·LoC 긴장" },
  { match: /gaza|west bank|golan/i, tension: "high", note: "중동 전선·점령지 관련" },
  { match: /abkhazia|south ossetia|transnistria|nagorno|donetsk|luhansk|crimea/i, tension: "high", note: "동유럽·코카서스 미인정/교전권" },
];

function loadSeeds() {
  const all = [];
  for (const file of SEED_FILES) {
    if (!fs.existsSync(file)) {
      console.warn("missing seed", file);
      continue;
    }
    all.push(...JSON.parse(fs.readFileSync(file, "utf8")));
  }
  return all;
}

function applyOverrides(dispute) {
  const name = `${dispute.name || ""} ${dispute.nameLong || ""}`;
  for (const rule of TENSION_OVERRIDES) {
    if (!rule.match.test(name)) continue;
    return {
      ...dispute,
      tension: rule.tension,
      note: dispute.note ? `${dispute.note} · ${rule.note}` : rule.note,
    };
  }
  return dispute;
}

function mergeAppData(filePath, seed) {
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", filePath);
    return;
  }
  const outDir = path.dirname(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const existing = isChunkManifest(data)
    ? readDisputesFromDir(outDir)
    : Array.isArray(data.disputes)
      ? data.disputes
      : [];
  const boosted = existing
    .filter((d) => !DEPRECATED_DISPUTE_IDS.has(d.id))
    .map(applyOverrides);
  const ids = new Set(boosted.map((d) => d.id));
  let added = 0;
  for (const item of seed) {
    if (DEPRECATED_DISPUTE_IDS.has(item.id)) continue;
    if (ids.has(item.id)) {
      const idx = boosted.findIndex((d) => d.id === item.id);
      if (idx >= 0) boosted[idx] = { ...boosted[idx], ...item };
      continue;
    }
    boosted.push(item);
    ids.add(item.id);
    added += 1;
  }

  if (isChunkManifest(data)) {
    const countriesPath = path.join(outDir, CHUNK_FILES.countries);
    const placesPath = path.join(outDir, CHUNK_FILES.places);
    const countries = fs.existsSync(countriesPath)
      ? JSON.parse(fs.readFileSync(countriesPath, "utf8"))
      : [];
    const places = fs.existsSync(placesPath)
      ? JSON.parse(fs.readFileSync(placesPath, "utf8"))
      : [];
    writeAppDataChunks(outDir, {
      generatedAt: new Date().toISOString(),
      profile: data.profile,
      sources: data.sources || { naturalEarth: "", gdelt: "" },
      countries,
      disputes: boosted,
      places,
    });
  } else {
    data.disputes = boosted;
    data.generatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
  console.log(`✓ ${path.relative(ROOT, filePath)}: +${added} new disputes, total ${boosted.length}`);
}

function mergeOverviews(filePath, seedItems, overviewExtras) {
  const base = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf8"))
    : { generatedAt: new Date().toISOString(), items: [] };
  const byId = new Map((base.items || []).map((item) => [item.id, item]));
  for (const item of seedItems) byId.set(item.id, item);
  for (const item of overviewExtras) byId.set(item.id, item);
  const next = {
    generatedAt: new Date().toISOString(),
    items: [...byId.values()],
  };
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  console.log(`✓ ${path.relative(ROOT, filePath)}: overviews ${next.items.length}`);
}

function main() {
  const seed = loadSeeds();
  const overviewSeed = JSON.parse(fs.readFileSync(OVERVIEW_SEED, "utf8"));

  const overviewExtras = seed.map((d) => ({
    id: d.id,
    overviewKo: d.nameLong || d.name,
    parties: String(d.sovereignty || "")
      .split(/[/,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    updatedAt: new Date().toISOString().slice(0, 10),
  }));

  for (const file of APP_DATA_PATHS) mergeAppData(file, seed);
  for (const file of OVERVIEW_PATHS) mergeOverviews(file, overviewSeed, overviewExtras);

  const mergedOverviewSeed = [...overviewSeed];
  const ovIds = new Set(overviewSeed.map((o) => o.id));
  for (const item of overviewExtras) {
    if (ovIds.has(item.id)) continue;
    mergedOverviewSeed.push(item);
    ovIds.add(item.id);
  }
  fs.writeFileSync(OVERVIEW_SEED, JSON.stringify(mergedOverviewSeed, null, 2) + "\n");
  console.log(`✓ updated overview seed (${mergedOverviewSeed.length}) · regional seeds ${seed.length}`);
}

main();
