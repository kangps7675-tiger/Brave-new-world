/**
 * 귀중한 속보 양피지 — **신속·위중** 히어로만.
 * 등불과 동일한 펼침+타전 사운드. 세션당 hero id 1회.
 * 한글 모드: 본문·골격 문장 무조건 한국어 + 전장 fly-to.
 * 출처는 하단 고정 표기.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  deepenSummaryForFlash,
  ensureFlashCopyKorean,
} from "@/lib/news/breakingFlashCopy";
import {
  extractFlashActors,
  FLASH_KINETIC_RE,
  FLASH_SOFT_EXCLUDE_RE,
  formatActorsLine,
  formatCausalLine,
  formatSceneLine,
  formatSupplyChainBridge,
  formatWhyImportant,
} from "@/lib/news/breakingFlashNarrative";
import type { HeroBreakingItem, NewsTheater } from "@/lib/news/types";
import { S_GRADE_MIN } from "@/lib/news/breakingGrade";
import {
  isChokepointEconomyNews,
  isChokepointSecurityNews,
} from "@/lib/news/chokepointNews";

export type BreakingFlashBriefing = {
  id: string;
  title: string;
  paragraphs: string[];
  link?: string;
  mode: "conflict" | "economy";
  /** 타전 시 지도 fly 대상 */
  theater: NewsTheater;
  /** 하단 출처 표기 (매체·시각) */
  sourceAttribution: string;
};

/** 신속 속보 — 이보다 오래된 기사는 타전하지 않음 */
export const FLASH_MAX_AGE_MINUTES = 45;
/** A급 예외는 더 짧은 창만 */
export const FLASH_A_MAX_AGE_MINUTES = 25;

const ECON_STRESS_FLASH_RE =
  /\b(hormuz|suez|malacca|red\s?sea|freight|tanker|embargo|default|bankrupt|record\s?crash|selloff|plunge)\b|호르무즈|수에즈|홍해|운임|봉쇄|디폴트|폭락|급락/i;

/** 세션 중 이미 타전한 귀중 속보 id — 동일 기사 재타전 방지 */
const claimedFlashIds = new Set<string>();
let lastClaimedFlashId: string | null = null;

export function claimBreakingFlash(id: string): boolean {
  if (!id || claimedFlashIds.has(id)) return false;
  claimedFlashIds.add(id);
  lastClaimedFlashId = id;
  return true;
}

export function wasBreakingFlashClaimed(id: string): boolean {
  return Boolean(id) && claimedFlashIds.has(id);
}

/** 티커 SOS와 양피지 중복 방지용 */
export function peekBreakingFlashClaim(): string | null {
  return lastClaimedFlashId;
}

