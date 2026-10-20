// UCDP GED (Georeferenced Event Dataset) 빌드 타임 fetch → 정적 분쟁 사건 갱신.
//
// UCDP는 v26.1부터 액세스 토큰을 요구한다 (헤더: x-ucdp-access-token).
//   .env / .env.local 에 UCDP_ACCESS_TOKEN=... 채운 뒤:
//     npm run data:ucdp
//   → scripts/data/sigint-converted/ucdp-events.json 갱신
//   → 이후 build-static-extras 가 public/data/{profile}/ucdp-events.json 으로 굽는다.
//
// 런타임(엣지/브라우저)에서는 절대 호출하지 않는다. 토큰은 서버/CI 빌드 환경에만 둔다.
//
// 범위 정책(keep scope): 전체 GED 덤프가 아니라, 현재 앱이 다루는 주요 분쟁국만
// 추려 최근 연도 위주로 상위 N건씩만 남긴다 (파일 크기·좌표 밀도 유지).

const fs = require("fs");
const path = require("path");

const API_BASE = "https://ucdpapi.pcr.uu.se/api/gedevents/26.1";
const OUT_PATH = path.join(__dirname, "data", "sigint-converted", "ucdp-events.json");

// --- 튜닝 상수 (필요 시 조정) --------------------------------------------------
const PAGE_SIZE = 1000; // API 최대 권장치
const MAX_PAGES = 60; // 안전 상한 (paging 폭주 방지)
const MIN_YEAR = 2023; // 이 연도 이상만 채택 (최근 위주)
const PER_COUNTRY_CAP = 6; // 국가별 상위 건수 (best 사망자 기준)
const GLOBAL_CAP = 60; // 전체 상한

// 현재 앱 커버리지에 맞춘 주요 분쟁국 (소문자 substring 매칭).
// UCDP country 표기 편차를 흡수하려 넉넉히 나열한다.
const COUNTRY_ALLOWLIST = [
  "ukraine",
  "russia",
  "palestine",
  "israel",
  "lebanon",
  "sudan",
  "myanmar",
  "burma",
  "congo", // DR Congo (Zaire)
  "somalia",
  "syria",
  "yemen",
  "ethiopia",
  "burkina",
  "mali",
  "niger",
];

const VIOLENCE_TYPE = {
  1: "state-based",
  2: "non-state",
  3: "one-sided",
};

function readEnvToken() {
  if (process.env.UCDP_ACCESS_TOKEN) return process.env.UCDP_ACCESS_TOKEN.trim();
  // .env / .env.local 에서 직접 읽기 (dotenv 의존 없이)
  for (const name of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", name);
    if (!fs.existsSync(p)) continue;
    const line = fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith("UCDP_ACCESS_TOKEN="));
    if (line) {
      const value = line.slice(line.indexOf("=") + 1).trim();
      if (value) return value;
    }
  }
  return "";
}

function isAllowedCountry(country) {
  const c = String(country || "").toLowerCase();
  return COUNTRY_ALLOWLIST.some((needle) => c.includes(needle));
}

function severityFrom(best) {
  const b = Number(best) || 0;
  if (b >= 40) return { severity: Math.min(98, 78 + Math.round(b / 8)), label: "Severe" };
  if (b >= 10) return { severity: Math.min(80, 55 + Math.round(b / 3)), label: "High" };
  if (b >= 1) return { severity: Math.max(35, 30 + b * 2), label: "Moderate" };
  return { severity: 25, label: "Low" };
}

