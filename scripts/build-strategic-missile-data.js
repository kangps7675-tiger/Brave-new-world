// 전략 미사일 정적 레이어 빌드 — 사일로 · 기지 · 시험장 · 발사 이력
// DATA_PROFILE=lite|full node scripts/build-strategic-missile-data.js
//
// 입력은 전부 커밋된 vendor JSON (scripts/extract-strategic-missile-sources.py 산출물)이라
// 이 스크립트는 네트워크·바이너리 파서 없이 돈다.

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const {
  writeJsonArrayFile,
  writeJsonObjectWithLineArrays,
  compactStaticPoint,
  roundCoord,
} = require("./compact-json");

const VENDOR = path.join(__dirname, "vendor", "strategic-missile");
const PLARF_JSON = path.join(
  VENDOR,
  "plarf-silo-study",
  "plarf-silo-study.normalized.json",
);
const NTI_JSON = path.join(
  VENDOR,
  "nti-missile-tracker",
  "nti-missile-tests.normalized.json",
);
const SRF_SEED = path.join(__dirname, "data", "russia-srf-divisions-seed.json");

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** "Yumen Missile Complex" → "yumen" */
function complexSlug(site) {
  return String(site || "")
    .toLowerCase()
    .replace(/missile complex/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ringCentroid(ring) {
  let lng = 0;
  let lat = 0;
  // 닫힌 링의 마지막 점은 첫 점과 같아 평균에서 제외
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.slice(0, -1) : ring;
  for (const [x, y] of pts) {
    lng += x;
    lat += y;
  }
  return [lng / pts.length, lat / pts.length];
}

// ------------------------------------------------------------ China PLARF

function buildPlarf(plarf) {
  const silos = [];
  const complexes = new Map();

  for (const silo of plarf.silos) {
    const slug = complexSlug(silo.site) || "unknown";
    silos.push({
      id: silo.id,
      kind: "missile-silo",
      name: silo.site ? `${silo.site} silo` : "PLARF silo",
      lat: silo.lat,
      lng: silo.lng,
      tier: 1,
      meta: {
        country: "China",
        operator: "PLARF",
        complex: silo.site || "",
        complexId: slug,
        status: "identified",
        source: "PLARF Silo Study",
      },
    });

    let entry = complexes.get(slug);
    if (!entry) {
      entry = { slug, name: silo.site || "Unknown complex", silos: 0, latSum: 0, lngSum: 0 };
      complexes.set(slug, entry);
    }
    entry.silos += 1;
    entry.latSum += silo.lat;
    entry.lngSum += silo.lng;
  }

  const centroids = [...complexes.values()].map((c) => ({
    slug: c.slug,
    name: c.name,
    lat: c.latSum / c.silos,
    lng: c.lngSum / c.silos,
    silos: c.silos,
  }));

  /**
   * 후보 격자는 사일로군 소속 정보가 원본에 없다.
   *
   * 좌표를 보면 붙일 수도 없다 — 격자는 서부 중국 전역(위도 36.7~42.2, 경도 77~107)에
   * 걸친 광역 조사 범위이고, 가장 가까운 셀조차 확인된 사일로군에서 120km 넘게 떨어져
   * 있다. 즉 "새 후보지를 찾으려 훑은 범위"지 3개 사일로군의 내부 격자가 아니다.
   * 최근접으로 귀속시키면 없는 사실이 생기므로, 원본의 격자 ID만 그대로 들고 간다.
   */
  const precision = IS_LITE ? 3 : 5;
  const fields = plarf.candidateSites.map((cell) => {
    const [cLng, cLat] = ringCentroid(cell.ring);
    return {
      id: cell.id,
      /** 원본 GRID_ID (예: SG-146) */
      gridId: cell.name,
      centroid: [roundCoord(cLng, precision), roundCoord(cLat, precision)],
      ring: cell.ring.map(([x, y]) => [roundCoord(x, precision), roundCoord(y, precision)]),
    };
  });

  const surveyBbox = fields.reduce(
    (box, cell) => ({
      minLng: Math.min(box.minLng, cell.centroid[0]),
      minLat: Math.min(box.minLat, cell.centroid[1]),
      maxLng: Math.max(box.maxLng, cell.centroid[0]),
      maxLat: Math.max(box.maxLat, cell.centroid[1]),
    }),
    { minLng: 180, minLat: 90, maxLng: -180, maxLat: -90 },
  );

  // 도로는 lite 프로파일에서 통째로 제외 — 619 세그먼트는 개요 줌에서 의미 없음
  const roads = IS_LITE
    ? []
    : plarf.roads.map((road) => ({
        id: road.id,
        complex: road.site || "",
        complexId: complexSlug(road.site),
        coords: road.coords.map(([x, y]) => [roundCoord(x, 5), roundCoord(y, 5)]),
      }));

  return { silos, fields, roads, centroids, surveyBbox };
}

// ---------------------------------------------------------- Russia RVSN

function buildRussiaSrf(seed) {
  const points = [];
  for (const army of seed.armies) {
    for (const div of army.divisions) {
      const mobile = /mobile/i.test(div.system);
      const silo = /silo/i.test(div.system);
      points.push({
        id: `rvsn-${complexSlug(div.location)}`,
        kind: "strategic-missile-base",
        name: `${div.location} — ${army.name}`,
        lat: div.latitude,
        lng: div.longitude,
        tier: 1,
        meta: {
          country: "Russia",
          operator: "RVSN (Strategic Rocket Forces)",
          army: army.name,
          armyHq: army.hq,
          garrison: div.location,
          system: div.system,
          basing: silo && mobile ? "silo+mobile" : silo ? "silo" : mobile ? "mobile" : "unknown",
        },
      });
    }
  }
  return points;
}

// -------------------------------------------------------------- NTI tests

function buildNti(nti) {
  const sites = nti.facilities
    .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng))
    .map((f) => ({
      id: `nti-facility-${f.facilityId}`,
      kind: "missile-test-site",
      name: f.name,
      lat: f.lat,
      lng: f.lng,
      tier: 2,
      meta: {
        country: f.country,
        location: f.location,
        altNames: f.altNames,
        facilityId: f.facilityId,
        source: "NTI/CNS missile launch tracker",
      },
    }));

  const byFacility = new Map(nti.facilities.map((f) => [f.facilityId, f]));
  const launches = nti.tests.map((t) => {
    const f = byFacility.get(t.facilityId);
    return {
      id: `nti-test-${t.eventId}`,
      date: t.dateOccurred ? t.dateOccurred.slice(0, 10) : null,
      country: t.country,
      missile: t.missileName,
      family: t.missileFamily,
      agency: t.launchAgency,
      facility: t.facilityName,
      lat: f ? f.lat : null,
      lng: f ? f.lng : null,
      outcome: t.outcome,
      apogeeKm: t.apogeeKm,
      rangeKm: t.estimatedRangeKm || t.approxRangeKm || "",
      nuclearFamily: /ICBM|IRBM|MRBM|SLBM/i.test(t.missileFamily || ""),
      note: IS_LITE ? "" : t.note,
    };
  });

  return { sites, launches };
}

