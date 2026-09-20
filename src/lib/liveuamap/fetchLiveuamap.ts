/**
 * LIVEUAMAP 전전선 ingest 어댑터.
 *
 * Env:
 * - LIVEUAMAP_FEED_URL — JSON 피드 URL (배열 또는 { events: [] })
 * - LIVEUAMAP_API_KEY — optional Bearer / query key
 *
 * 공식 public SDK가 없으면 운영자가 제공하는 JSON 미러를 폴링한다.
 * 미설정 시 빈 피드 (idle). LIVEUAMAP_USE_MOCK=true 면 개발용 샘플.
 */

import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsTheater } from "@/lib/news/types";

const THEATER_HINTS: Array<{ re: RegExp; theater: NewsTheater }> = [
  { re: /ukrain|donetsk|kharkiv|crimea|black\s?sea/i, theater: "russia-ukraine" },
  { re: /gaza|israel|lebanon|syria|iran|hormuz|red\s?sea|houthi/i, theater: "middle-east" },
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
  if (f.includes("middle")) return "middle-east";
  return "global";
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeRaw(raw: unknown, index: number): LiveuamapEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title) || asString(o.name) || asString(o.headline);
  const body =
    asString(o.body) ||
    asString(o.text) ||
    asString(o.description) ||
    asString(o.message) ||
    title;
  if (!title && !body) return null;

  const lat = asNumber(o.lat) ?? asNumber(o.latitude);
  const lng = asNumber(o.lng) ?? asNumber(o.lon) ?? asNumber(o.longitude);
  if (lat == null || lng == null) return null;

  const id =
    asString(o.id) ||
    asString(o.event_id) ||
    `liveua-${lat.toFixed(3)}-${lng.toFixed(3)}-${index}-${title.slice(0, 24)}`;

  const publishedAt =
    asString(o.publishedAt) ||
    asString(o.date) ||
    asString(o.time) ||
    asString(o.timestamp) ||
    new Date().toISOString();

  const sourceUrl =
    asString(o.sourceUrl) ||
    asString(o.url) ||
    asString(o.link) ||
    "https://liveuamap.com/";

  const tagsRaw = o.tags ?? o.categories ?? o.labels;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => asString(t)).filter(Boolean)
    : [];

  const blob = `${title} ${body} ${tags.join(" ")}`;
  return {
    id,
    theater: inferTheater(blob, asString(o.theater) || asString(o.region)),
    lat,
    lng,
    title: title || body.slice(0, 120),
    body,
    imageUrl: asString(o.imageUrl) || asString(o.image) || asString(o.photo) || undefined,
    videoUrl: asString(o.videoUrl) || asString(o.video) || undefined,
    sourceUrl,
    publishedAt,
    tags,
  };
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["events", "data", "items", "features"]) {
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
      theater: "russia-ukraine",
      lat: 45.04,
      lng: 35.38,
      title: "Strike reported near Crimea oil depot",
      body: "Ukrainian drones struck a Russian oil depot and fuel storage near the Black Sea coast, with secondary explosions reported.",
      imageUrl: undefined,
      sourceUrl: "https://liveuamap.com/",
      publishedAt: new Date(now - 12 * 60_000).toISOString(),
      tags: ["explosion", "oil", "ukraine"],
    },
    {
      id: "mock-liveua-grain-1",
      theater: "russia-ukraine",
      lat: 46.48,
      lng: 30.73,
      title: "Port infrastructure hit — grain export risk",
      body: "Missile strikes hit port facilities linked to wheat and grain exports; shipping insurance risk elevated.",
      sourceUrl: "https://liveuamap.com/",
      publishedAt: new Date(now - 20 * 60_000).toISOString(),
      tags: ["port", "grain", "missile"],
    },
  ];
}

export type SyncLiveuamapResult = {
  events: LiveuamapEvent[];
  source: "liveuamap" | "empty" | "mock";
  error?: string;
};

export async function syncLiveuamapEvents(): Promise<SyncLiveuamapResult> {
  if (process.env.LIVEUAMAP_USE_MOCK === "true") {
    return { events: mockEvents(), source: "mock" };
  }

  const feedUrl = process.env.LIVEUAMAP_FEED_URL?.trim();
  if (!feedUrl) {
    return { events: [], source: "empty" };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "BraveNewWorld/liveuamap-ingest",
  };
  const apiKey = process.env.LIVEUAMAP_API_KEY?.trim();
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
        source: "empty",
        error: `LIVEUAMAP_FEED_URL HTTP ${res.status}`,
      };
    }
    const json: unknown = await res.json();
    const list = extractList(json);
    const events = list
      .map((row, i) => normalizeRaw(row, i))
      .filter((e): e is LiveuamapEvent => Boolean(e));
    return { events, source: "liveuamap" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "liveuamap sync failed";
    return { events: [], source: "empty", error: message };
  }
}
