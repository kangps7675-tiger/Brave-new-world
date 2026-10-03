import type { LiveuamapRegionId } from "@/lib/liveuamap/types";

/** 국소 프로토타입에서 여는 전황 */
export type TheaterSitrepRegionId = Extract<
  LiveuamapRegionId,
  "ukraine" | "iran" | "yemen"
>;

export const THEATER_SITREP_REGIONS: TheaterSitrepRegionId[] = [
  "ukraine",
  "iran",
  "yemen",
];

export type TheaterSitrepMode = "liveua+rss" | "rss-brief" | "empty";

export type SitrepRssRef = {
  id: string;
  title: string;
  sourceName: string;
  url: string;
  occurredAt: string | null;
  trustTier: 1;
  link: "row" | "theater";
};

export type TheaterSitrepRow = {
  id: string;
  occurredAt: string;
  place: string;
  kind: "drone" | "missile" | "ground" | "other";
  killed: number | null;
  wounded: number | null;
  materialDamage: string | null;
  title: string;
  sourceUrl: string;
  imageUrl: string | null;
  viaSource: string | null;
  /** Tier 1 RSS soft-join (참고만 — 수치 칸에 쓰지 않음) */
  rssRefs?: SitrepRssRef[];
};

export type TheaterSitrepPhoto = {
  id: string;
  imageUrl: string;
  caption: string;
  sourceUrl: string;
  occurredAt: string;
};

export type TheaterSitrepDoc = {
  regionId: TheaterSitrepRegionId;
  mode: TheaterSitrepMode;
  windowHours: number;
  generatedAt: string;
  titleKo: string;
  titleEn: string;
  rows: TheaterSitrepRow[];
  photos: TheaterSitrepPhoto[];
  /** 행에 안 묶인 Tier 1 참고 */
  rssTheaterRefs: SitrepRssRef[];
  attribution: string;
  /** 게이트 요약 — UI에 그대로 노출 */
  coverageNoteKo: string;
  coverageNoteEn: string;
};
