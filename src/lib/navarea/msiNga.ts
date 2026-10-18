/* eslint-disable @typescript-eslint/no-explicit-any -- 소스마다 응답 필드가 달라 느슨하게 받는다 */
// NGA MSI(msi.nga.mil) 수집기 — Brave New World ingest Worker용  [실응답 확인 2026-10-18]
//
// ⚠ 항행 경보: /api/publications/broadcast-warn JSON API는 2024-05-10 이후 갱신 중단
//   (/broadcast-warn/latest-warning → {"date":"2024-05-10T15:42:00Z"}).
//   최신 데이터는 NGA가 매일 올리는 "Daily Memo" 텍스트(in-force 전체)에서 받는다 → fetchNavWarn()
// ⚠ ASAM: /api/publications/asam → 404, 남은 건 2024-07 shapefile뿐. 최신 선박 공격 데이터는 NGA에 없음
//   → UKMTO 레이어로 대체 (ASAM 코드는 제거)
// MODU · World Port Index는 JSON API 정상
//
// NGA WAF는 연속 호출 시 200 + "Request Rejected" HTML로 막음 → 요청 사이 간격 필수
//
// 프로젝트 반영 메모:
//  · 파서는 같은 폴더 `ngaMsi.ts`(원본 navareaNga.ts)를 쓴다.
//  · 크론 안에서는 `{ tries: 1, gapMs: 0 }`으로 한 번만 시도하고 실패로 넘긴다
//    (WAF 차단 시 1분씩 쉬는 기본 동작은 10분 주기 크론을 몇 분 세워 둔다).
//  · MemoWarning은 ngaMsi의 NgaWarning에 맞춰 navArea를 "IV"/"XII"/"HYDROLANT"로,
//    issueDate를 4자리 연도로, cancelDate(ISO)를 채운다 — 스냅샷 어댑터가 그대로 읽는다.

import { warningToFeatures, type NgaWarning } from "./ngaMsi";

const ORIGIN = "https://msi.nga.mil";
const BASE = `${ORIGIN}/api/publications`;

export const SOURCES = {
  navWarnMedia: `${ORIGIN}/api/media?type=Nav%20Warnings`, // Daily Memo 파일 목록
  modu: `${BASE}/modu?output=json`,
  wpi: `${BASE}/world-port-index?output=json`,
} as const;
export type SourceKey = "navWarn" | "modu" | "wpi";

// 권장 주기 (cron에서 분기). Daily Memo는 매일 19시(UTC)경 갱신됨
export const SCHEDULE: Record<SourceKey, string> = {
  navWarn: "하루 2번(예: 20:10, 08:10 UTC) — in-force 스냅샷 통째 교체",
  modu: "하루 1번 — 통째 교체",
  wpi: "한 달 1번 — 정적 데이터, R2에 GeoJSON으로",
};

type Pt = { type: "Point"; coordinates: [number, number] };
type Feature<P> = { type: "Feature"; id: string; geometry: Pt | any; properties: P };
export type FC<P = Record<string, unknown>> = {
  type: "FeatureCollection";
  features: Feature<P>[];
  meta: { source: SourceKey; fetchedAt: string; count: number; skipped: number };
};

export type MsiFetchOptions = {
  /** 요청 시도 횟수. 크론에서는 1 */
  tries?: number;
  /** WAF 차단(HTML)일 때 다시 시도하기 전 대기(ms). 기본 60초 */
  blockedWaitMs?: number;
  /** 소스·파일 사이 간격(ms). 기본 10초(소스 사이) / 3초(Daily Memo 파일 사이) */
  gapMs?: number;
  /** Daily Memo 파일의 lastModified가 이보다 오래되면 건너뛴다(일). 기본 7. 오래된 파일이 정상 경로로 와도 지도를 덮어쓰지 않게 한다 */
  maxAgeDays?: number;
  /** 테스트용 현재 시각(ms) */
  now?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, opts: MsiFetchOptions = {}): Promise<any> {
  const tries = Math.max(1, opts.tries ?? 3);
  const blockedWaitMs = opts.blockedWaitMs ?? 60_000;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld-ingest/1.0" },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.includes("json")) return res.json();
    // WAF 차단은 200 + text/html로 온다
    const blocked = ct.includes("html");
    if (i < tries - 1) await sleep(blocked ? blockedWaitMs : 5_000 * (i + 1));
    else throw new Error(`NGA ${res.status} ${blocked ? "WAF rejected" : ct} ${url}`);
  }
}

