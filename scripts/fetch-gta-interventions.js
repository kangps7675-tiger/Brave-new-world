#!/usr/bin/env node
/**
 * Global Trade Alert 무역조치 수집.
 *
 *   node scripts/fetch-gta-interventions.js [--since YYYY-MM-DD] [--limit N] [--all]
 *
 * ── 접근 등급 ──────────────────────────────────────────────────────
 *   basic : 셀프서비스 API 키로 **지금 바로** 된다.
 *           https://globaltradealert.org 가입 → 개인 API 키 발급
 *   full  : intervention_description · state_act_source · 관세율 prior/new.
 *           별도 승인 필요 (data@globaltradealert.org).
 *           승인 전에도 basic 으로 파이프라인을 완성해 둘 수 있다 —
 *           스키마에 컬럼을 미리 파뒀으므로 승인 시 필드만 채워진다.
 *
 * ── 폴링 예의 ──────────────────────────────────────────────────────
 *   GTA 는 연 단위 lag 보정이 있을 만큼 느린 데이터다. 정책 발표는 하루 단위지
 *   초 단위가 아니다. cron 은 **하루 1회**. 10분 크론에 절대 넣지 말 것.
 *   (프로젝트의 비공식 엔드포인트 원칙과 같은 정신 — 여긴 공식 API 지만
 *    부하 예의는 동일하게 지킨다.)
 *
 * License: CC BY 4.0 — 표기 의무. src/lib/gta.ts GTA_ATTRIBUTION 참조.
 */
const fs = require("fs");
const path = require("path");

const API = "https://api.globaltradealert.org/api/v1/data/";
const OUT_DIR = path.join(__dirname, "..", "public", "data");
const PAGE_SIZE = 1000;
/** 하루 요청 상한 — 예의이자 사고 방지 */
const MAX_PAGES = 20;
const USER_AGENT =
  "BraveTheWorld/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const API_KEY = process.env.GTA_API_KEY;
const FETCH_ALL = process.argv.includes("--all");
const LIMIT = Number(arg("--limit", PAGE_SIZE));
/** 기본: 최근 2년. 증분 수집이 기본이고 --all 로 전수. */
const SINCE =
  arg("--since", null) ||
  new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);

function hsChapter(hsCode) {
  const s = String(Math.trunc(Math.abs(Number(hsCode) || 0)));
  if (s.length <= 2) return Number(s);
  if (s.length <= 4) return Number(s.slice(0, 2));
  return Number(s.slice(0, s.length - 4));
}

function normalizeJurisdiction(j) {
  return {
    unCode: Number(j.id),
    iso3: String(j.iso ?? "").toUpperCase(),
    name: String(j.name ?? ""),
  };
}

function normalizeProducts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      // basic access → 숫자 배열 · full access → 객체 배열
      if (typeof p === "number") {
        return { hsCode: p, hsChapter: hsChapter(p), priorLevel: null, newLevel: null, unit: null };
      }
      const code = Number(p.product_id);
      if (!Number.isFinite(code)) return null;
      return {
        hsCode: code,
        hsChapter: hsChapter(code),
        priorLevel: p.prior_level ?? null,
        newLevel: p.new_level ?? null,
        unit: p.unit ?? null,
      };
    })
    .filter(Boolean);
}

function normalize(row, accessLevel) {
  return {
    interventionId: Number(row.intervention_id),
    stateActId: row.state_act_id != null ? Number(row.state_act_id) : null,
    title: String(row.state_act_title ?? ""),
    evaluation: String(row.gta_evaluation ?? "Amber"),
    interventionType: row.intervention_type ?? null,
    mastChapter: row.mast_chapter ?? null,
    implementationLevel: row.implementation_level ?? null,
    dateAnnounced: row.date_announced ?? null,
    dateImplemented: row.date_implemented ?? null,
    dateRemoved: row.date_removed ?? null,
    isInForce: Number(row.is_in_force) === 1,
    interventionUrl: row.intervention_url ?? null,
    implementers: (row.implementing_jurisdictions ?? []).map(normalizeJurisdiction),
    affected: (row.affected_jurisdictions ?? []).map(normalizeJurisdiction),
    products: normalizeProducts(row.affected_products),
    sectors: (row.affected_sectors ?? []).map(Number).filter(Number.isFinite),
    description: row.intervention_description ?? null,
    sourceNote: row.state_act_source ?? null,
    isOfficialSource:
      row.is_official_source == null ? null : Boolean(row.is_official_source),
    accessLevel,
  };
}

async function fetchPage(offset) {
  const body = {
    limit: LIMIT,
    offset,
    sorting: "-date_announced",
    request_data: FETCH_ALL ? {} : { announcement_period: [SINCE, null] },
  };

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `APIKey ${API_KEY}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `GTA API 인증 실패 (${res.status}). GTA_API_KEY 를 확인하라. ` +
        `키 발급: https://globaltradealert.org 가입 후 개인 API 키`,
    );
  }
  if (!res.ok) {
    throw new Error(`GTA API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/** full access 여부는 응답 필드로 판정한다 (문서화된 등급 차이). */
function detectAccessLevel(rows) {
  const sample = rows.find(Boolean);
  if (!sample) return "basic";
  return "intervention_description" in sample || "state_act_source" in sample
    ? "full"
    : "basic";
}

async function main() {
  if (!API_KEY) {
    console.error(
      "\nGTA_API_KEY 가 없다.\n" +
        "  1) https://globaltradealert.org 가입\n" +
        "  2) 개인 API 키 발급 (비상업 무료)\n" +
        "  3) .env 에 GTA_API_KEY=... 추가\n\n" +
        "메일 회신을 기다릴 필요 없다 — basic 접근은 셀프서비스다.\n" +
        "full access(설명·출처·관세율)만 data@globaltradealert.org 승인 대상이다.\n",
    );
    process.exit(1);
  }

  console.log(`GTA 수집 시작 — ${FETCH_ALL ? "전수" : `${SINCE} 이후`}`);
  const all = [];
  let accessLevel = "basic";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * LIMIT;
    const rows = await fetchPage(offset);
    if (!Array.isArray(rows) || rows.length === 0) break;
    if (page === 0) {
      accessLevel = detectAccessLevel(rows);
      console.log(`   접근 등급: ${accessLevel}`);
    }
    all.push(...rows.map((r) => normalize(r, accessLevel)));
    console.log(`   page ${page + 1}: +${rows.length} (누적 ${all.length})`);
    if (rows.length < LIMIT) break;
    // 예의상 간격
    await new Promise((r) => setTimeout(r, 1200));
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    accessLevel,
    since: FETCH_ALL ? null : SINCE,
    attribution: "Global Trade Alert (globaltradealert.org) · CC BY 4.0",
    license: "CC BY 4.0",
    count: all.length,
    interventions: all,
  };

  for (const profile of ["lite", "full"]) {
    const dir = path.join(OUT_DIR, profile);
    if (!fs.existsSync(dir)) continue;
    // lite 는 최근 조치만 (성능)
    const slice =
      profile === "lite"
        ? { ...payload, interventions: all.slice(0, 400), count: Math.min(400, all.length) }
        : payload;
    fs.writeFileSync(
      path.join(dir, "gta-interventions.json"),
      `${JSON.stringify(slice)}\n`,
    );
  }

  console.log(`✓ gta-interventions.json — ${all.length}건 (${accessLevel})`);
  console.log("  다음: node scripts/compress-data-gzip.js all");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
