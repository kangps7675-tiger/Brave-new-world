/**
 * 귀중한 속보 양피지 — 정세·경제 스트레스에 큰 영향을 줄 S급(또는 이에 준하는) 히어로만.
 * 등불과 동일한 펼침+타전 사운드. 세션당 hero id 1회.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import { deepenSummaryForFlash } from "@/lib/news/breakingFlashCopy";
import type { HeroBreakingItem } from "@/lib/news/types";
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
};

const TENSION_FLASH_RE =
  /\b(nuclear|missile|airstrike|invasion|escalat|massacre|genocide|carrier\s?strike|hypersonic|blockade|assassinate|warhead)\b|핵|미사일|공습|침공|확전|학살|봉쇄|암살/i;

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

/**
 * 귀중한 속보만 — S급, 또는 A급(≥8)이면서 긴장/물류 스트레스 키워드.
 */
export function shouldOpenBreakingFlash(
  hero: HeroBreakingItem | null | undefined,
  preferEconomy: boolean,
): boolean {
  if (!hero?.id) return false;
  const grade = hero.breakingGrade ?? 0;
  const rank = hero.breakingRank;
  if (rank !== "S" && !(rank === "A" && grade >= 8)) return false;
  if (hero.trustTier === 3 && grade < S_GRADE_MIN) return false;
  if (typeof hero.ageMinutes === "number" && hero.ageMinutes > 180) return false;

  const blob = `${hero.title} ${hero.summary ?? ""}`;
  if (preferEconomy || hero.feedTopic === "economy") {
    return (
      ECON_STRESS_FLASH_RE.test(blob) ||
      isChokepointEconomyNews(blob) ||
      grade >= S_GRADE_MIN
    );
  }
  return (
    TENSION_FLASH_RE.test(blob) ||
    isChokepointSecurityNews(blob) ||
    grade >= S_GRADE_MIN
  );
}

export function buildBreakingFlashBriefing(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
): BreakingFlashBriefing {
  const ko = lang !== "en";
  const economy = preferEconomy || hero.feedTopic === "economy";
  const kicker = economy
    ? ko
      ? "시장 속보 타전"
      : "Market flash"
    : ko
      ? "정세 속보 타전"
      : "Situation flash";
  const summary = deepenSummaryForFlash(hero.summary, hero.title, lang);
  const where = hero.theater
    ? ko
      ? `전장·권역: ${hero.theater}`
      : `Theater: ${hero.theater}`
    : null;
  const gradeLine =
    hero.breakingRank != null
      ? ko
        ? `등급 ${hero.breakingRank} · 내부 ${hero.breakingGrade ?? "—"}`
        : `Rank ${hero.breakingRank} · grade ${hero.breakingGrade ?? "—"}`
      : null;

  const paragraphs = [
    summary,
    [where, gradeLine, hero.publisher || hero.source].filter(Boolean).join(" · "),
    ko
      ? "이상은 확인된 보도를 바탕으로 한 즉시 타전입니다. 상세는 원문에서 확인하십시오."
      : "Immediate flash based on verified wires. See the source article for full detail.",
  ].filter((p) => p.trim().length > 0);

  return {
    id: hero.id,
    title: `${kicker}\n${hero.title}`,
    paragraphs,
    link: hero.link,
    mode: economy ? "economy" : "conflict",
  };
}
