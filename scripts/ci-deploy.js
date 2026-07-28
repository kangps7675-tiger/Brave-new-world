#!/usr/bin/env node
/**
 * Workers Builds deploy wrapper.
 * wrangler deploy → opennextjs-cloudflare deploy needs .open-next/.
 * If the build step only ran next build (or artifacts missing), build first.
 */
const { existsSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

function run(cmd, args) {
  console.log(`[ci-deploy] → ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

const openNextDir = path.join(process.cwd(), ".open-next");
const openNextConfig = path.join(
  openNextDir,
  ".build",
  "open-next.config.edge.mjs",
);
const needsBuild = !existsSync(openNextConfig);

if (needsBuild) {
  console.log(
    "[ci-deploy] .open-next missing or incomplete — running opennextjs-cloudflare build",
  );
  run("opennextjs-cloudflare", ["build"]);
} else {
  console.log("[ci-deploy] .open-next present — skipping rebuild");
}

/** stub OFF 배포 시 스펙·체크리스트 게이트 (API_STUB_MODE=false) */
run("node", [path.join(__dirname, "verify-stub-off-gate.js")]);

run("opennextjs-cloudflare", ["deploy"]);
