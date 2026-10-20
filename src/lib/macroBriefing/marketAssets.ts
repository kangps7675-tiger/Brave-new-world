/**
 * 거시 테마 → 관측용 시장 심볼 (해석용 · 투자 권유 아님).
 * 기존 THEATER_ASSETS_ECONOMY · CHOKEPOINT_PREFERRED_SYMBOLS 재사용.
 */

import {
  CHOKEPOINT_PREFERRED_SYMBOLS,
  type LogisticsChokepointId,
} from "@/data/majorEventTimeline";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ChokepointId } from "@/lib/news/chokepointNews";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import type { NewsTheater } from "@/lib/news/types";
import {
  theaterAssetNote,
  theaterPrimarySymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";
import { parseMacroThemeId } from "./themes";
import type { MacroThemeId } from "./types";

const MAX_SYMBOLS = 6;

/** 뉴스 초크 id → 물류 타임라인 / reaction API id */
const NEWS_TO_LOGISTICS_CHOKE: Partial<Record<ChokepointId, LogisticsChokepointId>> = {
  hormuz: "choke-hormuz",
  suez: "choke-suez",
  "bab-el-mandeb": "choke-bab-el-mandeb",
  malacca: "choke-malacca",
  "taiwan-strait": "choke-taiwan",
  panama: "choke-panama",
  bosporus: "choke-bosporus",
  gibraltar: "choke-gibraltar",
  "good-hope": "choke-good-hope",
};

const CHOKE_THEATER: Partial<Record<ChokepointId, NewsTheater>> = {
  hormuz: "middle-east",
  suez: "middle-east",
  "bab-el-mandeb": "middle-east",
  malacca: "southeast-asia",
  "taiwan-strait": "china-taiwan",
  panama: "south-america",
  bosporus: "russia-ukraine",
  gibraltar: "atlantic",
  "good-hope": "africa",
};

/** 지경학 장르 → 선물·매크로 (Yahoo allowlist 심볼만) */
const ECON_GENRE_SYMBOLS: Record<EconomyNewsGenre, readonly string[]> = {
  energy: ["CL=F", "BZ=F", "NG=F", "GC=F", "^VIX"],
  shipping: ["BDRY", "CL=F", "BZ=F", "^VIX", "GC=F"],
  chips: ["TSM", "SMH", "^TWII", "^VIX", "BZ=F"],
  markets: ["^VIX", "^GSPC", "^IXIC", "GC=F", "DX-Y.NYB", "CL=F"],
  macro: ["^TNX", "^VIX", "DX-Y.NYB", "GC=F", "CL=F"],
  tech: ["^IXIC", "^VIX", "GC=F", "DX-Y.NYB"],
  auto: ["^VIX", "^GSPC", "CL=F", "GC=F"],
  infra: ["HG=F", "GC=F", "^VIX", "CL=F", "BDRY"],
};

const ECON_GENRE_NOTE: Record<EconomyNewsGenre, { ko: string; en: string }> = {
  energy: {
    ko: "원유·가스·금·VIX — 에너지 트리거 관측 (해석용 · 투자 권유 아님)",
    en: "Oil · gas · gold · VIX — energy trigger watch (interpretive · not advice)",
  },
  shipping: {
    ko: "운임·유가·VIX — 물류 트리거 관측 (해석용 · 투자 권유 아님)",
    en: "Freight · oil · VIX — logistics trigger watch (interpretive · not advice)",
  },
  chips: {
    ko: "반도체·가권·VIX — 칩 서플라이 트리거 (해석용 · 투자 권유 아님)",
    en: "Semis · TWII · VIX — chip-supply trigger (interpretive · not advice)",
  },
  markets: {
    ko: "증시·공포·금·달러 — 시장 트리거 관측 (해석용 · 투자 권유 아님)",
    en: "Equities · fear · gold · dollar — market trigger (interpretive · not advice)",
  },
  macro: {
    ko: "금리·VIX·달러·금 — 거시 정책 트리거 (해석용 · 투자 권유 아님)",
    en: "Yields · VIX · dollar · gold — macro-policy trigger (interpretive · not advice)",
  },
  tech: {
    ko: "나스닥·VIX·금 — 빅테크·리스크 관측 (해석용 · 투자 권유 아님)",
    en: "Nasdaq · VIX · gold — tech / risk watch (interpretive · not advice)",
  },
  auto: {
    ko: "증시·유가·금 — 모빌리티 매크로 관측 (해석용 · 투자 권유 아님)",
    en: "Equities · oil · gold — mobility macro (interpretive · not advice)",
  },
  infra: {
    ko: "구리·금·운임·유가 — 인프라·원자재 관측 (해석용 · 투자 권유 아님)",
    en: "Copper · gold · freight · oil — infra / commodities (interpretive · not advice)",
  },
};

function uniqSymbols(symbols: string[], limit = MAX_SYMBOLS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of symbols) {
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function logisticsChokepointForMacro(
  chokeId: ChokepointId,
): LogisticsChokepointId | null {
  return NEWS_TO_LOGISTICS_CHOKE[chokeId] ?? null;
}

export type MacroMarketHint = {
  symbols: string[];
  note: string;
  /** reaction API theater */
  theater: TheaterMarketFilter;
  /** reaction API chokepointId (choke-hormuz …) */
  chokepointId: LogisticsChokepointId | null;
};

/**
 * 거시 테마 → 시장 관측 힌트.
 * 심볼은 지정학 트리거와 연관된 선물·매크로만 (방향 예측 아님).
 */
export function marketHintForTheme(
  themeId: MacroThemeId,
  lang: LabelLanguage,
): MacroMarketHint {
  const { kind, key } = parseMacroThemeId(themeId);

  if (kind === "choke") {
    const choke = key as ChokepointId;
    const logisticsId = logisticsChokepointForMacro(choke);
    const preferred = logisticsId
      ? [...CHOKEPOINT_PREFERRED_SYMBOLS[logisticsId]]
      : [];
    const theater = (CHOKE_THEATER[choke] ?? "all") as TheaterMarketFilter;
    const theaterSyms = theaterPrimarySymbols(theater, MAX_SYMBOLS, "economy");
    const symbols = uniqSymbols([...preferred, ...theaterSyms]);
    const note =
      lang === "en"
        ? `Chokepoint-linked futures — ${theaterAssetNote(theater, "en", "economy")}`
        : `초크 연계 선물 — ${theaterAssetNote(theater, "ko", "economy")}`;
    return { symbols, note, theater, chokepointId: logisticsId };
  }

  if (kind === "theater") {
    const theater = key as TheaterMarketFilter;
    return {
      symbols: theaterPrimarySymbols(theater, MAX_SYMBOLS, "economy"),
      note: theaterAssetNote(theater, lang, "economy"),
      theater: theater === "global" ? "all" : theater,
      chokepointId: null,
    };
  }

  // econ genre
  const genre = key as EconomyNewsGenre;
  const entry = ECON_GENRE_SYMBOLS[genre] ?? ECON_GENRE_SYMBOLS.markets;
  const noteEntry = ECON_GENRE_NOTE[genre] ?? ECON_GENRE_NOTE.markets;
  return {
    symbols: uniqSymbols([...entry]),
    note: lang === "en" ? noteEntry.en : noteEntry.ko,
    theater: "all",
    chokepointId: null,
  };
}
