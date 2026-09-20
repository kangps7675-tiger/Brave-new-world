/**
 * LIVEUAMAP 정규화 이벤트.
 * Attribution: Liveuamap (third-party OSINT map). Respect ToS; server-side only.
 */

import type { NewsTheater } from "@/lib/news/types";

export type LiveuamapEvent = {
  id: string;
  theater: NewsTheater;
  lat: number;
  lng: number;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  sourceUrl: string;
  publishedAt: string;
  tags: string[];
};

export type LiveuamapFeedPayload = {
  fetchedAt: string;
  events: LiveuamapEvent[];
  status: "ok" | "idle" | "error";
  error?: string;
  source: "liveuamap" | "empty" | "mock";
};
