/**
 * 근거 "종류" — 확인됨 규칙의 「서로 다른 종류의 중 2개」에 사용.
 * sourceKey 접두어 / 카탈로그 layerId 를 정규화한다.
 */

export type EvidenceSourceKind =
  | "firms"
  | "ais"
  | "adsb"
  | "neptun"
  | "tzeva-adom"
  | "satellite"
  | "control-zone"
  | "facility"
  | "liveua"
  | "ukmto"
  | "photo"
  | "official"
  | "media"
  | "manual"
  | "other";

export type MediaTierHint = 1 | 2 | 3;

/**
 * sourceKey 예:
 * - "firms", "firms:hotspot-1"
 * - "neptun:threat:abc"
 * - "media", "media:1", "media:tier3:ria", "media:reuters"
 * - "manual"
 */
export function evidenceSourceKind(sourceKey: string): EvidenceSourceKind {
  const raw = sourceKey.trim().toLowerCase();
  const head = raw.split(/[:/|]/)[0] ?? raw;

  if (head === "firms" || head === "nasa-firms" || head === "viirs") return "firms";
  if (head === "ais" || head === "marinetraffic") return "ais";
  if (head === "adsb" || head === "ads-b" || head === "aircraft") return "adsb";
  if (head === "control-zone") return "control-zone";
  if (head === "facility" || head === "osm") return "facility";
  if (head === "neptun") return "neptun";
  if (head === "tzeva" || head === "tzeva-adom" || head === "oref") return "tzeva-adom";
  if (
    head === "satellite" ||
    head === "sentinel" ||
    head === "sentinel-1" ||
    head === "sentinel-2" ||
    head === "optical" ||
    head === "sar"
  ) {
    return "satellite";
  }
  if (head === "liveua" || head === "liveuamap" || head === "deepstate") return "liveua";
  if (head === "ukmto") return "ukmto";
  if (head === "photo" || head === "geolocated-photo" || head === "imagery") return "photo";
  if (head === "official" || head === "gov" || head === "mod") return "official";
  if (head === "media" || head === "press" || head === "news" || head === "article") {
    return "media";
  }
  if (head === "manual") return "manual";
  return "other";
}

/**
 * media sourceKey에서 Tier 힌트 추출 (표시·디버그용).
 * **저장/상한 계산에는 쓰지 말 것** — 클라이언트가 `media:1:…`로 등급을 위조할 수 있음.
 * 서버는 classifyMediaTier(매체명, URL)만 신뢰한다.
 */
export function mediaTierFromSourceKey(sourceKey: string): MediaTierHint | undefined {
  if (evidenceSourceKind(sourceKey) !== "media") return undefined;
  const parts = sourceKey.trim().toLowerCase().split(/[:/|]/);
  for (const p of parts.slice(1)) {
    if (p === "1" || p === "tier1" || p === "t1") return 1;
    if (p === "2" || p === "tier2" || p === "t2") return 2;
    if (p === "3" || p === "tier3" || p === "t3") return 3;
  }
  return undefined;
}
