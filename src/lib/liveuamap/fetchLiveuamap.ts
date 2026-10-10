/**
 * LIVEUAMAP 전전선 ingest — 공식 mpts API + 예산 슬롯.
 *
 * Env:
 * - LIVEUAMAP_API_KEY — query key (필수, mock 제외)
 * - LIVEUAMAP_RESID_MAP — JSON resid 덮어쓰기
 * - LIVEUAMAP_FEED_URL — 미러 폴백
 * - LIVEUAMAP_USE_MOCK=true — 개발 샘플
 */

import {
  getLiveuamapBudgetSnapshot,
  recordLiveuamapFetch,
  selectDueLiveuamapSlots,
  touchLiveuamapSlot,
} from "@/lib/liveuamap/budget";
import type { LiveuamapRegionSlot } from "@/lib/liveuamap/regions";
import {
  isLiveuamapControlRegionId,
  type LiveuamapControlRegionId,
  type LiveuamapEvent,
  type LiveuamapRegionId,
} from "@/lib/liveuamap/types";
import {
  isMostlyKorean,
  mapPool,
  translateText,
} from "@/lib/koreanTranslate";
import type { NewsTheater } from "@/lib/news/types";
import type { OccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";
import { liveuamapFieldsToOccupiedGeoJson } from "@/lib/liveuamap/toOccupiedGeoJson";
import { asNumber, asString } from "@/lib/liveuamap/parseHelpers";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";

const MPTS_BASE = "https://a.liveuamap.com/api";

const THEATER_HINTS: Array<{ re: RegExp; theater: NewsTheater }> = [
  { re: /ukrain|donetsk|kharkiv|crimea|black\s?sea/i, theater: "russia-ukraine" },
  { re: /gaza|israel|lebanon|syria|iran|hormuz|red\s?sea|houthi|yemen/i, theater: "middle-east" },
  { re: /taiwan|pla\b|south\s?china\s?sea|scs\b/i, theater: "china-taiwan" },
  { re: /korea|dmz|pyongyang|seoul/i, theater: "korea" },
  { re: /japan|okinawa|senkaku/i, theater: "japan" },
  { re: /sudan|sahel|congo|ethiopia/i, theater: "africa" },
];

function inferTheater(text: string, fallback?: string): NewsTheater {
  for (const h of THEATER_HINTS) {
    if (h.re.test(text)) return h.theater;
  }
  const f = (fallback || "").toLowerCase();
  if (f.includes("ukraine")) return "russia-ukraine";
  if (f.includes("taiwan")) return "china-taiwan";
  if (f.includes("korea")) return "korea";
  if (f.includes("middle") || f.includes("iran") || f.includes("yemen")) return "middle-east";
  return "global";
}

function timestampToIso(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const asNum = Number(raw);
    if (Number.isFinite(asNum) && /^\d+$/.test(raw.trim())) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000;
      return new Date(ms).toISOString();
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function pickPhoto(o: Record<string, unknown>): string | undefined {
  const photo =
    asString(o.photo) ||
    asString(o.picture) ||
    asString(o.picpath) ||
    asString(o.imageUrl) ||
    asString(o.image);
  if (photo && !/\/images\/.*\.png$/i.test(photo)) return photo;
  const pics = o.pics;
  if (Array.isArray(pics)) {
    for (const p of pics) {
      const s = asString(p);
      if (s) return s;
      if (p && typeof p === "object") {
        const url = asString((p as Record<string, unknown>).url);
        if (url) return url;
      }
    }
  }
  return undefined;
}

/** mpts geojson=true → Feature; 레거시 place 객체도 그대로 허용 */
function flattenPlaceRow(raw: unknown): {
  fields: Record<string, unknown>;
  lat: number | null;
  lng: number | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.type === "Feature") {
    const geom = o.geometry;
    if (!geom || typeof geom !== "object") return null;
    const g = geom as { type?: unknown; coordinates?: unknown };
    // 이벤트 핀만 — Polygon 통제면은 toOccupiedGeoJson이 담당
    if (g.type !== "Point" && g.type !== "MultiPoint") return null;
    const coords = g.coordinates;
    let lng: number | null = null;
    let lat: number | null = null;
    if (g.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
      lng = asNumber(coords[0]);
      lat = asNumber(coords[1]);
    } else if (
      g.type === "MultiPoint" &&
      Array.isArray(coords) &&
      Array.isArray(coords[0]) &&
      coords[0].length >= 2
    ) {
      lng = asNumber(coords[0][0]);
      lat = asNumber(coords[0][1]);
    }
    const props =
      o.properties && typeof o.properties === "object"
        ? (o.properties as Record<string, unknown>)
        : {};
    return {
      fields: {
        ...props,
        id: props.id ?? o.id,
      },
      lat,
      lng,
    };
  }

  const props =
    o.properties && typeof o.properties === "object"
      ? (o.properties as Record<string, unknown>)
      : null;
  const fields = props ? { ...props, ...o } : o;
  return {
    fields,
    lat: asNumber(fields.lat) ?? asNumber(fields.latitude),
    lng:
      asNumber(fields.lng) ??
      asNumber(fields.lon) ??
      asNumber(fields.longitude),
  };
}

export function normalizePlace(
  raw: unknown,
  index: number,
  slot: Pick<LiveuamapRegionSlot, "id" | "resid" | "theater">,
): LiveuamapEvent | null {
  const flat = flattenPlaceRow(raw);
  if (!flat) return null;
  const o = flat.fields;
  const rawTitle = asString(o.title) || asString(o.name) || asString(o.headline);
  const rawBody =
    asString(o.body) ||
    asString(o.text) ||
    asString(o.description) ||
    asString(o.message) ||
    rawTitle;
  if (!rawTitle && !rawBody) return null;

  const lat = flat.lat ?? asNumber(o.lat) ?? asNumber(o.latitude);
  const lng =
    flat.lng ?? asNumber(o.lng) ?? asNumber(o.lon) ?? asNumber(o.longitude);
  if (lat == null || lng == null) return null;

  const idRaw = o.id ?? o.event_id;
  const id =
    asString(idRaw) ||
    (typeof idRaw === "number" ? String(idRaw) : "") ||
    `liveua-${slot.id}-${lat.toFixed(3)}-${lng.toFixed(3)}-${index}`;

  const rawSourceUrl =
    asString(o.sourceUrl) ||
    asString(o.url) ||
    asString(o.link) ||
    asString(o.source) ||
    "https://liveuamap.com/";

  /** name/title에 붙은 URL은 제목이 아니라 본문으로 */
  const { title, body, sourceUrl } = splitLiveuaTitleBody(
    rawTitle || rawBody.slice(0, 120),
    rawBody,
    rawSourceUrl,
  );
  if (!title && !body) return null;

  const tagsRaw = o.tags ?? o.categories ?? o.labels;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => asString(t)).filter(Boolean)
    : [];

  const blob = `${title} ${body} ${tags.join(" ")}`;
  return {
    id,
    regionId: slot.id,
    resid: slot.resid,
    theater: inferTheater(blob, slot.theater) || slot.theater,
    lat,
    lng,
    title: title || body.slice(0, 120),
    body,
    imageUrl: pickPhoto(o),
    videoUrl: asString(o.videoUrl) || asString(o.video) || undefined,
    sourceUrl,
    viaSource: asString(o.viaSource) || asString(o.resource) || undefined,
    publishedAt: timestampToIso(o.timestamp ?? o.publishedAt ?? o.date ?? o.time),
    tags,
  };
}

