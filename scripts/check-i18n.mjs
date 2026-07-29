#!/usr/bin/env node
/**
 * i18n 누수 가드 (P1-5) — 회귀 방지.
 *
 * JSX 본문에 한국어가 **직접** 박혀 있으면 EN 사용자가 한국어를 보게 된다.
 * 감사 시점에 20개 컴포넌트에서 발생했고, 그중 `HoverNav`(메인 nav)·
 * `BottomIntelStack`(하단 인텔)·`LayerPanelHost`(레이어 패널)·`AnalysisPanel`은
 * **메인 화면 4구역 전부**였다. 언어를 물어놓고 지키지 못하는 종류의 실패다.
 *
 * ── 오탐 주의 ──────────────────────────────────────────────────────
 * 아래는 **정상**이며 위반이 아니다:
 *   {lang === "en" ? <>English…</> : <>한국어…</>}
 * 인라인 삼항으로 양쪽을 다 갖춘 코드다. 단순 한글 검출은 이걸 잡아내므로,
 * 이 검사는 **개수 기준선(baseline)** 방식을 쓴다 —
 * 똑똑한 파싱 대신 "지금보다 늘지 않았는가"만 본다.
 * 정확도를 높이려다 노이즈가 늘면 아무도 안 보게 된다.
 *
 * 핵심 구역은 0을 유지해야 하므로 따로 하드 게이트를 건다.
 *
 * 사용: node scripts/check-i18n.mjs [--update-baseline]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "src");
const baselinePath = join(here, "i18n-baseline.json");

/** 절대 한국어가 새면 안 되는 화면 (메인 4구역) */
const CRITICAL = [
  "components/HoverNav.tsx",
  "components/globe/LayerPanelHost.tsx",
  "components/globe/AnalysisPanel.tsx",
];

/** JSX 본문에 한글이 직접 들어간 줄 (주석 제외) */
const LEAK = /^\s*(?!\/\/|\*|\/\*)[^\n]*>[^<>{}]*[가-힣][^<>{}]*</;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

const perFile = {};
let total = 0;

for (const file of walk(root)) {
  const rel = relative(root, file).replace(/\\/g, "/");
  let n = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (LEAK.test(line)) n += 1;
  }
  if (n > 0) {
    perFile[rel] = n;
    total += n;
  }
}

if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify({ total }, null, 2)}\n`, "utf8");
  console.log("baseline 갱신: total =", total);
  process.exit(0);
}

let failed = false;

// ① 핵심 구역은 0 하드 게이트
for (const rel of CRITICAL) {
  const n = perFile[rel] ?? 0;
  if (n > 0) {
    failed = true;
    console.error(`✗ 핵심 화면에 한국어 누수: ${rel} (${n}건)`);
  }
}

// ② 나머지는 기준선 이하
const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { total: Infinity };

if (total > (baseline.total ?? Infinity)) {
  failed = true;
  console.error(`✗ i18n 누수 ${total}건 (기준선 ${baseline.total}) — 새 위반이 추가됐습니다`);
  for (const [rel, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.error(`    ${rel}: ${n}건`);
  }
} else {
  const trend = total < baseline.total ? ` (기준선 ${baseline.total}에서 감소 ✓)` : "";
  console.log(`✓ i18n 누수: ${total}건${trend}`);
  console.log(`✓ 핵심 화면 ${CRITICAL.length}곳: 0건`);
}

if (failed) {
  console.error("\n한국어를 직접 쓰지 말고 uiStrings의 t()를 사용하세요.");
  process.exit(1);
}
console.log("i18n 검사 통과");
