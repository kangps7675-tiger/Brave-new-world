// GDELT 2.0 → Conflict View 4종 필터 (전투/외교·영유권/소요/시위)
// rolling: 최근 N×15분 export zip 병합 (기본 32구간 ≈ 8시간)
// 실행: npm run gdelt:fetch
// 환경변수: GDELT_ROLLING_SLICES=48 등

const fs = require("fs");
const path = require("path");
const { DEFAULT_ROLLING_SLICES, fetchRollingGdeltEvents } = require("./gdelt-core");

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

function toCSV(events) {
  const columns = [
    "global_event_id", "event_date", "country", "lat", "lon", "category", "severity",
    "goldstein_scale", "source_url", "title", "created_at", "actor1_country", "actor2_country",
    "event_tier", "tension_score",
  ];
  const rows = events.map((event) => columns.map((column) => escapeCsv(event[column])).join(","));
  return `${columns.join(",")}\n${rows.join("\n")}`;
}

async function main() {
  const sliceCount = DEFAULT_ROLLING_SLICES;
  console.log(`1. GDELT rolling fetch (${sliceCount}×15분 구간, 필터 유지)...`);

  const result = await fetchRollingGdeltEvents(sliceCount);
  console.log(`   최신: ${result.latestTimestamp}`);
  console.log(`   zip ${result.downloadedSlices}개 수신 · ${result.skippedSlices}개 없음/건너뜀`);
  console.log(`   분류된 이벤트 ${result.events.length}개 (중복 ID 병합)`);
  if (result.filterStats) {
    const s = result.filterStats;
    console.log(
      `   필터 통계 raw ${s.rawRows} · 좌표오류 ${s.invalidCoords} · 루트제외 ${s.disallowedRootCode}`,
    );
    console.log(
      `   티어제외 ${s.unclassifiedTier} · 지역제외 ${s.outsideConflictNav} · 핵심뉴스제외 ${s.nonCoreGeopolitical} · 통과 ${s.kept}`,
    );
  }

  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "events.json"), JSON.stringify(result.events, null, 2));
  fs.writeFileSync(path.join(outDir, "events.csv"), toCSV(result.events));
  fs.writeFileSync(
    path.join(outDir, "events-meta.json"),
    JSON.stringify(
      {
        fetchedAt: result.fetchedAt,
        latestUrl: result.latestUrl,
        latestTimestamp: result.latestTimestamp,
        sliceCount: result.sliceCount,
        downloadedSlices: result.downloadedSlices,
        skippedSlices: result.skippedSlices,
        eventCount: result.events.length,
        filterStats: result.filterStats || null,
      },
      null,
      2,
    ),
  );

  console.log("2. 완료. scripts/output/events.json");
}

main().catch((err) => {
  console.error("에러 발생:", err.message);
  process.exit(1);
});
