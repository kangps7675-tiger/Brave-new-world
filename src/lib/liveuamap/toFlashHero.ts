import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { HeroBreakingItem } from "@/lib/news/types";
import {
  FLASH_KINETIC_RE,
  isGeoeconomicImpactFlash,
  isPriceThreatInfrastructureFlash,
} from "@/lib/news/breakingFlash";
import { S_GRADE_MIN } from "@/lib/news/breakingGrade";

function ageMinutes(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.round((Date.now() - t) / 60_000));
}

/**
 * LIVEUA → 양피지 hero.
 * 고충격만 grade 9(S)로 올리고, 그 외는 B로 두어 게이트에서 걸러지게 한다.
 */
export function liveuamapEventToFlashHero(event: LiveuamapEvent): HeroBreakingItem {
  const blob = `${event.title} ${event.body} ${event.tags.join(" ")}`;
  const highImpact =
    (FLASH_KINETIC_RE.test(blob) && isGeoeconomicImpactFlash(blob)) ||
    isPriceThreatInfrastructureFlash(blob) ||
    (FLASH_KINETIC_RE.test(blob) && /\b(escalat|invasion|nato|nuclear|carrier)\b|확전|침공|핵/i.test(blob));

  const grade = highImpact ? S_GRADE_MIN : 5;
  const age = ageMinutes(event.publishedAt);

  return {
    id: `liveua:${event.id}`,
    title: event.title,
    link: event.sourceUrl,
    source: "Liveuamap",
    publisher: "Liveuamap",
    pubDate: event.publishedAt,
    theater: event.theater,
    trustTier: 2,
    feedTopic: isGeoeconomicImpactFlash(blob) ? "economy" : "defense",
    imageUrl: event.imageUrl,
    summary: event.body,
    heroStatus: "breaking",
    urgencyScore: grade * 10,
    breakingGrade: grade,
    breakingRank: grade >= S_GRADE_MIN ? "S" : "B",
    ageMinutes: age,
    flashSource: "liveuamap",
    videoUrl: event.videoUrl,
    lat: event.lat,
    lng: event.lng,
    verbatim: true,
  };
}
