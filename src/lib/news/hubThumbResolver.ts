/**
 * CRINK 허브 카드 썸네일 리졸버.
 *
 * 폴백: 좌표 있음 → Sentinel(키) → NASA GIBS → 지구본 bake → 카테고리 아이콘
 *        좌표 없음 + 장비 기사 → Wikimedia CC → 카테고리
 *        그 외 → 카테고리
 *
 * 기관 og/enclosure 는 쓰지 않는다 (crinkSourceRegistry blockHosts).
 */

import { crinkPlaceById } from "@/data/crinkPlaceGazetteer";

export type ThumbCategory =
  | "missile"
  | "ship"
  | "talks"
  | "nuclear"
  | "sanction"
  | "front";

export type HubThumbResult = {
  imageUrl: string;
  thumbCredit: string;
  kind: "sentinel" | "nasa-gibs" | "globe" | "commons" | "category";
};

const EQUIPMENT_RE =
  /\b(missile|icbm|irbm|tank|howitzer|destroyer|frigate|submarine|fighter|drone|uav|화성|미사일|전차|함정|잠수함)\b/i;
const NUCLEAR_RE =
  /\b(nuclear|enrichment|centrifuge|reactor|warhead|핵|농축|원자로)\b/i;
const SHIP_RE = /\b(navy|naval|carrier|destroyer|frigate|warship|함정|해군|항공모함)\b/i;
const TALKS_RE =
  /\b(summit|talks|diplomacy|sanctions?|treaty|회담|외교|제재|협상)\b/i;
const FRONT_RE = /\b(front|offensive|advance|retreat|전선|공세|점령)\b/i;

export function classifyThumbCategory(title: string, summary = ""): ThumbCategory {
  const blob = `${title} ${summary}`;
  if (NUCLEAR_RE.test(blob)) return "nuclear";
  if (SHIP_RE.test(blob)) return "ship";
  if (EQUIPMENT_RE.test(blob)) return "missile";
  if (FRONT_RE.test(blob)) return "front";
  if (TALKS_RE.test(blob)) return "sanction";
  if (/\btalk|summit|diplom/i.test(blob)) return "talks";
  return "talks";
}

export function categoryThumbUrl(category: ThumbCategory): string {
  return `/thumbs/categories/${category}.svg`;
}

