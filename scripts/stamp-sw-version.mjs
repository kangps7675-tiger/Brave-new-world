#!/usr/bin/env node
/**
 * 배포마다 public/sw.js 의 SW_VERSION 을 바꿔서 브라우저가
 * “서비스워커 업데이트 없음”으로 착각하지 않게 한다.
 *
 * 우선순위: Vercel/CF/Workers 커밋 SHA → SOURCE_VERSION → 날짜+시각
 * 로컬(비 CI)에서는 스킵 — git working tree를 더럽히지 않음.
 * 커밋된 기본값도 배포 전에 수동 범프해 두면 CI 없이도 바이트가 달라진다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = join(__dirname, "..", "public", "sw.js");

const isCi = Boolean(
  process.env.CI ||
    process.env.VERCEL ||
    process.env.WORKERS_CI ||
    process.env.CF_PAGES ||
    process.env.STAMP_SW === "1",
);

if (!isCi) {
  console.log("[stamp-sw-version] skip (local; set STAMP_SW=1 to force)");
  process.exit(0);
}

const sha = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  ""
)
  .trim()
  .slice(0, 12);

const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const stamp = sha ? `${day}-${sha}` : `${day}-${Date.now().toString(36)}`;
const nextVersion = `cv-sw-v4-nocache-${stamp}`;

const src = readFileSync(swPath, "utf8");
const re = /const SW_VERSION = "[^"]*";/;
if (!re.test(src)) {
  console.error("[stamp-sw-version] SW_VERSION assignment not found in public/sw.js");
  process.exit(1);
}

const out = src.replace(re, `const SW_VERSION = "${nextVersion}";`);
writeFileSync(swPath, out, "utf8");
console.log(`[stamp-sw-version] ${nextVersion}`);
