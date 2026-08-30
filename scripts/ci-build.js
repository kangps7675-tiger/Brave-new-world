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

/**
 * 상업 라이선스 게이트.
 *
 * 유료 티어를 켠 채로 상업 이용이 금지·미확인인 레이어를 배포하면
 * 계약 위반이다 (adsb.fi 는 개인·비상업 전용, ACLED 는 기업 라이선스 필수).
 * 무료 운영 중에는 경고만 내고, 유료화를 켜면 빌드를 막는다.
 *
 * ⚠️ DATA_GATE_SKIP 으로는 우회되지 않는다. 이건 법적 리스크라 별도 플래그를 둔다.
 */
if (!openNextNested && process.env.LICENSE_GATE_SKIP !== "1") {
  const licenseGate = spawnSync(
    process.execPath,
    [path.join(__dirname, "verify-commercial-licensing.js")],
    { stdio: "inherit" },
  );
  if (licenseGate.status !== 0) {
    console.error(
      "\n[ci-build] 상업 라이선스 게이트 실패 — 빌드를 중단한다.\n" +
        "           유료 티어에 상업 이용이 불가한 레이어가 섞여 있다.\n" +
        "           제외하거나, 라이선스를 취득하거나, 소스를 교체할 것.\n",
    );
    process.exit(licenseGate.status ?? 1);
  }
}

/**
 * Cloudflare Workers 정적 자산 25 MiB 한도.
 * 초과 파일을 public/에 두면 wrangler deploy가 실패하고 프로덕션이 옛 버전에 남는다.
 */
if (!openNextNested && process.env.ASSET_SIZE_GATE_SKIP !== "1") {
  const assetGate = spawnSync(
    process.execPath,
    [path.join(__dirname, "verify-workers-asset-size.js")],
    { stdio: "inherit" },
  );
  if (assetGate.status !== 0) {
    console.error(
      "\n[ci-build] Workers 자산 크기 게이트 실패 — 빌드를 중단한다.\n",
    );
    process.exit(assetGate.status ?? 1);
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
