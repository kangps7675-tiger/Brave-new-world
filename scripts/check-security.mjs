#!/usr/bin/env node
/**
 * 보안 회귀 가드.
 *
 * SECURITY-ASSESSMENT-2026-07-30 에서 고친 패턴이 다시 기어들어오는 것을 막는다.
 * CI(`npm run verify:security`)에서 돌고, 위반이 있으면 exit 1.
 *
 * 검사 항목
 *  1. fail-open 인증 게이트     — `if (!secret) return true`
 *  2. 쿼리 파라미터 시크릿 인증  — `searchParams.get("secret")`
 *  3. 하드코딩된 실키           — sk-ant-, AKIA…, ghp_, PEM 블록
 *  4. 부수효과 있는 GET 위임     — `export async function GET(...) { return POST(...) }`
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "workers", "scripts"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".open-next", ".git", ".wrangler"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

/** 이 파일 자신은 패턴 문자열을 담고 있으므로 제외 */
const SELF = path.join("scripts", "check-security.mjs");

const RULES = [
  {
    id: "fail-open-auth",
    re: /if\s*\(\s*!\s*secret\s*\)\s*return\s+true\s*;/,
    message:
      "인증 게이트가 fail-open 입니다. 시크릿 미설정 시 프로덕션에서는 거부해야 합니다.\n" +
      "        → authorizeCronRequest() (src/lib/auth/cronAuth.ts) 를 쓰거나\n" +
      "          `if (!secret) return process.env.NODE_ENV !== \"production\";` 로 바꾸세요.",
  },
  {
    id: "secret-in-query",
    re: /searchParams\.get\(\s*["'`]secret["'`]\s*\)/,
    message:
      "시크릿을 URL 쿼리로 받고 있습니다. 쿼리스트링은 CDN 로그·Referer·브라우저\n" +
      "        히스토리에 평문으로 남습니다. Authorization: Bearer 헤더만 쓰세요.",
  },
  {
    id: "hardcoded-secret",
    re: /(sk-ant-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/,
    message: "실제 자격증명이 소스에 하드코딩된 것으로 보입니다. 환경변수로 옮기고 즉시 회전하세요.",
  },
  {
    id: "side-effecting-get",
    re: /export\s+async\s+function\s+GET\s*\([^)]*\)\s*\{\s*return\s+POST\s*\(/,
    message:
      "GET 이 POST 로 위임되고 있습니다. 부수효과 있는 GET 은 프리페치·크롤러·CSRF 로\n" +
      "        의도치 않게 실행됩니다. POST 전용으로 두세요.",
  },
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (EXT.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

const violations = [];

for (const dir of SCAN_DIRS) {
  for await (const file of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file);
    if (rel === SELF) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // 명시적 허용 주석
      if (line.includes("security-guard-ignore")) return;
      for (const rule of RULES) {
        if (rule.re.test(line)) {
          violations.push({ rel, line: i + 1, rule, text: line.trim().slice(0, 120) });
        }
      }
    });
  }
}

if (violations.length === 0) {
  console.log("✓ security guard: 위반 없음");
  process.exit(0);
}

console.error(`\n✗ security guard: ${violations.length}건 위반\n`);
const byRule = new Map();
for (const v of violations) {
  if (!byRule.has(v.rule.id)) byRule.set(v.rule.id, []);
  byRule.get(v.rule.id).push(v);
}
for (const [id, list] of byRule) {
  console.error(`  [${id}] ${list[0].rule.message}`);
  for (const v of list) {
    console.error(`        ${v.rel}:${v.line}  ${v.text}`);
  }
  console.error("");
}
console.error("의도된 예외라면 해당 줄에 `security-guard-ignore` 주석을 남기세요.\n");
process.exit(1);
