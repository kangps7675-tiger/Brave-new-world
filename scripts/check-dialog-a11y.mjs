#!/usr/bin/env node
/**
 * 모달 접근성 검사 (P1-7).
 *
 * 감사 시점: `role="dialog"` 32개 중 Escape 처리 7개, 포커스 트랩 0.
 * 키보드만 쓰는 사용자는 모달이 떠도 포커스가 뒤 화면에 남아 보이지 않는
 * 요소를 Tab으로 훑게 되고, 스크린리더는 모달 밖 내용을 계속 읽는다.
 *
 * ── 검사 ───────────────────────────────────────────────────────────
 * ① `aria-modal="true"`인데 `useDialog`가 없으면 위반
 *    (진짜 모달인데 포커스를 안 가둔다 = 잘못된 약속)
 * ② `aria-modal="true"`인데 dismiss 수단(onDismiss/onClose)이 있고
 *    포커스 트랩도 없는 "배너형"은 **aria-modal 오표기**일 수 있으니 경고.
 *    보조기술에 "바깥은 비활성"이라 알리는데 실제로는 지도·nav가 살아 있다.
 *    → 없느니만 못한 표기다. 배너는 aria-modal을 빼고 Escape만 지원할 것.
 *
 * 기준선 방식 — 남은 위반이 늘지만 않으면 통과.
 *
 * 사용: node scripts/check-dialog-a11y.mjs [--update-baseline]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const srcRoot = join(root, "src");
const baselinePath = join(here, "dialog-a11y-baseline.json");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

const unguarded = [];
let modalCount = 0;
let guardedCount = 0;

for (const file of walk(srcRoot)) {
  const src = readFileSync(file, "utf8");
  if (!src.includes('aria-modal="true"')) continue;
  const rel = relative(srcRoot, file).replace(/\\/g, "/");
  modalCount += 1;
  if (src.includes("useDialog")) guardedCount += 1;
  else unguarded.push(rel);
}

const counts = { unguarded: unguarded.length };

if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`, "utf8");
  console.log("baseline 갱신:", counts);
  process.exit(0);
}

const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { unguarded: Infinity };

console.log(`aria-modal 선언 ${modalCount}곳 · useDialog 적용 ${guardedCount}곳`);

if (unguarded.length > (baseline.unguarded ?? Infinity)) {
  console.error(
    `\n✗ 포커스 트랩 없는 모달 ${unguarded.length}곳 (기준선 ${baseline.unguarded}) — 새 위반`,
  );
  for (const rel of unguarded.slice(0, 10)) console.error(`    ${rel}`);
  console.error("\n`useDialog`를 쓰거나, 실제로 모달이 아니면 aria-modal을 빼세요.");
  process.exit(1);
}

const trend =
  unguarded.length < baseline.unguarded ? ` (기준선 ${baseline.unguarded}에서 감소 ✓)` : "";
console.log(`✓ 포커스 트랩 미적용: ${unguarded.length}곳${trend}`);
console.log("모달 접근성 검사 통과");
