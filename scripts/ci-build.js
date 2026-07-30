#!/usr/bin/env node
/**
 * CI-aware build selector.
 * - Vercel → next build
 * - Cloudflare Workers Builds (WORKERS_CI=1) → OpenNext (.open-next/)
 * - Local / other → next build
 *
 * OpenNext itself runs `npm run build` for the Next.js step. Without a guard,
 * WORKERS_CI stays set and we recurse until the Workers Builds 20m timeout.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const isVercel = process.env.VERCEL === "1";
const isWorkersCi = process.env.WORKERS_CI === "1";
/** Set by this script when launching OpenNext; nested builds must use next. */
const openNextNested = process.env.OPENNEXT_BUILDING === "1";

/**
 * 데이터 무결성 게이트 (2026-07-31 감사).
 *
 * 널섬 좌표·빈 gzip·합성 플레이스홀더가 전부 **조용히** 배포된 적이 있다.
 * 빌드가 유일하게 반드시 지나가는 관문이므로 여기서 막는다.
 * 중첩 빌드(OpenNext→next)에서는 이미 한 번 돌았으므로 건너뛴다.
 *
 * 비상 탈출: DATA_GATE_SKIP=1 (사유를 커밋 메시지에 남길 것)
 */
if (!openNextNested && process.env.DATA_GATE_SKIP !== "1") {
  const gate = spawnSync(
    process.execPath,
    [path.join(__dirname, "verify-data-integrity.js")],
    { stdio: "inherit" },
  );
  if (gate.status !== 0) {
    console.error(
      "\n[ci-build] 데이터 무결성 게이트 실패 — 빌드를 중단한다.\n" +
        "           고칠 수 없는 상황이면 DATA_GATE_SKIP=1 로 우회할 수 있으나,\n" +
        "           사유를 반드시 커밋 메시지에 남길 것.\n",
    );
    process.exit(gate.status ?? 1);
  }
}

const useOpenNext = !isVercel && isWorkersCi && !openNextNested;
const cmd = useOpenNext
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

const label = useOpenNext
  ? "Workers CI"
  : openNextNested
    ? "OpenNext→next"
    : isVercel
      ? "Vercel"
      : "local";

console.log(`[ci-build] ${label} → ${cmd.join(" ")}`);

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: "inherit",
  shell: true,
  env: useOpenNext
    ? { ...process.env, OPENNEXT_BUILDING: "1" }
    : process.env,
});

process.exit(result.status ?? 1);