async function getText(url: string, opts: MsiFetchOptions = {}): Promise<string> {
  const tries = Math.max(1, opts.tries ?? 3);
  const blockedWaitMs = opts.blockedWaitMs ?? 60_000;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": "BraveNewWorld-ingest/1.0" } });
    const body = res.ok ? await res.text() : "";
    if (res.ok && !body.includes("Request Rejected")) return body;
    if (i < tries - 1) await sleep(blockedWaitMs);
  }
  throw new Error(`NGA text fetch failed ${url}`);
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));
const point = (lat: unknown, lon: unknown): Pt | null => {
  const la = num(lat), lo = num(lon);
  return Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180
    ? { type: "Point", coordinates: [+lo.toFixed(5), +la.toFixed(5)] }
    : null;
};
// 응답 최상위 배열 키가 소스마다 달라서(asam / modu / ports …) 첫 번째 배열을 찾음
const firstArray = (j: any): any[] =>
  Array.isArray(j) ? j : (Object.values(j ?? {}).find(Array.isArray) as any[]) ?? [];

function wrap<P>(source: SourceKey, features: Feature<P>[], skipped: number): FC<P> {
  return {
    type: "FeatureCollection",
    features,
    meta: { source, fetchedAt: new Date().toISOString(), count: features.length, skipped },
  };
}

// ── 1. 항행 경보 (Daily Memo 텍스트) ─────────────────────────
// 시리즈: NAVAREA IV · NAVAREA XII · HYDROLANT · HYDROPAC · HYDROARC
export type NavSeries = "NAVAREA IV" | "NAVAREA XII" | "HYDROLANT" | "HYDROPAC" | "HYDROARC";
const MEMO_FILES: Record<NavSeries, string> = {
  "NAVAREA IV": "DailyMemIV.txt",
  "NAVAREA XII": "DailyMemXII.txt",
  HYDROLANT: "DailyMemLAN.txt",
  HYDROPAC: "DailyMemPAC.txt",
  HYDROARC: "DailyMemARC.txt",
};

const MON: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};
// "161621Z OCT 26" → "2026-10-16T16:21:00Z"
export function dtgToIso(dtg: string): string | undefined {
  const m = dtg.match(/(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})\s+(\d{2,4})/);
  if (!m || !MON[m[4]]) return;
  const y = m[5].length === 2 ? `20${m[5]}` : m[5];
  return `${y}-${MON[m[4]]}-${m[1]}T${m[2]}:${m[3]}:00Z`;
}

export interface MemoWarning extends NgaWarning {
  warningId: string; // "HYDROPAC 3013/26"
  series: string;
  region: string[]; // ["GULF OF OMAN", "OMAN"]
  issuedAt?: string; // ISO
  cancelAt?: string; // ISO ("CANCEL THIS MSG ..." 기준)
}

export function parseDailyMemo(raw: string): { asOf?: string; warnings: MemoWarning[] } {
  const t = raw.replace(/\r/g, "");
  const asOf = t.match(/IN FORCE AS OF (\d{6,7}Z [A-Z]{3})/)?.[1];
  const blocks = t.split(/\n(?=\d{6}Z [A-Z]{3} \d{2}\n)/).slice(1);
  const warnings: MemoWarning[] = [];
  for (const b of blocks) {
    const lines = b.trim().split("\n");
    const head = lines[1]?.match(/^([A-Z ]+?)\s+(\d+)\/(\d{2})(?:\(([^)]*)\))?\.?/);
    if (!head) continue;
    const [, series, num, yy, sub] = head;
    const body = lines.slice(2);
    // 해역명 = 본문 앞쪽의 짧은 대문자 줄들 ("GULF OF OMAN." "OMAN.") — 번호 항목·좌표·긴 문장 나오면 멈춤
    const region: string[] = [];
    for (const l of body) {
      const s = l.trim();
      if (!s) continue;
      if (/^\d+\.\s/.test(s) || /\d{1,3}-\d/.test(s) || s.length > 40 || !/\.$/.test(s)) break;
      if (/^DNC \d+\.?$/.test(s)) continue; // 해도 번호
      region.push(s.replace(/\.$/, ""));
    }
    const text = body.join("\n");
    const cancel = text.match(/CANCEL THIS MSG\s+(\d{6}Z\s+[A-Z]{3}\s+\d{2,4})/)?.[1];
    const issuedAt = dtgToIso(lines[0]);
    const cancelAt = cancel ? dtgToIso(cancel) : undefined;
    warnings.push({
      warningId: `${series} ${num}/${yy}`,
      series,
      msgNumber: +num,
      msgYear: 2000 + +yy,
      // ngaMsi.navAreaRegionCode가 읽는 형태: NAVAREA는 로마 숫자, 나머지는 시리즈 이름 그대로
      navArea: series.replace(/^NAVAREA\s+/, ""),
      subregion: sub,
      region,
      // ngaIssueDateToIso는 4자리 연도를 기대한다 ("161621Z OCT 26" → "161621Z OCT 2026")
      issueDate: lines[0].trim().replace(/(\d{2})$/, "20$1"),
      issuedAt,
      cancelAt,
      cancelDate: cancelAt ?? null,
      text,
    });
  }
  return { asOf, warnings };
}

