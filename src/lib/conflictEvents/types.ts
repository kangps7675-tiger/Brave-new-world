import type { HeroStatus, MediaTrustTier } from "@/lib/news/types";

/** 통합 전장 이벤트 카테고리 — 레이어 아이콘 축 */
export type ConflictEventCategory =
  | "airstrike"
  | "missile"
  | "drone"
  | "clash"
  | "explosion"
  | "incursion";

/** 레이어는 하나, 칩으로 좁히는 전장 — 서→동 대단층선 + 활성 전장 */
export type ConflictTheater =
  | "ukraine"
  | "iran"
  | "lebanon"
  | "syria"
  | "taiwan"
  | "korea"
  | "kuril"
  | "baltic"
  | "black-sea"
  | "japan"
  | "caucasus"
  | "central-asia"
  | "south-china-sea";

export type ConflictConfidence = "single-source" | "corroborated" | "high-confidence";

export type ConflictEventSource = {
  id: string;
  name: string;
  url: string | null;
  title: string;
  occurredAt: string | null;
  trustTier?: MediaTrustTier | null;
  heroStatus?: HeroStatus | null;
  channel: "rss" | "gdelt" | "newfeeds" | "llm";
};

/**
 * Phase 0 산출물 — NewfeedsAttackRaw 와 나란히 두되 병합하지 않음.
 * 좌표는 지명 매칭(또는 LLM이 gazetteer id 를 고른 경우)에만 채운다.
 */
export type RawConflictEvent = {
  id: string;
  title: string;
  snippet: string;
  sourceName: string;
  sourceUrl: string | null;
  occurredAt: string | null;
  category: ConflictEventCategory | "unknown";
  keywords: string[];
  theater: ConflictTheater | null;
  lat: number | null;
  lng: number | null;
  matchedPlaceId: string | null;
  extraction: "gazetteer" | "llm" | "gdelt" | "newfeeds";
  trustTier?: MediaTrustTier | null;
  heroStatus?: HeroStatus | null;
  channel: ConflictEventSource["channel"];
};

export type ConflictEventCluster = {
  clusterId: string;
  lat: number;
  lng: number;
  category: ConflictEventCategory | "unknown";
  theater: ConflictTheater | null;
  keywords: string[];
  title: string;
  snippet: string;
  sources: ConflictEventSource[];
  firstSeenAt: string;
  lastConfirmedAt: string;
  confidence: ConflictConfidence;
  trustTier: MediaTrustTier;
  heroStatus: HeroStatus;
  matchedPlaceId: string | null;
};

export type ClusterThresholds = {
  geohashPrecision: number;
  maxDistanceKm: number;
  maxTimeDiffMs: number;
  minJaccard: number;
};
