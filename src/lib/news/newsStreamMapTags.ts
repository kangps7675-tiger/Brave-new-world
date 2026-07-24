/**
 * 구글 뉴스 스트림 → 지도 네온 태그 (전쟁=빨강 / 긴장=주황 / 외교=파랑).
 * 좌표는 제목·요약 지명 매칭, 없으면 전장 중심 + 안정 지터.
 */

import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { NeonRippleAccent } from "@/lib/neonRippleIncidentMarker";
import { resolveTelegramPlace } from "@/lib/telegramPlaceMatch";

export type NewsMapTagKind = "war" | "tension" | "diplomatic";

export type NewsStreamMapTag = {
  markerId: string;
  displayKind: "news-stream-neon";
  id: string;
  lat: number;
  lng: number;
  title: string;
  link: string;
  kind: NewsMapTagKind;
  accent: NeonRippleAccent;
  intensity: number;
  theater: NewsTheater;
};

const WAR_RE =
  /전쟁|전선|충돌|교전|공습|포격|미사일|폭격|침공|공격|전투|교전|shelling|airstrike|missile|combat|war\b|clash|offensive|invasion|strike|bombard|front\s?line|포격|드론 공격/i;

const TENSION_RE =
  /긴장|대치|확전|위기|경고|위협|제재|봉쇄|무력시위|tension|standoff|escalate|escalation|threat|sanction|blockade|show of force|위기 고조/i;

const DIPLOMATIC_RE =
  /외교|회담|정상회담|특사|대사|협상|휴전|합의|동맹|방문|외교부|summit|diplomat|envoy|talks|ceasefire|negotiation|treaty|foreign minister|ambassador|동맹|평화협정/i;

function classifyNewsKind(text: string): NewsMapTagKind {
  if (WAR_RE.test(text)) return "war";
  if (DIPLOMATIC_RE.test(text)) return "diplomatic";
  if (TENSION_RE.test(text)) return "tension";
  // theater 기본 — 중동·우크라·대만·한반도는 긴장, 그 외 외교
  return "tension";
}

function accentForKind(kind: NewsMapTagKind): NeonRippleAccent {
  if (kind === "war") return "red";
  if (kind === "diplomatic") return "blue";
  return "orange";
}

function hashJitter(id: string): { dLat: number; dLng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = ((h % 1000) / 1000 - 0.5) * 1.2;
  const b = ((((h / 1000) | 0) % 1000) / 1000 - 0.5) * 1.2;
  return { dLat: a, dLng: b };
}

function resolveNewsCoords(item: NewsStreamItem): { lat: number; lng: number } {
  const blob = `${item.title} ${item.summary ?? ""}`;
  const hit = resolveTelegramPlace(blob);
  if (hit) return { lat: hit.lat, lng: hit.lng };

  const fly = THEATER_FLY_TO[item.theater] ?? THEATER_FLY_TO.global;
  const { dLat, dLng } = hashJitter(item.id);
  return { lat: fly.lat + dLat, lng: fly.lng + dLng };
}

function intensityFromItem(item: NewsStreamItem): number {
  if (item.trustTier === 1) return 0.92;
  if (item.trustTier === 2) return 0.72;
  return 0.55;
}

const MAX_NEWS_MAP_TAGS = 48;

/**
 * 폴링된 뉴스 → 지도 네온 태그 (중복 좌표는 제목 우선 1개).
 */
export function buildNewsStreamMapTags(items: NewsStreamItem[]): NewsStreamMapTag[] {
  const out: NewsStreamMapTag[] = [];
  const seenCell = new Set<string>();

  for (const item of items) {
    if (out.length >= MAX_NEWS_MAP_TAGS) break;
    if (item.feedTopic === "economy") continue;
    const text = `${item.title} ${item.summary ?? ""} ${item.category ?? ""}`;
    const kind = classifyNewsKind(text);
    // theater 힌트 — 전쟁 전장은 war로 상향하지 않음 (키워드만)
    const accent = accentForKind(kind);
    const { lat, lng } = resolveNewsCoords(item);
    const cell = `${lat.toFixed(1)},${lng.toFixed(1)},${kind}`;
    if (seenCell.has(cell)) continue;
    seenCell.add(cell);

    out.push({
      markerId: `news-neon-${item.id}`,
      displayKind: "news-stream-neon",
      id: item.id,
      lat,
      lng,
      title: item.title,
      link: item.link,
      kind,
      accent,
      intensity: intensityFromItem(item),
      theater: item.theater,
    });
  }

  return out;
}
