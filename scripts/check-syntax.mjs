#!/usr/bin/env node
/**
 * 문법 파싱 검사 — 대량 치환 안전망.
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────────
 * 코드모드로 import를 삽입하다 `EconInsightParchment.tsx`의 **여러 줄 import
 * 블록 안에** 새 import를 꽂아 파일이 깨졌다. 그런데 당시 검증은
 * `grep`으로 "import가 존재하는가"만 봤기 때문에 **초록불이었다.**
 * 존재 확인은 정확성 확인이 아니다.
 *
 * `tsc --noEmit`은 전체 타입 그래프를 도느라 느리다. 이 검사는 **파싱만**
 * 하므로 훨씬 빠르고, 대량 치환 직후 "문법이 깨졌는가"를 즉시 알려준다.
 * (타입 오류는 못 잡는다 — 그건 tsc의 몫)
 *
 * 사용: node scripts/check-syntax.mjs [파일…]   (없으면 src 전체)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const srcRoot = join(root, "src");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args.map((f) => join(root, f)) : walk(srcRoot);

let bad = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length === 0) continue;

  bad += 1;
  console.error(`✗ ${relative(root, file).replace(/\\/g, "/")}`);
  for (const d of diags.slice(0, 5)) {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    console.error(
      `   ${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
    );
  }
}

if (bad > 0) {
  console.error(`\n문법 오류 ${bad}개 파일`);
  process.exit(1);
}
console.log(`문법 검사 통과 — ${files.length}개 파일`);
