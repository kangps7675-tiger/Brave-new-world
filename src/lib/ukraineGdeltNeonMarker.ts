/**
 * 우크라 전장 GDELT 전투·충돌 — 하늘색·시안 네온 점 + 물결 리플.
 * 흰 네온은 UCDP 속보용. 이란 NewFeeds(국영·공식)는 빨간 구체(별도 레이어).
 */

import { isFreshEvent, type ScoredEvent } from "@/data/eventTiers";
import { gdeltLocationTagLabel } from "@/lib/gdeltLocationTags";
import { GDELT_NEWS_ALERT_LABEL } from "@/lib/gdeltNewsAlert";
import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";
import { isInCombatTheater } from "@/lib/theaterCombat";

export type UkraineGdeltNeonMarker = ScoredEvent & {
  markerId: string;
  displayKind: "ukraine-gdelt-neon";
  /** 가장 가까운 HAPI UKR admin1 태그 */
  hapiTag?: string | null;
};

export function isUkraineTheaterGdeltWar(event: ScoredEvent): boolean {
  return (
    event.eventTier === "war" &&
    isInCombatTheater("russia-ukraine", event.lat, event.lng)
  );
}

function intensityFromEvent(event: ScoredEvent): number {
  if (event.importanceGrade === "S") return 1;
  if (event.importanceGrade === "A") return 0.88;
  if (isFreshEvent(event)) return 0.78;
  return 0.55;
}

export function createUkraineGdeltNeonBadge(
  event: UkraineGdeltNeonMarker,
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: UkraineGdeltNeonMarker | null) => void;
    onClick?: (item: UkraineGdeltNeonMarker) => void;
  },
): HTMLElement {
  const category = gdeltLocationTagLabel(event.eventTier, lang);
  const title = event.title || event.category || (lang === "en" ? "GDELT news" : "GDELT 뉴스");
  const tagLine = event.hapiTag ? `HAPI · ${event.hapiTag}` : "";
  const aria =
    lang === "en"
      ? `Ukraine incident · ${title}`
      : `우크라 사건 · ${title}`;

  return createNeonRippleIncidentBadge(
    {
      markerId: event.markerId,
      accent: "cyan",
      intensity: intensityFromEvent(event),
      title: [`${GDELT_NEWS_ALERT_LABEL} · ${category}`, title, tagLine]
        .filter(Boolean)
        .join("\n"),
      ariaLabel: aria,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? event : null),
      onClick: () => handlers?.onClick?.(event),
    },
  );
}

/** GDELT 좌표 → 가장 가까운 우크라 HAPI 전선 라벨 */
export function nearestUkraineHapiTag(
  lat: number,
  lng: number,
  fronts: Array<{ locationCode: string; admin1Name: string; lat: number; lng: number }>,
  maxDeg = 2.8,
): string | null {
  let best: { name: string; d: number } | null = null;
  for (const front of fronts) {
    if (front.locationCode !== "UKR") continue;
    const d = Math.hypot(lat - front.lat, lng - front.lng);
    if (d > maxDeg) continue;
    if (!best || d < best.d) best = { name: front.admin1Name, d };
  }
  return best?.name ?? null;
}
