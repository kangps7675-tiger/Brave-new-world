import type { ConflictConfidence } from "@/lib/conflictEvents/types";
import type { ChokepointId } from "@/lib/news/chokepointNews";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { MediaTrustTier, NewsTheater } from "@/lib/news/types";

/** geo = 지정학, econ = 지경학 */
export type MacroDomain = "geo" | "econ";

export type MacroThemeKind = "theater" | "choke" | "econ";

/** 고정 거시 테마 ID — AI가 발명하지 않음 */
export type MacroThemeId =
  | `theater:${NewsTheater}`
  | `choke:${ChokepointId}`
  | `econ:${EconomyNewsGenre}`;

export type MacroTrustBadge = ConflictConfidence;

/** GDELT 밀도 배지 — 매체 신뢰와 혼동 금지 */
export type MacroDensityBadge = "none" | "elevated" | "high" | "surge";

export type MacroSourceLink = {
  title: string;
  url: string;
  source: string;
  trustTier: MediaTrustTier | null;
};

export type MacroStepKind = "rss-catalyst" | "rss-cluster" | "gdelt-density";

export type MacroCameraHint = {
  lat: number;
  lng: number;
  altitude: number;
  theater?: NewsTheater;
  chokepointId?: ChokepointId;
  /** 관련 레이어 힌트 — 클라이언트가 prefs에 반영 */
  layerHints?: Array<"conflictEvents" | "gdelt" | "chokepoint">;
};

export type MacroStep = {
  id: string;
  kind: MacroStepKind;
  /** 초보자용 한두 문장 — RSS 있을 때만 스토리; GDELT만이면 밀도 고지 */
  body: string;
  /** 원 헤드라인(있을 때) */
  headline: string | null;
  sources: MacroSourceLink[];
  trustBadge: MacroTrustBadge | null;
  densityBadge: MacroDensityBadge | null;
  camera: MacroCameraHint | null;
};

export type MacroTopic = {
  id: MacroThemeId;
  kind: MacroThemeKind;
  domain: MacroDomain;
  title: string;
  heat: number;
  rssIndependentSources: number;
  gdeltEventCount24h: number;
  trustBadge: MacroTrustBadge | null;
  densityBadge: MacroDensityBadge;
  /** 「독립 매체 N · GDELT 이벤트 M」 */
  heatLabel: string;
  steps: MacroStep[];
  camera: MacroCameraHint | null;
  /** 이 트리거와 연관된 관측 심볼 (유가·가스·VIX·금 등) */
  marketSymbols: string[];
  /** 왜 이 심볼인지 — 해석용 면책 포함 */
  marketNote: string;
  /** /api/stock-tickers/reaction theater */
  marketTheater: string;
  /** logistics chokepoint id (choke-hormuz …) or null */
  marketChokepointId: string | null;
  /** 촉매 RSS 경과 분 — reaction 앵커 (없으면 null) */
  marketAgeMinutes: number | null;
};

export type MacroBriefingPayload = {
  generatedAt: string;
  domain: MacroDomain;
  lang: LabelLanguage;
  topics: MacroTopic[];
  sources: {
    news: "memory" | "d1" | "live" | "empty";
    gdelt: "d1" | "ingest-worker" | "live" | "empty";
  };
  error?: string;
};

export type MacroRssInputItem = {
  id: string;
  title: string;
  /** 한국어 제목 — KO UI에서 우선 */
  titleKo?: string;
  link: string;
  source: string;
  publisher?: string;
  pubDate: string;
  theater: NewsTheater;
  trustTier: MediaTrustTier;
  feedTopic?: "defense" | "economy";
  econGenre?: EconomyNewsGenre;
  summary?: string;
  /** 한국어 요약 — KO UI에서 우선 */
  bodyKo?: string;
  urgencyScore?: number;
  breakingGrade?: number;
  ageMinutes?: number;
};

export type MacroGdeltInputEvent = {
  id: string;
  lat: number;
  lng: number;
  title: string | null;
  sourceUrl: string | null;
  eventTier?: string | null;
  tensionScore?: number;
  importanceGrade?: string;
  createdAt?: string | null;
  eventDate?: string | null;
};
