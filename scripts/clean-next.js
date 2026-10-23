// dev 시작 전 손상된 .next · webpack tmp 캐시 정리 (OneDrive 환경 대응)
const fs = require("fs");
const os = require("os");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
const tmpCache = path.join(os.tmpdir(), "straitdesk-next-cache");

for (const target of [nextDir, tmpCache]) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`   삭제됨: ${target}`);
  }
}
