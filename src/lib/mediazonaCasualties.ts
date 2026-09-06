/**
 * Mediazona × BBC — 확인 전사(하한) + CSIS 기반 부상 추정.
 * Kaggle 패널은 스냅샷 폴백; 표시 숫자는 가능하면 Mediazona 라이브.
 * 마커 UI/호버는 `@/lib/warCasualtyOverlay` 공용 (다른 전장도 동일).
 */

export {
  CASUALTY_ELEGY_LINES,
  formatCasualtyCount,
  getCasualtyOverlayScale,
} from "@/lib/warCasualtyOverlay";

export type MediazonaCasualtySnapshot = {
  confirmedNamedDeaths: number;
  confirmedNamedDeathsAsOf: string;
  confirmedNamedDeathsSource: string;
  /** CSIS 등 공개 추정 — 명의 확인이 아님 */
  estimatedWounded: number;
  estimatedWoundedAsOf: string;
  estimatedWoundedSource: string;
  panelConfirmedDeaths: number;
  panelAsOf: string;
  panelSource: string;
  panelKaggleSlug: string;
  caveat: string;
  cite: string[];
  urls: {
    mediazona: string;
    russia200: string;
    kaggle: string;
    csisNote: string;
  };
  marker: {
    lat: number;
    lng: number;
    killedLabelKo: string;
    killedLabelEn: string;
    woundedLabelKo: string;
    woundedLabelEn: string;
  };
  topRegions?: Array<{
    federal_subject: string;
    iso_3166_2: string;
    casualties_total: number;
  }>;
  builtAt?: string;
  liveScrapedAt?: string | null;
};

import { UKRAINE_CASUALTY_MARKER } from "@/lib/warCasualtyTheaters";

/** 우크라이나 전선(Donetsk 부근) — 영토 고정 좌표 */
export const MEDIAZONA_FRONT_MARKER = UKRAINE_CASUALTY_MARKER;

export const MEDIAZONA_CASUALTY_SEED: MediazonaCasualtySnapshot = {
  confirmedNamedDeaths: 230_600,
  confirmedNamedDeathsAsOf: "2026-07-03",
  confirmedNamedDeathsSource:
    "Mediazona x BBC Russian Service (en.zona.media homepage scrape)",
  estimatedWounded: 900_000,
  estimatedWoundedAsOf: "2025-12",
  estimatedWoundedSource:
    "CSIS end-2025 combat-casualty estimate (≈1.2M total; ~¼ killed) via Meduza analysis — wounded not named-confirmed",
  panelConfirmedDeaths: 210_828,
  panelAsOf: "2026-05-15",
  panelSource:
    "matthewdegtyar/russia-mediazona-casualties-bonuses-panel-0526 (russia_regional_casualties_may_2026.csv)",
  panelKaggleSlug: "matthewdegtyar/russia-mediazona-casualties-bonuses-panel-0526",
  caveat:
    "Named deaths are a lower bound. Wounded figures are estimates only (no public named WIA list).",
  cite: [
    "Mediazona",
    "BBC Russian Service",
    "CSIS",
    "Meduza",
    "gogov.ru",
    "Rosstat",
    "GADM",
  ],
  urls: {
    mediazona: "https://en.zona.media/article/2026/07/03/casualties_eng-trl",
    russia200: "https://200.zona.media/",
    kaggle:
      "https://www.kaggle.com/datasets/matthewdegtyar/russia-mediazona-casualties-bonuses-panel-0526",
    csisNote:
      "https://meduza.io/en/feature/2026/01/29/russia-s-military-losses-in-ukraine-surpass-any-major-power-since-wwii-yet-re-deployed-wounded-obscure-the-true-toll",
  },
  marker: {
    ...MEDIAZONA_FRONT_MARKER,
    killedLabelKo: "확인 전사",
    killedLabelEn: "Named deaths (lower bound)",
    woundedLabelKo: "추정 부상",
    woundedLabelEn: "Estimated WIA",
  },
};

export function parseMediazonaHomepageCount(html: string): number | null {
  const patterns = [
    /(\d{1,3}(?:,\d{3})+)\s*deaths?\s+confirmed/i,
    /deaths?\s+confirmed[^\d]{0,40}(\d{1,3}(?:,\d{3})+)/i,
    /RECORDED\s+NAMES?\s+COUNT[^\d]{0,20}(\d{1,3}(?:,\d{3})+)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 50_000 && n < 2_000_000) return n;
  }
  return null;
}
