/**
 * 북한 미사일 과거 내역 카드.
 * 세슘 지도에는 최신만 두고, 이 목록은 과거 내역 창에서 고른다.
 */

import { KOREA_MISSILE_LAUNCHES } from "@/data/koreaMissileLaunchesSeed";
import { MISSILE_EVENTS } from "@/data/missileReports";
import {
  ballisticArcSamples,
  type BallisticArcSample,
} from "@/lib/cesiumMissileLaunches";

export type NkMissileHistoryCard = {
  id: string;
  date: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  kind: string;
  lat: number;
  lng: number;
  sourceUrl: string | null;
  missileEventId?: string;
  landing?: { lat: number; lng: number; label: string };
};

/** 특정 시험 문서가 있는 것만. 나머지는 발사 연표 참고 문서. */
const SPECIFIC_SOURCE: Record<string, string> = {
  "nk-launch-1998-taepodong1": "https://en.wikipedia.org/wiki/Taepodong-1",
  "nk-launch-2006-nodong":
    "https://en.wikipedia.org/wiki/2006_North_Korean_missile_test",
  "nk-launch-2009-unha2": "https://en.wikipedia.org/wiki/Kwangmy%C5%8Fngs%C5%8Fng-2",
  "nk-launch-2012-unha3":
    "https://en.wikipedia.org/wiki/Kwangmy%C5%8Fngs%C5%8Fng-3_Unit_2",
  "nk-launch-2016-musudan": "https://en.wikipedia.org/wiki/Hwasong-10",
  "nk-launch-2017-hwaseong14": "https://en.wikipedia.org/wiki/Hwasong-14",
  "nk-launch-2017-hwaseong15": "https://en.wikipedia.org/wiki/Hwasong-15",
  "nk-launch-2019-kn23": "https://en.wikipedia.org/wiki/KN-23",
  "nk-launch-2022-hwaseong17": "https://en.wikipedia.org/wiki/Hwasong-17",
  "nk-launch-2023-hwaseong18": "https://en.wikipedia.org/wiki/Hwasong-18",
  "nk-launch-2023-malligyong": "https://en.wikipedia.org/wiki/Malligyong-1",
};

const CHRONICLE_SOURCE =
  "https://en.wikipedia.org/wiki/List_of_North_Korean_missile_tests";

export function buildNkMissileHistoryCards(): NkMissileHistoryCard[] {
  const fromEvents: NkMissileHistoryCard[] = MISSILE_EVENTS.map((event) => {
    const launchReport = event.reports.find((report) => report.launch);
    const landingReport = event.reports.find((report) => report.landing);
    const launch = launchReport?.launch;
    const landing = landingReport?.landing;
    const source =
      event.reports.find((report) => report.agency === "jcs")?.sourceUrl ??
      event.reports[0]?.sourceUrl ??
      null;
    return {
      id: event.id,
      date: event.date,
      titleKo: event.title,
      titleEn: event.title,
      bodyKo: launchReport?.summary ?? event.reports[0]?.summary ?? "",
      bodyEn: landingReport?.summary ?? launchReport?.summary ?? "",
      kind: "ballistic",
      lat: launch?.coordinates[1] ?? 39.05,
      lng: launch?.coordinates[0] ?? 125.75,
      sourceUrl: source,
      missileEventId: event.id,
      landing: landing
        ? {
            lat: landing.coordinates[1],
            lng: landing.coordinates[0],
            label: landing.label,
          }
        : undefined,
    };
  });

  const fromSeed: NkMissileHistoryCard[] = KOREA_MISSILE_LAUNCHES.map((launch) => ({
    id: launch.id,
    date: launch.launchedAt,
    titleKo: launch.titleKo,
    titleEn: launch.titleEn,
    bodyKo: launch.bodyKo,
    bodyEn: launch.bodyEn,
    kind: launch.kind,
    lat: launch.lat,
    lng: launch.lng,
    sourceUrl: SPECIFIC_SOURCE[launch.id] ?? CHRONICLE_SOURCE,
  }));

  return [...fromEvents, ...fromSeed].sort((a, b) => b.date.localeCompare(a.date));
}

export function matchNkMissileHistoryCard(
  cards: NkMissileHistoryCard[],
  title: string,
  pubDate?: string,
): NkMissileHistoryCard | null {
  const day = pubDate?.slice(0, 10);
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const exact = cards.find((card) => card.date === day);
    if (exact) return exact;
    const stamp = Date.parse(`${day}T00:00:00Z`);
    const near = cards.find((card) => {
      const cardStamp = Date.parse(`${card.date}T00:00:00Z`);
      return Number.isFinite(cardStamp) && Math.abs(cardStamp - stamp) <= 2 * 86_400_000;
    });
    if (near) return near;
  }
  const compact = title.replace(/\s+/g, "");
  const hit = cards.find((card) => {
    const key = card.titleKo.replace(/\s*\(\d{4}\)\s*$/, "").replace(/\s+/g, "");
    return key.length >= 4 && compact.includes(key);
  });
  return hit ?? null;
}

/** 기사만 있고 검토된 궤적이 없을 때 — 평양 권역에서 동해 방향 개략선. */
export function syntheticMissileCard(input: {
  id: string;
  title: string;
  pubDate?: string;
  sourceUrl: string;
}): NkMissileHistoryCard {
  const day = input.pubDate?.slice(0, 10);
  return {
    id: input.id,
    date: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "",
    titleKo: input.title,
    titleEn: input.title,
    bodyKo: "발표 좌표가 없어 평양 권역에서 동해 방향으로 개략 궤적만 그립니다.",
    bodyEn: "No published coordinates — illustrative arc from the Pyongyang area toward the East Sea.",
    kind: "ballistic",
    lat: 39.2,
    lng: 125.67,
    sourceUrl: input.sourceUrl,
  };
}

export function historyArcSamples(card: NkMissileHistoryCard): BallisticArcSample[] {
  if (!card.landing) return ballisticArcSamples(card.lat, card.lng, card.kind);
  const steps = 28;
  const apexM = 90_000;
  const samples: BallisticArcSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    samples.push({
      lng: card.lng + (card.landing.lng - card.lng) * t,
      lat: card.lat + (card.landing.lat - card.lat) * t,
      heightM: 4 * apexM * t * (1 - t),
    });
  }
  return samples;
}
