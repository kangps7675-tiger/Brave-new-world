#!/usr/bin/env node
/**
 * ICOW(Issue Correlates of War) 영유권 클레임 인제스트 — 반자동, 1회성, 구조적 사실만.
 *
 *   node scripts/fetch-territorial-claims.js <icow-territorial-claims.csv> [--out path]
 *
 * ── 왜 API 폴링이 아니라 1회성 스크립트인가 ──────────────────────────────
 * ICOW Territorial Claims(Hensel & Mitchell)도 API 없는 정적 학술 데이터셋이다.
 * 국경분쟁은 몇 년 단위로만 바뀌는 구조적 사실이라 GDELT/FIRMS 같은 2층 실시간 폴링
 * 대상이 아니다 — "신규 허브 후보 조사할 때" 또는 "ICOW가 새 버전을 낼 때"만 재실행.
 *
 * ── 원본 다운로드 (직접 받아야 함 — 이 스크립트는 다운로드하지 않는다) ──────
 *   http://www.paulhensel.org/icowterr.html (ICOW Project Data Archive: data.icow.org)
 *   실제 배포판(ICOW Data 1.1)의 클레임-dyad 레벨 파일명은 ICOWclaimdy.csv — 이걸 넣으면 된다.
 *   버전마다 컬럼명이 바뀔 수 있어 헤더를 자동 탐지한다. 실행하면 항상 감지된 헤더를 출력하니
 *   매핑이 이상하면 그 로그 보고 ALIASES를 조정할 것. ⚠ ICOW CSV는 CR(구식 맥/스테이터) 줄바꿈을
 *   쓰기도 한다 — 이 스크립트의 CSV 파서는 \r 단독도 줄 구분자로 처리하므로 별도 변환 불필요.
 *
 * ── ⚠ 커버리지 한계 (반드시 읽을 것) ─────────────────────────────────
 *   ICOW Data 1.1은 서반구·서유럽 영토 클레임은 1816–2001까지, 나머지 지역은 버전에 따라
 *   더 이르게 끊길 수 있다. 2020 나고르노-카라바흐 2차 전쟁, 2023~ 가자 등 최근 사건은 당연히
 *   빠져 있다. 실행 로그에 실제 파일의 연도 범위를 출력하니 확인할 것 — 최신 분쟁은 별도 수기 추가 필요.
 *
 * ── 이 스크립트가 하지 않는 것 ────────────────────────────────────────
 *   TERRITORIAL_DISPUTE_EPISODES(src/data/territorialDisputeEpisodes.ts)를 덮어쓰지 않고,
 *   자동으로 새 엔트리를 만들어 넣지도 않는다. briefing/briefingEn/presentLinkKo/presentLinkEn
 *   같은 줄글 필드는 이 스크립트가 자동 생성하면 안 되는 영역이다(뇌피셜 서사 방지) — 전부
 *   "TODO" 플레이스홀더로만 남기고, LLM 초안 + 사람 검수로 별도 채운다(등불 브리핑과 같은 패턴).
 *   그 TODO를 채울 때의 문체 규칙(용어 괄호 설명, 추상적 요약 문구 금지, 2001년 이후는
 *   웹서치로 검증)은 프로젝트 루트 CLAUDE.md 참고.
 *   기존 파일과 겹치는 듯한 클레임은 이름 매칭 휴리스틱으로만 "가능성 있음" 표시한다 — 확정 아님.
 *   결과는 scripts/data/territorial-claims-draft.json.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "scripts", "data", "territorial-claims-draft.json");
const EPISODES_TS = path.join(ROOT, "src", "data", "territorialDisputeEpisodes.ts");
const COUNTRIES_JSON = path.join(ROOT, "public", "data", "full", "countries.json");

/**
 * fetch-atop-alliances.js와 동일 표(실측 검증됨 — 실제 ICOW/ATOP 배포판 chal/tgt/member
 * 값과 대조해 확인). ICOW 최우량 커버리지가 서반구(전 세계 372개 클레임 중 82개, 1816–2001
 * 전량 수집 완료)라 카리브해·중미 코드(31/40/41/42/51/52/90–95/115)를 반드시 포함해야 한다 —
 * 초기 버전엔 이게 빠져서 서반구 클레임 다수가 "미해결"로 잘못 떨어지는 버그가 있었음(수정됨).
 * ⚠ 1871년 독일 통일·이탈리아 통일 이전의 소국(바이에른=245, 바덴=267, 뷔르템베르크=269,
 * 헤센=271/273, 함부르크=280, 오스트리아-헝가리=300 등)은 의도적으로 매핑하지 않는다 —
 * 현대 ISO3 국가가 아니고 이 제품은 현재 지정학이 목적이라, 아주 오래된 19세기 유럽 소국
 * 클레임은 unresolvedCountryCodes 로그에만 남기고 넘어간다.
 */
