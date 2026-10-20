/**
 * HDX HAPI · ACLED conflict-events → 실제 교전 전선별 사망(fatalities) 집계.
 * event_type=political_violence 만 사용 (civilian_targeting과 비상호배타).
 * 부상은 HAPI에 없음.
 *
 * 원데이터 경로:
 *   ACLED (Armed Conflict Location & Event Data Project)
 *     → OCHA HDX 데이터셋
 *     → HDX HAPI `/coordination-context/conflict-events`
 * 표기 시 ACLED를 반드시 명시 (https://acleddata.com/attributionpolicy).
 */

import type { CombatTheaterId } from "@/lib/theaterCombat";

/** HDX HAPI 엔드포인트 — 집계된 conflict-events */
export const HAPI_CONFLICT_EVENTS_URL =
  "https://hapi.humdata.org/api/v2/coordination-context/conflict-events";

/** HDX HAPI 문서 */
export const HAPI_DOCS_URL = "https://hapi.humdata.org/docs";

/** HDX 데이터셋(메타) — Conflict Events */
export const HAPI_HDX_DATASET_URL =
  "https://data.humdata.org/dataset/hdx-hapi-conflict-event";

/** 원천 데이터 제공자 (ACLED 표기 필수) */
export const ACLED_HOME_URL = "https://acleddata.com";
export const ACLED_ATTRIBUTION_POLICY_URL = "https://acleddata.com/attributionpolicy";

export const HAPI_ATTRIBUTION_SHORT = "HDX HAPI · ACLED";
export const HAPI_ATTRIBUTION =
  "HDX HAPI · Armed Conflict Location & Event Data Project (ACLED) · OCHA HDX";
export const HAPI_SOURCE_LINE =
  "Source: ACLED via HDX HAPI (OCHA). www.acleddata.com";

/** 사용자 제공 앱 식별자 (MyConflictMap:kangps7675@gmail.com) — env로 덮어쓰기 가능 */
export const HAPI_APP_IDENTIFIER_DEFAULT =
  "TXlDb25maWN0TWFwOmthbmdwczc2NzVAZ21haWwuY29t";

export type HapiConflictEventRow = {
  location_code: string;
  location_name: string;
  admin1_code?: string | null;
  admin1_name?: string | null;
  admin2_code?: string | null;
  admin2_name?: string | null;
  admin_level?: number | null;
  event_type: string;
  events: number;
  fatalities: number;
  reference_period_start: string;
  reference_period_end: string;
};

export type HapiActiveFront = {
  id: string;
  theaterId: CombatTheaterId;
  locationCode: string;
  locationName: string;
  admin1Name: string;
  lat: number;
  lng: number;
  killed: number;
  events: number;
  periodStart: string;
  periodEnd: string;
  territorySpanDeg: number;
};

export type HapiConflictCasualtiesPayload = {
  fronts: HapiActiveFront[];
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  /** 국가별 조회 창 — 전면전은 개전일, 회색지대는 최근 수개월 */
  windowsByLocation?: Record<string, { start: string; end: string }>;
  source: string;
  cite: string[];
  caveat: string;
};

/** 우크라 전면전 개전 */
export const UKRAINE_FULLSCALE_START = "2022-02-24";
/** 미국·이스라엘 vs 이란 (Epic Fury) */
export const IRAN_WAR_START = "2026-02-28";
/** 가자 전쟁 개전 */
export const GAZA_WAR_START = "2023-10-07";

/** 우크라 — 현재 열린 전선 주(州). 후방·비전선은 제외 */
export const UKRAINE_ACTIVE_FRONT_ADMIN1 = new Set([
  "Donetska",
  "Luhanska",
  "Kharkivska",
  "Zaporizka",
  "Khersonska",
  "Sumska",
  "Dnipropetrovska",
]);

