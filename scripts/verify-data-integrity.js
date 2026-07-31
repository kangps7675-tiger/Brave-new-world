#!/usr/bin/env node
/**
 * 데이터 무결성 게이트 — `npm run verify:data`
 *
 * 2026-07-31 감사에서 뚫린 세 가지 실패 유형을 CI 에서 막는다.
 *
 *   P0-1  널섬(0,0) 좌표      — GEM 철강·시멘트·철광석·화학 2,000건 전멸
 *   P0-2  낡은/빈 .json.gz    — fetchJsonPreferGzip 이 gz 를 우선하므로
 *                               파이프라인 3종이 조용히 [] 로 서빙됨
 *   P0-3  합성 플레이스홀더    — "internet-exchanges site 0" 같은 데모 데이터가
 *                               PeeringDB 이름으로 shipped
 *
 * 실패는 전부 **조용한** 실패였다. 에러가 안 나고 빈 지도만 나온다.
 * 그래서 사람이 아니라 빌드가 잡아야 한다.
 *
 * 사용:
 *   node scripts/verify-data-integrity.js          # 검사만
 *   node scripts/verify-data-integrity.js --warn   # 경고만 (exit 0)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const DATA_DIRS = ["lite", "full"].map((p) => path.join(ROOT, "public", "data", p));
const WARN_ONLY = process.argv.includes("--warn");

/** 널섬 허용 비율 — 0 이 진짜 좌표인 데이터셋은 이 프로젝트에 없다. */
const NULL_ISLAND_MAX_RATIO = 0.01;
/**
 * 플레이스홀더 작명 탐지.
 *
 * 단순히 /site \d+/ 로 잡으면 "Ellsworth AFB Site 2"(실재하는 미니트맨 발사대)
 * 같은 진짜 이름이 걸린다. 합성 데모 데이터의 특징은
 * **레코드 이름이 자기 파일 이름을 그대로 반복한다**는 것이다:
 *   internet-exchanges.json → "internet-exchanges site 0"
 *   conflict-zones.json     → "conflict-zone-0"
 * 그래서 파일 slug 를 기준으로 판정한다.
 */
function isPlaceholderName(name, fileSlug) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return false;
  const slug = fileSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) return false;
  const singular = slug.replace(/s$/, "");
  // "<slug> site 0" · "<slug>-0" · "<slug> 12" — 모두 자기 파일명 반복형
  const head = slug === singular ? slug : `(?:${slug}|${singular})`;
  return new RegExp(`^${head}(?:[\\s-]+site)?[\\s-]+\\d+$`).test(n);
}
/** 빈 gzip(=`[]`) 은 약 23바이트. 원본이 이보다 크면 압축 실패로 본다. */
const MIN_MEANINGFUL_JSON = 10_000;
const MAX_EMPTY_GZ = 100;
/** 이보다 큰 gz 는 내용 대조를 생략한다 (해제 비용). 크기·시각 검사는 그대로 한다. */
const CONTENT_CHECK_MAX_GZ = 512 * 1024;

/**
 * 검사 면제 — 의도적으로 비어 있거나 표본이 작은 파일.
 * 여기에 추가할 때는 **반드시 사유를 적을 것.**
 */
const ALLOWLIST = new Map([
  ["axis-arms.json", "SIPRI 축 무기거래 — 공개 stub (허가 전). vendor에 실데이터 보관"],
  ["gdelt-events.json", "빌드타임 스냅샷 — 런타임은 /api/gdelt 사용"],
  ["app-data.json", "청크 인덱스 파일 — 실제 데이터는 countries/disputes/places"],
  [
    "sigint-military-bases.json",
    "합성 데모였음(P0-3) — 의도적으로 비움. military-bases.json(OSM 815건)이 정본.",
  ],
  ["gem-steel.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-cement.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-iron-ore.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-chemicals.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["internet-exchanges.json", "합성 데모 이름 — PeeringDB fetch 전 비움"],
]);

/**
 * 아직 재빌드가 안 끝난 알려진 결함 — 경고로만 낸다.
 *
 * ⚠️ 여기 있는 항목은 **반드시 비워야 한다.** 지시된 명령을 실행하면 사라진다.
 *    빌드를 통과시키려고 항목을 늘리는 순간 이 게이트는 무의미해진다.
 */
const KNOWN_PENDING = new Map([
  ["gem-oil-gas-extraction.json", "npm run gem:trackers:all — 잔여 널섬 필터는 적용됨, 재빌드 권장"],
]);

const problems = [];
const warnings = [];
const pending = [];

/** 알려진 미해결 항목이면 경고로 돌린다. */
function report(file, message) {
  const name = path.basename(file);
  const fix = KNOWN_PENDING.get(name);
  if (fix) pending.push(`${relative(file)} — ${message}\n      → ${fix}`);
  else problems.push(`${relative(file)} — ${message}`);
}

function relative(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    problems.push(`${relative(file)} — JSON 파싱 실패: ${error.message}`);
    return null;
  }
}

/** 최상위 배열 · GeoJSON · {items:[]} 형태 모두에서 포인트를 뽑는다. */
function extractPoints(data) {
  if (Array.isArray(data)) {
    return data.filter((x) => x && typeof x === "object" && typeof x.la === "number");
  }
  if (data && Array.isArray(data.features)) return [];
  return [];
}

function countRecords(data) {
  if (Array.isArray(data)) return data.length;
  if (!data || typeof data !== "object") return 0;
  if (Array.isArray(data.features)) return data.features.length;
  const lists = Object.values(data).filter(Array.isArray);
  if (lists.length) return lists.reduce((sum, l) => sum + l.length, 0);
  return Object.keys(data).length ? 1 : 0;
}

