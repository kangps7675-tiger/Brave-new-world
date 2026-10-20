#!/usr/bin/env node
/**
 * ATOP(Alliance Treaty Obligations and Provisions) 동맹조약 인제스트 — 반자동, 1회성.
 *
 *   node scripts/fetch-atop-alliances.js <atop-member-level.csv> [--isos CHN,RUS,PRK,IRN,...] [--out path]
 *
 * ── 왜 API 폴링이 아니라 1회성 스크립트인가 ──────────────────────────────
 * ATOP은 공개 API가 없는 정적 학술 데이터셋(버전 5.1, 커버리지 1815–2018)이다.
 * 원본을 직접 받아 로컬 CSV로 넣고 이 스크립트로 초안을 뽑는다 — 매일/매주 돌릴 게 아니라
 * "신규 허브 국가를 추가할 때" 또는 "ATOP가 새 버전을 낼 때"(비정기, 수년 주기)만 재실행한다.
 * GDELT/FIRMS 같은 2층 실시간 폴링 레이어와는 성격이 다르다 — 이건 1층 정적 스냅샷 재료다.
 *
 * ── 원본 다운로드 (직접 받아야 함 — 이 스크립트는 다운로드하지 않는다) ──────
 *   http://www.atopdata.org/data.html → "Member-Level Data" (CSV 또는 Stata .dta → CSV로 변환)
 *   가입 없이 받을 수 있으나 버전마다 정확한 컬럼명이 바뀔 수 있어, 이 스크립트는
 *   컬럼명을 하드코딩하지 않고 헤더를 자동 탐지한다. 실행하면 항상 감지된 헤더를 출력하니
 *   매핑이 이상하면 그 로그를 보고 ALIASES를 조정하면 된다.
 *
 * ── ⚠ 커버리지 한계 (반드시 읽을 것) ─────────────────────────────────
 *   ATOP v5.1은 2018년까지만 커버한다. 예를 들어 2024년 북·러 포괄적 전략 동반자 조약
 *   (상호방위 조항 포함, CRINK 서사에서 핵심적인 최근 사건)은 이 데이터셋에 없다.
 *   이 스크립트가 뽑는 초안은 "2018년까지의 공식 조약 지형"이지 현재 상태가 아니다.
 *   최근 조약은 alliedBlocCountryPolygons.ts의 DISPUTED_MEMBERSHIP_ISO / WEAKER_BILATERAL_ISO
 *   같은 수기 오버라이드 패턴으로 별도 보강해야 한다.
 *
 * ── 이 스크립트가 하지 않는 것 ────────────────────────────────────────
 *   src/lib/alliedBlocCountryPolygons.ts를 덮어쓰지 않는다. 그 파일의 6단계 분류는
 *   이미 사람이 출처를 달아 큐레이션한 것(nato.int, odkb-csto.org, 뉴스 등)이라
 *   이 스크립트로 자동 대체할 대상이 아니다. 대신:
 *     1) 기존 분류와 ATOP 공식 조약 데이터를 대조해 불일치가 있는지 QA 초안을 만들고
 *     2) 새 허브 후보 국가의 동맹 관계를 처음부터 손으로 조사하는 대신 초안으로 제공한다
 *   결과 JSON은 scripts/data/atop-alliances-draft.json — 병합은 사람이 diff 보고 판단.
 *
 * License: ATOP 데이터는 학술 인용 요구(비상업). 상업 배포 전 atopdata.org 이용조건 재확인.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "scripts", "data", "atop-alliances-draft.json");

/** 이 프로젝트가 지금 다루는 범위 — CRINK 4허브 + 현 동맹 오버레이(alliedBlocCountryPolygons.ts) 전체.
 *  --isos 로 얼마든지 바꿀 수 있다(다음 허브 후보 조사용). */
const DEFAULT_ISOS = [
  // CRINK
  "CHN", "RUS", "PRK", "IRN",
  // CSTO
  "BLR", "ARM", "KAZ", "KGZ", "TJK",
  // NATO (32)
  "ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA",
  "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD",
  "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR",
  "GBR", "USA",
  // AUKUS 잔여
  "AUS",
  // 미국 양자조약 / 안보 파트너
  "KOR", "JPN", "PHL", "THA", "QAT", "BHR",
];

/**
 * Correlates of War 국가코드(ccode) → ISO3. ATOP 원본은 관례적으로 COW 코드로 회원국을
 * 식별한다(컬럼명은 버전마다 memid/member/statea 등으로 다를 수 있음 — 아래 ALIASES 참고).
 * COW 코드 자체는 안정적인 표준이지만, 이 표는 이 프로젝트가 다루는 국가 위주로만 채웠다 —
 * 매핑 안 되는 코드는 조용히 버리지 않고 UNMAPPED로 로그를 남긴다. 이상하면 대조해서 채울 것.
 */
