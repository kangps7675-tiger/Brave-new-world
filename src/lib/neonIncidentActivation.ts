/**
 * 네온 리플 — 최신(속보) 사건이 있으면 그걸 쓰고,
 * 없으면 시드 앵커로 폴백해 레이어 ON이 빈 화면이 되지 않게 한다.
 */

import {
  CHINA_THEATER_INCIDENTS,
  type ChinaTheaterDyad,
  type ChinaTheaterIncident,
} from "@/data/chinaTheaterIncidentsSeed";
import {
  FRESH_EVENT_HOURS,
  isFreshEvent,
  type ScoredEvent,
} from "@/data/eventTiers";
import {
  KOREA_MISSILE_INCIDENTS,
  type KoreaMissileIncident,
} from "@/data/koreaMissileIncidentsSeed";
import { isInCombatTheater } from "@/lib/theaterCombat";

const CHINA_SEED_MATCH_DEG = 3.2;
const KOREA_SEED_MATCH_DEG = 2.8;
/** 폴백 시 dyad당 최대 시드 수 */
const CHINA_SEED_FALLBACK_PER_DYAD = 2;
const KOREA_SEED_FALLBACK_MAX = 4;

const MISSILE_EVENT_RE =
  /missile|ballistic|rocket|icbm|irbm|mrbm|slbm|hypersonic|launch\s*test|weapons?\s*test|화성|미사일|로켓|발사체|발사\s*실험|탄도|극초음속|방사포|핵실험/i;

function intensityFromEvent(event: ScoredEvent): number {
  if (event.importanceGrade === "S") return 1;
  if (event.importanceGrade === "A") return 0.9;
  if (isFreshEvent(event)) return 0.8;
  return 0.55;
}

function nearestSeed<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  seeds: T[],
  maxDeg: number,
): T | null {
  let best: { seed: T; d: number } | null = null;
  for (const seed of seeds) {
    const d = Math.hypot(lat - seed.lat, lng - seed.lng);
    if (d > maxDeg) continue;
    if (!best || d < best.d) best = { seed, d };
  }
  return best?.seed ?? null;
}

function isActionableTier(event: ScoredEvent): boolean {
  return (
    event.eventTier === "war" ||
    event.eventTier === "diplomatic" ||
    event.eventTier === "protest"
  );
}

function chinaSeedFallback(
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
): ChinaTheaterIncident[] {
  const out: ChinaTheaterIncident[] = [];
  for (const dyad of enabledDyads) {
    const seeds = CHINA_THEATER_INCIDENTS.filter((s) => s.dyad === dyad)
      .slice()
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, CHINA_SEED_FALLBACK_PER_DYAD);
    for (const seed of seeds) {
      out.push({
        ...seed,
        id: `seed-${seed.id}`,
        intensity: Math.max(0.35, seed.intensity * 0.55),
      });
    }
  }
  return out;
}

function koreaSeedFallback(): KoreaMissileIncident[] {
  return KOREA_MISSILE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, KOREA_SEED_FALLBACK_MAX)
    .map((seed) => ({
      ...seed,
      id: `seed-nk-${seed.id}`,
      intensity: Math.max(0.35, seed.intensity * 0.55),
    }));
}

/** 중국 대치 네온: 신선 GDELT 우선, 없으면 시드 폴백 */
export function activateChinaTheaterIncidents(
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
  events: ScoredEvent[],
  now = Date.now(),
): ChinaTheaterIncident[] {
  if (enabledDyads.size === 0) return [];
  const seeds = CHINA_THEATER_INCIDENTS.filter((s) => enabledDyads.has(s.dyad));
  if (seeds.length === 0) return [];

  const out: ChinaTheaterIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const seed = nearestSeed(event.lat, event.lng, seeds, CHINA_SEED_MATCH_DEG);
    if (!seed) continue;
    const id = `live-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    out.push({
      ...seed,
      id,
      lat: event.lat,
      lng: event.lng,
      titleKo: title || seed.titleKo,
      titleEn: title || seed.titleEn,
      bodyKo: seed.bodyKo,
      bodyEn: seed.bodyEn,
      intensity: Math.max(seed.intensity * 0.65, intensityFromEvent(event)),
    });
  }

  if (out.length > 0) return out;
  return chinaSeedFallback(enabledDyads);
}

/** 북한 미사일 네온: 신선·미사일 사건 우선, 없으면 시드 폴백 */
export function activateKoreaMissileIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): KoreaMissileIncident[] {
  const out: KoreaMissileIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
    const inKorea = isInCombatTheater("korea", event.lat, event.lng);
    const missileLike = MISSILE_EVENT_RE.test(text);
    if (!missileLike && !inKorea) continue;
    if (missileLike && !inKorea) {
      const nearSite = nearestSeed(
        event.lat,
        event.lng,
        KOREA_MISSILE_INCIDENTS,
        KOREA_SEED_MATCH_DEG,
      );
      if (!nearSite) continue;
    } else if (inKorea && !missileLike) {
      continue;
    }

    const seed =
      nearestSeed(event.lat, event.lng, KOREA_MISSILE_INCIDENTS, KOREA_SEED_MATCH_DEG) ??
      KOREA_MISSILE_INCIDENTS[0];
    if (!seed) continue;

    const id = `live-nk-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    out.push({
      ...seed,
      id,
      lat: event.lat,
      lng: event.lng,
      titleKo: title || seed.titleKo,
      titleEn: title || seed.titleEn,
      intensity: Math.max(seed.intensity * 0.65, intensityFromEvent(event)),
    });
  }

  if (out.length > 0) return out;
  return koreaSeedFallback();
}

/**
 * NewFeeds 공격 점 신선도 (네온 자동활성화 등).
 * 이란 뉴스 레이어 토글 표시에는 쓰지 않음 — 레이어 ON이면 전체 표시.
 */
export function isFreshNewfeedsAttack(
  attack: { publishedAt?: string | null },
  now = Date.now(),
): boolean {
  if (!attack.publishedAt) return false;
  const t = Date.parse(attack.publishedAt);
  if (!Number.isFinite(t)) return false;
  return now - t <= FRESH_EVENT_HOURS * 60 * 60 * 1000;
}
