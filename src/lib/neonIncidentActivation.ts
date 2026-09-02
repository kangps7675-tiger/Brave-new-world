/**
 * 네온 리플 — 최신(속보) 사건이 있으면 그걸 쓰고,
 * 없으면 시드 앵커로 폴백해 레이어 ON이 빈 화면이 되지 않게 한다.
 */

import {
  CHINA_THEATER_INCIDENTS,
  type ChinaTheaterDyad,
  type ChinaTheaterIncident,
  type ChinaTheaterSea,
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
import {
  provenanceFromActivation,
  type IncidentProvenance,
} from "@/lib/eventProvenance";
import { isInCombatTheater } from "@/lib/theaterCombat";

const CHINA_SEED_MATCH_DEG = 3.2;
const KOREA_SEED_MATCH_DEG = 2.8;
const RUSSIA_STRIKE_MATCH_DEG = 2.4;
const EUROPE_DRONE_SEED_MATCH_DEG = 3.5;
const CHINA_SEED_FALLBACK_PER_DYAD = 2;
const KOREA_SEED_FALLBACK_MAX = 4;
const RUSSIA_STRIKE_FALLBACK_MAX = 5;
const EUROPE_DRONE_FALLBACK_MAX = 5;

const MISSILE_EVENT_RE =
  /missile|ballistic|rocket|icbm|irbm|mrbm|slbm|hypersonic|launch\s*test|weapons?\s*test|화성|미사일|로켓|발사체|발사\s*실험|탄도|극초음속|방사포|핵실험/i;

const STRIKE_EVENT_RE =
  /drone|uav|shahed|kamikaze|missile|atacms|storm\s*shadow|neptune|strike|struck|\bhit\b|explosion|blast|refinery|air\s*base|airfield|oil\s*depot|드론|무인기|미사일|타격|피격|폭발|정유소|공습|격추/i;

const RUSSIA_TARGET_RE =
  /belgorod|kursk|bryansk|voronezh|rostov|moscow|engels|morozovsk|novorossiysk|sevastopol|tuapse|ryazan|krasnodar|taganrog|feodosia|lipetsk|saratov|smolensk|crimea|krym|벨고로드|쿠르스크|브[랸랴]스크|보로네시|로스토프|모스크바|엥겔스|세바스토폴|랴잔|크라스노다르|노보로시스크|타간로그|페오도시야|크림/i;

const DRONE_AIRSPACE_EVENT_RE =
  /drone|uav|unmanned\s*aerial|airspace|air\s*space|scrambled?|shot\s*down|shoot\s*down|intercept|airport\s*(closed|closure|shutdown|suspend)|no-?fly|nato\s*article\s*4|드론|무인기|영공|스크램블|요격|격추|공항\s*폐쇄|비행\s*금지|나토\s*4조/i;

const EUROPE_NATO_TARGET_RE =
  /poland|polska|lublin|warsaw|romania|tulcea|danube|lithuania|latvia|estonia|finland|baltic|denmark|copenhagen|aalborg|billund|karup|germany|munich|kiel|belgium|netherlands|kleine\s*brogel|volkel|norway|ørland|orland|brønnøysund|bronnoysund|france|ile\s*longue|île\s*longue|nato|moldova|chisinau|balti|ungheni|hincesti|cahul|giurgiulesti|sauca|폴란드|루블린|바르샤바|루마니아|다뉴브|리투아니아|라트비아|에스토니아|핀란드|발트|덴마크|코펜하겐|올보르|빌룬|카루프|독일|뮌헨|킬|벨기에|네덜란드|노르웨이|프랑스|일롱그|나토|몰도바|키시나우|벌치|웅게니|인체슈티|카훌/i;

const CHINA_THEATER_EVENT_RE =
  /adiz|air\s*defense|intercept|laser|water\s*cannon|ram|collision|incursion|coast\s*guard|pla\s*navy|carrier|blockade|strait|patrol|missile|drill|exercise|gray\s*zone|영공|요격|충돌|해경|해군|훈련|미사일|대치|레이저|ADIZ/i;

export type ProvenanceFields = {
  provenance: IncidentProvenance;
  gdeltSourceUrl?: string | null;
};

export function eventText(event: ScoredEvent): string {
  return `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
}

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

function withProvenance<T extends { id: string; sourceUrl?: string }>(
  item: T,
  params: { hadSeedMatch: boolean; seedSourceUrl?: string | null; gdeltSourceUrl?: string | null },
): T & ProvenanceFields {
  return {
    ...item,
    provenance: provenanceFromActivation({
      id: item.id,
      seedSourceUrl: params.seedSourceUrl,
      gdeltSourceUrl: params.gdeltSourceUrl,
      hadSeedMatch: params.hadSeedMatch,
    }),
    gdeltSourceUrl: params.gdeltSourceUrl ?? null,
  };
}

function defaultSeaForDyad(dyad: ChinaTheaterDyad): ChinaTheaterSea {
  if (dyad === "china-taiwan") return "taiwan-strait";
  if (dyad === "china-japan") return "east-china-sea";
  if (dyad === "china-philippines") return "south-china-sea";
  return "west-pacific";
}

function inferChinaDyad(
  event: ScoredEvent,
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
): ChinaTheaterDyad | null {
  const text = eventText(event);
  const rules: { dyad: ChinaTheaterDyad; re: RegExp }[] = [
    { dyad: "china-taiwan", re: /taiwan|strait|kinmen|matsu|台|대만|台湾/i },
    { dyad: "china-japan", re: /japan|senkaku|dokdo|okinawa|east china|일본|동중국|尖閣/i },
    {
      dyad: "china-philippines",
      re: /philippines|scarborough|spratly|second thomas|필리핀|南沙|黄岩/i,
    },
    {
      dyad: "us-china",
      re: /south china sea|scs|us navy|carrier strike|미국|南中国海|西太|philippine sea/i,
    },
  ];
  for (const rule of rules) {
    if (enabledDyads.has(rule.dyad) && rule.re.test(text)) return rule.dyad;
  }
  if (enabledDyads.has("china-taiwan") && isInCombatTheater("china-taiwan", event.lat, event.lng)) {
    return "china-taiwan";
  }
  if (
    enabledDyads.has("china-philippines") &&
    event.lat >= 4 &&
    event.lat <= 22 &&
    event.lng >= 108 &&
    event.lng <= 122
  ) {
    return "china-philippines";
  }
  return null;
}

function chinaSeedFallback(
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
): (ChinaTheaterIncident & ProvenanceFields)[] {
  const out: (ChinaTheaterIncident & ProvenanceFields)[] = [];
  for (const dyad of enabledDyads) {
    const seeds = CHINA_THEATER_INCIDENTS.filter((s) => s.dyad === dyad)
      .slice()
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, CHINA_SEED_FALLBACK_PER_DYAD);
    for (const seed of seeds) {
      out.push(
        withProvenance(
          {
            ...seed,
            id: `seed-${seed.id}`,
            intensity: Math.max(0.35, seed.intensity * 0.55),
          },
          { hadSeedMatch: true, seedSourceUrl: seed.sourceUrl, gdeltSourceUrl: null },
        ),
      );
    }
  }
  return out;
}

function koreaSeedFallback(): (KoreaMissileIncident & ProvenanceFields)[] {
  return KOREA_MISSILE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, KOREA_SEED_FALLBACK_MAX)
    .map((seed) =>
      withProvenance(
        {
          ...seed,
          id: `seed-nk-${seed.id}`,
          intensity: Math.max(0.35, seed.intensity * 0.55),
        },
        { hadSeedMatch: true, seedSourceUrl: null, gdeltSourceUrl: null },
      ),
    );
}

export function activateChinaTheaterIncidents(
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
  events: ScoredEvent[],
  now = Date.now(),
): (ChinaTheaterIncident & ProvenanceFields)[] {
  if (enabledDyads.size === 0) return [];
  const seeds = CHINA_THEATER_INCIDENTS.filter((s) => enabledDyads.has(s.dyad));
  if (seeds.length === 0) return [];

  const out: (ChinaTheaterIncident & ProvenanceFields)[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    if (!CHINA_THEATER_EVENT_RE.test(eventText(event))) continue;
    const dyad = inferChinaDyad(event, enabledDyads);
    if (!dyad) continue;

    const seed = nearestSeed(
      event.lat,
      event.lng,
      seeds.filter((s) => s.dyad === dyad),
      CHINA_SEED_MATCH_DEG,
    );
    const id = `live-ct-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    const intensity = intensityFromEvent(event);

    if (seed) {
      out.push(
        withProvenance(
          {
            ...seed,
            id,
            lat: event.lat,
            lng: event.lng,
            titleKo: title || seed.titleKo,
            titleEn: title || seed.titleEn,
            sourceUrl: seed.sourceUrl ?? event.sourceUrl ?? undefined,
            intensity: Math.max(seed.intensity * 0.65, intensity),
          },
          {
            hadSeedMatch: true,
            seedSourceUrl: seed.sourceUrl,
            gdeltSourceUrl: event.sourceUrl,
          },
        ),
      );
      continue;
    }

    out.push(
      withProvenance(
        {
          id,
          dyad,
          sea: defaultSeaForDyad(dyad),
          lat: event.lat,
          lng: event.lng,
          titleKo: title || "동아시아 대치·충돌 (GDELT)",
          titleEn: title || "East Asia standoff (GDELT)",
          bodyKo: "GDELT 속보 매칭 — 큐레이션 앵커 없음",
          bodyEn: "GDELT headline match — no curated anchor",
          sourceUrl: event.sourceUrl ?? undefined,
          intensity,
        },
        { hadSeedMatch: false, gdeltSourceUrl: event.sourceUrl },
      ),
    );
  }

  if (out.length > 0) return out;
  return chinaSeedFallback(enabledDyads);
}