// ------------------------------------------------------------------- main

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`build-strategic-missile-data (profile=${IS_LITE ? "lite" : "full"})`);

  const plarf = readJson(PLARF_JSON);
  const nti = readJson(NTI_JSON);
  const srf = readJson(SRF_SEED);

  if (!plarf) {
    console.warn("   PLARF vendor JSON 없음 — extract-strategic-missile-sources.py 먼저 실행");
  }
  if (!nti) {
    console.warn("   NTI vendor JSON 없음 — extract-strategic-missile-sources.py 먼저 실행");
  }

  const china = plarf
    ? buildPlarf(plarf)
    : { silos: [], fields: [], roads: [], centroids: [], surveyBbox: null };
  const russia = srf ? buildRussiaSrf(srf) : [];
  const india = nti ? buildNti(nti) : { sites: [], launches: [] };

  writeJsonArrayFile(
    path.join(OUT_DIR, "missile-silos.json"),
    china.silos.map(compactStaticPoint),
  );
  console.log(`   missile-silos: ${china.silos.length}`);

  writeJsonArrayFile(
    path.join(OUT_DIR, "strategic-missile-bases.json"),
    russia.map(compactStaticPoint),
  );
  console.log(`   strategic-missile-bases: ${russia.length}`);

  writeJsonArrayFile(
    path.join(OUT_DIR, "missile-test-sites.json"),
    india.sites.map(compactStaticPoint),
  );
  console.log(`   missile-test-sites: ${india.sites.length}`);

  writeJsonObjectWithLineArrays(
    path.join(OUT_DIR, "missile-silo-fields.json"),
    {
      generatedAt: new Date().toISOString(),
      attribution: "PLARF Silo Study · China missile silo construction 2019-2021",
      // 후보 격자는 사일로군 내부가 아니라 연구가 훑은 광역 조사 범위다
      fieldsNote:
        "Candidate cells are the study's survey grid across western China — areas screened for new sites, not confirmed silos, and disjoint from the three known fields.",
      surveyBbox: china.surveyBbox,
      complexes: china.centroids.map((c) => ({
        id: c.slug,
        name: c.name,
        silos: c.silos,
        lat: roundCoord(c.lat, 4),
        lng: roundCoord(c.lng, 4),
      })),
      fields: china.fields,
      roads: china.roads,
    },
    ["complexes", "fields", "roads"],
  );
  console.log(
    `   missile-silo-fields: ${china.fields.length} survey cells, ` +
      `${china.roads.length} roads, ${china.centroids.length} complexes`,
  );

  writeJsonObjectWithLineArrays(
    path.join(OUT_DIR, "missile-launch-tests.json"),
    {
      generatedAt: new Date().toISOString(),
      attribution: "NTI / CNS India and Pakistan Missile Launch Tracker",
      launches: india.launches,
    },
    ["launches"],
  );
  console.log(`   missile-launch-tests: ${india.launches.length}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
