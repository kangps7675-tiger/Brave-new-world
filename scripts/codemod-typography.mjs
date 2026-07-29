#!/usr/bin/env node
/**
 * 타이포 스케일 코드모드 (P1-1) — 1회성.
 *
 * `text-[Npx]` 임의 px를 의미 단위 토큰으로 바꾼다.
 * 실제 크기는 globals.css의 --fs-* 에서 조정하므로, 이 매핑은 **의미 분류**다.
 *
 *   8·9·10px → micro    (거의 읽지 않는 것. 9px는 사실상 비가시였다)
 *   11px     → meta     (라벨·시각·카운트)
 *   12px     → caption  (보조 설명)
 *   13px     → body     (본문)
 *   14px+    → 유지     (이미 충분히 크다. 임의 값이어도 손대지 않는다)
 *
 * 사용: node scripts/codemod-typography.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const dry = process.argv.includes("--dry");

/** px → 토큰. 14 이상은 의도적으로 비워둔다(유지). */
const MAP = {
  8: "micro",
  9: "micro",
  10: "micro",
  11: "meta",
  12: "caption",
  13: "body",
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

let files = 0;
let hits = 0;
const perToken = {};

for (const file of walk(root)) {
  const src = readFileSync(file, "utf8");
  let changed = false;
  const next = src.replace(/text-\[(\d+)px\]/g, (whole, px) => {
    const token = MAP[Number(px)];
    if (!token) return whole;
    changed = true;
    hits += 1;
    perToken[token] = (perToken[token] ?? 0) + 1;
    return `text-${token}`;
  });
  if (changed) {
    files += 1;
    if (!dry) writeFileSync(file, next, "utf8");
  }
}

console.log(`${dry ? "[dry-run] " : ""}${hits}곳 치환 · ${files}개 파일`);
for (const [token, n] of Object.entries(perToken).sort((a, b) => b[1] - a[1])) {
  console.log(`  text-${token.padEnd(8)} ${n}`);
}
