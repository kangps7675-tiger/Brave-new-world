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
import {
  ADSB_LOL_RADIUS_NM,
  ADSB_WORLD_HUBS,
  mapPool,
  thinWorldwide,
} from "@/lib/adsbWorld";

const ADSBX_MIL_URL = "https://gateway.adsbexchange.com/api/aircraft/v2/mil";
const ADSBX_ALL_URL = "https://gateway.adsbexchange.com/api/aircraft/v2/all";

/** 전 세계 민항 격자. 반경은 ADSB_LOL_RADIUS_NM. */
export const ADSB_CIV_HUBS: Array<{
  id: string;
  lat: number;
  lng: number;
  distNm: number;
}> = ADSB_WORLD_HUBS.map((hub) => ({ ...hub, distNm: ADSB_LOL_RADIUS_NM }));

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
    const all: TrackedAircraft[] = [];
    for (const raw of extractAircraftList(payload as never)) {
      const item = normalizeAdsbAircraft(raw, { requireMilitary: true });
      if (!item) continue;
      all.push(item);
    }
    const aircraft = thinWorldwide(all, { cellDeg: 10, perCell: 40, max });
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
  maxTotal?: number;
  hubs?: typeof ADSB_CIV_HUBS;
}): Promise<{
  aircraft: MilitaryAircraft[];
  hubsOk: number;
  errors: string[];
  provider: string;
}> {
  const maxPerHub = options?.maxPerHub ?? 40;
  const maxTotal = options?.maxTotal ?? 1200;
  const hubs = options?.hubs ?? ADSB_CIV_HUBS;
  const apiKey = getAdsbApiKey();

  if (apiKey) {
    try {
      const response = await fetch(ADSBX_ALL_URL, {
        cache: "no-store",
        headers: adsbAuthHeaders(apiKey),
        signal: AbortSignal.timeout(12_000),
      });
      if (response.ok) {
        const payload = (await readAdsbJsonBody(response)) as {
          ac?: unknown[];
          aircraft?: unknown[];
        };
        const all: MilitaryAircraft[] = [];
        for (const raw of extractAircraftList(payload as never)) {
          const item = normalizeAdsbAircraft(raw, { excludeMilitary: true });
          if (item) all.push(item);
        }
        if (all.length > 0) {
          return {
            aircraft: thinWorldwide(all, { cellDeg: 8, perCell: 12, max: maxTotal }),
            hubsOk: hubs.length,
            errors: [],
            provider: "adsbx-all",
          };
        }
      }
    } catch {
      // 전 세계 한 방이 실패하면 격자 폴링으로 내려간다
    }
  }

  const byHex = new Map<string, MilitaryAircraft>();
  const errors: string[] = [];
  let hubsOk = 0;
  let stop = false;

  await mapPool(hubs, 4, async (hub) => {
    if (stop) return;
    const { url, source } = civilianTrafficUrl(hub.lat, hub.lng, hub.distNm);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: adsbAuthHeaders(source === "adsbx" ? apiKey : null),
      });
      if (!response.ok) {
        errors.push(`${hub.id}: HTTP ${response.status}`);
        if (response.status === 429) stop = true;
        return;
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
  });

  return {
    aircraft: thinWorldwide(Array.from(byHex.values()), {
      cellDeg: 8,
      perCell: 20,
      max: maxTotal,
    }),
    hubsOk,
    errors,
    provider: "adsb-world-hubs",
  };
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
