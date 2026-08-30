/**
 * Cloudflare Workers static asset cap — 25 MiB per file.
 *
 * `public/` 는 OpenNext가 `.open-next/assets` 로 복사한다. 한 파일이라도
 * 25 MiB를 넘으면 wrangler deploy가 "Asset too large"로 죽고, 프로덕션은
 * 직전 성공본에 묶인다 (PR 127 워커가 라이브에 남은 원인).
 *
 *   node scripts/verify-workers-asset-size.js
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MAX_BYTES = 25 * 1024 * 1024;

function gitTrackedPublicFiles() {
  const listed = spawnSync("git", ["ls-files", "public"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (listed.status !== 0) {
    console.error(listed.stderr || "git ls-files public failed");
    process.exit(1);
  }
  return listed.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((rel) => path.join(ROOT, rel.replace(/\//g, path.sep)));
}

function main() {
  const files = gitTrackedPublicFiles();
  const oversized = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const bytes = fs.statSync(file).size;
    if (bytes > MAX_BYTES) {
      oversized.push({
        rel: path.relative(ROOT, file).split(path.sep).join("/"),
        mib: bytes / (1024 * 1024),
      });
    }
  }

  if (oversized.length === 0) {
    console.log(
      `[verify:workers-assets] ✅ ${files.length} git-tracked public/ files — all ≤ 25 MiB`,
    );
    return;
  }

  console.error(
    `[verify:workers-assets] ❌ ${oversized.length} file(s) exceed Cloudflare Workers 25 MiB asset limit:`,
  );
  for (const row of oversized) {
    console.error(`   ${row.mib.toFixed(2)} MiB  ${row.rel}`);
  }
  console.error(
    "\n   gzip 하거나 public/ 밖으로 옮길 것. 이 상태로 배포하면 라이브 워커가 갱신되지 않는다.\n",
  );
  process.exit(1);
}

main();