// ── 보안 사건 분류 (ASAM 대체) ───────────────────────────────
// 실제 Daily Memo 문구로 튜닝 (2026-10-18). 단어 경계 필수:
//   BOARD→STARBOARD, MINE→DETERMINE 오탐 실제 확인됨
// 훈련·사격장 경보("MISSILE FIRING OPERATIONS", "GUNNERY EXERCISES")는 hostile에서 제외
// 실제 10월 파일 729건으로 점검(2026-10-19): NGA는 피습을 "SUFFERED (A) SECURITY INCIDENT"로 쓴다
//   (호르무즈 M/V LIPSI 10-04, 오만만 M/V PETRO DOLPHIN 10-12). 이전엔 ADRIFT 때문에 사고(casualty)로 분류됐다.
export type SecurityClass =
  | "hostile" // 공격·해적·납치·나포·봉쇄
  | "mine" // 기뢰
  | "interference" // GPS/GNSS/AIS 교란
  | "casualty"; // 침몰·전복·화재·표류 선박

const R = {
  hostile:
    /\b(ATTACK(ED|S)?|PIRA(CY|TES?)|HIJACK(ED|ING)?|ARMED ROBBERY|BOARDED|FIRED UPON|STRUCK BY|PROJECTILES?|EXPLOSIONS?|HOSTILE|KIDNAPP?(ED|ING)?|SEIZED|SEIZURE|DETAINED|BLOCKADE|SECURITY INCIDENTS?|SUSPICIOUS (APPROACH|VESSELS?|CRAFT)|UNMANNED (SURFACE|AERIAL|UNDERWATER) (VESSELS?|VEHICLES?)|USVS?|UAVS?|DRONES?)\b/,
  // 훈련/사격장 문맥: 이것만 있으면 hostile 아님
  // "EXERCISE (EXTREME) CAUTION"은 경보 상투 문구라 제외 (실데이터에서 기뢰 경보 오분류 확인)
  drill:
    /\b(EXERCISES?(?! (EXTREME )?CAUTION)|TRAINING|FIRING|GUNNERY|ROCKET LAUNCH(ING)?|LAUNCH OPERATIONS|MISSILE OPERATIONS|TARGET|RANGE FACILITY|SPACE DEBRIS|EXPLOSIVE ORDNANCE DISPOSAL|DEMOLITION)\b/,
  mine: /\b(MINES?|MINEFIELDS?|NAVAL MINES?)\b(?! (COUNTERMEASURES?|HUNTING) EXERCISE)/,
  interference: /\b(GPS|GNSS|AIS)\b[^.]{0,40}\b(INTERFERENCE|JAMMING|SPOOFING|DISRUPTION|UNRELIABLE)\b|\b(JAMMING|SPOOFING)\b/,
  casualty: /\b(SANK|SUNK|SINKING|CAPSIZED|ON FIRE|ABLAZE|DERELICT|ADRIFT|AGROUND)\b/,
};

