/**
 * npm이 연결한 wrangler 실행 파일을 재시도 가리개로 바꾼다.
 * Workers Builds 배포 명령이 `npx wrangler deploy` 라서, 이 연결이 있어야 504 재시도가 탄다.
 */
import { chmodSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const binDir = path.join(root, "node_modules", ".bin");
const wrapper = path.join(root, "scripts", "wrangler-with-retry.mjs");
const real = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");

if (!existsSync(real) || !existsSync(wrapper)) {
  process.exit(0);
}

const sh = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node "$basedir/../../scripts/wrangler-with-retry.mjs" "$@"
`;
const cmd = `@ECHO off\r\nnode "%~dp0\\..\\..\\scripts\\wrangler-with-retry.mjs" %*\r\n`;
const ps1 = `#!/usr/bin/env pwsh
$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent
$node = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { "node" }
& $node "$basedir/../../scripts/wrangler-with-retry.mjs" $args
exit $LASTEXITCODE
`;

const shPath = path.join(binDir, "wrangler");
// .bin/wrangler 는 wrangler.js 로 가는 심볼릭 링크다.
// 지하지 않고 쓰면 링크를 따라가 본체 파일이 셸 스크립트로 덮인다.
if (existsSync(shPath)) unlinkSync(shPath);
writeFileSync(shPath, sh, "utf8");
try {
  chmodSync(shPath, 0o755);
} catch {
  // Windows에서는 실행 비트가 없다.
}
writeFileSync(path.join(binDir, "wrangler.cmd"), cmd, "utf8");
writeFileSync(path.join(binDir, "wrangler.ps1"), ps1, "utf8");
