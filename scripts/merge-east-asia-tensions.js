// Merge East Asia gray-zone / tension seeds into app-data + boost known NE disputes.
// node scripts/merge-east-asia-tensions.js

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SEED = path.join(__dirname, "data", "east-asia-tensions-seed.json");
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

/** Existing Natural Earth disputes — raise tension + note for East Asia flashpoints */
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
];

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
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const existing = Array.isArray(data.disputes) ? data.disputes : [];
  const boosted = existing.map(applyOverrides);
  const ids = new Set(boosted.map((d) => d.id));
  let added = 0;
  for (const item of seed) {
    if (ids.has(item.id)) continue;
    boosted.push(item);
    ids.add(item.id);
    added += 1;
  }
  data.disputes = boosted;
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`✓ ${path.relative(ROOT, filePath)}: +${added} seed, total ${boosted.length}`);
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
  const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
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

  // Map major NE disputes to overview text where IDs differ — keep seed as-is
  for (const file of APP_DATA_PATHS) mergeAppData(file, seed);
  for (const file of OVERVIEW_PATHS) mergeOverviews(file, overviewSeed, overviewExtras);

  // Keep overview seed file extended for future rebuilds
  const mergedOverviewSeed = [...overviewSeed];
  const ovIds = new Set(overviewSeed.map((o) => o.id));
  for (const item of overviewExtras) {
    if (ovIds.has(item.id)) continue;
    mergedOverviewSeed.push(item);
    ovIds.add(item.id);
  }
  fs.writeFileSync(OVERVIEW_SEED, JSON.stringify(mergedOverviewSeed, null, 2) + "\n");
  console.log(`✓ updated overview seed (${mergedOverviewSeed.length})`);
}

main();