export function classifySecurity(text: string): SecurityClass | null {
  const t = text.toUpperCase().replace(/\s+/g, " ");
  // "1. ..." 본문만 (CANCEL 줄 제외 — 다른 경보 번호 나열이라 오탐 원인)
  const body = t.replace(/\b\d\. CANCEL[^.]*\./g, "");
  if (R.hostile.test(body)) {
    // 공격 단어가 있어도 훈련 문맥이면 제외. 단 실제 사건 단어(BOARDED/HIJACK/PIRACY/SEIZED)는 훈련보다 우선
    const strong = /\b(PIRA(CY|TES?)|HIJACK|ARMED ROBBERY|BOARDED|FIRED UPON|STRUCK BY|SEIZED|KIDNAP|BLOCKADE|ATTACKED|SECURITY INCIDENT)\b/.test(body);
    if (strong || !R.drill.test(body)) return "hostile";
  }
  if (R.mine.test(body) && !R.drill.test(body)) return "mine";
  if (R.interference.test(body)) return "interference";
  if (R.casualty.test(body)) return "casualty";
  return null;
}

const ALL_SERIES: NavSeries[] = ["NAVAREA IV", "NAVAREA XII", "HYDROLANT", "HYDROPAC", "HYDROARC"];

/** Daily Memo 파일을 받아 경보 목록으로. 크론 어댑터(ngaWarningsToNavareaCollection)가 이걸 그대로 쓴다. */
export async function fetchNavWarnMemos(series: NavSeries[] = ALL_SERIES, opts: MsiFetchOptions = {}) {
  // 파일 key는 media 목록에서 받아옴 (경로가 바뀌어도 따라가도록)
  const media = (await getJson(SOURCES.navWarnMedia, opts)) as {
    s3Key: string;
    filenameBase: string;
    lastModified: string;
  }[];
  const warnings: MemoWarning[] = [];
  const files: Record<string, { lastModified?: string; warnings: number; stale?: boolean }> = {};
  const gapMs = opts.gapMs ?? 3_000;
  const maxAgeMs = (opts.maxAgeDays ?? 7) * 86_400_000;
  const now = opts.now ?? Date.now();
  let fetched = 0;
  for (const s of series) {
    const m = media.find((x) => `${x.filenameBase}.txt` === MEMO_FILES[s]);
    if (!m) continue;
    // 오래된 파일은 받지 않는다 — 그 리전은 교체 대상에서도 빠져 D1의 기존 스냅샷이 유지된다
    const modified = Date.parse(m.lastModified);
    if (Number.isFinite(modified) && now - modified > maxAgeMs) {
      files[s] = { lastModified: m.lastModified, warnings: 0, stale: true };
      continue;
    }
    if (fetched && gapMs > 0) await sleep(gapMs);
    fetched++;
    const raw = await getText(`${BASE}/download?key=${encodeURIComponent(m.s3Key)}&type=view`, opts);
    const parsed = parseDailyMemo(raw).warnings;
    files[s] = { lastModified: m.lastModified, warnings: parsed.length };
    warnings.push(...parsed);
  }
  return { warnings, files };
}

export async function fetchNavWarn(series: NavSeries[] = ALL_SERIES, opts: MsiFetchOptions = {}) {
  const { warnings, files } = await fetchNavWarnMemos(series, opts);
  const feats: any[] = [];
  let skipped = 0;
  for (const w of warnings) {
    const f = warningToFeatures(w);
    if (!f.length) { skipped++; continue; }
    const security = classifySecurity(w.text);
    for (const x of f)
      Object.assign(x.properties, {
        series: w.series, region: w.region, issuedAt: w.issuedAt, cancelAt: w.cancelAt, security,
      });
    feats.push(...f);
  }
  const fc = wrap("navWarn", feats, skipped);
  return { ...fc, meta: { ...fc.meta, files } };
}

// NGA 출처 보안 사건만 (ASAM 대체 레이어). 항행 경보를 이미 받았다면 그 결과를 넘겨서 재요청 없이 거름
export async function fetchNgaSecurity(
  classes: SecurityClass[] = ["hostile", "mine", "interference", "casualty"],
  navWarn?: Awaited<ReturnType<typeof fetchNavWarn>>,
  opts: MsiFetchOptions = {},
) {
  const fc = navWarn ?? (await fetchNavWarn(ALL_SERIES, opts));
  const features = fc.features.filter((f: any) => classes.includes(f.properties.security));
  const byClass: Record<string, number> = {};
  const seen = new Set<string>();
  for (const f of features as any[]) {
    if (seen.has(f.properties.warningId)) continue; // 경보 1건이 점 여러 개여도 1건으로 셈
    seen.add(f.properties.warningId);
    byClass[f.properties.security] = (byClass[f.properties.security] ?? 0) + 1;
  }
  return {
    type: "FeatureCollection" as const,
    features,
    meta: { source: "NGA Daily Memo", fetchedAt: fc.meta.fetchedAt, warnings: seen.size, byClass },
  };
}

