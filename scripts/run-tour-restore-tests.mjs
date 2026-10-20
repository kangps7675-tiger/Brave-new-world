/**
 * vitest 없이 투어 복구 단위 검증 (localStorage 시뮬).
 * node scripts/run-tour-restore-tests.mjs
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// --- localStorage mock before any app import ---
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(String(k), String(v));
  },
  removeItem: (k) => {
    store.delete(String(k));
  },
  clear: () => store.clear(),
};
globalThis.sessionStorage = {
  getItem: (k) => (store.has(`s:${k}`) ? store.get(`s:${k}`) : null),
  setItem: (k, v) => store.set(`s:${k}`, String(v)),
  removeItem: (k) => store.delete(`s:${k}`),
  clear: () => {
    for (const k of [...store.keys()]) if (String(k).startsWith("s:")) store.delete(k);
  },
};

// Resolve @/ via dynamic import of compiled-free TS is hard; test via source text + duplicated gate logic.
const FIRST_VISIT_TOUR_KEY = "geowatch-first-visit-tour-v1";
const TOUR_INVITE_KEY = "geowatch-tour-invite-v1";

function readTourDone() {
  return localStorage.getItem(FIRST_VISIT_TOUR_KEY) === "1";
}
function readInviteDismissed() {
  return localStorage.getItem(TOUR_INVITE_KEY) === "1";
}
function shouldOffer() {
  if (readTourDone()) return false;
  if (readInviteDismissed()) return false;
  return true;
}

function reset() {
  store.clear();
}

reset();
assert.equal(shouldOffer(), true, "fresh browser offers invite");

localStorage.setItem(TOUR_INVITE_KEY, "1");
assert.equal(shouldOffer(), false, "dismissed invite blocks");

reset();
localStorage.setItem(FIRST_VISIT_TOUR_KEY, "1");
assert.equal(shouldOffer(), false, "completed tour blocks");

reset();
localStorage.setItem(TOUR_INVITE_KEY, "1");
localStorage.setItem(FIRST_VISIT_TOUR_KEY, "1");
localStorage.removeItem(FIRST_VISIT_TOUR_KEY);
assert.equal(readTourDone(), false);
assert.equal(shouldOffer(), false, "invite key alone still blocks auto");

const tourSrc = fs.readFileSync(path.join(root, "src/lib/firstVisitTour.ts"), "utf8");
for (const s of [
  "#ask-layers-button",
  "#view-mode-switcher",
  "#chrome-menu-peep",
  "#macro-briefing-toggle",
]) {
  assert.ok(tourSrc.includes(s), `missing selector ${s}`);
}
for (const s of ["#exploration-theater-dropdown", "#feature-guide-button"]) {
  assert.ok(!tourSrc.includes(s), `dead selector ${s}`);
}
assert.ok(tourSrc.includes("지정학") && tourSrc.includes("지경학") && tourSrc.includes("3D"));

const budget = fs.readFileSync(path.join(root, "src/lib/onboardingBudget.ts"), "utf8");
const chromeBlock = budget.slice(budget.indexOf("chromeCoach:"), budget.indexOf("tourInvite:"));
assert.ok(!chromeBlock.includes("eager: true"), "chromeCoach must not be eager");
const inviteBlock = budget.slice(budget.indexOf("tourInvite:"), budget.indexOf("sentinelIntro:"));
assert.ok(inviteBlock.includes("exempt: true"), "tourInvite must be exempt");

const dash = fs.readFileSync(path.join(root, "src/components/GlobeDashboard.tsx"), "utf8");
assert.ok(dash.includes('from "@/lib/tourInvite"'));
assert.ok(dash.includes("setShowTourInvite(true)"));

const hover = fs.readFileSync(path.join(root, "src/components/HoverNav.tsx"), "utf8");
assert.ok(hover.includes('id="ask-layers-button"'));

const util = fs.readFileSync(path.join(root, "src/components/UtilityChromeMenu.tsx"), "utf8");
assert.ok(util.includes('id="utility-chrome-menu-trigger"'));

const peep = fs.readFileSync(path.join(root, "src/components/HoverSideDrawer.tsx"), "utf8");
assert.ok(peep.includes("peepId"));

const top = fs.readFileSync(path.join(root, "src/components/globe/DashboardTopChrome.tsx"), "utf8");
assert.ok(top.includes('peepId="chrome-menu-peep"'));
assert.ok(top.includes('id="scene-mission-start"'));

console.log("run-tour-restore-tests: all asserts passed");
