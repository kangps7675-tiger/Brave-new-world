#!/usr/bin/env node
/**
 * UI 토큰 가드 (P1-1 / P1-2) — 회귀 방지.
 *
 * 대량 치환보다 중요한 건 **치환 후 다시 흩어지지 않게 하는 것**이다.
 * 이 검사가 없으면 몇 주 뒤 `text-[10px]`과 `z-[10042]`가 다시 자란다.
 *
 * 검사
 *  ① 타이포: `text-[Npx]` (N ≤ 13) 금지 → text-micro/meta/caption/body
 *  ② z-index: uiStack의 층 값이 아닌 `z-[N]` 금지 (N > 20)
 *
 * 기준선(baseline) 방식: 지금 남아 있는 위반 수를 넘지 않으면 통과.
 * 코드모드를 아직 안 돌렸어도 CI를 깨뜨리지 않고, 새 위반만 막는다.
 * 코드모드 후 baseline을 0으로 내릴 것.
 *
 * 사용: node scripts/check-ui-tokens.mjs [--update-baseline]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "src");
const baselinePath = join(here, "ui-tokens-baseline.json");

/** uiStack.ts가 정의한 허용 z 값 */
const ALLOWED_Z = new Set([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
/** 지역 스택 컨텍스트용 소값은 허용 */
const LOCAL_Z_MAX = 20;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const violations = { typography: [], zIndex: [] };

for (const file of walk(root)) {
  const rel = relative(root, file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");

  for (const m of src.matchAll(/text-\[(\d+)px\]/g)) {
    if (Number(m[1]) <= 13) violations.typography.push(`${rel}: ${m[0]}`);
  }

  if (rel === "lib/uiStack.ts") continue;
  for (const m of src.matchAll(/z-\[(\d+)\]/g)) {
    const n = Number(m[1]);
    if (n <= LOCAL_Z_MAX) continue;
    if (!ALLOWED_Z.has(n)) violations.zIndex.push(`${rel}: ${m[0]}`);
  }
}

const counts = {
  typography: violations.typography.length,
  zIndex: violations.zIndex.length,
};

if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`, "utf8");
  console.log("baseline 갱신:", counts);
  process.exit(0);
}

const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { typography: Infinity, zIndex: Infinity };

let failed = false;
for (const kind of ["typography", "zIndex"]) {
  const now = counts[kind];
  const max = baseline[kind] ?? Infinity;
  const label = kind === "typography" ? "타이포 임의 px" : "임의 z-index";
  if (now > max) {
    failed = true;
    console.error(`✗ ${label}: ${now}건 (기준선 ${max}) — 새 위반이 추가됐습니다`);
    for (const v of violations[kind].slice(0, 10)) console.error(`    ${v}`);
    if (violations[kind].length > 10) {
      console.error(`    … 외 ${violations[kind].length - 10}건`);
    }
  } else {
    const trend = now < max ? ` (기준선 ${max}에서 감소 ✓)` : "";
    console.log(`✓ ${label}: ${now}건${trend}`);
  }
}

if (failed) {
  console.error(
    "\n토큰을 사용하세요 — 타이포: text-micro/meta/caption/body · z: lib/uiStack.ts의 zc()",
  );
  process.exit(1);
}
console.log("UI 토큰 검사 통과");
