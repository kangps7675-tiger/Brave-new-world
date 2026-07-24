import type { EconomyNewsGenre } from "@/lib/news/economyGenres";

export type NewsTheater =
  | "middle-east"
  | "russia-ukraine"
  | "china-taiwan"
  | "korea"
  | "japan"
  | "south-asia"
  | "southeast-asia"
  | "south-america"
  | "africa"
  | "arctic"
  | "atlantic"
  | "global";

export type MediaTrustTier = 1 | 2 | 3;

export type HeroStatus = "confirmed" | "breaking" | "unverified";

/** 내부 1~10 눈금 → 유저 S/A/B */
export type BreakingUiRank = "S" | "A" | "B";

export type NewsFeedTopic = "defense" | "economy";

export type { EconomyNewsGenre, EconomyGenreFilter } from "@/lib/news/economyGenres";

export type NewsStreamItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publisher?: string;
  pubDate: string;
  theater: NewsTheater;
  trustTier: MediaTrustTier;
  /** RSS 카테고리 */
  category?: string;
  /** feedCatalog defense | economy */
  feedTopic?: NewsFeedTopic;
  /** 경제 뉴스 장르 (geo-trader) */
  econGenre?: EconomyNewsGenre;
  imageUrl?: string;
  summary?: string;
};

export type HeroBreakingItem = NewsStreamItem & {
  heroStatus: HeroStatus;
  /** grade × 10 — 정렬·하위 호환 */
  urgencyScore: number;
  /** 내부 1~10 */
  breakingGrade: number;
  /** S=SOS · A=배너 · B=시트만 */
  breakingRank: BreakingUiRank;
  ageMinutes: number;
  clusterId?: string;
};

export type NewsStreamPayload = {
  fetchedAt: string;
  hero: HeroBreakingItem | null;
  verified: NewsStreamItem[];
  stateMedia: NewsStreamItem[];
  stats: {
    total: number;
    tier1: number;
    tier2: number;
    tier3: number;
    economy?: number;
    theaters: Record<NewsTheater, number>;
    genres?: Partial<Record<EconomyNewsGenre, number>>;
  };
  error?: string;
};