// ⚠ NGA 점검(503) 시 /apology_objects/DailyMem*.txt 대체 파일이 뜨지만 2026-10-18 확인 결과 3월 스냅샷(오래됨)
//   → 대체 경로로 받지 말고, 수집 실패 시 D1의 기존 스냅샷을 그대로 유지할 것

// ── 3. MODU: 이동식 해양 시추설비 위치 ───────────────────────
export interface ModuProps {
  name: string;
  date?: string;
  rigStatus?: string;
  specialStatus?: string;
  navArea?: string;
  subregion?: string;
}
// 실응답에 "Rig Removed"·수년 전 날짜 항목이 섞여 있음 → 기본은 철거된 설비 제외
export async function fetchModu(includeRemoved = false, opts: MsiFetchOptions = {}) {
  const j = await getJson(SOURCES.modu, opts);
  let skipped = 0;
  const feats: Feature<ModuProps>[] = [];
  for (const m of firstArray(j)) {
    if (!includeRemoved && /removed/i.test(m.specialStatus ?? "")) { skipped++; continue; }
    const g = point(m.latitude, m.longitude);
    if (!g) { skipped++; continue; }
    feats.push({
      type: "Feature",
      id: `modu-${m.name}`,
      geometry: g,
      properties: {
        name: m.name,
        date: m.date,
        rigStatus: m.rigStatus,
        specialStatus: m.specialStatus,
        navArea: m.navArea,
        subregion: m.subregion,
      },
    });
  }
  return wrap("modu", feats, skipped);
}

// ── 4. World Port Index: 세계 항구 ───────────────────────────
export interface PortProps {
  portNumber: number;
  portName: string;
  country?: string;
  region?: string;
  harborSize?: string;
}
export async function fetchPorts(opts: MsiFetchOptions = {}) {
  const j = await getJson(SOURCES.wpi, opts);
  let skipped = 0;
  const feats: Feature<PortProps>[] = [];
  for (const p of firstArray(j)) {
    // WPI의 latitude/longitude는 "30°20'00\"N" 문자열 → 숫자는 ycoord/xcoord (실응답 확인)
    const g = point(p.ycoord, p.xcoord);
    if (!g) { skipped++; continue; }
    feats.push({
      type: "Feature",
      id: `port-${p.portNumber}`,
      geometry: g,
      properties: {
        portNumber: p.portNumber,
        portName: p.portName ?? p.mainPortName,
        country: p.countryName ?? p.countryCode,
        region: p.regionName,
        harborSize: p.harborSize,
      },
    });
  }
  return wrap("wpi", feats, skipped);
}

// ── 한 번에 돌리기 (소스 사이 간격, 하나 실패해도 나머지 진행) ──
const FETCHERS: Record<SourceKey, (opts: MsiFetchOptions) => Promise<FC<any>>> = {
  navWarn: (o) => fetchNavWarn(ALL_SERIES, o),
  modu: (o) => fetchModu(false, o),
  wpi: (o) => fetchPorts(o),
};

export async function fetchMsi(keys: SourceKey[] = ["navWarn", "modu"], opts: MsiFetchOptions = {}) {
  const gapMs = opts.gapMs ?? 10_000;
  const out: Partial<Record<SourceKey, FC<any>>> = {};
  const errors: Partial<Record<SourceKey, string>> = {};
  for (const [i, k] of keys.entries()) {
    if (i && gapMs > 0) await sleep(gapMs);
    try {
      out[k] = await FETCHERS[k](opts);
    } catch (e) {
      errors[k] = String(e);
    }
  }
  return { data: out, errors };
}

/* Cloudflare Worker cron 예시 (wrangler.toml: crons = ["10 8,20 * * *", "17 3 * * *", "27 4 1 * *"])
export default {
  async scheduled(evt: ScheduledController, env: Env) {
    if (evt.cron === "10 8,20 * * *") { const fc = await fetchNavWarn(); await replaceNavarea(env.DB, fc); }
    if (evt.cron === "17 3 * * *")    { const fc = await fetchModu(); ... }
    if (evt.cron === "27 4 1 * *") { const fc = await fetchPorts(); await env.R2.put("static/wpi.geojson", JSON.stringify(fc)); }
  },
};
*/