const COW_TO_ISO3 = {
  2: "USA", 20: "CAN", 31: "BHS", 40: "CUB", 41: "HTI", 42: "DOM",
  51: "JAM", 52: "TTO", 70: "MEX", 90: "GTM", 91: "HND", 92: "SLV",
  93: "NIC", 94: "CRI", 95: "PAN", 100: "COL", 101: "VEN", 110: "GUY",
  115: "SUR", 130: "ECU", 135: "PER", 140: "BRA", 145: "BOL", 150: "PRY",
  155: "CHL", 160: "ARG", 165: "URY",
  200: "GBR", 205: "IRL", 210: "NLD", 211: "BEL", 212: "LUX", 220: "FRA",
  225: "SUI", 230: "SPN", 235: "PRT", 255: "DEU", 260: "DEU", 265: "DDR",
  290: "POL", 305: "AUT", 310: "HUN", 315: "CZE", 316: "CZE", 317: "SVK",
  325: "ITA", 338: "MLT", 339: "ALB", 341: "MNE", 343: "MKD", 344: "BIH",
  345: "SRB", 346: "HRV", 347: "KOS", 349: "SVN", 350: "GRC", 352: "CYP",
  355: "BGR", 359: "MDA", 360: "ROU", 365: "RUS", 366: "EST", 367: "LVA",
  368: "LTU", 369: "UKR", 370: "BLR", 371: "ARM", 372: "GEO", 373: "AZE",
  375: "FIN", 380: "SWE", 385: "NOR", 390: "DNK", 395: "ISL",
  402: "CAB", 411: "GNB", 420: "GMB", 432: "MLI", 433: "SEN", 434: "BEN",
  435: "MRT", 436: "NER", 437: "CIV", 438: "GIN", 439: "BFA", 450: "LBR",
  451: "SLE", 452: "GHA", 461: "TGO", 471: "CMR", 475: "NGA", 481: "GAB",
  482: "CAF", 483: "TCD", 484: "COG", 490: "COD", 500: "UGA", 501: "KEN",
  510: "TZA", 511: "BDI", 516: "RWA", 517: "SOM", 520: "SOM", 522: "DJI",
  531: "ETH", 530: "ETH", 541: "MOZ", 551: "ZMB", 552: "ZWE", 553: "MWI",
  560: "ZAF", 565: "NAM", 570: "LSO", 571: "BWA", 572: "SWZ", 580: "MDG",
  590: "COM", 600: "MAR", 615: "DZA", 616: "TUN", 620: "LBY", 625: "SDN",
  626: "SSD", 630: "IRN", 640: "TUR", 645: "IRQ", 651: "EGY", 652: "SYR",
  660: "LBN", 663: "JOR", 666: "ISR", 670: "SAU", 678: "YEM", 680: "YEM",
  690: "KWT", 692: "BHR", 694: "QAT", 696: "ARE", 698: "OMN",
  700: "AFG", 701: "TKM", 702: "TJK", 703: "KGZ", 704: "UZB", 705: "KAZ",
  710: "CHN", 712: "MNG", 713: "TWN", 731: "PRK", 732: "KOR", 740: "JPN",
  750: "IND", 760: "BTN", 770: "PAK", 771: "BGD", 775: "MMR", 780: "LKA",
  781: "MDV", 790: "NPL", 800: "THA", 811: "KHM", 812: "LAO", 816: "VNM",
  817: "VNM", 820: "MYS", 830: "SGP", 835: "BRN", 840: "PHL", 850: "IDN",
  860: "TLS", 900: "AUS", 910: "PNG", 920: "NZL", 935: "VUT", 940: "SLB",
  950: "FJI",
};

