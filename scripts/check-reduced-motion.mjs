#!/usr/bin/env node
/**
 * reduced-motion 커버리지 검사 (P0-6 회귀 방지)
 *
 * 이 앱은 공습 사이렌 컷 · 전면 플래시 · 스캔라인을 쓴다.
 * reduced-motion 대응은 취향이 아니라 **안전 항목**이므로 CI에서 강제한다.
 *
 * 검사 항목
 *  1. 전역 규칙(animation-duration 0.01ms)이 존재하는가
 *  2. `forwards`로 **사라지는 것이 최종 상태**인 애니메이션에
 *     `animation: none`이 걸리지 않았는가
 *     → 걸리면 시작 상태(보임)에 멈춰 화면에 영구 잔류한다.
 *       실제로 `.access-denied-flash`(z-index 10050)가 이 함정에 걸릴 뻔했다.
 *  3. 새 @keyframes가 무방비로 추가되지 않았는가 (전역 규칙이 받아주므로 경고만)
 *
 * 사용: node scripts/check-reduced-motion.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = join(root, "src/app/globals.css");
const raw = readFileSync(cssPath, "utf8");
/** 주석 제거 — 주석 속 클래스명이 오탐을 만든다 */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

const MEDIA = "@media (prefers-reduced-motion: reduce)";
const start = css.indexOf(MEDIA);

const errors = [];
const warnings = [];

if (start === -1) {
  errors.push(`${MEDIA} 블록이 없습니다.`);
}

let block = "";
let outside = css;
if (start !== -1) {
  let depth = 0;
  let end = start;
  for (; end < css.length; end += 1) {
    if (css[end] === "{") depth += 1;
    else if (css[end] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  block = css.slice(start, end + 1);
  outside = css.slice(0, start) + css.slice(end + 1);
}

// 1. 전역 규칙
if (!/animation-duration:\s*0\.01ms\s*!important/.test(block)) {
  errors.push(
    "전역 규칙 누락 — `*, *::before, *::after { animation-duration: 0.01ms !important }`",
  );
}

// keyframes 파싱
const keyframes = new Map();
for (const m of outside.matchAll(
  /@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g,
)) {
  keyframes.set(m[1], m[2]);
}

/** 100%/to 에서 opacity 0 으로 끝나는가 */
function endsHidden(name) {
  const body = keyframes.get(name) ?? "";
  const stops = [...body.matchAll(/(100%|to)\s*\{([^}]*)\}/g)];
  if (stops.length === 0) return false;
  return /opacity:\s*0(?![.\d])/.test(stops[stops.length - 1][2]);
}

// reduced-motion 블록에서 animation:none 이 걸린 셀렉터
const noneSelectors = new Set();
for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (!/animation:\s*none/.test(m[2])) continue;
  for (const sel of m[1].split(",")) noneSelectors.add(sel.trim().replace(/\s+/g, " "));
}

// 2. forwards + 최종 숨김 → animation:none 금지
const usedNames = new Set();
for (const m of outside.matchAll(/([^{}]+)\{([^{}]*animation\s*:[^{}]*)\}/g)) {
  const decl = /animation:\s*([\w-]+)([^;]*)/.exec(m[2]);
  if (!decl || decl[1] === "none") continue;
  const [, name, rest] = decl;
  usedNames.add(name);
  if (!/forwards|both/.test(rest)) continue;
  if (!endsHidden(name)) continue;
  for (const sel of m[1].split(",")) {
    const clean = sel.trim().replace(/\s+/g, " ");
    if (noneSelectors.has(clean)) {
      errors.push(
        `\`${clean}\` 에 animation:none — ${name} 은 forwards로 사라지는 애니메이션입니다. ` +
          `끄면 화면에 영구 잔류합니다. 전역 0.01ms 규칙에 맡기세요.`,
      );
    }
  }
}

// 3. 미사용/신규 keyframe 경고
for (const name of keyframes.keys()) {
  if (!usedNames.has(name)) warnings.push(`@keyframes ${name} — 사용처를 못 찾았습니다.`);
}

for (const w of warnings) console.warn(`  경고: ${w}`);
if (errors.length > 0) {
  console.error(`\nreduced-motion 검사 실패 (${errors.length}건)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `reduced-motion 검사 통과 — @keyframes ${keyframes.size}종 / 명시 대응 ${noneSelectors.size}종`,
);