/** 중동 — 최근 교전이 열린 행정구역 (HAPI admin1 이름) */
export const MIDDLE_EAST_ACTIVE_FRONT_ADMIN1 = new Set([
  "Gaza Strip",
  "Al Nabatieh",
  "South",
  "Baalbek-El Hermel",
  "Baalbek-Hermel",
]);

/**
 * 이란 — HAPI/ACLED admin1 (영문).
 * 사망이 적어도 events가 있으면 사건 태그로 표시.
 */
export const IRAN_ACTIVE_FRONT_ADMIN1 = new Set([
  "Tehran",
  "Isfahan",
  "Esfahan",
  "Khuzestan",
  "Bushehr",
  "Hormozgan",
  "Fars",
  "Kermanshah",
  "West Azerbaijan",
  "East Azerbaijan",
  "Sistan and Baluchestan",
  "Sistan & Baluchestan",
  "Kerman",
  "Lorestan",
  "Ilam",
  "Kurdistan",
  "Hamadan",
  "Qom",
  "Markazi",
  "Yazd",
  "Semnan",
  "Golestan",
  "Mazandaran",
  "Gilan",
  "Ardabil",
  "Zanjan",
  "Qazvin",
  "Alborz",
  "Chahar Mahaal and Bakhtiari",
  "Kohgiluyeh and Boyer-Ahmad",
  "North Khorasan",
  "Razavi Khorasan",
  "South Khorasan",
  "Iran",
]);

export const IRAN_LOCATION_CODES = new Set(["IRN"]);

/**
 * 중국·대만 — HAPI는 종종 admin1=null(국가 단위)만 줌.
 * 해상 대치·물대포 등 회색지대는 fatalities=0이어도 events>0.
 */
export const CHINA_TAIWAN_LOCATION_CODES = new Set(["CHN", "TWN"]);

type AdminCentroid = { lat: number; lng: number; spanDeg?: number };

const UKRAINE_ADMIN1_CENTROIDS: Record<string, AdminCentroid> = {
  Donetska: { lat: 48.02, lng: 37.8, spanDeg: 4.5 },
  Luhanska: { lat: 48.92, lng: 39.15, spanDeg: 4.2 },
  Kharkivska: { lat: 49.99, lng: 36.23, spanDeg: 4.8 },
  Zaporizka: { lat: 47.84, lng: 35.14, spanDeg: 4.5 },
  Khersonska: { lat: 46.64, lng: 32.62, spanDeg: 4.5 },
  Sumska: { lat: 50.91, lng: 34.8, spanDeg: 4.2 },
  Dnipropetrovska: { lat: 48.46, lng: 35.04, spanDeg: 4.8 },
};

const ME_ADMIN1_CENTROIDS: Record<string, AdminCentroid> = {
  "Gaza Strip": { lat: 31.4, lng: 34.35, spanDeg: 1.2 },
  "West Bank": { lat: 31.95, lng: 35.25, spanDeg: 1.8 },
  "Al Nabatieh": { lat: 33.38, lng: 35.48, spanDeg: 1.4 },
  South: { lat: 33.27, lng: 35.2, spanDeg: 1.5 },
  "Baalbek-El Hermel": { lat: 34.2, lng: 36.25, spanDeg: 1.6 },
  "Baalbek-Hermel": { lat: 34.2, lng: 36.25, spanDeg: 1.6 },
  Bekaa: { lat: 33.85, lng: 35.95, spanDeg: 1.5 },
  Israel: { lat: 31.5, lng: 34.85, spanDeg: 2.2 },
};

