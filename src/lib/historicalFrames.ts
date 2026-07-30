/**
 * R2 day-frame 계약 — 다음 트렌치(AIS/FIRMS 등 원시 점 재생)용 SSOT.
 *
 * 이번 제품 슬라이스에서는 **타입·경로·재생 가능 여부만** 고정한다.
 * live D1 테이블(기본 48h prune)을 히스토리 원본으로 쓰지 말 것.
 *
 * 키 규칙: `frames/{YYYY-MM-DD}/{layerId}.json`
 * 예: `frames/2026-07-20/firms-fires.json`
 */

import type { EvidenceTier } from "@/lib/evidenceTier";

export const HISTORICAL_FRAME_PREFIX = "frames";

/** 일별 랭크/모델 계열 — 현재 제품에서 asOf 스크럽 가능 */
export const REPLAYABLE_RANK_LAYER_IDS = [
  "daily-ranks",
  "logistics-risk",
  "world-tension",
] as const;

export type HistoricalFrameBbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type HistoricalFrameLayerRef = {
  layerId: string;
  /** R2 object key under DATA_BUCKET */
  objectKey: string;
  evidenceTier: EvidenceTier;
  featureCount?: number;
  bytes?: number;
};

export type HistoricalFrameManifest = {
  date: string;
  layers: HistoricalFrameLayerRef[];
  bbox?: HistoricalFrameBbox;
  retentionDays: number;
  builtAt: string;
  note?: string;
};

export function historicalFrameObjectKey(date: string, layerId: string): string {
  return `${HISTORICAL_FRAME_PREFIX}/${date}/${layerId}.json`;
}

/**
 * 이 asOf에 해당 레이어를 지도에서 재생할 수 있는가.
 * 1차: 일별 랭크/모델만 true. live-poll 레이어는 전부 false (가짜 과거 점 금지).
 */
export function isLayerReplayable(layerId: string, _asOf?: string | null): boolean {
  return (REPLAYABLE_RANK_LAYER_IDS as readonly string[]).includes(layerId);
}

/** 히스토리 모드에서 강제로 끄거나 재생 불가로 고지할 live prefs 키 */
export const HISTORICAL_MODE_LIVE_PREF_KEYS = [
  "showAis",
  "showDisguisedVessels",
  "showAirTraffic",
  "showFirmsFires",
  "showTelegramOsint",
  "showNeptun",
  "showGpsInterference",
  "showTzevaAdom",
  "showNewfeedsIranAttacks",
] as const;

export type HistoricalModeLivePrefKey =
  (typeof HISTORICAL_MODE_LIVE_PREF_KEYS)[number];
