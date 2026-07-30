#!/usr/bin/env node
/**
 * MapLibre 표현식 규칙 검사 — 런타임 전용 버그 방어.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────
 * MapLibre는 `["zoom"]`을 **최상위 `interpolate`/`step`의 직접 입력**으로만
 * 허용한다. 산술식·`case`·`min`/`max` 안에 중첩하면 `addLayer`가 검증에서
 * 던지고 **레이어가 지도에 아예 올라가지 않는다.**
 *
 * 이 버그가 프로덕션에 살아 있었는데도:
 *   tsc ✅  vitest ✅  build ✅  (표현식 타입이 `any`라 아무도 못 잡는다)
 *
 * 실제 브라우저 콘솔에서만 드러났다:
 *   layers.map-paths.paint.line-width: "zoom" expression may only be used as
 *   input to a top-level "step" or "interpolate" expression.
 *
 * 정적 검사로 잡히지 않는 부류이므로 **표현식 구조를 직접 파싱**해서 막는다.
 *
 * 사용: node scripts/check-maplibre-expr.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

/** zoom을 직접 입력으로 받을 수 있는 최상위 연산자 */
const ZOOM_INPUT_OK = new Set(["interpolate", "interpolate-hcl", "interpolate-lab", "step"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const violations = [];

/**
 * 배열 리터럴 노드를 재귀 검사.
 * @param node        검사할 노드
 * @param depthFromOk 최상위 interpolate/step의 입력 위치인가
 */
function inspect(node, sf, file, insideOkInput) {
  if (!ts.isArrayLiteralExpression(node)) {
    ts.forEachChild(node, (c) => inspect(c, sf, file, false));
    return;
  }

  const first = node.elements[0];
  const opName =
    first && ts.isStringLiteral(first) ? first.text : null;

  // ["zoom"] 자체를 만났다 — 허용 위치가 아니면 위반
  if (opName === "zoom" && node.elements.length === 1) {
    if (!insideOkInput) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      violations.push(`${file}:${line + 1}  ["zoom"]이 최상위 interpolate/step 입력이 아닙니다`);
    }
    return;
  }

  if (opName && ZOOM_INPUT_OK.has(opName)) {
    // interpolate: [op, interpolationType, input, ...stops]
    // step:        [op, input, default, ...stops]
    const inputIndex = opName === "step" ? 1 : 2;
    node.elements.forEach((el, i) => {
      inspect(el, sf, file, i === inputIndex);
    });
    return;
  }

  node.elements.forEach((el) => inspect(el, sf, file, false));
}

const args = process.argv.slice(2);
const targets = args.length > 0 ? args.map((f) => join(root, f)) : walk(join(root, "src"));

for (const file of targets) {
  const src = readFileSync(file, "utf8");
  if (!src.includes('"zoom"')) continue;
  const rel = relative(root, file).replace(/\\/g, "/");
  if (rel.endsWith("scripts/check-maplibre-expr.mjs")) continue;
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ESNext,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  ts.forEachChild(sf, (c) => inspect(c, sf, rel, false));
}

if (violations.length > 0) {
  console.error(`✗ MapLibre 표현식 위반 ${violations.length}건\n`);
  for (const v of violations) console.error(`    ${v}`);
  console.error(
    "\n`[\"zoom\"]`은 최상위 interpolate/step의 입력으로만 쓰세요.\n" +
      "feature 속성·클램프는 **각 줌 스톱의 출력값** 안에서 계산하세요.\n" +
      "(interpolate를 min/max/case 안에 넣는 것도 같은 위반입니다.)",
  );
  process.exit(1);
}
console.log("MapLibre 표현식 검사 통과");