function extractPlaces(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["places", "events", "data", "items", "features"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

function mockEvents(): LiveuamapEvent[] {
  const now = Date.now();
  return [
    {
      id: "mock-liveua-oil-1",
      regionId: "ukraine",
      resid: 0,
      theater: "russia-ukraine",
      lat: 45.04,
      lng: 35.38,
      title: "Strike reported near Crimea oil depot",
      titleKo: "크림 인근 유류 저장고 타격 보고",
      body: "Ukrainian drones struck a Russian oil depot and fuel storage near the Black Sea coast, with secondary explosions reported.",
      bodyKo:
        "우크라이나 드론이 흑해 연안 러시아 유류·연료 저장고를 타격했고 2차 폭발이 보고됐다.",
      sourceUrl: "https://liveuamap.com/",
      publishedAt: new Date(now - 12 * 60_000).toISOString(),
      tags: ["explosion", "oil", "ukraine"],
    },
    {
      id: "mock-liveua-grain-1",
      regionId: "ukraine",
      resid: 0,
      theater: "russia-ukraine",
      lat: 46.48,
      lng: 30.73,
      title: "Port infrastructure hit — grain export risk",
      titleKo: "항구 인프라 피격 — 곡물 수출 위험",
      body: "Missile strikes hit port facilities linked to wheat and grain exports; shipping insurance risk elevated.",
      bodyKo:
        "밀·곡물 수출과 연결된 항구 시설이 미사일 타격을 받아 해상보험 위험이 커졌다.",
      sourceUrl: "https://liveuamap.com/",
      publishedAt: new Date(now - 20 * 60_000).toISOString(),
      tags: ["port", "grain", "missile"],
    },
  ];
}

async function translateEventsKo(events: LiveuamapEvent[]): Promise<LiveuamapEvent[]> {
  return mapPool(
    events,
    async (ev) => {
      if (ev.titleKo && ev.bodyKo) return ev;
      const titleKo = isMostlyKorean(ev.title)
        ? ev.title
        : await translateText(ev.title, "ko");
      const bodyKo = isMostlyKorean(ev.body)
        ? ev.body
        : await translateText(ev.body.slice(0, 800), "ko");
      return { ...ev, titleKo, bodyKo };
    },
    4,
  );
}

async function fetchMptsSlot(
  slot: LiveuamapRegionSlot,
  apiKey: string,
  options?: { recordBudget?: boolean },
): Promise<{
  events: LiveuamapEvent[];
  control: OccupiedGeoJson | null;
  raw: unknown;
  error?: string;
}> {
  const recordBudget = options?.recordBudget !== false;
  const url = new URL(MPTS_BASE);
  url.searchParams.set("a", "mpts");
  url.searchParams.set("resid", String(slot.resid));
  url.searchParams.set("count", "50");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("geojson", "true");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "BraveNewWorld/liveuamap-ingest",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (recordBudget) recordLiveuamapFetch(slot.id);
    else touchLiveuamapSlot(slot.id);
    if (!res.ok) {
      return {
        events: [],
        control: null,
        raw: null,
        error: `mpts resid=${slot.resid} HTTP ${res.status}`,
      };
    }
    const json: unknown = await res.json();
    // 일일 쿼터 소진 등 success:false 본문
    if (
      json &&
      typeof json === "object" &&
      (json as { success?: unknown }).success === false
    ) {
      const message =
        asString((json as { message?: unknown }).message) ||
        `mpts resid=${slot.resid} rejected`;
      return { events: [], control: null, raw: json, error: message };
    }
    const places = extractPlaces(json);
    const events = places
      .map((row, i) => normalizePlace(row, i, slot))
      .filter((e): e is LiveuamapEvent => Boolean(e));

    let control: OccupiedGeoJson | null = null;
    if (slot.parseControl && isLiveuamapControlRegionId(slot.id)) {
      control = liveuamapFieldsToOccupiedGeoJson(json, slot.id);
    }
    return { events, control, raw: json };
  } catch (err) {
    if (recordBudget) recordLiveuamapFetch(slot.id);
    else touchLiveuamapSlot(slot.id);
    const message = err instanceof Error ? err.message : "mpts fetch failed";
    return { events: [], control: null, raw: null, error: message };
  }
}

async function fetchFeedUrlFallback(apiKey?: string): Promise<{
  events: LiveuamapEvent[];
  control: OccupiedGeoJson | null;
  error?: string;
}> {
  const feedUrl = process.env.LIVEUAMAP_FEED_URL?.trim();
  if (!feedUrl) return { events: [], control: null, error: "no LIVEUAMAP_API_KEY or FEED_URL" };

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "BraveNewWorld/liveuamap-ingest",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const res = await fetch(feedUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return {
        events: [],
        control: null,
        error: `LIVEUAMAP_FEED_URL HTTP ${res.status}`,
      };
    }
    const json: unknown = await res.json();
    const list = extractPlaces(json);
    const slot = { id: "ukraine" as LiveuamapRegionId, resid: 0, theater: "russia-ukraine" as const };
    const events = list
      .map((row, i) => normalizePlace(row, i, slot))
      .filter((e): e is LiveuamapEvent => Boolean(e));
    const control = liveuamapFieldsToOccupiedGeoJson(json, "ukraine");
    return { events, control };
  } catch (err) {
    return {
      events: [],
      control: null,
      error: err instanceof Error ? err.message : "feed fetch failed",
    };
  }
}

