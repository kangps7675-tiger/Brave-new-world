#!/usr/bin/env node
/**
 * stub OFF 배포 게이트.
 * API_STUB_MODE=false (또는 FORCE_STUB_OFF_GATE=1) 이면 체크리스트·가드·캡 스펙을 강제한다.
 * stub ON 기본 배포에서는 no-op (exit 0).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const stubOff =
  process.env.FORCE_STUB_OFF_GATE === "1" ||
  process.env.API_STUB_MODE === "false" ||
  process.env.NEXT_PUBLIC_API_STUB_MODE === "false";

if (!stubOff) {
  console.log(
    "[verify-stub-off-gate] skip (stub ON or unset). Set API_STUB_MODE=false or FORCE_STUB_OFF_GATE=1 to enforce.",
  );
  process.exit(0);
}

console.log("[verify-stub-off-gate] stub OFF detected — running product-spec + checklist anchors");

const verify = spawnSync(
  process.execPath,
  [path.join(__dirname, "verify-product-spec.js")],
  { stdio: "inherit", env: process.env },
);

if ((verify.status ?? 1) !== 0) {
  console.error(
    "[verify-stub-off-gate] FAILED. Fix docs/code caps or keep stub ON. See docs/stub-off-checklist.md",
  );
  process.exit(verify.status ?? 1);
}

console.log("[verify-stub-off-gate] passed — safe to deploy with stub OFF (after D1/warm ops)");
