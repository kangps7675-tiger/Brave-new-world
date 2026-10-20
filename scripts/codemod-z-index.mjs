#!/usr/bin/env node
/**
 * z-index 코드모드 (P1-2) — 1회성.
 *
 * 하드코딩 `z-[N]`을 `lib/uiStack.ts`의 층 토큰으로 매핑한다.
 * 기존 값의 **상대 순서를 보존**하도록 구간별로 묶었다 —
 * 겹침 관계가 바뀌면 안 되므로 임의로 재배치하지 않는다.
 *
 * 사용:
 *   node scripts/codemod-z-index.mjs --dry    (미리보기)
 *   node scripts/codemod-z-index.mjs          (적용)
 *
 * ⚠️ 다른 사람이 같은 파일을 편집 중일 때 돌리지 말 것. 충돌한다.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const dry = process.argv.includes("--dry");

/** 기존 z 값 구간 → 새 층 값. 상대 순서 보존이 원칙. */
function mapZ(n) {
  if (n <= 20) return null; // 지역 스택 컨텍스트(z-[1] 등) — 건드리지 않는다
  if (n <= 55) return 100; // mapChrome
  if (n <= 80) return 200; // mapControl
  if (n <= 100) return 300; // nav
  if (n <= 118) return 400; // navMenu
  if (n === 119) return 500; // panelScrim
  if (n <= 130) return 600; // panel
  if (n < 10000) return 700; // immersive (9000·9600·9990·9999)
  if (n < 10035) return 800; // gate
  if (n < 11000) return 900; // alert
  return 1000; // toast / 최상단
}

const LAYER_NAME = {
  100: "mapChrome",
  200: "mapControl",
  300: "nav",
  400: "navMenu",
  500: "panelScrim",
  600: "panel",
  700: "immersive",
  800: "gate",
  900: "alert",
  1000: "toast",
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

let files = 0;
let hits = 0;
const perLayer = {};

for (const file of walk(root)) {
  if (file.endsWith("uiStack.ts")) continue; // 정본은 제외
  const src = readFileSync(file, "utf8");
  let changed = false;
  const next = src.replace(/z-\[(\d+)\]/g, (whole, raw) => {
    const mapped = mapZ(Number(raw));
    if (mapped === null || String(mapped) === raw) return whole;
    changed = true;
    hits += 1;
    const name = LAYER_NAME[mapped];
    perLayer[name] = (perLayer[name] ?? 0) + 1;
    return `z-[${mapped}]`;
  });
  if (changed) {
    files += 1;
    if (!dry) writeFileSync(file, next, "utf8");
  }
}

console.log(`${dry ? "[dry-run] " : ""}${hits}곳 치환 · ${files}개 파일`);
for (const [name, n] of Object.entries(perLayer).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(12)} ${n}`);
}
