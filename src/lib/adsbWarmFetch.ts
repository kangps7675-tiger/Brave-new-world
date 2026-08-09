import type { MilitaryAircraft } from "@/data/geoTypes";
import {
  adsbAuthHeaders,
  civilianTrafficUrl,
  extractAircraftList,
  getAdsbApiKey,
  normalizeAdsbAircraft,
  readAdsbJsonBody,
  type TrackedAircraft,
} from "@/lib/adsbClient";

const ADSBX_MIL_URL = "https://gateway.adsbexchange.com/api/aircraft/v2/mil";

/** 민간 항적 워밍용 허브 (전역 civ는 비현실적 → 격자 샘플) */
export const ADSB_CIV_HUBS: Array<{
  id: string;
  lat: number;
  lng: number;
  distNm: number;
}> = [
  { id: "europe", lat: 50.5, lng: 8.5, distNm: 280 },
  { id: "mideast", lat: 29.5, lng: 48.0, distNm: 250 },
  { id: "east-asia", lat: 35.5, lng: 129.0, distNm: 280 },
  { id: "us-east", lat: 39.0, lng: -77.0, distNm: 280 },
  { id: "us-west", lat: 34.0, lng: -118.2, distNm: 250 },
  { id: "sg-malacca", lat: 1.3, lng: 103.8, distNm: 220 },
];

/** ODbL — 출처 표기만 하면 무료·유료 모두 사용 가능 */
const ADSB_LOL_MIL_URL = "https://api.adsb.lol/v2/mil";

/**
 * ⚠️ **adsb.fi 를 폴백으로 되돌리지 말 것.**
 *
 * 약관이 "for **personal**, non-commercial use only" 다. 이전 구현은 유료
 * 티어에서만 adsb.lol 로 떨어졌으나, 그건 "non-commercial" 한쪽만 본 것이다.
 * **공개 웹서비스는 무료여도 "personal" 요건을 충족하지 못한다.**
 *
 * @see docs/copyright-audit-2026-08-01.md — Y-2
 */
function milUrl(): { url: string; source: "adsbx" | "adsb.lol" | "adsb.fi" } {
  const custom = process.env.ADSBEXCHANGE_MIL_URL?.trim();
  if (custom) return { url: custom, source: "adsbx" };
  if (getAdsbApiKey()) return { url: ADSBX_MIL_URL, source: "adsbx" };
  return { url: ADSB_LOL_MIL_URL, source: "adsb.lol" };
}

export async function fetchAdsbMilitary(max = 400): Promise<{
  aircraft: TrackedAircraft[];
  provider: string;
  error?: string;
}> {
  const apiKey = getAdsbApiKey();
  const { url, source } = milUrl();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: adsbAuthHeaders(source === "adsbx" ? apiKey : null),
    });
    if (!response.ok) {
      return {
        aircraft: [],
        provider: source,
        error: `ADS-B mil HTTP ${response.status}`,
      };
    }
    const payload = (await readAdsbJsonBody(response)) as {
      ac?: unknown[];
      aircraft?: unknown[];
    };
    const aircraft: TrackedAircraft[] = [];
    for (const raw of extractAircraftList(payload as never)) {
      const item = normalizeAdsbAircraft(raw, { requireMilitary: true });
      if (!item) continue;
      aircraft.push(item);
      if (aircraft.length >= max) break;
    }
    return { aircraft, provider: source };
  } catch (error) {
    return {
      aircraft: [],
      provider: source,
      error: error instanceof Error ? error.message : "mil fetch failed",
    };
  }
}

export async function fetchAdsbCivilianHubs(options?: {
  maxPerHub?: number;
  hubs?: typeof ADSB_CIV_HUBS;
}): Promise<{
  aircraft: MilitaryAircraft[];
  hubsOk: number;
  errors: string[];
}> {
  const maxPerHub = options?.maxPerHub ?? 80;
  const hubs = options?.hubs ?? ADSB_CIV_HUBS;
  const apiKey = getAdsbApiKey();
  const byHex = new Map<string, MilitaryAircraft>();
  const errors: string[] = [];
  let hubsOk = 0;

  for (const hub of hubs) {
    const { url, source } = civilianTrafficUrl(hub.lat, hub.lng, hub.distNm);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: adsbAuthHeaders(source === "adsbx" ? apiKey : null),
      });
      if (!response.ok) {
        errors.push(`${hub.id}: HTTP ${response.status}`);
        continue;
      }
      const payload = (await readAdsbJsonBody(response)) as {
        ac?: unknown[];
        aircraft?: unknown[];
      };
      let n = 0;
      for (const raw of extractAircraftList(payload as never)) {
        const item = normalizeAdsbAircraft(raw, { excludeMilitary: true });
        if (!item) continue;
        byHex.set(item.hex, item);
        n += 1;
        if (n >= maxPerHub) break;
      }
      hubsOk += 1;
    } catch (error) {
      errors.push(
        `${hub.id}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return { aircraft: Array.from(byHex.values()), hubsOk, errors };
}

/** lat/lng/dist → 대략 bbox (1° ≈ 60NM) */
export function distNmToBbox(lat: number, lng: number, distNm: number) {
  const dLat = distNm / 60;
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLng = distNm / (60 * cos);
  return {
    west: lng - dLng,
    south: lat - dLat,
    east: lng + dLng,
    north: lat + dLat,
  };
}