function toCompactEvent(ev) {
  const lat = Number(ev.latitude);
  const lon = Number(ev.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const best = Number(ev.best) || 0;
  const { severity, label } = severityFrom(best);
  const conflictName = ev.conflict_name || ev.dyad_name || ev.country || "UCDP event";
  return {
    i: `sigint-ucdp-event-${ev.id}`,
    k: "ucdp-event",
    n: conflictName,
    la: Math.round(lat * 100) / 100,
    ln: Math.round(lon * 100) / 100,
    s: 1,
    m: {
      source: "ucdp-ged-api",
      id: String(ev.id),
      type: "ucdp_event",
      violenceType: VIOLENCE_TYPE[ev.type_of_violence] || "state-based",
      conflictId: ev.conflict_new_id ?? ev.conflict_dset_id ?? null,
      conflictName,
      actor1Name: ev.side_a || null,
      actor2Name: ev.side_b || null,
      country: ev.country || null,
      admin1: ev.adm_1 || null,
      locationName: ev.where_description || ev.where_coordinates || ev.adm_1 || ev.country || null,
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
      date: ev.date_start ? String(ev.date_start).slice(0, 10) : null,
      year: Number(ev.year) || null,
      fatalities_best: best,
      fatalities_low: Number(ev.low) || 0,
      fatalities_high: Number(ev.high) || 0,
      severity,
      severityLabel: label,
      sourceName: "UCDP GED",
      sourceDatasetVersion: "26.1",
      sourceUrl: "https://ucdp.uu.se/downloads/index.html",
      attribution: "Uppsala Conflict Data Program (UCDP) · GED API",
      lastUpdated: Date.now(),
      ts: Date.now(),
    },
  };
}

async function fetchPage(token, page) {
  const url = `${API_BASE}?pagesize=${PAGE_SIZE}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      "x-ucdp-access-token": token,
      Accept: "application/json",
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`UCDP 인증 실패 (HTTP ${res.status}) — 토큰을 확인하세요.`);
  }
  if (!res.ok) {
    throw new Error(`UCDP 요청 실패 (HTTP ${res.status}) page=${page}`);
  }
  return res.json();
}

async function main() {
  const token = readEnvToken();
  if (!token) {
    console.log(
      "[ucdp] UCDP_ACCESS_TOKEN 미설정 — 갱신을 건너뜁니다. 기존 ucdp-events.json 유지.",
    );
    console.log("[ucdp] .env 에 UCDP_ACCESS_TOKEN=... 채운 뒤 다시 실행하세요.");
    return;
  }

  console.log(`[ucdp] GED 26.1 fetch 시작 (pagesize=${PAGE_SIZE}, min_year=${MIN_YEAR})`);
  const collected = [];
  let totalPages = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let payload;
    try {
      payload = await fetchPage(token, page);
    } catch (err) {
      console.error(`[ucdp] ${err.message}`);
      if (page === 1) process.exitCode = 1;
      break;
    }
    if (totalPages == null) {
      totalPages = Number(payload.TotalPages) || 1;
      console.log(`[ucdp] TotalPages=${totalPages} TotalCount=${payload.TotalCount ?? "?"}`);
    }
    const rows = Array.isArray(payload.Result) ? payload.Result : [];
    for (const ev of rows) {
      if ((Number(ev.year) || 0) < MIN_YEAR) continue;
      if (!isAllowedCountry(ev.country)) continue;
      collected.push(ev);
    }
    if (page >= (totalPages || 1)) break;
    if (page % 10 === 0) console.log(`[ucdp]  … page ${page}, 후보 ${collected.length}건`);
  }

  console.log(`[ucdp] 필터 통과 원시 ${collected.length}건 — 국가별 상위 ${PER_COUNTRY_CAP} 추출`);

  // 국가별 best 내림차순 상위 N
  const byCountry = new Map();
  for (const ev of collected) {
    const key = String(ev.country || "?").toLowerCase();
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key).push(ev);
  }
  const picked = [];
  for (const [, list] of byCountry) {
    list.sort((a, b) => (Number(b.best) || 0) - (Number(a.best) || 0));
    picked.push(...list.slice(0, PER_COUNTRY_CAP));
  }
  picked.sort((a, b) => (Number(b.best) || 0) - (Number(a.best) || 0));

  const compact = picked
    .slice(0, GLOBAL_CAP)
    .map(toCompactEvent)
    .filter(Boolean);

  if (compact.length === 0) {
    console.log("[ucdp] 채택 0건 — 기존 파일을 보존하고 종료합니다.");
    if (!process.exitCode) process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const body = `[\n${compact.map((e) => `\t${JSON.stringify(e)}`).join(",\n")}\n]\n`;
  fs.writeFileSync(OUT_PATH, body);
  console.log(`[ucdp] 완료: ${compact.length}건 → ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log("[ucdp] 다음: npm run sigint:build (또는 build-static-extras) 로 public/data 반영");
}

main().catch((err) => {
  console.error("[ucdp] 예외:", err);
  process.exitCode = 1;
});
