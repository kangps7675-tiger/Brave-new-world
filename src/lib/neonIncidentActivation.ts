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
  EUROPE_DRONE_INCIDENTS,
  type EuropeDroneIncident,
} from "@/data/europeDroneIncursionSeed";
import {
  KOREA_MISSILE_INCIDENTS,
  type KoreaMissileIncident,
} from "@/data/koreaMissileIncidentsSeed";
import {
  RUSSIA_STRIKE_INCIDENTS,
  type RussiaStrikeIncident,
} from "@/data/russiaStrikeIncidentsSeed";
import { isInCombatTheater } from "@/lib/theaterCombat";

const CHINA_SEED_MATCH_DEG = 3.2;
const KOREA_SEED_MATCH_DEG = 2.8;
const RUSSIA_STRIKE_MATCH_DEG = 2.4;
const EUROPE_DRONE_SEED_MATCH_DEG = 3.5;
/** 폴백 시 dyad당 최대 시드 수 */
const CHINA_SEED_FALLBACK_PER_DYAD = 2;
const KOREA_SEED_FALLBACK_MAX = 4;
const RUSSIA_STRIKE_FALLBACK_MAX = 5;
const EUROPE_DRONE_FALLBACK_MAX = 5;

const MISSILE_EVENT_RE =
  /missile|ballistic|rocket|icbm|irbm|mrbm|slbm|hypersonic|launch\s*test|weapons?\s*test|화성|미사일|로켓|발사체|발사\s*실험|탄도|극초음속|방사포|핵실험/i;

/** 타격을 시사하는 어휘 */
const STRIKE_EVENT_RE =
  /drone|uav|shahed|kamikaze|missile|atacms|storm\s*shadow|neptune|strike|struck|\bhit\b|explosion|blast|refinery|air\s*base|airfield|oil\s*depot|드론|무인기|미사일|타격|피격|폭발|정유소|공습|격추/i;

/**
 * 러시아(및 점령지) 표적 지명 — "러시아를 향한 타격"만 남기고
 * 국경 반대편(하르키우 등 우크라 도시 피격)을 배제하는 disambiguation 키.
 */
const RUSSIA_TARGET_RE =
  /belgorod|kursk|bryansk|voronezh|rostov|moscow|engels|morozovsk|novorossiysk|sevastopol|tuapse|ryazan|krasnodar|taganrog|feodosia|lipetsk|saratov|smolensk|crimea|krym|벨고로드|쿠르스크|브[랸랴]스크|보로네시|로스토프|모스크바|엥겔스|세바스토폴|랴잔|크라스노다르|노보로시스크|타간로크|페오도시야|크림/i;

/** 드론·영공 침범을 시사하는 어휘 */
const DRONE_AIRSPACE_EVENT_RE =
  /drone|uav|unmanned\s*aerial|airspace|air\s*space|scrambled?|shot\s*down|shoot\s*down|intercept|airport\s*(closed|closure|shutdown|suspend)|no-?fly|nato\s*article\s*4|드론|무인기|영공|스크램블|요격|격추|공항\s*폐쇄|비행\s*금지|나토\s*4조/i;

/**
 * 유럽/나토 표적 지명 — 러-우 전쟁 교전지역 자체(우크라이나 국경 지대)가 아니라
 * "나토 회원국·비교전국(+나토 비회원 스필오버국 몰도바) 영공에서 벌어진" 사건만
 * 남기는 disambiguation 키.
 */
const EUROPE_NATO_TARGET_RE =
  /poland|polska|lublin|warsaw|romania|tulcea|danube|lithuania|latvia|estonia|finland|baltic|denmark|copenhagen|aalborg|billund|karup|germany|munich|kiel|belgium|netherlands|kleine\s*brogel|volkel|norway|ørland|orland|brønnøysund|bronnoysund|france|ile\s*longue|île\s*longue|nato|moldova|chisinau|balti|ungheni|hincesti|cahul|giurgiulesti|sauca|폴란드|루블린|바르샤바|루마니아|다뉴브|리투아니아|라트비아|에스토니아|핀란드|발트|덴마크|코펜하겐|올보르|빌룬|카루프|독일|뮌헨|킬|벨기에|네덜란드|노르웨이|프랑스|일롱그|나토|몰도바|키시나우|벌치|웅게니|인체슈티|카훌/i;

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

function russiaStrikeFallback(): RussiaStrikeIncident[] {
  return RUSSIA_STRIKE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, RUSSIA_STRIKE_FALLBACK_MAX)
    .map((seed) => ({
      ...seed,
      id: `seed-ru-${seed.id}`,
      intensity: Math.max(0.35, seed.intensity * 0.55),
    }));
}

/**
 * 우크라이나 → 러시아 타격 네온: 신선·타격 사건이 러시아 표적 근처에 있을 때만 점등,
 * 없으면 시드 폴백.
 *
 * disambiguation 2단계 — (1) 텍스트에 러시아 표적 지명, (2) 좌표가 러시아 앵커 근처.
 * 두 조건을 모두 요구해 국경 반대편(우크라 도시 피격)이 잘못 잡히는 걸 막는다.
 * 모든 결과는 "보도·미확인"으로 취급(러 국방부/우크라 발표 모두 검증 불가).
 */
export function activateRussiaStrikeIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): RussiaStrikeIncident[] {
  const out: RussiaStrikeIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
    if (!STRIKE_EVENT_RE.test(text)) continue;
    if (!RUSSIA_TARGET_RE.test(text)) continue;

    const seed = nearestSeed(
      event.lat,
      event.lng,
      RUSSIA_STRIKE_INCIDENTS,
      RUSSIA_STRIKE_MATCH_DEG,
    );
    if (!seed) continue;

    const id = `live-ru-${event.id}`;
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
  return russiaStrikeFallback();
}

function europeDroneFallback(): EuropeDroneIncident[] {
  return EUROPE_DRONE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, EUROPE_DRONE_FALLBACK_MAX)
    .map((seed) => ({
      ...seed,
      id: `seed-ed-${seed.id}`,
      intensity: Math.max(0.35, seed.intensity * 0.55),
    }));
}

/**
 * 유럽 드론·영공 침범 네온: 신선·드론 사건이 나토/유럽 표적 근처에 있을 때만 점등,
 * 없으면 시드 폴백.
 *
 * disambiguation 2단계 — (1) 텍스트에 드론·영공 어휘, (2) 텍스트에 유럽/나토 지명.
 * 두 조건을 모두 요구해 우크라이나 본토 내 드론 공방(별도 레이어가 이미 다룸)이
 * 잘못 잡히는 걸 막는다. 폴란드·루마니아처럼 공식 확인된 사건도, 대부분의 공항
 * 목격처럼 출처 불상인 사건도 섞여 있어 — 각 앵커의 kind/본문에 확인 여부를 명시.
 */
export function activateEuropeDroneIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): EuropeDroneIncident[] {
  const out: EuropeDroneIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
    if (!DRONE_AIRSPACE_EVENT_RE.test(text)) continue;
    if (!EUROPE_NATO_TARGET_RE.test(text)) continue;

    const seed = nearestSeed(
      event.lat,
      event.lng,
      EUROPE_DRONE_INCIDENTS,
      EUROPE_DRONE_SEED_MATCH_DEG,
    );
    if (!seed) continue;

    const id = `live-ed-${event.id}`;
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
  return europeDroneFallback();
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