/** 이란 admin1 센트로이드 (대략) */
const IRAN_ADMIN1_CENTROIDS: Record<string, AdminCentroid> = {
  Tehran: { lat: 35.69, lng: 51.39, spanDeg: 2.2 },
  Isfahan: { lat: 32.65, lng: 51.67, spanDeg: 3.5 },
  Esfahan: { lat: 32.65, lng: 51.67, spanDeg: 3.5 },
  Khuzestan: { lat: 31.32, lng: 48.67, spanDeg: 3.2 },
  Bushehr: { lat: 28.92, lng: 50.84, spanDeg: 2.4 },
  Hormozgan: { lat: 27.18, lng: 56.28, spanDeg: 3.0 },
  Fars: { lat: 29.59, lng: 52.58, spanDeg: 3.5 },
  Kermanshah: { lat: 34.31, lng: 47.06, spanDeg: 2.2 },
  "West Azerbaijan": { lat: 37.55, lng: 45.07, spanDeg: 2.8 },
  "East Azerbaijan": { lat: 38.08, lng: 46.29, spanDeg: 2.6 },
  "Sistan and Baluchestan": { lat: 29.49, lng: 60.87, spanDeg: 4.5 },
  "Sistan & Baluchestan": { lat: 29.49, lng: 60.87, spanDeg: 4.5 },
  Kerman: { lat: 30.28, lng: 57.07, spanDeg: 4.0 },
  Lorestan: { lat: 33.49, lng: 48.35, spanDeg: 2.2 },
  Ilam: { lat: 33.64, lng: 46.42, spanDeg: 2.0 },
  Kurdistan: { lat: 35.31, lng: 46.99, spanDeg: 2.2 },
  Hamadan: { lat: 34.8, lng: 48.51, spanDeg: 2.0 },
  Qom: { lat: 34.64, lng: 50.88, spanDeg: 1.6 },
  Markazi: { lat: 34.09, lng: 49.69, spanDeg: 2.2 },
  Yazd: { lat: 31.9, lng: 54.37, spanDeg: 3.2 },
  Semnan: { lat: 35.57, lng: 53.39, spanDeg: 3.5 },
  Golestan: { lat: 37.25, lng: 55.17, spanDeg: 2.2 },
  Mazandaran: { lat: 36.56, lng: 53.06, spanDeg: 2.4 },
  Gilan: { lat: 37.28, lng: 49.58, spanDeg: 2.0 },
  Ardabil: { lat: 38.25, lng: 48.3, spanDeg: 2.0 },
  Zanjan: { lat: 36.67, lng: 48.5, spanDeg: 2.0 },
  Qazvin: { lat: 36.27, lng: 50.0, spanDeg: 1.8 },
  Alborz: { lat: 35.99, lng: 50.93, spanDeg: 1.5 },
  "Chahar Mahaal and Bakhtiari": { lat: 32.33, lng: 50.86, spanDeg: 1.8 },
  "Kohgiluyeh and Boyer-Ahmad": { lat: 30.67, lng: 51.6, spanDeg: 1.8 },
  "North Khorasan": { lat: 37.47, lng: 57.33, spanDeg: 2.4 },
  "Razavi Khorasan": { lat: 36.3, lng: 59.6, spanDeg: 3.5 },
  "South Khorasan": { lat: 32.86, lng: 59.22, spanDeg: 3.2 },
  Iran: { lat: 32.5, lng: 53.5, spanDeg: 8 },
  IRN: { lat: 32.5, lng: 53.5, spanDeg: 8 },
};

/** 국가 단위(admin1 null) — 대만해협·연안 앵커 */
const CHINA_TAIWAN_CENTROIDS: Record<string, AdminCentroid> = {
  China: { lat: 24.5, lng: 118.2, spanDeg: 6 },
  "Taiwan (Province of China)": { lat: 23.7, lng: 120.9, spanDeg: 3.5 },
  Taiwan: { lat: 23.7, lng: 120.9, spanDeg: 3.5 },
  CHN: { lat: 24.5, lng: 118.2, spanDeg: 6 },
  TWN: { lat: 23.7, lng: 120.9, spanDeg: 3.5 },
};

const LOCATION_THEATER: Record<string, CombatTheaterId> = {
  UKR: "russia-ukraine",
  PSE: "middle-east",
  ISR: "middle-east",
  LBN: "middle-east",
  SYR: "middle-east",
  YEM: "middle-east",
  IRQ: "middle-east",
  IRN: "middle-east",
  CHN: "china-taiwan",
  TWN: "china-taiwan",
};

