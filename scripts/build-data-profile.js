// 프로필별 정적 데이터 일괄 빌드: node scripts/build-data-profile.js lite|full
const { execSync } = require("child_process");
const path = require("path");

const profile = process.argv[2] || process.env.DATA_PROFILE || "full";
if (profile !== "lite" && profile !== "full") {
  console.error("Usage: node scripts/build-data-profile.js lite|full");
  process.exit(1);
}

const scriptsDir = __dirname;
const steps = [
  "build-local-data.js",
  "build-coastlines.js",
  "build-country-borders.js",
  "build-static-extras.js",
];

console.log(`\n=== DATA_PROFILE=${profile} ===\n`);

for (const script of steps) {
  const scriptPath = path.join(scriptsDir, script);
  console.log(`→ ${script} (${profile})`);
  execSync(`node "${scriptPath}" ${profile}`, {
    stdio: "inherit",
    env: { ...process.env, DATA_PROFILE: profile },
  });
}

console.log(`\nDone: public/data/${profile}/\n`);
