/**
 * LIVEUAMAP 정규화 이벤트·피드.
 * Attribution: Liveuamap (third-party OSINT map). Respect ToS; server-side only.
 */

import type { NewsTheater } from "@/lib/news/types";

export type LiveuamapRegionId =
  | "ukraine"
  | "iran"
  | "yemen"
  | "lebanon"
  | "israel-palestine"
  | "taiwan"
  | "korea";

export type LiveuamapEvent = {
  id: string;
  regionId: LiveuamapRegionId;
  resid: number;
  theater: NewsTheater;
  lat: number;
  lng: number;
  title: string;
  body: string;
  /** 한국어 UI용 (sync 시 번역). 없으면 title 사용 */
  titleKo?: string;
  bodyKo?: string;
  imageUrl?: string;
  videoUrl?: string;
  sourceUrl: string;
  viaSource?: string;
  publishedAt: string;
  tags: string[];
};

export type LiveuamapFeedPayload = {
  fetchedAt: string;
  events: LiveuamapEvent[];
  status: "ok" | "idle" | "error";
  error?: string;
  source: "liveuamap" | "empty" | "mock";
  budget?: {
    dayUtc: string;
    used: number;
    cap: number;
  };
};

export type LiveuamapControlRegionId =
  | "ukraine"
  | "iran"
  | "yemen"
  | "lebanon";

export const LIVEUAMAP_CONTROL_REGION_IDS: LiveuamapControlRegionId[] = [
  "ukraine",
  "iran",
  "yemen",
  "lebanon",
];

export function isLiveuamapControlRegionId(
  value: string,
): value is LiveuamapControlRegionId {
  return (LIVEUAMAP_CONTROL_REGION_IDS as string[]).includes(value);
}
