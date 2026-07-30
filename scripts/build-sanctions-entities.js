#!/usr/bin/env node
/**
 * 제재 대상 레이어 빌드 — `npm run sanctions:build`
 *
 * 2026-07-31 감사 P0-3 대응.
 * 기존 shipped 파일은 국가 단위 더미 15건(Iran, North Korea, ...)이었는데
 * "OFAC SDN + UN + EU + UK" 로 표기되고 있었다. 게다가 route.ts 의
 * loadSanctions() 는 라이브 fetch 가 전혀 없이 그 파일만 읽고 lists 배열을
 * 하드코딩했다. 이 스크립트가 리포에 이미 있는 진짜 데이터로 교체한다.
 *
 * 입력: scripts/vendor/sigint-news-layers/sanctions-entities.json
 *
 * ⚠️ 이 vendor 파일은 **일부 손상돼 있다.** 약 11.18MB 지점에서 두 개의 JSON
 *    문서가 겹쳐 쓰였다 (`],"ts":...}:"Saddam Hussein..."`). 앞쪽 문서는
 *    온전하므로 거기까지만 파싱한다. 원본을 다시 받으면 이 처리는 지워도 된다.
 *
 * ⚠️ 정직성 — 19,709건 중 좌표가 있는 것은 268건(1.4%)뿐이고, 그나마도
 *    국가 중심점에 geoConfidence="Low" 다. 그래서 두 갈래로 낸다:
 *      1) points  — 좌표가 실제로 있는 것만. 없는 걸 지어내지 않는다.
 *      2) rollup  — 나머지는 관할권별 **집계**. 국가 음영용이지 핀이 아니다.
 *    이게 "지도에 점이 있어야 하니까 대충 찍는" 것보다 낫다.
 */
const fs = require("fs");
const path = require("path");

const VENDOR = path.join(
  __dirname,
  "vendor",
  "sigint-news-layers",
  "sanctions-entities.json",
);
const OUT_DIR = path.join(__dirname, "..", "public", "data");
const CAPS = { lite: 200, full: 600 };

/** 손상 지점 이전까지만 안전하게 파싱한다. */
function parseSalvageable(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const m = /position (\d+)/.exec(error.message);
    const at = m ? Number(m[1]) : NaN;
    if (!Number.isFinite(at)) throw error;
    console.warn(
      `   ⚠ vendor JSON 손상 — ${at.toLocaleString()} 바이트까지만 사용한다.`,
    );
    return JSON.parse(raw.slice(0, at));
  }
}

function normalizeIso(value) {
  const v = String(value ?? "").trim();
  if (!v || v === "-0-") return null;
  return v;
}

function main() {
  if (!fs.existsSync(VENDOR)) {
    console.error(`vendor 파일이 없다: ${VENDOR}`);
    console.error("→ node scripts/fetch-sigint-layers.js 로 먼저 받을 것");
    process.exit(1);
  }

  const raw = fs.readFileSync(VENDOR, "utf8");
  const doc = parseSalvageable(raw);
  const entities = Array.isArray(doc.entities) ? doc.entities : [];
  console.log(`제재 엔티티 ${entities.length.toLocaleString()}건 로드`);

  const byAuthority = {};
  const rollup = {};
  const points = [];

  for (const e of entities) {
    const authority = String(e.authority ?? "UNKNOWN");
    byAuthority[authority] = (byAuthority[authority] ?? 0) + 1;

    const jurisdiction = normalizeIso(e.jurisdictionCountry);
    if (jurisdiction) {
      rollup[jurisdiction] = (rollup[jurisdiction] ?? 0) + 1;
    }

    const geo = e.geo;
    const lat = Number(geo?.lat);
    const lng = Number(geo?.lon ?? geo?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    points.push({
      i: `sanction-${e.id ?? points.length}`,
      k: "sanctions-entity",
      n: String(e.name ?? "(이름 없음)"),
      la: Number(lat.toFixed(4)),
      ln: Number(lng.toFixed(4)),
      s: authority === "OFAC" ? 1 : 2,
      m: {
        source: "ofac-un-consolidated",
        authority,
        program: e.program ?? null,
        entityType: e.entityType ?? null,
        designationDate: e.designationDate ?? null,
        status: e.status ?? null,
        jurisdiction,
        imo: e.identifiers?.imo ?? null,
        mmsi: e.identifiers?.mmsi ?? null,
        sourceUrl: e.sourceTrace?.sourceUrl ?? null,
        datasetVersion: e.sourceTrace?.datasetVersion ?? null,
        // 좌표 신뢰도를 그대로 들고 간다 — 국가 중심점을 정밀 위치로 오인하면 안 된다
        geoConfidence: geo?.geoConfidence ?? "Unknown",
        coordPrecision: "country-centroid",
      },
    });
  }

  console.log(`   authority: ${JSON.stringify(byAuthority)}`);
  console.log(
    `   좌표 보유 ${points.length}건 (${((points.length / entities.length) * 100).toFixed(1)}%) · ` +
      `관할권 집계 ${Object.keys(rollup).length}개국`,
  );

  if (points.length < 50) {
    throw new Error(`좌표 보유 ${points.length}건뿐 — 덮어쓰지 않고 중단한다.`);
  }

  const authorities = Object.keys(byAuthority).sort();
  for (const profile of ["lite", "full"]) {
    const dir = path.join(OUT_DIR, profile);
    if (!fs.existsSync(dir)) continue;

    const capped = points.slice(0, CAPS[profile]);
    fs.writeFileSync(
      path.join(dir, "sanctions-entities.json"),
      `[\n${capped.map((p) => `\t${JSON.stringify(p)}`).join(",\n")}\n]\n`,
    );

    // 사이드카 — 국가 음영·통계용. 점으로 못 찍는 19,441건이 여기 있다.
    fs.writeFileSync(
      path.join(dir, "sanctions-rollup.json"),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalEntities: entities.length,
          mappedPoints: capped.length,
          note:
            "전체 제재 엔티티 중 좌표를 가진 것은 소수이며 그나마 국가 중심점이다. " +
            "나머지는 관할권별 집계로만 표현한다 — 없는 좌표를 지어내지 않는다.",
          authorities: byAuthority,
          byJurisdiction: rollup,
          attribution: "US Treasury OFAC SDN · UN Security Council Consolidated List",
        },
        null,
        2,
      )}\n`,
    );
    console.log(`   ✓ ${profile}: points ${capped.length} + rollup`);
  }

  console.log("\n다음 단계:");
  console.log("  1) sourceCatalog 의 sanctions-entities 를 shipped 로 되돌리고");
  console.log(`     attribution 을 "US Treasury OFAC / UN Security Council" 로 (실제 수록: ${authorities.join(", ")})`);
  console.log("     ⚠️ EU·UK 는 이 vendor 파일에 없다 — 표기에서 빼거나 따로 수집할 것");
  console.log("  2) src/app/api/layers/sanctions-entities/route.ts 의 하드코딩 lists 배열 수정");
  console.log("  3) node scripts/compress-data-gzip.js all && npm run verify:data");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
