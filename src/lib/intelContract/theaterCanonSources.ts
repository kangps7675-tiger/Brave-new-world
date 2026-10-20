/**
 * 전장별 정본(공개) 채널 — 전량 수집이 아니라 데스크가 기대하는 소수 소스.
 * 비밀·준대외비 흉내 금지. 이미 제품에 있는 공개 OSINT만 적는다.
 */

import type { ObservationModality } from "@/lib/intelContract/types";
import type { ConflictTheater } from "@/lib/conflictEvents/types";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";

export type CanonChannel = {
  id: string;
  modality: Extract<
    ObservationModality,
    "official" | "sensor" | "media" | "alert" | "stat"
  >;
  nameKo: string;
  nameEn: string;
  /** 제품 내 레이어/파이프 힌트 */
  productHint: string;
};

export type TheaterCanon = {
  theaterId: string;
  titleKo: string;
  titleEn: string;
  windowHours: number;
  channels: CanonChannel[];
};

const UKRAINE: TheaterCanon = {
  theaterId: "ukraine",
  titleKo: "우크라 전장",
  titleEn: "Ukraine theater",
  windowHours: 72,
  channels: [
    {
      id: "liveuamap-ukraine",
      modality: "sensor",
      nameKo: "Liveuamap (우크라)",
      nameEn: "Liveuamap (Ukraine)",
      productHint: "liveuamap / theater sitrep",
    },
    {
      id: "firms-ukraine",
      modality: "sensor",
      nameKo: "NASA FIRMS 열원",
      nameEn: "NASA FIRMS hotspots",
      productHint: "firms-fires",
    },
    {
      id: "rss-ukraine",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream / conflict-events",
    },
    {
      id: "gdelt-ukraine",
      modality: "stat",
      nameKo: "GDELT 이벤트",
      nameEn: "GDELT events",
      productHint: "conflict-events gdelt",
    },
  ],
};

const IRAN: TheaterCanon = {
  theaterId: "iran",
  titleKo: "이란·페르시아만",
  titleEn: "Iran–Persian Gulf",
  windowHours: 72,
  channels: [
    {
      id: "liveuamap-iran",
      modality: "sensor",
      nameKo: "Liveuamap (이란)",
      nameEn: "Liveuamap (Iran)",
      productHint: "liveuamap / theater sitrep",
    },
    {
      id: "ukmto-gulf",
      modality: "alert",
      nameKo: "UKMTO·항행 경보",
      nameEn: "UKMTO / NAV warnings",
      productHint: "cesium alerts / ukmto",
    },
    {
      id: "rss-iran",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream",
    },
    {
      id: "ais-hormuz",
      modality: "stat",
      nameKo: "AIS·초크포인트 통항",
      nameEn: "AIS / chokepoint traffic",
      productHint: "portwatch / ais",
    },
  ],
};

const YEMEN: TheaterCanon = {
  theaterId: "yemen",
  titleKo: "홍해·예멘",
  titleEn: "Red Sea–Yemen",
  windowHours: 72,
  channels: [
    {
      id: "liveuamap-yemen",
      modality: "sensor",
      nameKo: "Liveuamap (예멘)",
      nameEn: "Liveuamap (Yemen)",
      productHint: "liveuamap / theater sitrep",
    },
    {
      id: "ukmto-redsea",
      modality: "alert",
      nameKo: "UKMTO·홍해 경보",
      nameEn: "UKMTO Red Sea alerts",
      productHint: "cesium alerts / ukmto",
    },
    {
      id: "rss-yemen",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream",
    },
  ],
};

const TAIWAN: TheaterCanon = {
  theaterId: "taiwan",
  titleKo: "대만 해협",
  titleEn: "Taiwan Strait",
  windowHours: 72,
  channels: [
    {
      id: "rss-taiwan",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream / conflict-events",
    },
    {
      id: "gdelt-taiwan",
      modality: "stat",
      nameKo: "GDELT 이벤트",
      nameEn: "GDELT events",
      productHint: "conflict-events gdelt",
    },
    {
      id: "adsb-eastasia",
      modality: "sensor",
      nameKo: "ADS-B 항적 (동아시아)",
      nameEn: "ADS-B tracks (East Asia)",
      productHint: "adsb-mil / adsb-traffic",
    },
  ],
};