export function activateKoreaMissileIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): (KoreaMissileIncident & ProvenanceFields)[] {
  const out: (KoreaMissileIncident & ProvenanceFields)[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = eventText(event);
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
    out.push(
      withProvenance(
        {
          ...seed,
          id,
          lat: event.lat,
          lng: event.lng,
          titleKo: title || seed.titleKo,
          titleEn: title || seed.titleEn,
          intensity: Math.max(seed.intensity * 0.65, intensityFromEvent(event)),
        },
        { hadSeedMatch: true, seedSourceUrl: null, gdeltSourceUrl: event.sourceUrl },
      ),
    );
  }

  if (out.length > 0) return out;
  return koreaSeedFallback();
}

function russiaStrikeFallback(): (RussiaStrikeIncident & ProvenanceFields)[] {
  return RUSSIA_STRIKE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, RUSSIA_STRIKE_FALLBACK_MAX)
    .map((seed) =>
      withProvenance(
        {
          ...seed,
          id: `seed-ru-${seed.id}`,
          intensity: Math.max(0.35, seed.intensity * 0.55),
        },
        { hadSeedMatch: true, seedSourceUrl: null, gdeltSourceUrl: null },
      ),
    );
}

export function activateRussiaStrikeIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): (RussiaStrikeIncident & ProvenanceFields)[] {
  const out: (RussiaStrikeIncident & ProvenanceFields)[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = eventText(event);
    if (!STRIKE_EVENT_RE.test(text)) continue;
    if (!RUSSIA_TARGET_RE.test(text)) continue;

    const seed = nearestSeed(
      event.lat,
      event.lng,
      RUSSIA_STRIKE_INCIDENTS,
      RUSSIA_STRIKE_MATCH_DEG,
    );
    const id = `live-ru-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    const intensity = Math.max(0.55, intensityFromEvent(event));

    if (seed) {
      out.push(
        withProvenance(
          {
            ...seed,
            id,
            lat: event.lat,
            lng: event.lng,
            titleKo: title || seed.titleKo,
            titleEn: title || seed.titleEn,
            intensity: Math.max(seed.intensity * 0.65, intensity),
          },
          { hadSeedMatch: true, seedSourceUrl: null, gdeltSourceUrl: event.sourceUrl },
        ),
      );
      continue;
    }

    out.push(
      withProvenance(
        {
          id,
          kind: "drone",
          lat: event.lat,
          lng: event.lng,
          titleKo: title || "러시아 표적 타격 보도 (GDELT)",
          titleEn: title || "Russia-target strike report (GDELT)",
          bodyKo: "GDELT 속보 매칭 — 큐레이션 앵커 없음",
          bodyEn: "GDELT headline match — no curated anchor",
          intensity,
        },
        { hadSeedMatch: false, gdeltSourceUrl: event.sourceUrl },
      ),
    );
  }

  if (out.length > 0) return out;
  return russiaStrikeFallback();
}

function europeDroneFallback(): (EuropeDroneIncident & ProvenanceFields)[] {
  return EUROPE_DRONE_INCIDENTS.slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, EUROPE_DRONE_FALLBACK_MAX)
    .map((seed) =>
      withProvenance(
        {
          ...seed,
          id: `seed-ed-${seed.id}`,
          intensity: Math.max(0.35, seed.intensity * 0.55),
        },
        { hadSeedMatch: true, seedSourceUrl: seed.sourceUrl, gdeltSourceUrl: null },
      ),
    );
}

export function activateEuropeDroneIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): (EuropeDroneIncident & ProvenanceFields)[] {
  const out: (EuropeDroneIncident & ProvenanceFields)[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = eventText(event);
    if (!DRONE_AIRSPACE_EVENT_RE.test(text)) continue;
    if (!EUROPE_NATO_TARGET_RE.test(text)) continue;

    const seed = nearestSeed(
      event.lat,
      event.lng,
      EUROPE_DRONE_INCIDENTS,
      EUROPE_DRONE_SEED_MATCH_DEG,
    );
    const id = `live-ed-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    const intensity = intensityFromEvent(event);

    if (seed) {
      out.push(
        withProvenance(
          {
            ...seed,
            id,
            lat: event.lat,
            lng: event.lng,
            titleKo: title || seed.titleKo,
            titleEn: title || seed.titleEn,
            intensity: Math.max(seed.intensity * 0.65, intensity),
          },
          {
            hadSeedMatch: true,
            seedSourceUrl: seed.sourceUrl,
            gdeltSourceUrl: event.sourceUrl,
          },
        ),
      );
      continue;
    }

    out.push(
      withProvenance(
        {
          id,
          kind: "airport-disruption",
          lat: event.lat,
          lng: event.lng,
          titleKo: title || "유럽·나토 영공 드론 (GDELT)",
          titleEn: title || "Europe/NATO airspace drone (GDELT)",
          bodyKo: "GDELT 속보 매칭 — 큐레이션 앵커 없음",
          bodyEn: "GDELT headline match — no curated anchor",
          intensity,
        },
        { hadSeedMatch: false, gdeltSourceUrl: event.sourceUrl },
      ),
    );
  }

  if (out.length > 0) return out;
  return europeDroneFallback();
}

export function isFreshNewfeedsAttack(
  attack: { publishedAt?: string | null },
  now = Date.now(),
): boolean {
  if (!attack.publishedAt) return false;
  const t = Date.parse(attack.publishedAt);
  if (!Number.isFinite(t)) return false;
  return now - t <= FRESH_EVENT_HOURS * 60 * 60 * 1000;
}
