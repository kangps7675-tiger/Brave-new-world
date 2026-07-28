#!/usr/bin/env node
/**
 * README · stub-off-checklist · deferred-status · liveRenderGuard · layerExclusiveCap
 * 숫자 일치 검증. CI / 배포 게이트에서 실행.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustInclude(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[verify-product-spec] FAIL ${label}: missing "${needle}" in ${file}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`[verify-product-spec] OK ${label}`);
  return true;
}

function extractConst(src, name) {
  const re = new RegExp(`export const ${name}\\s*=\\s*(\\d+)`);
  const m = src.match(re);
  if (!m) {
    console.error(`[verify-product-spec] FAIL: ${name} not found in source`);
    process.exitCode = 1;
    return null;
  }
  return Number(m[1]);
}

/** SSOT: geowatch.config caps — layerExclusiveCap re-exports GEOWATCH_CONFIG */
function extractConfigCap(configSrc, key) {
  const re = new RegExp(`${key}:\\s*(\\d+)`);
  const m = configSrc.match(re);
  if (!m) {
    console.error(`[verify-product-spec] FAIL: caps.${key} not found in geowatch.config`);
    process.exitCode = 1;
    return null;
  }
  return Number(m[1]);
}

function mustExportCapAlias(capSrc, name, configToken) {
  if (!capSrc.includes(`export const ${name}`) || !capSrc.includes(configToken)) {
    console.error(
      `[verify-product-spec] FAIL: ${name} must re-export ${configToken} from GEOWATCH_CONFIG`,
    );
    process.exitCode = 1;
    return false;
  }
  console.log(`[verify-product-spec] OK ${name} → ${configToken}`);
  return true;
}

const capSrc = read("src/lib/layerExclusiveCap.ts");
const configSrc = read("src/config/geowatch.config.ts");
const pkgSrc = read("src/lib/viewPackages.ts");
const guardSrc = read("src/lib/liveRenderGuard.ts");
const specSrc = read("src/lib/productSpec.ts");

mustExportCapAlias(capSrc, "ACTIVE_LAYER_CAP_DEFAULT", "fullModeMaxLayers");
mustExportCapAlias(capSrc, "ACTIVE_LAYER_CAP_ULTRA", "ultraLiteMaxLayers");

const DEFAULT = extractConfigCap(configSrc, "fullModeMaxLayers");
const ULTRA = extractConfigCap(configSrc, "ultraLiteMaxLayers");
const HARD = extractConst(pkgSrc, "MAX_ON_LAYERS");
const HARD_E = extractConst(pkgSrc, "MAX_ON_LAYERS_ECONOMY");

if (DEFAULT == null || ULTRA == null || HARD == null || HARD_E == null) {
  process.exit(1);
}

if (DEFAULT !== 30 || ULTRA !== 16 || HARD !== 64 || HARD_E !== 64) {
  console.error(
    `[verify-product-spec] unexpected caps: default=${DEFAULT} ultra=${ULTRA} hard=${HARD}/${HARD_E}`,
  );
  process.exitCode = 1;
}

mustInclude(
  "src/lib/productSpec.ts",
  "ACTIVE_LAYER_CAP_DEFAULT",
  "productSpec re-exports caps",
);
mustInclude("src/lib/productSpec.ts", "newsRss: 150_000", "productSpec news poll");
mustInclude("src/lib/liveRenderGuard.ts", "LIVE.newsRssMs", "liveRenderGuard news SSOT");
mustInclude("src/lib/liveRenderGuard.ts", "LIVE.tzevaMs", "liveRenderGuard tzeva SSOT");
mustInclude("src/config/geowatch.config.ts", "newsRssMs: 150_000", "config news 150s");
mustInclude("src/config/geowatch.config.ts", "tzevaMs: 15_000", "config tzeva 15s");
mustInclude("docs/stub-off-checklist.md", `일반 **${DEFAULT}**`, "stub-off UI cap default");
mustInclude("docs/stub-off-checklist.md", `Ultra-Lite **${ULTRA}**`, "stub-off UI cap ultra");
mustInclude("docs/stub-off-checklist.md", `**${HARD}**`, "stub-off package hard");
mustInclude("docs/stub-off-checklist.md", "150s", "stub-off news 150s");
mustInclude("docs/stub-off-checklist.md", "max 120", "stub-off AIS max");
mustInclude("docs/deferred-status.md", `**${DEFAULT}**`, "deferred default cap");
mustInclude("docs/deferred-status.md", `**${ULTRA}**`, "deferred ultra cap");
mustInclude("README.md", `일반 **${DEFAULT}**`, "README default cap");
mustInclude("README.md", `Ultra-Lite **${ULTRA}**`, "README ultra cap");
mustInclude("README.md", `**${HARD}**`, "README hard cap");

// liveRenderGuard stub-OFF path must read GEOWATCH_CONFIG.polling (SSOT)
const checks = [
  ["liveTzevaPollMs", "LIVE.tzevaMs", "tzevaMs: 15_000"],
  ["liveTelegramPollMs", "LIVE.telegramMs", "telegramMs: 30_000"],
  ["liveNewsPollMs", "LIVE.newsRssMs", "newsRssMs: 150_000"],
  ["liveAisPollMs", "LIVE.aisMs", "aisMs: 90_000"],
  ["liveMilPollMs", "LIVE.milAdsbMs", "milAdsbMs: 75_000"],
  ["liveTickerPollMs", "LIVE.tickerMs", "tickerMs: 15 * 60_000"],
];
for (const [fn, guardToken, configToken] of checks) {
  if (!guardSrc.includes(fn) || !guardSrc.includes(guardToken)) {
    console.error(`[verify-product-spec] FAIL guard ${fn} missing ${guardToken}`);
    process.exitCode = 1;
  } else if (!configSrc.includes(configToken)) {
    console.error(`[verify-product-spec] FAIL config missing ${configToken} for ${fn}`);
    process.exitCode = 1;
  } else {
    console.log(`[verify-product-spec] OK guard ${fn}`);
  }
}

if (!specSrc.includes("STUB_OFF_FETCH_MAX") || !specSrc.includes("ais: 120")) {
  console.error("[verify-product-spec] FAIL productSpec AIS max");
  process.exitCode = 1;
}

if (process.exitCode) {
  console.error("[verify-product-spec] failed");
  process.exit(process.exitCode);
}
console.log("[verify-product-spec] all checks passed");