function formatAgeShort(ageMinutes: number | undefined, ko: boolean): string | null {
  if (ageMinutes == null || !Number.isFinite(ageMinutes)) return null;
  const m = Math.max(0, Math.round(ageMinutes));
  if (ko) {
    if (m < 1) return "방금";
    if (m < 60) return `약 ${m}분 전`;
    return `약 ${Math.round(m / 60)}시간 전`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `~${m} min ago`;
  return `~${Math.round(m / 60)}h ago`;
}

export function formatFlashSourceAttribution(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const outlet =
    (hero.publisher || hero.source || "").trim() || (ko ? "미상 매체" : "Unknown outlet");
  const age = formatAgeShort(hero.ageMinutes, ko);
  if (ko) {
    return age ? `출처: ${outlet} · 보도 ${age}` : `출처: ${outlet}`;
  }
  return age ? `Source: ${outlet} · ${age}` : `Source: ${outlet}`;
}

/**
 * 신속·위중 속보만 타전.
 * - 지정학: 기본 **S급** + 키네틱/초크/공급망 신호. A급은 핵·침공·공습 등 + grade≥8 + 더 짧은 시간창.
 * - 연예·스포츠·사설 제외. **45분** 초과 제외 (신속 속보).
 * - Tier3 단독은 S 미만 불가.
 * - 공급망 연결은 별도 양피지가 아니라 본문 「공급망 연결」 단락으로만 붙인다.
 */
export function shouldOpenBreakingFlash(
  hero: HeroBreakingItem | null | undefined,
  preferEconomy: boolean,
): boolean {
  if (!hero?.id) return false;
  const grade = hero.breakingGrade ?? 0;
  const rank = hero.breakingRank;
  const age = typeof hero.ageMinutes === "number" ? hero.ageMinutes : 999;
  if (age > FLASH_MAX_AGE_MINUTES) return false;
  if (hero.trustTier === 3 && grade < S_GRADE_MIN) return false;

  const blob = `${hero.title} ${hero.summary ?? ""}`;
  if (FLASH_SOFT_EXCLUDE_RE.test(blob)) return false;

  if (preferEconomy || hero.feedTopic === "economy") {
    if (rank !== "S" && !(rank === "A" && grade >= 8 && age <= FLASH_A_MAX_AGE_MINUTES)) {
      return false;
    }
    return (
      ECON_STRESS_FLASH_RE.test(blob) ||
      isChokepointEconomyNews(blob) ||
      grade >= S_GRADE_MIN
    );
  }

  // 정세 — 신속·위중만
  if (rank === "S") {
    return (
      FLASH_KINETIC_RE.test(blob) ||
      isChokepointSecurityNews(blob) ||
      grade >= S_GRADE_MIN
    );
  }
  // A급: 키네틱 + 더 짧은 창만
  if (
    rank === "A" &&
    grade >= 8 &&
    age <= FLASH_A_MAX_AGE_MINUTES &&
    FLASH_KINETIC_RE.test(blob)
  ) {
    return true;
  }
  return false;
}

export function buildBreakingFlashBriefing(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
  opts?: { title?: string; summary?: string },
): BreakingFlashBriefing {
  const ko = lang !== "en";
  const economy = preferEconomy || hero.feedTopic === "economy";
  const titleText = (opts?.title ?? hero.title).replace(/\s+/g, " ").trim();
  const summaryRaw = opts?.summary ?? hero.summary;
  const blob = `${titleText} ${summaryRaw ?? ""}`;

  const kicker = economy
    ? ko
      ? "시장 신속 속보"
      : "Market flash"
    : ko
      ? "정세 신속 속보"
      : "Situation flash";

  const actors = extractFlashActors(blob, lang);
  const actorsLine = formatActorsLine(actors, lang);
  const causal = formatCausalLine(titleText, actors, lang);
  const scene = formatSceneLine(hero.theater, lang);
  const why = formatWhyImportant(hero.theater, blob, lang);
  const supplyBridge = formatSupplyChainBridge(blob, lang);
  const body = deepenSummaryForFlash(summaryRaw, titleText, lang);

  const gradeLine =
    hero.breakingRank != null
      ? ko
        ? `등급 ${hero.breakingRank} · 내부 ${hero.breakingGrade ?? "—"}`
        : `Rank ${hero.breakingRank} · grade ${hero.breakingGrade ?? "—"}`
      : null;

  const closing = ko
    ? "이상은 확인된 보도를 바탕으로 한 즉시 타전입니다. 상세는 원문에서 확인하십시오."
    : "Immediate flash based on verified wires. See the source article for full detail.";

  const sourceAttribution = formatFlashSourceAttribution(hero, lang);

  const paragraphs = [
    actorsLine,
    causal,
    scene,
    why,
    supplyBridge,
    body,
    gradeLine,
    closing,
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));

  return {
    id: hero.id,
    title: `${kicker}\n${titleText}`,
    paragraphs,
    link: hero.link,
    mode: economy ? "economy" : "conflict",
    theater: hero.theater,
    sourceAttribution,
  };
}

/** 한글 UI — 번역 후 타전 브리핑 생성 */
export async function buildBreakingFlashBriefingForLang(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
): Promise<BreakingFlashBriefing> {
  if (lang === "en") {
    return buildBreakingFlashBriefing(hero, lang, preferEconomy);
  }
  const { title, summary } = await ensureFlashCopyKorean({
    title: hero.title,
    summary: hero.summary,
  });
  return buildBreakingFlashBriefing(hero, "ko", preferEconomy, {
    title,
    summary,
  });
}
