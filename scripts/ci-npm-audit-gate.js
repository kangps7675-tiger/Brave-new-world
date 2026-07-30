/**
 * CI production audit gate.
 *
 * Fails on high/critical advisories in production deps, with a short allowlist
 * for packages that cannot be patched without a Next major migration
 * (OpenNext Cloudflare is on Next 14 until we plan 15+).
 *
 * Usage: node scripts/ci-npm-audit-gate.js
 */
const { spawnSync } = require("child_process");

/** package name → reason (must re-review when migrating Next) */
const ALLOWED_HIGH = {
  next:
    "Next 14.2.x is EOL for recent CVEs; OpenNext Cloudflare still on 14. Track Next 15+ migration.",
  postcss:
    "Bundled via next@14; fixed only by upgrading Next. Production CSS stringify XSS not in our build path.",
};

const result = spawnSync(
  "npm",
  ["audit", "--omit=dev", "--json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, shell: true },
);

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("Failed to parse npm audit JSON");
  console.error(result.stdout?.slice(0, 2000));
  process.exit(1);
}

const vulns = report.vulnerabilities || {};
const blocking = [];

for (const [name, info] of Object.entries(vulns)) {
  const severity = String(info.severity || "").toLowerCase();
  if (severity !== "high" && severity !== "critical") continue;
  if (ALLOWED_HIGH[name]) {
    console.warn(`[allowlisted] ${name} (${severity}): ${ALLOWED_HIGH[name]}`);
    continue;
  }
  const via = Array.isArray(info.via)
    ? info.via
        .map((v) => (typeof v === "string" ? v : v.title || v.url || JSON.stringify(v)))
        .join("; ")
    : "";
  blocking.push({ name, severity, via });
}

if (blocking.length) {
  console.error("Blocking production audit findings:");
  for (const b of blocking) {
    console.error(`- ${b.name} [${b.severity}] ${b.via}`);
  }
  process.exit(1);
}

console.log("npm audit gate: no blocking high/critical production issues.");
process.exit(0);
