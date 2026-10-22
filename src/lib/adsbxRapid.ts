/**
 * ADS-B Exchange (RapidAPI) 보강 수집 — 순수 로직. Worker(workers/cron-ingest/src/adsbxDensify.ts)가 쓴다.
 *
 * 왜 이렇게 좁게 쓰나:
 *  - RapidAPI 플랜은 월 호출 수 한도가 있고(현재 1만), 한 번에 반경 250NM 원 하나만 준다. 전 세계 일괄 조회(/all) 없음.
 *  - 전역 표본은 무료 adsb.lol(반경 1000NM 허브)이 요청당 훨씬 넓다. 유료 쿼터는 허브가 얇게 자르는 곳 — 해운 위험 해역 — 만 촘촘히 채운다.
 *  - D1 항공기 위치는 25분 안의 것만 화면에 쓴다(ADSB_D1_TTL_MS). 그래서 지점마다 20분 간격으로 갱신해야 하고,
 *    그러면 지점 하나가 월 약 2,160회 → 한도 안에서는 3곳이 한계다.
 */

/** RapidAPI 공통 키 형식: <10hex>msh<hex>p<hex>jsn<hex> (adsbClient.isRapidApiKey 와 같은 규칙) */
export function isRapidKey(key: string | null | undefined): boolean {
  return typeof key === "string" && /^[0-9a-f]{8,12}msh[0-9a-f]+p[0-9a-f]+jsn[0-9a-f]+$/i.test(key.trim());
}

export const RAPID_HOST = "adsbexchange-com1.p.rapidapi.com";
export const RAPID_MAX_DIST_NM = 250;

export function rapidHeaders(key: string): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": "StraitDesk/1.0",
    "x-rapidapi-key": key.trim(),
    "x-rapidapi-host": RAPID_HOST,
  };
}

export function rapidLatLonUrl(lat: number, lng: number, distNm = RAPID_MAX_DIST_NM): string {
  const d = Math.min(RAPID_MAX_DIST_NM, Math.max(25, Math.round(distNm)));
  return `https://${RAPID_HOST}/v2/lat/${lat}/lon/${lng}/dist/${d}/`;
}

export type DensifyPoint = { id: string; lat: number; lng: number; nameKo: string };

/** 해운 위험 해역 — 허브(1000NM)가 구역당 80대로 자르는 곳. 3곳 × 20분 ≈ 월 6,500회 */
export const DENSIFY_POINTS: readonly DensifyPoint[] = [
  { id: "hormuz", lat: 26.4, lng: 56.4, nameKo: "호르무즈·오만만" },
  { id: "bab-el-mandeb", lat: 13.5, lng: 43.0, nameKo: "바브엘만데브·아덴만" },
  { id: "red-sea-north", lat: 27.0, lng: 34.5, nameKo: "수에즈·홍해 북부" },
];

export const DENSIFY_REFRESH_MIN = 20;
/** 지점당 한 번에 받는 기체 상한 (D1 쓰기량 보호) */
export const DENSIFY_MAX_AIRCRAFT_PER_POINT = 600;
/** 월 상한 기본값 — 플랜 1만에서 웹 사용자 조회용으로 약 3,500을 남긴다 */
export const DENSIFY_DEFAULT_MONTHLY_CAP = 6_500;
/** 달 초에 몰아 쓰지 않도록 허용하는 선행 여유 */
export const DENSIFY_PACE_BURST = 30;
export const DENSIFY_MAX_PER_TICK = 3;

export function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 이번 달 경과 비율 (UTC, 0~1) */
export function monthFraction(now: Date): number {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

/**
 * 이번 틱에 부를 지점. 월 상한을 넘지 않고, 시간 경과에 비해 앞서 쓰지 않으며(페이스),
 * 마지막 호출이 DENSIFY_REFRESH_MIN 보다 오래된 지점만, 오래된 순으로.
 */
export function dueDensifyPoints(
  lastAt: Record<string, string | undefined>,
  callsThisMonth: number,
  cap: number,
  now: Date,
  points: readonly DensifyPoint[] = DENSIFY_POINTS,
  max = DENSIFY_MAX_PER_TICK,
): DensifyPoint[] {
  if (callsThisMonth >= cap) return [];
  const allowedByPace = Math.ceil(cap * monthFraction(now)) + DENSIFY_PACE_BURST;
  const room = Math.min(cap - callsThisMonth, allowedByPace - callsThisMonth);
  if (room <= 0) return [];
  const nowMs = now.getTime();
  const due = points
    .map((p) => {
      const t = Date.parse(lastAt[p.id] ?? "");
      return { p, t: Number.isFinite(t) ? t : 0 };
    })
    .filter((x) => nowMs - x.t >= DENSIFY_REFRESH_MIN * 60_000)
    .sort((a, b) => a.t - b.t)
    .map((x) => x.p);
  return due.slice(0, Math.min(max, room));
}
