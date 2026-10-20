/** 로컬 관심 신호 · 프로필 — 로그인 후 계정 문서로 동일 스키마 이전 가능 */

export const INTEREST_STORAGE_KEY = "geowatch-interest-v1";
export const INTEREST_EVENTS_MAX = 200;
export const INTEREST_BUCKETS_MAX = 40;

export type InterestKind =
  | "theater"
  | "theme"
  | "entity"
  | "mode"
  | "symbol"
  | "news";

export type InterestSignal = {
  kind: InterestKind;
  id: string;
  /** UI 표시용 (없으면 id) */
  label?: string;
  weight?: number;
  at: number;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type InterestState = {
  v: 1;
  events: InterestSignal[];
  updatedAt: number;
};

export type InterestBucket = {
  kind: InterestKind;
  id: string;
  label?: string;
  score: number;
  count: number;
  lastAt: number;
};

export type InterestProfile = {
  buckets: InterestBucket[];
  topTheaters: InterestBucket[];
  topThemes: InterestBucket[];
  topSymbols: InterestBucket[];
  eventCount: number;
};

export type InterestRecommendAction =
  | { type: "fly-theater"; theater: string }
  | { type: "enable-layer"; layerKey: string }
  | { type: "open-sheet"; theater?: string }
  | { type: "noop" };

export type InterestRecommendChip = {
  id: string;
  kind: InterestKind;
  labelKo: string;
  labelEn: string;
  score: number;
  action: InterestRecommendAction;
};