/** NASA GIBS snapshot — public domain, no key */
export function nasaGibsSnapshotUrl(lat: number, lng: number, size = 512): string {
  const delta = 0.35;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  const params = new URLSearchParams({
    REQUEST: "GetMap",
    LAYERS: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    CRS: "EPSG:4326",
    TIME: "default",
    WRAP: "DAY",
    BBOX: bbox,
    FORMAT: "image/jpeg",
    WIDTH: String(size),
    HEIGHT: String(size),
    AUTOSCALE: "TRUE",
  });
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params.toString()}`;
}

export function globeBakeUrl(placeId: string, dataCdn?: string | null): string {
  const path = `thumbs/globe/${placeId}.jpg`;
  const base = (dataCdn || "").replace(/\/+$/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

export type ResolveHubThumbInput = {
  title: string;
  summary?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** optional Sentinel Process API result URL already cached */
  sentinelUrl?: string | null;
  /** NEXT_PUBLIC_DATA_CDN */
  dataCdn?: string | null;
  /** skip network — tests */
  preferCategory?: boolean;
};

/**
 * 동기 폴백 체인 (네트워크 없이 URL만 결정).
 * Sentinel 실호출은 resolveHubThumbAsync 에서.
 */
export function resolveHubThumbSync(input: ResolveHubThumbInput): HubThumbResult {
  const category = classifyThumbCategory(input.title, input.summary ?? "");
  const catUrl = categoryThumbUrl(category);
  const catCredit = "ConflictView icon";

  if (input.preferCategory) {
    return { imageUrl: catUrl, thumbCredit: catCredit, kind: "category" };
  }

  if (input.sentinelUrl) {
    return {
      imageUrl: input.sentinelUrl,
      thumbCredit: "Copernicus Sentinel-2 · CC BY 4.0",
      kind: "sentinel",
    };
  }

  const lat = input.lat;
  const lng = input.lng;
  const placeId = input.placeId ?? (lat != null && lng != null ? null : null);

  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    // 지구본 bake가 있으면 우선할 수도 있으나 — 위성 최신본이 더 유의미. bake는 위성 실패 시.
    return {
      imageUrl: nasaGibsSnapshotUrl(lat, lng),
      thumbCredit: "NASA GIBS / VIIRS",
      kind: "nasa-gibs",
    };
  }

  if (placeId) {
    const place = crinkPlaceById(placeId);
    if (place) {
      return {
        imageUrl: nasaGibsSnapshotUrl(place.lat, place.lng),
        thumbCredit: "NASA GIBS / VIIRS",
        kind: "nasa-gibs",
      };
    }
    return {
      imageUrl: globeBakeUrl(placeId, input.dataCdn),
      thumbCredit: "ConflictView globe",
      kind: "globe",
    };
  }

  return { imageUrl: catUrl, thumbCredit: catCredit, kind: "category" };
}

/**
 * Sentinel Hub Process API (optional). 실패 시 sync 폴백.
 * Client credentials: SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET
 */
export async function resolveHubThumbAsync(
  input: ResolveHubThumbInput,
  env?: {
    SENTINEL_HUB_CLIENT_ID?: string;
    SENTINEL_HUB_CLIENT_SECRET?: string;
    DATA_CDN?: string;
  },
): Promise<HubThumbResult> {
  const dataCdn = input.dataCdn ?? env?.DATA_CDN ?? null;
  const lat = input.lat;
  const lng = input.lng;
  const place =
    input.placeId != null ? crinkPlaceById(input.placeId) : undefined;
  const useLat = typeof lat === "number" ? lat : place?.lat;
  const useLng = typeof lng === "number" ? lng : place?.lng;

  const clientId = env?.SENTINEL_HUB_CLIENT_ID?.trim();
  const clientSecret = env?.SENTINEL_HUB_CLIENT_SECRET?.trim();

  if (
    clientId &&
    clientSecret &&
    typeof useLat === "number" &&
    typeof useLng === "number"
  ) {
    try {
      const tokenRes = await fetch("https://services.sentinel-hub.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      if (tokenRes.ok) {
        const tokenJson = (await tokenRes.json()) as { access_token?: string };
        const token = tokenJson.access_token;
        if (token) {
          const d = 0.08;
          const bbox = [useLng - d, useLat - d, useLng + d, useLat + d];
          // Evalscript true color — short process request; return process URL not stored blob
          // For MVP we fall through to NASA if process fails; full R2 upload is bake/CI job.
          void bbox;
          void token;
        }
      }
    } catch {
      // fall through
    }
  }

  // placeId + coords → prefer globe bake path as secondary after NASA
  const base = resolveHubThumbSync({
    ...input,
    lat: useLat,
    lng: useLng,
    dataCdn,
  });

  // If NASA and placeId, also expose globe as alternate — UI uses imageUrl
  if (base.kind === "nasa-gibs" && input.placeId) {
    // Keep NASA as primary; globe is offline bake fallback when NASA URL fails in UI onError
    return base;
  }

  // Equipment articles without coords → try commons keyword (sync stub → category)
  if (base.kind === "category" && EQUIPMENT_RE.test(`${input.title} ${input.summary ?? ""}`)) {
    const commons = await tryWikimediaCommonsThumb(input.title);
    if (commons) return commons;
  }

  return base;
}

const COMMONS_CC =
  /^(cc0|cc-by|cc-by-sa|public domain|pd|pd-us|pd-old)/i;

async function tryWikimediaCommonsThumb(title: string): Promise<HubThumbResult | null> {
  try {
    const q = title.split(/\s+/).slice(0, 4).join(" ");
    const api = new URL("https://commons.wikimedia.org/w/api.php");
    api.searchParams.set("action", "query");
    api.searchParams.set("format", "json");
    api.searchParams.set("generator", "search");
    api.searchParams.set("gsrsearch", q);
    api.searchParams.set("gsrlimit", "5");
    api.searchParams.set("gsrnamespace", "6");
    api.searchParams.set("prop", "imageinfo");
    api.searchParams.set("iiprop", "url|extmetadata");
    api.searchParams.set("iiurlwidth", "640");
    api.searchParams.set("origin", "*");

    const res = await fetch(api.toString(), {
      headers: {
        "User-Agent": "ConflictViewBot/1.0 (hub thumb; non-commercial situational dashboard)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            imageinfo?: Array<{
              thumburl?: string;
              url?: string;
              extmetadata?: {
                LicenseShortName?: { value?: string };
                Artist?: { value?: string };
              };
            }>;
          }
        >;
      };
    };
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const license = info.extmetadata?.LicenseShortName?.value ?? "";
      if (license && !COMMONS_CC.test(license.replace(/\s+/g, " ").trim())) continue;
      const url = info.thumburl || info.url;
      if (!url) continue;
      const artist = (info.extmetadata?.Artist?.value ?? "")
        .replace(/<[^>]*>/g, "")
        .slice(0, 80);
      return {
        imageUrl: url,
        thumbCredit: artist
          ? `Wikimedia · ${license || "CC"} · ${artist}`
          : `Wikimedia · ${license || "CC"}`,
        kind: "commons",
      };
    }
  } catch {
    return null;
  }
  return null;
}

/** UI onError 폴백: NASA → globe → category */
export function hubThumbFallbacks(input: {
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  title: string;
  summary?: string | null;
  dataCdn?: string | null;
}): string[] {
  const urls: string[] = [];
  const lat = input.lat;
  const lng = input.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    urls.push(nasaGibsSnapshotUrl(lat, lng));
  }
  if (input.placeId) {
    urls.push(globeBakeUrl(input.placeId, input.dataCdn));
    const place = crinkPlaceById(input.placeId);
    if (place && (lat == null || lng == null)) {
      urls.push(nasaGibsSnapshotUrl(place.lat, place.lng));
    }
  }
  urls.push(categoryThumbUrl(classifyThumbCategory(input.title, input.summary ?? "")));
  return [...new Set(urls)];
}
