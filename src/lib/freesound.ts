import { getCached, setCached } from "@/lib/apiCache";
import { AUDIO_MANIFEST, type AudioEventDef, type AudioEventId } from "@/data/audioManifest";

const FREESOUND_SEARCH = "https://freesound.org/apiv2/search/text/";
const FREESOUND_SOUND = "https://freesound.org/apiv2/sounds";
/** 캐시 버전 — 매니페스트 ID/쿼리 교체 시 구오매칭 캐시 무효화 */
const CACHE_PREFIX = "freesound-preview-v6:";
const SEARCH_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export type FreesoundPreview = {
  soundId: number;
  name: string;
  username: string;
  previewUrl: string;
  duration: number;
  license: string;
};

type FreesoundSearchHit = {
  id: number;
  name: string;
  username?: string;
  duration?: number;
  license?: string;
  tags?: string[];
  previews?: {
    "preview-hq-mp3"?: string;
    "preview-lq-mp3"?: string;
  };
};

type FreesoundSearchResponse = {
  count: number;
  results: FreesoundSearchHit[];
};

/** 텍스트 검색 오매칭 블랙리스트 — 동물·일상·코미디 잡음 */
const REJECT_NAME_RE =
  /\b(dog|bark|barking|woof|puppy|canine|cat|meow|kitten|bird|crow|rooster|chicken|animal|zoo|pet|horse|cow|sheep|goat|pig|frog|insect|bee|mosquito|laugh|sneeze|fart|burp|farting|cartoon|scream|baby|cry|crying|toilet|flush)\b/i;

export function getFreesoundApiKey(): string | null {
  const key = process.env.FREESOUND_API_KEY?.trim();
  return key || null;
}

export function isAudioEventId(value: string): value is AudioEventId {
  return value in AUDIO_MANIFEST;
}

function hitPreviewUrl(hit: FreesoundSearchHit): string | null {
  return hit.previews?.["preview-hq-mp3"] || hit.previews?.["preview-lq-mp3"] || null;
}

function isRejectedHit(hit: FreesoundSearchHit): boolean {
  const blob = `${hit.name} ${(hit.tags ?? []).join(" ")}`;
  return REJECT_NAME_RE.test(blob);
}

function pickBestHit(results: FreesoundSearchHit[]): FreesoundSearchHit | null {
  for (const hit of results) {
    if (isRejectedHit(hit)) continue;
    if (hitPreviewUrl(hit)) return hit;
  }
  return null;
}

function toPreview(hit: FreesoundSearchHit): FreesoundPreview {
  const previewUrl = hitPreviewUrl(hit);
  if (!previewUrl) {
    throw new Error(`Freesound hit ${hit.id} missing preview URL`);
  }
  return {
    soundId: hit.id,
    name: hit.name,
    username: hit.username || "unknown",
    previewUrl,
    duration: hit.duration ?? 0,
    license: hit.license || "unknown",
  };
}

/** 검색 실패 시 — 단일 모호 단어(air/alert/bell)로 줄이지 않음 (개 짖는 소리 등 오매칭 원인) */
function queryFallbacks(query: string): string[] {
  const trimmed = query.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ").filter(Boolean);
  const out: string[] = [trimmed];
  if (parts.length >= 3) out.push(parts.slice(0, 2).join(" "));
  // 최소 2단어 유지
  return [...new Set(out.filter((q) => q.split(" ").length >= 2))];
}