/** HAPI 조회 대상 — 교전(우크라·중동·이란) + 중국·대만 긴장 감시 */
export const HAPI_ACTIVE_WAR_LOCATION_CODES = [
  "UKR",
  "PSE",
  "ISR",
  "LBN",
  "IRN",
  "CHN",
  "TWN",
] as const;

export function resolveHapiAppIdentifier(): string {
  return (
    process.env.HAPI_APP_IDENTIFIER?.trim() ||
    process.env.HDX_HAPI_APP_IDENTIFIER?.trim() ||
    HAPI_APP_IDENTIFIER_DEFAULT
  );
}

export function hapiLookbackWindow(now = new Date()): { start: string; end: string } {
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setUTCMonth(startDate.getUTCMonth() - 4);
  const start = startDate.toISOString().slice(0, 10);
  return { start, end };
}

function clampWindowStart(start: string, end: string): string {
  return start > end ? end : start;
}

/**
 * 국가별 누적 창.
 * 전면전(UKR·IRN·가자/레바논)은 개전일부터, 중국·대만은 최근 4개월.
 */
export function hapiLookbackWindowForLocation(
  locationCode: string,
  now = new Date(),
): { start: string; end: string } {
  const { start: recentStart, end } = hapiLookbackWindow(now);
  const code = locationCode.toUpperCase();
  if (code === "UKR") {
    return { start: clampWindowStart(UKRAINE_FULLSCALE_START, end), end };
  }
  if (code === "IRN") {
    return { start: clampWindowStart(IRAN_WAR_START, end), end };
  }
  if (code === "PSE" || code === "ISR" || code === "LBN") {
    return { start: clampWindowStart(GAZA_WAR_START, end), end };
  }
  return { start: recentStart, end };
}

function normalizeAdmin1(name: string | null | undefined, locationName: string): string {
  const raw = (name || "").trim();
  if (raw) return raw;
  return locationName.trim() || "Unknown";
}

function isActiveFrontAdmin1(
  locationCode: string,
  admin1Name: string,
  fatalities: number,
  events: number,
): boolean {
  if (CHINA_TAIWAN_LOCATION_CODES.has(locationCode)) {
    // 회색지대·해상 대치: 사망 0이어도 사건 집계가 있으면 표시
    return events >= 1 || fatalities >= 1;
  }
  if (IRAN_LOCATION_CODES.has(locationCode)) {
    // 이란: 허용 admin1이면 사건/사망 중 하나, 밖이면 고강도만
    if (IRAN_ACTIVE_FRONT_ADMIN1.has(admin1Name)) {
      return events >= 1 || fatalities >= 1;
    }
    return fatalities >= 40 || events >= 12;
  }
  if (locationCode === "UKR") {
    return UKRAINE_ACTIVE_FRONT_ADMIN1.has(admin1Name) && fatalities > 0;
  }
  if (locationCode === "PSE" || locationCode === "LBN" || locationCode === "ISR") {
    if (MIDDLE_EAST_ACTIVE_FRONT_ADMIN1.has(admin1Name)) return fatalities > 0;
    // 허용 목록 밖: 고강도만 (후방 잡음 제거)
    return fatalities >= 80;
  }
  return fatalities >= 100;
}