const COW_TO_ISO3 = {
  2: "USA", 20: "CAN", 31: "BHS", 40: "CUB", 41: "HTI", 42: "DOM",
  51: "JAM", 52: "TTO", 70: "MEX", 90: "GTM", 91: "HND", 92: "SLV",
  93: "NIC", 94: "CRI", 95: "PAN", 100: "COL", 101: "VEN", 110: "GUY",
  115: "SUR", 130: "ECU", 135: "PER", 140: "BRA", 145: "BOL", 150: "PRY",
  155: "CHL", 160: "ARG", 165: "URY",
  200: "GBR", 205: "IRL", 210: "NLD", 211: "BEL", 212: "LUX", 220: "FRA",
  225: "CHE", 230: "ESP", 235: "PRT", 255: "DEU", 260: "DEU", 265: "DDR",
  290: "POL", 305: "AUT", 310: "HUN", 315: "CZE", 316: "CZE", 317: "SVK",
  325: "ITA", 338: "MLT", 339: "ALB", 341: "MNE", 343: "MKD", 344: "BIH",
  345: "SRB", 346: "HRV", 347: "KOS", 349: "SVN", 350: "GRC", 352: "CYP",
  355: "BGR", 359: "MDA", 360: "ROU", 365: "RUS", 366: "EST", 367: "LVA",
  368: "LTU", 369: "UKR", 370: "BLR", 371: "ARM", 372: "GEO", 373: "AZE",
  375: "FIN", 380: "SWE", 385: "NOR", 390: "DNK", 395: "ISL",
  402: "CPV", 411: "GNB", 420: "GMB", 432: "MLI", 433: "SEN", 434: "BEN",
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

/**
 * ISO3 → 영문 표기 후보(territorialDisputeEpisodes.ts가 실제로 쓰는 짧은 영문명, 예: "US"·"China").
 * dedup 매칭은 아래 possibleDuplicate()에서 단어 경계(\b)로 비교한다 — 예전엔 단순
 * String.includes()라 "US"가 "Russia"/"Belarus"/"Mauritius" 안의 "us" 부분문자열에 걸려
 * 엉뚱한 클레임을 "이미 아카이브에 있음"으로 잘못 표시하는 버그가 있었음(수정됨). 이 표가
 * 없는 나라는 ISO3 코드 자체(소문자)로만 비교하므로, 흔히 등장할 법한 나라는 되도록 채운다.
 */
const ISO3_ALIASES = {
  USA: ["US", "USA", "United States", "America"],
  GBR: ["UK", "Britain", "United Kingdom", "England"],
  KOR: ["South Korea", "ROK", "Korea"],
  PRK: ["North Korea", "DPRK"],
  CHN: ["China", "PRC"],
  TWN: ["Taiwan", "ROC"],
  RUS: ["Russia"],
  IRN: ["Iran"],
  IND: ["India"],
  PAK: ["Pakistan"],
  VNM: ["Vietnam"],
  PHL: ["Philippines"],
  MYS: ["Malaysia"],
  IDN: ["Indonesia"],
  JPN: ["Japan"],
  UKR: ["Ukraine"],
  GEO: ["Georgia"],
  ARM: ["Armenia"],
  AZE: ["Azerbaijan"],
  ISR: ["Israel"],
  LBN: ["Lebanon"],
  SYR: ["Syria"],
  IRQ: ["Iraq"],
  SAU: ["Saudi Arabia"],
  ARE: ["UAE", "United Arab Emirates"],
  QAT: ["Qatar"],
  BHR: ["Bahrain"],
  KWT: ["Kuwait"],
  OMN: ["Oman"],
  YEM: ["Yemen"],
  EGY: ["Egypt"],
  SDN: ["Sudan"],
  SSD: ["South Sudan"],
  LBY: ["Libya"],
  DZA: ["Algeria"],
  MAR: ["Morocco"],
  TUN: ["Tunisia"],
  ETH: ["Ethiopia"],
  ERI: ["Eritrea"],
  ARG: ["Argentina"],
  CHL: ["Chile"],
  VEN: ["Venezuela"],
  GUY: ["Guyana"],
  BOL: ["Bolivia"],
  PER: ["Peru"],
  ECU: ["Ecuador"],
  COL: ["Colombia"],
  BRA: ["Brazil"],
  MEX: ["Mexico"],
  CUB: ["Cuba"],
  TUR: ["Turkey", "Turkiye"],
  GRC: ["Greece"],
  CYP: ["Cyprus"],
  BGR: ["Bulgaria"],
  ROU: ["Romania"],
  MDA: ["Moldova"],
  FIN: ["Finland"],
  SWE: ["Sweden"],
  NOR: ["Norway"],
  DNK: ["Denmark"],
  DEU: ["Germany"],
  FRA: ["France"],
  NLD: ["Netherlands"],
  BEL: ["Belgium"],
  POL: ["Poland"],
  AUT: ["Austria"],
  HUN: ["Hungary"],
  ITA: ["Italy"],
  ALB: ["Albania"],
  SRB: ["Serbia"],
  HRV: ["Croatia"],
  BIH: ["Bosnia"],
  MNE: ["Montenegro"],
  MKD: ["North Macedonia", "Macedonia"],
  KOS: ["Kosovo"],
  SVN: ["Slovenia"],
  AUS: ["Australia"],
  NZL: ["New Zealand"],
  THA: ["Thailand"],
  MMR: ["Myanmar", "Burma"],
  BGD: ["Bangladesh"],
  LKA: ["Sri Lanka"],
  NPL: ["Nepal"],
  BTN: ["Bhutan"],
  AFG: ["Afghanistan"],
  KAZ: ["Kazakhstan"],
  UZB: ["Uzbekistan"],
  TJK: ["Tajikistan"],
  KGZ: ["Kyrgyzstan"],
  TKM: ["Turkmenistan"],
  MNG: ["Mongolia"],
  ZAF: ["South Africa"],
  NAM: ["Namibia"],
  BWA: ["Botswana"],
  ZWE: ["Zimbabwe"],
  ZMB: ["Zambia"],
  MOZ: ["Mozambique"],
  TZA: ["Tanzania"],
  KEN: ["Kenya"],
  UGA: ["Uganda"],
  RWA: ["Rwanda"],
  SOM: ["Somalia"],
  NGA: ["Nigeria"],
  GHA: ["Ghana"],
  CMR: ["Cameroon"],
  CAF: ["Central African Republic"],
  TCD: ["Chad"],
  COD: ["DR Congo", "Congo-Kinshasa"],
  COG: ["Congo-Brazzaville"],
  SEN: ["Senegal"],
  MLI: ["Mali"],
  NER: ["Niger"],
  BFA: ["Burkina Faso"],
  BLR: ["Belarus"],
  EST: ["Estonia"],
  LVA: ["Latvia"],
  LTU: ["Lithuania"],
  BHS: ["Bahamas"],
  HTI: ["Haiti"],
  DOM: ["Dominican Republic"],
  JAM: ["Jamaica"],
  TTO: ["Trinidad"],
  GTM: ["Guatemala"],
  HND: ["Honduras"],
  SLV: ["El Salvador"],
  NIC: ["Nicaragua"],
  CRI: ["Costa Rica"],
  PAN: ["Panama"],
  SUR: ["Suriname"],
  PRY: ["Paraguay"],
  URY: ["Uruguay"],
  CAN: ["Canada"],
  ESP: ["Spain"],
  PRT: ["Portugal"],
  CHE: ["Switzerland"],
  IRL: ["Ireland"],
  LUX: ["Luxembourg"],
  MLT: ["Malta"],
  CPV: ["Cabo Verde", "Cape Verde"],
};

/**
 * ICOW 공식 배포판(ICOWclaimdy.csv, v1.1)에서 실측 확인된 컬럼명을 1순위로 둔다.
 * begclaim/endclaim은 YYYYMM(예: 181601 = 1816년 1월) 형식 — plain YYYY 아님, parseYearMaybeYyyymm로 변환.
 * ⚠ "claim"과 "issue" 컬럼은 진짜로 존재하지만 영토명이 아니다(claim=지역 내 일련번호,
 * issue=쟁점유형 플래그) — 예전 버전은 이 둘을 claimname으로 잘못 매핑했었다. 영토명은 "name" 컬럼.
 */
const ALIASES = {
  claimid: ["claimdy", "claimdyad", "claimno", "claim_id", "claimid"],
  chal: ["chal", "challenger", "sidea", "statea"],
  tgt: ["tgt", "target", "sideb", "stateb"],
  styear: ["begclaim", "styear", "stday_year", "begyr", "startyear", "year_start"],
  endyr: ["endclaim", "endyr", "endday_year", "year_end"],
  claimname: ["name", "claimname", "territory"],
  resolved: ["resolved"],
  salience: ["icowsalc", "icowsal"],
};

/** ICOW의 begclaim/endclaim은 YYYYMM(6자리). ATOP 등 plain YYYY(4자리) 소스와는 다르다 — 자릿수로 구분. */
function parseYearMaybeYyyymm(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return trimmed.replace(/[^0-9]/g, "").length >= 6 ? Math.floor(n / 100) : n;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

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

function resolveCountry(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const num = Number(trimmed);
  if (Number.isFinite(num) && COW_TO_ISO3[num]) return COW_TO_ISO3[num];
  const upper = trimmed.toUpperCase();
  if (upper.length === 3 && /^[A-Z]{3}$/.test(upper)) return upper;
  return null; // 국가명 텍스트로 온 경우는 이 스크립트가 임의로 ISO 추정하지 않음
}

/** 기존 아카이브에서 이미 있을 법한 클레임인지 — 정확한 dedup 아님, "확인 필요" 플래그용 휴리스틱. */
function loadExistingPartyBlobs() {
  if (!fs.existsSync(EPISODES_TS)) return [];
  const text = fs.readFileSync(EPISODES_TS, "utf8");
  const blobs = [];
  const re = /parties:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text))) {
    blobs.push(m[1].toLowerCase());
  }
  return blobs;
}