export type SyncLiveuamapResult = {
  events: LiveuamapEvent[];
  controls: Partial<Record<LiveuamapControlRegionId, OccupiedGeoJson>>;
  source: "liveuamap" | "empty" | "mock";
  error?: string;
  fetchedSlots: LiveuamapRegionId[];
  budget: ReturnType<typeof getLiveuamapBudgetSnapshot>;
};

export async function syncLiveuamapEvents(): Promise<SyncLiveuamapResult> {
  const budget = getLiveuamapBudgetSnapshot();

  if (process.env.LIVEUAMAP_USE_MOCK === "true") {
    const mockControl = liveuamapFieldsToOccupiedGeoJson(
      {
        fields: [
          {
            id: "mock-ua-zone",
            name: "mock occupied",
            // GeoJSON order: [lng, lat] — Donetsk 근방
            points: [
              [37.0, 48.0],
              [37.4, 48.0],
              [37.4, 48.2],
              [37.0, 48.2],
            ],
          },
        ],
      },
      "ukraine",
    );
    return {
      events: mockEvents(),
      controls: mockControl ? { ukraine: mockControl } : {},
      source: "mock",
      fetchedSlots: ["ukraine"],
      budget,
    };
  }

  const apiKey = process.env.LIVEUAMAP_API_KEY?.trim();
  const due = selectDueLiveuamapSlots(Date.now(), 3);

  if (apiKey && due.length > 0) {
    const errors: string[] = [];
    const allEvents: LiveuamapEvent[] = [];
    const controls: Partial<Record<LiveuamapControlRegionId, OccupiedGeoJson>> = {};
    const fetchedSlots: LiveuamapRegionId[] = [];
    /** 동일 resid는 HTTP 1회만 — LB/IL-PS 공유 등 */
    const rawByResid = new Map<
      number,
      { raw: unknown; error?: string; primaryId: LiveuamapRegionId }
    >();

    for (const slot of due) {
      fetchedSlots.push(slot.id);
      let packed = rawByResid.get(slot.resid);
      if (!packed) {
        const result = await fetchMptsSlot(slot, apiKey, { recordBudget: true });
        packed = {
          raw: result.raw,
          error: result.error,
          primaryId: slot.id,
        };
        rawByResid.set(slot.resid, packed);
        if (result.error) errors.push(result.error);
        allEvents.push(...result.events);
        if (result.control?.features.length && isLiveuamapControlRegionId(slot.id)) {
          controls[slot.id] = result.control;
        }
        continue;
      }

      // 캐시된 raw 재사용
      touchLiveuamapSlot(slot.id);
      if (packed.error) {
        // primary에서 이미 errors에 넣음
      } else if (packed.raw) {
        const places = extractPlaces(packed.raw);
        const events = places
          .map((row, i) => normalizePlace(row, i, slot))
          .filter((e): e is LiveuamapEvent => Boolean(e));
        allEvents.push(...events);
        if (slot.parseControl && isLiveuamapControlRegionId(slot.id)) {
          const control = liveuamapFieldsToOccupiedGeoJson(packed.raw, slot.id);
          if (control?.features.length) controls[slot.id] = control;
        }
      }
    }

    const translated = await translateEventsKo(allEvents);
    return {
      events: translated,
      controls,
      source: translated.length > 0 || Object.keys(controls).length > 0 ? "liveuamap" : "empty",
      error: errors.length ? errors.join("; ") : undefined,
      fetchedSlots,
      budget: getLiveuamapBudgetSnapshot(),
    };
  }

  if (apiKey && due.length === 0) {
    return {
      events: [],
      controls: {},
      source: "empty",
      error: "no due slots (budget or interval)",
      fetchedSlots: [],
      budget: getLiveuamapBudgetSnapshot(),
    };
  }

  const fallback = await fetchFeedUrlFallback(apiKey);
  const translated = await translateEventsKo(fallback.events);
  const controls: Partial<Record<LiveuamapControlRegionId, OccupiedGeoJson>> = {};
  if (fallback.control?.features.length) {
    controls.ukraine = fallback.control;
  }
  return {
    events: translated,
    controls,
    source: translated.length > 0 || Object.keys(controls).length > 0 ? "liveuamap" : "empty",
    error: fallback.error,
    fetchedSlots: translated.length || Object.keys(controls).length ? (["ukraine"] as LiveuamapRegionId[]) : [],
    budget: getLiveuamapBudgetSnapshot(),
  };
}
