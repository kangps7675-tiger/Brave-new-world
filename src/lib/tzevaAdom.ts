import type { OrefGeocodeMatch } from "@/lib/israelAlertZones";

/** Tzeva Adom (צבע אדום) — Pikud HaOref 비공식 JSON 피드 타입 */

export type TzevaAdomAlert = {
  id: string;
  region: string;
  title: string;
  alertDate: string;
  category?: number;
  active: boolean;
  /** 사전 매칭 실패 시 null — 가짜 좌표를 쓰지 않음 */
  lat: number | null;
  lng: number | null;
  /** 좌표 매칭 방식. 조사 근거로는 exact만 사용. 구 페이로드에는 없을 수 있음 */
  geocodeMatch?: OrefGeocodeMatch;
};

export type TzevaAdomPayload = {
  fetchedAt: string;
  live: boolean;
  active: TzevaAdomAlert[];
  history: TzevaAdomAlert[];
  stub?: boolean;
  geoRestricted?: boolean;
  error?: string;
};

export const OREF_HISTORY_URL =
  "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json";

export const OREF_ACTIVE_URL =
  "https://www.oref.org.il/WarningMessages/alert/alerts.json";

export const OREF_REQUEST_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;