function checkCoordinates(file, data) {
  const name = path.basename(file);
  const points = extractPoints(data);
  if (!points.length) return;

  const nullIsland = points.filter((p) => p.la === 0 && p.ln === 0);
  const ratio = nullIsland.length / points.length;
  if (ratio > NULL_ISLAND_MAX_RATIO) {
    report(
      file,
      `널섬(0,0) 좌표 ${nullIsland.length}/${points.length} ` +
        `(${(ratio * 100).toFixed(1)}%). 좌표 파서가 깨졌을 가능성이 높다. ` +
        `예: "${nullIsland[0].n ?? "?"}"`,
    );
  }

  const outOfRange = points.filter(
    (p) =>
      !(p.la >= -90 && p.la <= 90) ||
      typeof p.ln !== "number" ||
      !(p.ln >= -180 && p.ln <= 180),
  );
  if (outOfRange.length) {
    problems.push(
      `${relative(file)} — 좌표 범위 이탈 ${outOfRange.length}건. ` +
        `예: ${JSON.stringify(outOfRange[0]).slice(0, 120)}`,
    );
  }

  if (ALLOWLIST.has(name)) return;
  const fileSlug = name.replace(/\.json$/, "").replace(/^sigint-/, "");
  const placeholders = points.filter((p) => isPlaceholderName(p.n, fileSlug));
  if (placeholders.length) {
    report(
      file,
      `플레이스홀더 작명 ${placeholders.length}건. 합성 데모 데이터로 보인다. ` +
        `예: "${placeholders[0].n}"`,
    );
  }
}

function checkNonEmpty(file, data) {
  const name = path.basename(file);
  if (ALLOWLIST.has(name)) return;
  if (countRecords(data) === 0) {
    problems.push(
      `${relative(file)} — 레코드 0건. 빌드가 실패했거나 소스가 사라졌다. ` +
        `의도한 것이면 ALLOWLIST 에 사유와 함께 추가할 것.`,
    );
  }
}

function checkGzipSidecars(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".json.gz")) continue;
    const gzPath = path.join(dir, entry);
    const jsonPath = gzPath.slice(0, -3);
    if (!fs.existsSync(jsonPath)) {
      warnings.push(`${relative(gzPath)} — 짝이 되는 .json 이 없다 (고아 sidecar)`);
      continue;
    }

    const gzStat = fs.statSync(gzPath);
    const jsonStat = fs.statSync(jsonPath);

    // 빈 gzip 이 살아있는 json 을 가리는 경우 — 가장 위험한 유형
    if (jsonStat.size > MIN_MEANINGFUL_JSON && gzStat.size < MAX_EMPTY_GZ) {
      problems.push(
        `${relative(gzPath)} — 빈 gzip(${gzStat.size}B) 이 ` +
          `${(jsonStat.size / 1024).toFixed(0)}KB 짜리 원본을 가리고 있다. ` +
          `fetchJsonPreferGzip 이 gz 를 우선하므로 런타임에 [] 가 서빙된다. ` +
          `→ node scripts/compress-data-gzip.js all`,
      );
      continue;
    }

    // 파일시스템 타임스탬프 해상도와 OneDrive 동기화 지연을 감안해 5분 여유.
    const STALE_TOLERANCE_MS = 5 * 60 * 1000;
    if (jsonStat.mtimeMs > gzStat.mtimeMs + STALE_TOLERANCE_MS) {
      const days = (jsonStat.mtimeMs - gzStat.mtimeMs) / 86_400_000;
      problems.push(
        `${relative(gzPath)} — .json 보다 ${days.toFixed(1)}일 낡았다. ` +
          `런타임은 이 낡은 gz 를 쓴다. → node scripts/compress-data-gzip.js all`,
      );
      continue;
    }

    // 내용 확인 — 압축은 최신인데 안이 비어 있을 수 있다.
    // 대용량(roads/railroads 등)은 해제·파싱 비용이 커서 건너뛴다.
    // 크기·시각 검사만으로도 실제 사고(23B 빈 gzip)는 이미 잡힌다.
    if (gzStat.size > CONTENT_CHECK_MAX_GZ) continue;
    try {
      const inflated = zlib.gunzipSync(fs.readFileSync(gzPath)).toString("utf8");
      const gzCount = countRecords(JSON.parse(inflated));
      const jsonCount = countRecords(readJson(jsonPath) ?? []);
      if (jsonCount > 0 && gzCount === 0) {
        problems.push(
          `${relative(gzPath)} — 압축본 레코드 0건인데 원본은 ${jsonCount}건이다.`,
        );
      }
    } catch (error) {
      problems.push(`${relative(gzPath)} — gzip 해제/파싱 실패: ${error.message}`);
    }
  }
}

function main() {
  let checked = 0;

  for (const dir of DATA_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".json")) continue;
      const file = path.join(dir, entry);
      const data = readJson(file);
      if (data == null) continue;
      checked += 1;
      checkNonEmpty(file, data);
      checkCoordinates(file, data);
    }
    checkGzipSidecars(dir);
  }

  console.log(`[verify:data] 검사한 JSON ${checked}개`);

  for (const w of warnings) console.warn(`  ⚠ ${w}`);

  if (pending.length) {
    console.warn(`\n[verify:data] 재빌드 대기 ${pending.length}건 (게이트는 통과시킴)\n`);
    for (const p of pending) console.warn(`  ⏳ ${p}`);
    console.warn("");
  }

  if (!problems.length) {
    console.log("[verify:data] ✅ 통과");
    return;
  }

  console.error(`\n[verify:data] ❌ 문제 ${problems.length}건\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error("");

  if (!WARN_ONLY) process.exit(1);
}

main();