const KOREA: TheaterCanon = {
  theaterId: "korea",
  titleKo: "한반도",
  titleEn: "Korean Peninsula",
  windowHours: 72,
  channels: [
    {
      id: "rss-korea",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream / korea-missile",
    },
    {
      id: "gdelt-korea",
      modality: "stat",
      nameKo: "GDELT·미사일 사건",
      nameEn: "GDELT / missile incidents",
      productHint: "conflict-events / korea-missile",
    },
    {
      id: "firms-korea",
      modality: "sensor",
      nameKo: "NASA FIRMS (참고)",
      nameEn: "NASA FIRMS (reference)",
      productHint: "firms-fires",
    },
  ],
};

const SYRIA: TheaterCanon = {
  theaterId: "syria",
  titleKo: "시리아·이라크 축",
  titleEn: "Syria–Iraq axis",
  windowHours: 72,
  channels: [
    {
      id: "rss-syria",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream / conflict-events",
    },
    {
      id: "firms-syria",
      modality: "sensor",
      nameKo: "NASA FIRMS 열원",
      nameEn: "NASA FIRMS hotspots",
      productHint: "firms-fires",
    },
    {
      id: "gdelt-syria",
      modality: "stat",
      nameKo: "GDELT 이벤트",
      nameEn: "GDELT events",
      productHint: "conflict-events gdelt",
    },
  ],
};

const LEBANON: TheaterCanon = {
  theaterId: "lebanon",
  titleKo: "레바논·이스라엘 접경",
  titleEn: "Lebanon–Israel border",
  windowHours: 72,
  channels: [
    {
      id: "rss-lebanon",
      modality: "media",
      nameKo: "Tier-1 보도 (RSS)",
      nameEn: "Tier-1 press (RSS)",
      productHint: "news-stream / conflict-events",
    },
    {
      id: "gdelt-lebanon",
      modality: "stat",
      nameKo: "GDELT 이벤트",
      nameEn: "GDELT events",
      productHint: "conflict-events gdelt",
    },
  ],
};

/** sitrep 프로토타입 지역 + conflict-events 전장 정본 */
export const THEATER_CANON: TheaterCanon[] = [
  UKRAINE,
  IRAN,
  YEMEN,
  TAIWAN,
  KOREA,
  SYRIA,
  LEBANON,
];

const BY_ID = new Map(THEATER_CANON.map((c) => [c.theaterId, c]));

export function canonForTheater(
  theaterId: string | null | undefined,
): TheaterCanon | null {
  if (!theaterId) return null;
  return BY_ID.get(theaterId) ?? null;
}

export function canonForSitrepRegion(
  region: TheaterSitrepRegionId,
): TheaterCanon | null {
  return canonForTheater(region);
}

export function canonForConflictTheater(
  theater: ConflictTheater | null | undefined,
): TheaterCanon | null {
  return canonForTheater(theater ?? null);
}

/** 정본이 기대하는 modality 집합 */
export function canonExpectedModalities(
  canon: TheaterCanon,
): Set<ObservationModality> {
  return new Set(canon.channels.map((c) => c.modality));
}

/** 현재 확보 modality 대비 정본 빈칸 */
export function canonGaps(
  canon: TheaterCanon,
  present: Iterable<string>,
): CanonChannel[] {
  const have = new Set(present);
  const seenMod = new Set<string>();
  const gaps: CanonChannel[] = [];
  for (const ch of canon.channels) {
    if (have.has(ch.modality)) continue;
    if (seenMod.has(ch.modality)) continue;
    seenMod.add(ch.modality);
    gaps.push(ch);
  }
  return gaps;
}

export function formatCanonGapNote(
  gaps: CanonChannel[],
  lang: "ko" | "en",
): string | null {
  if (gaps.length === 0) return null;
  const names = gaps
    .slice(0, 3)
    .map((g) => (lang === "en" ? g.nameEn : g.nameKo));
  if (lang === "en") {
    return `Still thin on: ${names.join(" · ")}`;
  }
  return `아직 비어 있음: ${names.join(" · ")}`;
}
