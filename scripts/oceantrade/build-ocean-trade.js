#!/usr/bin/env node
/**
 * UNCTAD "International trade in ocean-based sectors" bilateral TOTAL (O_TOT) →
 * corridor scoring cache — mode==="sea" corridors only.
 *
 * 이 데이터는 UNCTADstat 의 "해양경제(ocean-based sectors) 무역" 원본 벌크
 * 익스포트(사용자가 직접 받은 US_OceanTrade.csv, 11.9GB — 전세계 모든
 * 국가×파트너×수산물/선박/해양에너지 등 품목×2012~2025년)에서, mode==="sea"
 * corridor 들의 comtradePair 국가쌍(양방향)에 대해 Product=O_TOT(Total) 행만
 * 걸러낸 결과다. UNCTADstat API/벌크 페이지가 재현 가능한 소스가 아니라서
 * (JS 렌더링 + 이메일 인증, scripts/unctad/README.md 참고) 원본 재다운로드
 * 대신 이 필터링된 소형 CSV(scripts/data/ocean-trade-sea-corridors-raw.csv,
 * ~40KB)를 저장소에 커밋해 소스로 쓴다 — scripts/unctad 의 "연 1~2회 수동
 * 갱신" 관례와 같다.
 *
 * ⚠ 주의: 이 지표는 "해양경제 산업(수산물·선박·해양에너지·해양바이오 등)"
 * 간 무역이지, corridor 를 통과하는 해상 물동량(shipping volume)이 아니다.
 * comtradePair 와 정확히 겹치는 mode==="sea" corridor 에만 붙는 부가 신호로
 * scoreTrade() 의 "trade" 항목 안에서 bilateralTradeNorm 과 평균한다(Eurostat
 * rail freight 를 corridorTeuNorm 으로 blend 한 것과 같은 패턴).
 *
 * Output:
 *   scripts/data/ocean-trade-bilateral.json
 *   public/data/crink/ocean-trade-bilateral.json
 *
 * Usage:
 *   node scripts/oceantrade/build-ocean-trade.js
 *   npm run corridors:oceantrade
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const RAW_CSV = path.join(ROOT, "scripts", "data", "ocean-trade-sea-corridors-raw.csv");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "ocean-trade-bilateral.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "ocean-trade-bilateral.json");

const YEARS_TO_AVERAGE = 3; // 최근 N개 유효연도 평균 (Eurostat rail freight 와 동일 관례)

// M49 → ISO3, mode==="sea" corridor comtradePair 국가만 (fetch_bilateral.py ISO3_TO_M49 의 부분집합)
const M49_TO_ISO3 = {
  "156": "CHN",
  "528": "NLD",
  "364": "IRN",
  "408": "PRK",
  "643": "RUS",
  "760": "SYR",
  "682": "SAU",
  "784": "ARE",
  "887": "YEM",
  "192": "CUB",
};

/** Minimal CSV split — handles quoted fields with commas (scripts/unctad 관례와 동일) */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function pairKey(a, b) {
  const [x, y] = [a, b].sort();
  return `${x}|${y}`;
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(RAW_CSV)) {
    console.error(`[ocean-trade] missing ${path.relative(ROOT, RAW_CSV)} — nothing to build.`);
    process.exit(1);
  }
  const lines = fs
    .readFileSync(RAW_CSV, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  const header = splitCsvLine(lines[0]);
  const idx = {
    year: header.indexOf("Year"),
    economy: header.indexOf("Economy"),
    partner: header.indexOf("Partner"),
    product: header.indexOf("Product"),
    flow: header.indexOf("Flow"),
    value: header.indexOf("US$ at current prices in thousands"),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0) throw new Error(`[ocean-trade] missing column "${k}" in ${path.basename(RAW_CSV)}`);
  }

  // directed[isoA][isoB][year] = exports+imports USD (thousands) as reported by isoA about isoB
  const directed = new Map();
  let rowsUsed = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols[idx.product] !== "O_TOT") continue;
    const isoA = M49_TO_ISO3[String(cols[idx.economy]).trim()];
    const isoB = M49_TO_ISO3[String(cols[idx.partner]).trim()];
    if (!isoA || !isoB || isoA === isoB) continue;
    const year = Number(cols[idx.year]);
    const value = Number(cols[idx.value]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    if (!directed.has(isoA)) directed.set(isoA, new Map());
    if (!directed.get(isoA).has(isoB)) directed.get(isoA).set(isoB, new Map());
    const yearMap = directed.get(isoA).get(isoB);
    yearMap.set(year, (yearMap.get(year) || 0) + value); // Exports(02) + Imports(01) 합
    rowsUsed += 1;
  }

  // unordered pair × year → mirror-average (A→B, B→A 둘 다 있으면 평균, 하나만 있으면 그대로 — fetch_bilateral.py 와 동일 규칙)
  const pairs = {};
  const seenPairs = new Set();
  for (const [isoA, byB] of directed) {
    for (const isoB of byB.keys()) {
      seenPairs.add(pairKey(isoA, isoB));
    }
  }

  for (const key of seenPairs) {
    const [isoA, isoB] = key.split("|");
    const abYears = directed.get(isoA)?.get(isoB) || new Map();
    const baYears = directed.get(isoB)?.get(isoA) || new Map();
    const allYears = new Set([...abYears.keys(), ...baYears.keys()]);
    const yearTotals = {};
    for (const year of allYears) {
      const ab = abYears.get(year) || 0;
      const ba = baYears.get(year) || 0;
      const total = ab > 0 && ba > 0 ? (ab + ba) / 2 : ab + ba;
      if (total > 0) yearTotals[year] = total;
    }
    const sortedYears = Object.keys(yearTotals)
      .map(Number)
      .sort((a, b) => a - b);
    const recentYears = sortedYears.slice(-YEARS_TO_AVERAGE);
    const recentValues = recentYears.map((y) => yearTotals[y]);
    const avgUsdThousands = recentValues.length
      ? recentValues.reduce((s, v) => s + v, 0) / recentValues.length
      : null;
    pairs[key] = {
      isoA,
      isoB,
      usd: avgUsdThousands != null ? avgUsdThousands * 1000 : null, // thousands → USD (Comtrade 캐시와 단위 통일)
      unit: "USD (current prices)",
      years: yearTotals,
      recentYears,
    };
  }

  const withData = Object.values(pairs).filter((p) => typeof p.usd === "number" && p.usd > 0).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat International trade in ocean-based sectors (bulk CSV, user-provided one-off download)",
    sourceFile: path.relative(ROOT, RAW_CSV).replace(/\\/g, "/"),
    caveat:
      "해양경제 산업(수산물·선박·해양에너지·해양바이오 등) 무역이지 corridor 통과 물동량이 아님 — mode===\"sea\" corridor 의 comtradePair 와 겹치는 경우에만 bilateralTradeNorm 과 평균되는 부가 신호로 쓰인다.",
    method: `Product=O_TOT(Total), 최근 ${YEARS_TO_AVERAGE}개 유효연도 평균; 양방향 보고 시 평균, 한쪽만 있으면 그대로 (UN Comtrade fetch_bilateral.py 와 동일 규칙)`,
    rowsUsed,
    pairCount: Object.keys(pairs).length,
    withData,
    pairs,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(`[ocean-trade] pairs=${payload.pairCount} withData=${withData} rowsUsed=${rowsUsed}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
