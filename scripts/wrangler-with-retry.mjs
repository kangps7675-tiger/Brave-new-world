/**
 * `npx wrangler deploy` 가리개.
 * Cloudflare가 워커 스크립트 versions 업로드에서 504 HTML을 주면
 * wrangler는 한 번 실패하고 끝난다. 배포만 최대 3번 다시 시도한다.
 * 안쪽 wrangler 호출은 WRANGLER_RETRY_WRAPPED 로 통과시켜 루프를 막는다.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// bin/wrangler.js 는 다른 프로세스를 띄우는 껍데기다.
// 배포 명령은 그 안의 cli.js 를 직접 실행한다.
const wranglerCli = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/wrangler/wrangler-dist/cli.js",
);
const args = process.argv.slice(2);
const isDeploy = args[0] === "deploy";
const wrapped = process.env.WRANGLER_RETRY_WRAPPED === "1";

function run() {
  return spawnSync(process.execPath, ["--no-warnings", wranglerCli, ...args], {
    stdio: "inherit",
    env: process.env,
  });
}

if (!isDeploy || wrapped) {
  const result = run();
  process.exit(result.status ?? 1);
}

process.env.WRANGLER_RETRY_WRAPPED = "1";
const attempts = 3;
for (let i = 1; i <= attempts; i++) {
  const result = run();
  if ((result.status ?? 1) === 0) process.exit(0);
  if (i === attempts) process.exit(result.status ?? 1);
  console.error(
    `[wrangler-retry] deploy failed (attempt ${i}/${attempts}). Retrying in 25s.`,
  );
  await delay(25_000);
}
