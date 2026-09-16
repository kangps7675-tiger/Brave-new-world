import type { ConflictConfidence } from "@/lib/conflictEvents/types";
import type { HeroStatus, MediaTrustTier } from "@/lib/news/types";
import type { EvidenceTier } from "@/lib/evidenceTier";
import { withUnverifiedTitleMark } from "@/lib/newfeedsI18n";
import type { LabelLanguage } from "@/lib/layerPrefs";

export function confidenceFromSourceCount(n: number): ConflictConfidence {
  if (n >= 4) return "high-confidence";
  if (n >= 2) return "corroborated";
  return "single-source";
}

/** 집계 채널 표시명 — 독립 매체 판별에 쓰면 안 됨 (전부 하나로 뭉침) */
const AGGREGATOR_SOURCE_NAMES = new Set(["gdelt", "newfeeds", "rss", "unknown"]);

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * 독립 소스 키.
 * URL 호스트가 있으면 그걸 우선 — GDELT처럼 sourceName이 전부 "GDELT"여도
 * reuters.com / apnews.com 은 서로 다른 소스로 센다.
 */
export function uniqueSourceKey(name: string, url: string | null): string {
  const host = hostnameOf(url);
  if (host) return host;
  const n = name.trim().toLowerCase();
  if (n) return n;
  return "unknown";
}

/** 호버·배지용 표시명 — GDELT면 기사 URL 호스트를 보여 준다 */
export function displaySourceName(name: string, url: string | null): string {
  const trimmed = name.trim();
  const host = hostnameOf(url);
  if (host && AGGREGATOR_SOURCE_NAMES.has(trimmed.toLowerCase())) return host;
  return trimmed || host || "unknown";
}

export function clusterTrustTier(tiers: Array<MediaTrustTier | null | undefined>): MediaTrustTier {
  const nums = tiers.filter((t): t is MediaTrustTier => t === 1 || t === 2 || t === 3);
  if (nums.length === 0) return 3;
  return Math.min(...nums) as MediaTrustTier;
}

export function clusterHeroStatus(input: {
  confidence: ConflictConfidence;
  trustTier: MediaTrustTier;
  statuses: Array<HeroStatus | null | undefined>;
}): HeroStatus {
  if (input.confidence === "high-confidence") return "confirmed";
  if (input.confidence === "corroborated") {
    return input.trustTier === 3 ? "breaking" : "confirmed";
  }
  if (input.statuses.some((s) => s === "unverified") || input.trustTier === 3) {
    return "unverified";
  }
  return "breaking";
}

export function confidenceEvidenceTier(confidence: ConflictConfidence): EvidenceTier {
  if (confidence === "single-source") return "unverified";
  if (confidence === "high-confidence") return "reported";
  return "reported";
}

export function confidenceLabel(
  confidence: ConflictConfidence,
  lang: LabelLanguage,
): string {
  const en = lang === "en";
  if (confidence === "high-confidence") return en ? "High confidence" : "높은 신뢰";
  if (confidence === "corroborated") return en ? "Corroborated" : "교차 보도";
  return en ? "Single source" : "단일 소스";
}

export function independentSourceLine(n: number, lang: LabelLanguage): string {
  if (lang === "en") {
    return n <= 1 ? "1 independent source reported this" : `${n} independent sources reported this`;
  }
  return n <= 1 ? "1개 독립 소스가 보도" : `${n}개 독립 소스가 보도`;
}

export function clusterTitleWithUnverifiedMark(
  title: string,
  lang: LabelLanguage,
  opts: { trustTier: MediaTrustTier; heroStatus: HeroStatus },
): string {
  return withUnverifiedTitleMark(title, lang, opts);
}
