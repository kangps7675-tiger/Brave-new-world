import fs from "node:fs";

const t = fs.readFileSync("src/lib/firstVisitTour.ts", "utf8");
const must = [
  "#ask-layers-button",
  "#view-mode-switcher",
  "#chrome-menu-peep",
  "#macro-briefing-toggle",
];
const bad = ["#exploration-theater-dropdown", "#feature-guide-button"];

for (const s of must) {
  if (!t.includes(s)) {
    console.error("missing", s);
    process.exit(1);
  }
}
for (const s of bad) {
  if (t.includes(s)) {
    console.error("dead present", s);
    process.exit(1);
  }
}
if (!t.includes("지정학") || !t.includes("지경학") || !t.includes("3D")) {
  console.error("lens copy");
  process.exit(1);
}

const budget = fs.readFileSync("src/lib/onboardingBudget.ts", "utf8");
const chromeBlock = budget.slice(budget.indexOf("chromeCoach:"), budget.indexOf("tourInvite:"));
if (chromeBlock.includes("eager: true")) {
  console.error("chromeCoach still eager");
  process.exit(1);
}
const inviteBlock = budget.slice(budget.indexOf("tourInvite:"), budget.indexOf("sentinelIntro:"));
if (!inviteBlock.includes("exempt: true")) {
  console.error("tourInvite not exempt");
  process.exit(1);
}

const dash = fs.readFileSync("src/components/GlobeDashboard.tsx", "utf8");
if (!dash.includes("shouldOfferTourInvite") || !dash.includes("setShowTourInvite(true)")) {
  console.error("ignite missing");
  process.exit(1);
}

const hover = fs.readFileSync("src/components/HoverNav.tsx", "utf8");
if (!hover.includes('id="ask-layers-button"')) {
  console.error("ask id missing");
  process.exit(1);
}

const util = fs.readFileSync("src/components/UtilityChromeMenu.tsx", "utf8");
if (!util.includes('id="utility-chrome-menu-trigger"')) {
  console.error("menu trigger id missing");
  process.exit(1);
}

console.log("smoke text checks ok");
