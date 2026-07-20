/**
 * NewFeeds (ktoetotam/NewFeeds) — Iran & regional conflict monitor.
 * Upstream: https://github.com/ktoetotam/NewFeeds (MIT)
 * Public JSON: raw.githubusercontent.com/ktoetotam/NewFeeds/main/data/*
 *
 * Used for Iran-related attack map markers and regional news pooling.
 * Always attribute NewFeeds + underlying outlets when displaying.
 */

export const NEWFEEDS_REPO_URL = "https://github.com/ktoetotam/NewFeeds";
export const NEWFEEDS_ATTRIBUTION =
  "NewFeeds (ktoetotam/NewFeeds) · MIT — aggregated regional state media & attack classification";
export const NEWFEEDS_ATTRIBUTION_SHORT = "NewFeeds";
export const NEWFEEDS_DATA_BASE =
  "https://raw.githubusercontent.com/ktoetotam/NewFeeds/main/data";

export const NEWFEEDS_ATTACKS_URL = `${NEWFEEDS_DATA_BASE}/attacks.json`;
export const NEWFEEDS_THREAT_URL = `${NEWFEEDS_DATA_BASE}/threat_level.json`;
export const NEWFEEDS_IRAN_FEED_URL = `${NEWFEEDS_DATA_BASE}/feeds/iran.json`;

export type NewfeedsSeverity = "major" | "high" | "medium" | "low" | string;

export type NewfeedsAttackClassification = {
  is_attack?: boolean;
  category?: string;
  severity?: NewfeedsSeverity;
  parties_involved?: string[];
  location?: string;
  brief?: string;
};

export type NewfeedsAttackRaw = {
  id: string;
  title_en?: string;
  title_original?: string;
  summary_en?: string;
  url?: string;
  published?: string;
  fetched_at?: string;
  source_name?: string;
  source_category?: string;
  region?: string;
  countries_mentioned?: string[];
  classification?: NewfeedsAttackClassification;
  lat?: number | null;
  lng?: number | null;
};

export type NewfeedsAttackPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  summary: string;
  severity: NewfeedsSeverity;
  category: string;
  location: string;
  sourceName: string;
  sourceUrl: string | null;
  publishedAt: string | null;
  region: string;
  iranRelated: boolean;
};

export type NewfeedsAttacksPayload = {
  fetchedAt: string;
  live: boolean;
  attribution: string;
  attributionUrl: string;
  threatLabel: string | null;
  threatLevel: number | null;
  attacks: NewfeedsAttackPoint[];
  iranCount: number;
  error?: string;
  stub?: boolean;
};

/** Approximate Iran + near-gulf theater for map focus */
export function isInIranTheaterBbox(lat: number, lng: number): boolean {
  return lat >= 24.5 && lat <= 40.5 && lng >= 43.5 && lng <= 64.5;
}

export function isIranRelatedAttack(raw: NewfeedsAttackRaw): boolean {
  if (raw.region === "iran") return true;
  const countries = raw.countries_mentioned ?? [];
  if (countries.some((c) => /iran/i.test(c))) return true;
  const loc = raw.classification?.location ?? "";
  if (/iran|tehran|isfahan|bandar|hormuz|persian\s*gulf/i.test(loc)) return true;
  const blob = `${raw.title_en ?? ""} ${raw.summary_en ?? ""}`;
  if (/\biran\b|\birgc\b|\btehran\b/i.test(blob)) return true;
  if (
    typeof raw.lat === "number" &&
    typeof raw.lng === "number" &&
    isInIranTheaterBbox(raw.lat, raw.lng) &&
    /\biran\b|\birgc\b|missile|strike|intercept/i.test(blob)
  ) {
    return true;
  }
  return false;
}

export function mapNewfeedsAttack(raw: NewfeedsAttackRaw): NewfeedsAttackPoint | null {
  const lat = raw.lat;
  const lng = raw.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cls = raw.classification;
  return {
    id: raw.id,
    lat,
    lng,
    title: (raw.title_en || raw.title_original || "Attack event").trim(),
    summary: (raw.summary_en || cls?.brief || "").trim(),
    severity: cls?.severity || "medium",
    category: cls?.category || "unknown",
    location: cls?.location || raw.region || "",
    sourceName: raw.source_name || "NewFeeds",
    sourceUrl: raw.url || null,
    publishedAt: raw.published || raw.fetched_at || null,
    region: raw.region || "",
    iranRelated: isIranRelatedAttack(raw),
  };
}

export function severityColor(severity: NewfeedsSeverity): string {
  // 중·고·대규모는 빨간 계열 구체로 읽히게 (중간=노랑이면 지도에서 잘 안 보임)
  if (severity === "major") return "rgba(220, 38, 38, 0.95)";
  if (severity === "high") return "rgba(239, 68, 68, 0.92)";
  if (severity === "medium") return "rgba(249, 115, 22, 0.9)";
  return "rgba(148, 163, 184, 0.75)";
}

/** 심각도 라벨 — 지도 호버·패널용 */
export function severityLabel(
  severity: NewfeedsSeverity,
  lang: "ko" | "en" = "ko",
): string {
  const en = lang === "en";
  if (severity === "major") return en ? "Major" : "대규모";
  if (severity === "high") return en ? "High" : "높음";
  if (severity === "medium") return en ? "Medium" : "중간";
  if (severity === "low") return en ? "Low" : "낮음";
  return en ? String(severity) : String(severity);
}

export function severityHint(
  severity: NewfeedsSeverity,
  lang: "ko" | "en" = "ko",
): string {
  const en = lang === "en";
  if (severity === "major") {
    return en ? "Highest intensity attack event" : "최고 강도 공격 이벤트";
  }
  if (severity === "high") {
    return en ? "High intensity attack event" : "높은 강도 공격 이벤트";
  }
  if (severity === "medium") {
    return en ? "Medium intensity event" : "중간 강도 이벤트";
  }
  return en ? "Lower intensity / unclassified" : "낮은 강도 · 미분류";
}