function centroidFor(
  locationCode: string,
  admin1Name: string,
  locationName?: string,
): AdminCentroid | null {
  if (locationCode === "UKR") return UKRAINE_ADMIN1_CENTROIDS[admin1Name] ?? null;
  if (IRAN_LOCATION_CODES.has(locationCode)) {
    return (
      IRAN_ADMIN1_CENTROIDS[admin1Name] ??
      IRAN_ADMIN1_CENTROIDS[locationName || ""] ??
      IRAN_ADMIN1_CENTROIDS[locationCode] ??
      IRAN_ADMIN1_CENTROIDS.Iran ??
      null
    );
  }
  if (CHINA_TAIWAN_LOCATION_CODES.has(locationCode)) {
    return (
      CHINA_TAIWAN_CENTROIDS[admin1Name] ??
      CHINA_TAIWAN_CENTROIDS[locationName || ""] ??
      CHINA_TAIWAN_CENTROIDS[locationCode] ??
      null
    );
  }
  return ME_ADMIN1_CENTROIDS[admin1Name] ?? null;
}

/**
 * political_violence 행을 admin1로 합산 → 열린 전선만 반환.
 */
export function aggregateActiveFronts(
  rows: HapiConflictEventRow[],
  opts?: { minFatalities?: number },
): HapiActiveFront[] {
  const minFat = opts?.minFatalities ?? 1;
  type Acc = {
    locationCode: string;
    locationName: string;
    admin1Name: string;
    killed: number;
    events: number;
    periodStart: string;
    periodEnd: string;
  };
  const map = new Map<string, Acc>();

  for (const row of rows) {
    if (row.event_type !== "political_violence") continue;
    const locationCode = String(row.location_code || "").toUpperCase();
    if (!LOCATION_THEATER[locationCode]) continue;
    const admin1Name = normalizeAdmin1(row.admin1_name, row.location_name);
    const key = `${locationCode}::${admin1Name}`;
    const fat = Number(row.fatalities) || 0;
    const ev = Number(row.events) || 0;
    const start = (row.reference_period_start || "").slice(0, 10);
    const end = (row.reference_period_end || "").slice(0, 10);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        locationCode,
        locationName: row.location_name || locationCode,
        admin1Name,
        killed: fat,
        events: ev,
        periodStart: start,
        periodEnd: end,
      });
      continue;
    }
    prev.killed += fat;
    prev.events += ev;
    if (start && (!prev.periodStart || start < prev.periodStart)) prev.periodStart = start;
    if (end && (!prev.periodEnd || end > prev.periodEnd)) prev.periodEnd = end;
  }

  const fronts: HapiActiveFront[] = [];
  for (const acc of map.values()) {
    const isChinaTaiwan = CHINA_TAIWAN_LOCATION_CODES.has(acc.locationCode);
    const isIran = IRAN_LOCATION_CODES.has(acc.locationCode);
    if (!isChinaTaiwan && !isIran && acc.killed < minFat) continue;
    if (isIran && acc.killed < minFat && acc.events < 1) continue;
    if (
      !isActiveFrontAdmin1(acc.locationCode, acc.admin1Name, acc.killed, acc.events)
    ) {
      continue;
    }
    const center = centroidFor(acc.locationCode, acc.admin1Name, acc.locationName);
    if (!center) continue;
    const theaterId = LOCATION_THEATER[acc.locationCode];
    if (!theaterId) continue;
    fronts.push({
      id: `hapi-${acc.locationCode}-${acc.admin1Name}`.replace(/\s+/g, "-").toLowerCase(),
      theaterId,
      locationCode: acc.locationCode,
      locationName: acc.locationName,
      admin1Name: acc.admin1Name,
      lat: center.lat,
      lng: center.lng,
      killed: acc.killed,
      events: acc.events,
      periodStart: acc.periodStart,
      periodEnd: acc.periodEnd,
      territorySpanDeg: center.spanDeg ?? 3.5,
    });
  }

  return fronts.sort((a, b) => b.killed - a.killed);
}

export const HAPI_CASUALTY_CAVEAT =
  "HDX HAPI · ACLED political_violence. Front fatalities are cumulative from theater start (UKR 2022-02-24, IRN 2026-02-28, Gaza/Lebanon 2023-10-07). China/Taiwan: ~4-month events. No wounded field. Not Mediazona named RU KIA. Cite ACLED: www.acleddata.com";