const ALIASES = {
  atopid: ["atopid", "alliance_id", "allianceid"],
  member: ["member", "memid", "ccode", "stateabb_num", "state1", "statea"],
  begyr: ["begyr", "yrent", "startyear", "year_enter", "begyear"],
  endyr: ["endyr", "yrexit", "endyear", "year_exit"],
  defense: ["defense", "defence"],
  offense: ["offense", "offence"],
  neutral: ["neutral", "neutrality"],
  nonagg: ["nonagg", "nonaggression"],
  consul: ["consul", "consultation"],
};

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** 최소 의존성 CSV 파서 — 따옴표 묶음 필드까지만 지원(학술 데이터셋 범위엔 충분). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function detectColumns(header) {
  const lower = header.map((h) => h.trim().toLowerCase());
  const found = {};
  for (const [key, candidates] of Object.entries(ALIASES)) {
    const idx = lower.findIndex((h) => candidates.includes(h));
    if (idx >= 0) found[key] = idx;
  }
  return found;
}

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error(
      "사용법: node scripts/fetch-atop-alliances.js <atop-member-level.csv> [--isos CHN,RUS,...] [--out path]\n" +
      "원본: http://www.atopdata.org/data.html (Member-Level Data)",
    );
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error("파일 없음:", src);
    process.exit(1);
  }

  const targetIsos = new Set(
    (arg("--isos", DEFAULT_ISOS.join(","))).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
  );
  const outPath = arg("--out", DEFAULT_OUT);

  const rows = parseCsv(fs.readFileSync(src, "utf8"));
  if (rows.length < 2) {
    console.error("CSV가 비어있거나 헤더만 있음");
    process.exit(1);
  }
  const header = rows[0];
  console.log("감지된 헤더:", header.join(" | "));

  const cols = detectColumns(header);
  console.log("자동 매핑:", cols);
  if (cols.atopid == null || cols.member == null) {
    console.error(
      "\n필수 컬럼(atopid, member/ccode)을 못 찾았다. 위 '감지된 헤더'를 보고 " +
      "스크립트 상단 ALIASES에 실제 컬럼명을 추가한 뒤 재실행하라.\n",
    );
    process.exit(1);
  }

  const byAlliance = new Map();
  const unmapped = new Set();

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.length < 2) continue;
    const atopid = row[cols.atopid]?.trim();
    const memberRaw = row[cols.member]?.trim();
    if (!atopid || !memberRaw) continue;

    const cowCode = Number(memberRaw);
    const iso3 = Number.isFinite(cowCode) ? COW_TO_ISO3[cowCode] : memberRaw.toUpperCase();
    if (!iso3) {
      unmapped.add(memberRaw);
      continue;
    }

    if (!byAlliance.has(atopid)) {
      byAlliance.set(atopid, {
        atopId: atopid,
        members: new Set(),
        obligations: new Set(),
        begYear: null,
        endYear: null,
      });
    }
    const entry = byAlliance.get(atopid);
    entry.members.add(iso3);

    for (const oblKey of ["defense", "offense", "neutral", "nonagg", "consul"]) {
      const idx = cols[oblKey];
      if (idx == null) continue;
      const v = row[idx]?.trim();
      if (v === "1" || v?.toLowerCase() === "yes" || v?.toLowerCase() === "true") {
        entry.obligations.add(oblKey);
      }
    }
    if (cols.begyr != null) {
      const raw = row[cols.begyr]?.trim();
      const y = raw ? Number(raw) : NaN;
      if (Number.isFinite(y)) entry.begYear = entry.begYear ? Math.min(entry.begYear, y) : y;
    }
    if (cols.endyr != null) {
      const raw = row[cols.endyr]?.trim();
      const y = raw ? Number(raw) : NaN;
      if (Number.isFinite(y)) entry.endYear = entry.endYear ? Math.max(entry.endYear, y) : y;
    }
  }

  // targetIsos 중 하나라도 걸린 동맹만 남긴다
  const relevant = [...byAlliance.values()]
    .filter((a) => [...a.members].some((iso) => targetIsos.has(iso)))
    .map((a) => ({
      atopId: a.atopId,
      members: [...a.members].sort(),
      obligations: [...a.obligations].sort(),
      begYear: a.begYear,
      endYear: a.endYear,
    }))
    .sort((a, b) => (a.begYear ?? 0) - (b.begYear ?? 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "ATOP (Alliance Treaty Obligations and Provisions) v5.1",
    sourceUrl: "http://www.atopdata.org/data.html",
    coverageNote:
      "ATOP v5.1 커버리지는 1815–2018. 이후 조약(예: 2024 북·러 포괄적 전략 동반자 조약)은 " +
      "여기 없음 — 별도 수기 확인 필요.",
    targetIsos: [...targetIsos].sort(),
    allianceCount: relevant.length,
    unmappedMemberCodes: [...unmapped].sort(),
    _usage:
      "이 파일은 초안이다. src/lib/alliedBlocCountryPolygons.ts를 자동 덮어쓰지 않는다 — " +
      "기존 6단계 분류와 대조해 불일치·누락만 사람이 확인해서 반영할 것.",
    alliances: relevant,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`\n✓ ${relevant.length}개 동맹 초안 → ${outPath}`);
  if (unmapped.size) {
    console.log(`⚠ 매핑 안 된 member 코드 ${unmapped.size}개 (COW_TO_ISO3에 없음):`, [...unmapped].slice(0, 20).join(", "));
  }
  console.log("다음: 이 JSON을 alliedBlocCountryPolygons.ts의 기존 분류와 대조해서 사람이 검수.");
}

main();
