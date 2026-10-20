/**
 * 선박 사진 — Wikimedia Commons에서 선박명으로 찾는다. 키 불필요, CORS 허용(origin=*).
 *
 * 엉뚱한 배(또는 지명 사진)를 사건 선박처럼 보여 주면 오보가 되므로 맞춤 기준을 빡빡하게 둔다:
 *  1. 파일 제목에 선박명이 단어 단위로 모두 들어 있어야 한다.
 *  2. 제목·분류·설명 중 어딘가에 선박 관련 단어가 있어야 한다. (예: "Sounion"은 수니온 곶 사진이 걸린다)
 * 못 찾으면 null — 호출부는 대표 일러스트로 대체하고 "실제 선박 사진 아님"을 표시한다.
 */

export type ShipPhoto = {
  /** 640px 썸네일 */
  url: string;
  /** Commons 파일 페이지 */
  pageUrl: string;
  title: string;
  license: string | null;
  /** 촬영자(HTML 제거본) */
  artist: string | null;
};

export type ShipKind = "tanker" | "bulk" | "container" | "generic";

const SHIP_WORDS =
  /\b(ship|ships|vessel|tanker|carrier|cargo|container|freighter|bulker|bulk|imo|mv|mt|ms|ss|merchant|oil|chemical|lng|lpg|ferry)\b/i;

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/** 선박명 → 비교용 토큰. 따옴표·기호 제거, 소문자. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** 선박 접두어(MV/MT 등)는 이름 일부가 아니다. */
function stripPrefix(tokens: string[]): string[] {
  const head = tokens[0];
  return head && ["mv", "mt", "ms", "ss", "m/v", "m/t"].includes(head) ? tokens.slice(1) : tokens;
}

export function titleHasName(title: string, name: string): boolean {
  const want = stripPrefix(nameTokens(name));
  if (want.length === 0) return false;
  const have = new Set(nameTokens(title.replace(/^file:/i, "").replace(/\.[a-z0-9]+$/i, "")));
  return want.every((t) => have.has(t));
}

type CommonsPage = {
  index?: number;
  title: string;
  imageinfo?: {
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
};

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t || null;
}

/** 캐러셀에 올리는 사진 수 상한 */
export const SHIP_PHOTO_MAX = 6;

/** 검색 결과에서 맞는 사진을 순위순으로 최대 SHIP_PHOTO_MAX장 고른다. 순수 함수라 테스트한다. */
export function pickShipPhotos(pages: CommonsPage[], name: string): ShipPhoto[] {
  const out: ShipPhoto[] = [];
  const sorted = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of sorted) {
    if (out.length >= SHIP_PHOTO_MAX) break;
    const info = page.imageinfo?.[0];
    const url = info?.thumburl || info?.url;
    if (!info || !url) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    if (!titleHasName(page.title, name)) continue;
    const md = info.extmetadata ?? {};
    const haystack = `${page.title} ${md.Categories?.value ?? ""} ${md.ImageDescription?.value ?? ""}`;
    if (!SHIP_WORDS.test(haystack)) continue;
    out.push({
      url,
      pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      title: page.title.replace(/^File:/i, ""),
      license: stripHtml(md.LicenseShortName?.value),
      artist: stripHtml(md.Artist?.value),
    });
  }
  return out;
}

/** 맞는 사진 중 가장 앞선 한 장 */
export function pickShipPhoto(pages: CommonsPage[], name: string): ShipPhoto | null {
  return pickShipPhotos(pages, name)[0] ?? null;
}

/** 선종 문자열 → 대표 일러스트 종류 */
export function shipKindFromType(vesselType: string | null | undefined): ShipKind {
  const t = (vesselType ?? "").toLowerCase();
  if (/tanker|oil|chemical|lng|lpg|유조|탱커/.test(t)) return "tanker";
  if (/bulk|벌크|산적/.test(t)) return "bulk";
  if (/container|컨테이너/.test(t)) return "container";
  return "generic";
}

const cache = new Map<string, Promise<ShipPhoto[]>>();

export function fetchShipPhotos(name: string, signal?: AbortSignal): Promise<ShipPhoto[]> {
  const key = nameTokens(name).join(" ");
  if (!key) return Promise.resolve([]);
  const hit = cache.get(key);
  if (hit) return hit;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${name} ship`,
    gsrnamespace: "6",
    gsrlimit: "16",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "640",
    format: "json",
    origin: "*",
  });
  const job = fetch(`${COMMONS_API}?${params.toString()}`, { signal })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { query?: { pages?: Record<string, CommonsPage> } } | null) =>
      json?.query?.pages ? pickShipPhotos(Object.values(json.query.pages), name) : [],
    )
    .catch(() => {
      cache.delete(key); // 일시 오류는 다음에 다시 시도
      return [] as ShipPhoto[];
    });
  cache.set(key, job);
  return job;
}