/** 라이브 HAPI 실패·지연 시에도 전선 숫자가 보이게 하는 폴백 (최근 창 근사값) */
export const HAPI_CASUALTY_SEED: HapiConflictCasualtiesPayload = {
  fronts: [
    {
      id: "hapi-ukr-donetska",
      theaterId: "russia-ukraine",
      locationCode: "UKR",
      locationName: "Ukraine",
      admin1Name: "Donetska",
      lat: 48.02,
      lng: 37.8,
      killed: 1_180,
      events: 0,
      periodStart: UKRAINE_FULLSCALE_START,
      periodEnd: "",
      territorySpanDeg: 4.5,
    },
    {
      id: "hapi-ukr-zaporizka",
      theaterId: "russia-ukraine",
      locationCode: "UKR",
      locationName: "Ukraine",
      admin1Name: "Zaporizka",
      lat: 47.84,
      lng: 35.14,
      killed: 270,
      events: 0,
      periodStart: UKRAINE_FULLSCALE_START,
      periodEnd: "",
      territorySpanDeg: 4.5,
    },
    {
      id: "hapi-pse-gaza-strip",
      theaterId: "middle-east",
      locationCode: "PSE",
      locationName: "Palestine",
      admin1Name: "Gaza Strip",
      lat: 31.4,
      lng: 34.35,
      killed: 480,
      events: 0,
      periodStart: GAZA_WAR_START,
      periodEnd: "",
      territorySpanDeg: 1.2,
    },
    {
      id: "hapi-lbn-al-nabatieh",
      theaterId: "middle-east",
      locationCode: "LBN",
      locationName: "Lebanon",
      admin1Name: "Al Nabatieh",
      lat: 33.38,
      lng: 35.48,
      killed: 320,
      events: 0,
      periodStart: GAZA_WAR_START,
      periodEnd: "",
      territorySpanDeg: 1.4,
    },
    {
      id: "hapi-chn-china",
      theaterId: "china-taiwan",
      locationCode: "CHN",
      locationName: "China",
      admin1Name: "China",
      lat: 24.5,
      lng: 118.2,
      killed: 0,
      events: 23,
      periodStart: "",
      periodEnd: "",
      territorySpanDeg: 6,
    },
    {
      id: "hapi-twn-taiwan",
      theaterId: "china-taiwan",
      locationCode: "TWN",
      locationName: "Taiwan (Province of China)",
      admin1Name: "Taiwan (Province of China)",
      lat: 23.7,
      lng: 120.9,
      killed: 0,
      events: 4,
      periodStart: "",
      periodEnd: "",
      territorySpanDeg: 3.5,
    },
    {
      id: "hapi-irn-tehran",
      theaterId: "middle-east",
      locationCode: "IRN",
      locationName: "Iran (Islamic Republic of)",
      admin1Name: "Tehran",
      lat: 35.69,
      lng: 51.39,
      killed: 0,
      events: 18,
      periodStart: IRAN_WAR_START,
      periodEnd: "",
      territorySpanDeg: 2.2,
    },
    {
      id: "hapi-irn-khuzestan",
      theaterId: "middle-east",
      locationCode: "IRN",
      locationName: "Iran (Islamic Republic of)",
      admin1Name: "Khuzestan",
      lat: 31.32,
      lng: 48.67,
      killed: 12,
      events: 9,
      periodStart: IRAN_WAR_START,
      periodEnd: "",
      territorySpanDeg: 3.2,
    },
  ],
  fetchedAt: "",
  windowStart: "",
  windowEnd: "",
  source: HAPI_ATTRIBUTION,
  cite: [
    "Armed Conflict Location & Event Data Project (ACLED)",
    ACLED_HOME_URL,
    "HDX HAPI · OCHA",
    HAPI_CONFLICT_EVENTS_URL,
    HAPI_HDX_DATASET_URL,
  ],
  caveat: `${HAPI_CASUALTY_CAVEAT} · seed until live HAPI refresh`,
};
