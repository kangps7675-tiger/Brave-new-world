export const STRAIT_IDS = ["hormuz", "red_sea_suez", "malacca"] as const;
export type StraitId = (typeof STRAIT_IDS)[number];

export const EVENT_KINDS = [
  "attack",
  "seizure",
  "closure",
  "accident",
  "sanction",
  "drill",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const TRAFFIC_HORIZONS = ["D+1", "D+5", "D+14"] as const;
export const PRICE_HORIZONS = ["D+1", "D+5"] as const;
export type OutcomeHorizon =
  | (typeof TRAFFIC_HORIZONS)[number]
  | (typeof PRICE_HORIZONS)[number];

export type SourceUrl = {
  label: string;
  url: string;
  publisher: string;
};

export type StraitEvent = {
  id: string;
  straitId: StraitId;
  occurredOn: string;
  lat: number;
  lng: number;
  titleKo: string;
  titleEn: string;
  kind: EventKind;
  sourceUrls: SourceUrl[];
  curatedBy: "human" | "gdelt";
  reviewed: boolean;
  isSynthetic: boolean;
  baselineWindowDays: number;
};

export type TrafficDay = {
  straitId: StraitId;
  date: string;
  vesselCount: number;
  tankerCount?: number | null;
  capacityDwt?: number | null;
  sourceVintage: string;
};

export type OutcomeRow = {
  eventId: string;
  metric: string;
  horizon: OutcomeHorizon;
  baselineValue: number | null;
  observedValue: number | null;
  deltaPct: number | null;
  sampleNote: string | null;
};

export type OutcomeDistribution = {
  metric: string;
  horizon: OutcomeHorizon;
  sampleSize: number;
  /** 표본 < 5 이면 null — UI는 "표본 부족"만 */
  min: number | null;
  median: number | null;
  max: number | null;
  points: number[];
  insufficient: boolean;
};

export type StraitReplayAttribution = {
  id: string;
  label: string;
  url: string;
  note: string;
};

export type StraitReplayResponse = {
  straitId: StraitId;
  event: StraitEvent | null;
  similarEvents: StraitEvent[];
  outcomes: OutcomeRow[];
  distributions: OutcomeDistribution[];
  trafficSeries: Array<{ date: string; vesselCount: number; eventId?: string }>;
  sampleSize: number;
  isSynthetic: boolean;
  dataThrough: string | null;
  lastEventOn: string | null;
  calmNote: boolean;
  attributions: StraitReplayAttribution[];
  emptyReason: string | null;
};