async function searchFreesoundOnce(
  apiKey: string,
  query: string,
  filter: string | null,
): Promise<FreesoundSearchHit[]> {
  const url = new URL(FREESOUND_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("fields", "id,name,username,duration,license,tags,previews");
  url.searchParams.set("page_size", "15");
  url.searchParams.set("sort", "score");
  if (filter) url.searchParams.set("filter", filter);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Freesound search failed: HTTP ${res.status} ${body.slice(0, 120)}`);
  }

  const json = (await res.json()) as FreesoundSearchResponse;
  return json.results ?? [];
}

/** 검증된 사운드 ID → HQ mp3 (서버 전용) */
export async function resolveFreesoundById(soundId: number): Promise<FreesoundPreview> {
  const cacheKey = `${CACHE_PREFIX}id:${soundId}`;
  const cached = getCached<FreesoundPreview>(cacheKey);
  if (cached) return cached;

  const apiKey = getFreesoundApiKey();
  if (!apiKey) {
    throw new Error("FREESOUND_API_KEY is not configured");
  }

  const url = new URL(`${FREESOUND_SOUND}/${soundId}/`);
  url.searchParams.set("fields", "id,name,username,duration,license,tags,previews");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Freesound sound ${soundId} failed: HTTP ${res.status} ${body.slice(0, 120)}`);
  }

  const hit = (await res.json()) as FreesoundSearchHit;
  if (isRejectedHit(hit)) {
    throw new Error(`Freesound sound ${soundId} rejected by content filter: ${hit.name}`);
  }
  const preview = toPreview(hit);
  setCached(cacheKey, preview, SEARCH_TTL_MS);
  return preview;
}

/** Freesound 텍스트 검색 → HQ mp3 프리뷰 URL (서버 전용) */
export async function resolveFreesoundPreview(query: string): Promise<FreesoundPreview> {
  const cacheKey = `${CACHE_PREFIX}q:${query.toLowerCase().trim()}`;
  const cached = getCached<FreesoundPreview>(cacheKey);
  if (cached) return cached;

  const apiKey = getFreesoundApiKey();
  if (!apiKey) {
    throw new Error("FREESOUND_API_KEY is not configured");
  }

  const wantsSiren = /\b(siren|air.?raid)\b/i.test(query);
  const wantsBoom = /\b(boom|explosion|thud|artillery|gunfire|muffled)\b/i.test(query);
  const wantsBell = /\b(bell|chime|emergency)\b/i.test(query) && !wantsSiren;

  const filters: Array<string | null> = [];
  if (wantsSiren) {
    filters.push('duration:[0.4 TO 90] tag:siren -tag:dog -tag:animal -tag:bark');
    filters.push("duration:[0.4 TO 90] tag:siren");
  } else if (wantsBoom) {
    filters.push(
      'duration:[0.2 TO 20] (tag:explosion OR tag:boom OR tag:gun OR tag:artillery) -tag:dog -tag:animal -tag:cartoon',
    );
    filters.push("duration:[0.2 TO 20] -tag:dog -tag:animal");
  } else if (wantsBell) {
    filters.push(
      'duration:[0.3 TO 40] (tag:bell OR tag:alarm OR tag:alert) -tag:dog -tag:animal -tag:church',
    );
    filters.push("duration:[0.3 TO 40] -tag:dog -tag:animal");
  } else {
    filters.push("duration:[0.15 TO 45] -tag:dog -tag:animal -tag:bark");
  }
  filters.push("duration:[0.15 TO 45]");
  filters.push(null);

  let hit: FreesoundSearchHit | null = null;
  let usedQuery = query;

  outer: for (const candidate of queryFallbacks(query)) {
    usedQuery = candidate;
    for (const filter of filters) {
      hit = pickBestHit(await searchFreesoundOnce(apiKey, candidate, filter));
      if (hit) break outer;
    }
  }

  if (!hit) {
    throw new Error(`No Freesound preview for query: ${query}`);
  }

  const preview = toPreview(hit);
  setCached(cacheKey, preview, SEARCH_TTL_MS);
  setCached(`${CACHE_PREFIX}q:${usedQuery.toLowerCase()}`, preview, SEARCH_TTL_MS);
  return preview;
}

export async function resolvePreviewForEvent(eventId: AudioEventId): Promise<{
  def: AudioEventDef;
  preview: FreesoundPreview;
}> {
  const def = AUDIO_MANIFEST[eventId] as AudioEventDef;
  // 경보 등: 고정 ID 우선 — 텍스트 검색 오매칭(개 짖는 소리 등) 차단
  if (typeof def.freesoundId === "number" && Number.isFinite(def.freesoundId)) {
    try {
      const preview = await resolveFreesoundById(def.freesoundId);
      return { def, preview };
    } catch {
      // ID 실패 시에만 검색 폴백
    }
  }
  const preview = await resolveFreesoundPreview(def.freesoundQuery);
  return { def, preview };
}