/** 단어 경계로만 매칭 — 단순 substring이면 "US"가 "Russia"/"Belarus"/"Mauritius" 속 "us"에 걸린다. */
function blobHasName(blob, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(blob);
}

function possibleDuplicate(iso3a, iso3b, existingBlobs) {
  const namesFor = (iso3) => [iso3, ...(ISO3_ALIASES[iso3] || [])];
  const aNames = namesFor(iso3a);
  const bNames = namesFor(iso3b);
  return existingBlobs.some(
    (blob) =>
      aNames.some((n) => blobHasName(blob, n)) && bNames.some((n) => blobHasName(blob, n)),
  );
}

function loadCountryCentroids() {
  if (!fs.existsSync(COUNTRIES_JSON)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(COUNTRIES_JSON, "utf8"));
    const features = data.features || data; // 형태 방어적으로
    const out = {};
    for (const f of features) {
      const iso = f?.properties?.isoA3 ?? f?.isoA3;
      const center = f?.properties?.center ?? f?.center;
      if (iso && center?.lat != null && center?.lng != null) {
        out[iso] = [center.lng, center.lat];
      }
    }
    return out;
  } catch {
    return {};
  }
}

function slugify(a, b, id) {
  return `${a}-${b}-territorial-claim-${id}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error(
      "사용법: node scripts/fetch-territorial-claims.js <icow-territorial-claims.csv> [--out path]\n" +
      "원본: http://www.paulhensel.org/icowterr.html",
    );
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error("파일 없음:", src);
    process.exit(1);
  }

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
  if (cols.chal == null || cols.tgt == null) {
    console.error(
      "\n필수 컬럼(challenger/target 국가 식별자)을 못 찾았다. 위 '감지된 헤더'를 보고 " +
      "스크립트 상단 ALIASES에 실제 컬럼명을 추가한 뒤 재실행하라.\n",
    );
    process.exit(1);
  }

  const existingBlobs = loadExistingPartyBlobs();
  const centroids = loadCountryCentroids();
  console.log(
    existingBlobs.length
      ? `기존 territorialDisputeEpisodes.ts에서 ${existingBlobs.length}개 에피소드의 parties 로드 완료 (dedup 휴리스틱용)`
      : "⚠ territorialDisputeEpisodes.ts를 못 읽음 — dedup 휴리스틱 비활성",
  );
  console.log(
    Object.keys(centroids).length
      ? `국가 중심좌표 ${Object.keys(centroids).length}개 로드 (좌표 근사용, public/data/lite/countries.json)`
      : "⚠ countries.json 없음 — 좌표는 전부 null로 남음(수기 채우기 필요)",
  );

  let minYear = Infinity;
  let maxYear = -Infinity;
  const drafts = [];
  const unresolved = new Set();

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const chalRaw = row[cols.chal]?.trim();
    const tgtRaw = row[cols.tgt]?.trim();
    const chalIso = resolveCountry(chalRaw);
    const tgtIso = resolveCountry(tgtRaw);
    // 실패한 쪽의 코드만 기록한다 — 한쪽만 실패해도 둘 다 넣으면, 실제로는 멀쩡히 풀린
    // 코드가 "미해결"로 잘못 찍혀서 검수할 때 혼란을 준다.
    if (!chalIso && chalRaw) unresolved.add(chalRaw);
    if (!tgtIso && tgtRaw) unresolved.add(tgtRaw);
    if (!chalIso || !tgtIso) continue;

    const styear = cols.styear != null ? parseYearMaybeYyyymm(row[cols.styear]) : null;
    const endyr = cols.endyr != null ? parseYearMaybeYyyymm(row[cols.endyr]) : null;
    if (Number.isFinite(styear)) { minYear = Math.min(minYear, styear); maxYear = Math.max(maxYear, styear); }
    if (Number.isFinite(endyr)) { maxYear = Math.max(maxYear, endyr); }

    const claimName = cols.claimname != null ? row[cols.claimname]?.trim() : "";
    const claimId = cols.claimid != null ? row[cols.claimid]?.trim() : String(r);
    const resolvedRaw = cols.resolved != null ? row[cols.resolved]?.trim() : "";
    const salienceRaw = cols.salience != null ? row[cols.salience]?.trim() : "";

    const cA = centroids[chalIso];
    const cB = centroids[tgtIso];
    const coordinatesApprox = cA && cB ? [(cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2] : null;

    drafts.push({
      id: slugify(chalIso, tgtIso, claimId),
      parties: [chalIso, tgtIso],
      claimNameRaw: claimName || null,
      historicalYear: Number.isFinite(styear) ? styear : null,
      yearEnd: Number.isFinite(endyr) ? endyr : null,
      coordinatesApprox,
      coordinatesNote: coordinatesApprox
        ? "당사국 중심좌표 평균 — 실제 분쟁지 좌표 아님, 검수 시 정확한 좌표로 교체할 것"
        : "좌표 없음 — 수기로 채울 것",
      possibleDuplicateOfExisting: possibleDuplicate(chalIso, tgtIso, existingBlobs),
      resolvedRaw: resolvedRaw || null,
      resolvedNote:
        "원본 코드값 그대로임 — resolved=미해결/빈값 가능성 큼, 정확한 코드 의미는 ICOW " +
        "Territorial Claims 코딩매뉴얼(paulhensel.org) 대조 필요",
      icowSalienceRaw: salienceRaw || null,
      icowSalienceNote:
        "ICOW 중요도 0–12점 척도 원본값(자원·전략적 위치·상주인구·본토여부·정체성연관·역사적주권 6개 지표 합산). " +
        "높을수록 분쟁이 구조적으로 중요하다는 뜻 — briefing 작성 시 우선순위 참고용.",
      title: "TODO — 사람/LLM 초안 필요",
      titleEn: "TODO",
      briefing: "TODO — LLM 초안 + 필성 검수 후 채울 것 (자동 생성 금지)",
      briefingEn: "TODO",
      presentLinkKo: "TODO",
      presentLinkEn: "TODO",
      linkedHotspotIds: [],
      _source: "ICOW Territorial Claims Data (Hensel & Mitchell)",
      _needsReview: true,
    });
  }

  // 이미 아카이브에 있을 법한 건 뒤로 밀어서 "새로 볼 것"이 먼저 보이게
  drafts.sort((a, b) => Number(a.possibleDuplicateOfExisting) - Number(b.possibleDuplicateOfExisting));

  const newCandidates = drafts.filter((d) => !d.possibleDuplicateOfExisting);
  const likelyExisting = drafts.filter((d) => d.possibleDuplicateOfExisting);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "ICOW Territorial Claims Data (Hensel & Mitchell)",
    sourceUrl: "http://www.paulhensel.org/icowterr.html",
    fileYearRange: Number.isFinite(minYear) ? `${minYear}–${maxYear}` : "알 수 없음(연도 컬럼 매핑 실패)",
    coverageNote:
      "이 파일의 실제 연도 범위는 위 fileYearRange 참고. 2020년대 분쟁(나고르노-카라바흐 2차, 가자 등)은 " +
      "원본 데이터셋 버전에 따라 빠져 있을 수 있음 — 별도 수기 추가 필요.",
    totalParsed: drafts.length,
    newCandidateCount: newCandidates.length,
    likelyAlreadyInArchiveCount: likelyExisting.length,
    unresolvedCountryCodes: [...unresolved].sort(),
    _usage:
      "title/briefing/presentLink* 필드는 전부 TODO다 — 자동 서사 생성 금지 원칙. " +
      "newCandidates부터 검토해서 필요한 것만 LLM 초안 + 검수로 채운 뒤 " +
      "territorialDisputeEpisodes.ts에 사람이 직접 추가할 것.",
    newCandidates,
    likelyAlreadyInArchive: likelyExisting,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`\n✓ 총 ${drafts.length}건 파싱 (신규 후보 ${newCandidates.length} / 기존 추정 ${likelyExisting.length}) → ${outPath}`);
  if (unresolved.size) {
    console.log(`⚠ 국가코드 미해결 ${unresolved.size}개:`, [...unresolved].slice(0, 20).join(", "));
  }
  console.log("다음: newCandidates 리스트를 검토 → 필요한 항목만 briefing 초안 작성 → territorialDisputeEpisodes.ts에 수기 반영.");
}

main();
