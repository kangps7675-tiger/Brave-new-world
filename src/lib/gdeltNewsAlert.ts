import type { EventCategory, EventTier } from "@/data/geoTypes";
import {
  gdeltImportanceShortLabel,
  isMarkedGdeltImportance,
  type GdeltImportanceGrade,
} from "@/lib/gdeltImportance";

export const GDELT_NEWS_ALERT_LABEL = "뉴스 알림";
export const GDELT_NEWS_ALERT_LABEL_EN = "News alert";

export function gdeltNewsAlertLabel(lang: "ko" | "en" = "ko"): string {
  return lang === "en" ? GDELT_NEWS_ALERT_LABEL_EN : GDELT_NEWS_ALERT_LABEL;
}

/** Geo API query_tag → 한국어 주제 (티어 라벨과 별개) */
const QUERY_TAG_LABEL_KO: Record<string, string> = {
  ukraine: "우크라이나",
  "middle-east": "중동",
  taiwan: "대만·남중국해",
  korea: "한반도",
  "land-war": "지상전",
  maritime: "해상",
  pacific: "태평양",
  atlantic: "대서양",
  arctic: "북극",
  "air-adiz": "공역·ADIZ",
  strategic: "핵·미사일",
  hybrid: "하이브리드·제재",
  alliance: "동맹·군사외교",
  "axis-network": "축 관계망",
  cyber: "사이버",
  election: "선거",
};

const CATEGORY_LABEL_KO: Record<EventCategory, string> = {
  Battles: "교전",
  "Violence against civilians": "민간인 폭력",
  Protests: "시위",
  Riots: "폭동",
  "Strategic developments": "전략 동향",
};

const BARE_TITLE_RE =
  /^(GDELT|gdelt|diplomatic|war|alliance|protest|strategic developments)$/i;

function isBareOrTagTitle(title: string): boolean {
  const t = title.trim();
  if (!t || BARE_TITLE_RE.test(t)) return true;
  if (QUERY_TAG_LABEL_KO[t.toLowerCase()]) return true;
  return false;
}

export function gdeltQueryTagLabel(tag: string | null | undefined): string | null {
  if (!tag) return null;
  return QUERY_TAG_LABEL_KO[tag.toLowerCase()] ?? null;
}

export function hostFromGdeltUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** 기사 URL 경로에서 헤드라인 후보 추출 (개별 뉴스 구분용) */
export function headlineFromGdeltSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop() || "";
    let cleaned = decodeURIComponent(seg)
      .replace(/\.(html?|php|aspx?|shtml)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\d{6,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length < 14) return null;
    if (!/[a-zA-Z가-힣]{4,}/.test(cleaned)) return null;
    if (cleaned.length > 96) cleaned = `${cleaned.slice(0, 93).trim()}…`;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return null;
  }
}

type HeadlineInput = {
  title?: string | null;
  category?: EventCategory | string | null;
  country?: string | null;
  actor1Country?: string | null;
  actor2Country?: string | null;
  sourceUrl?: string | null;
  /** D1/Geo 포인트의 query_tag */
  queryTag?: string | null;
};

/**
 * 알림창·리스트용 개별 뉴스 한 줄.
 * 티어 라벨("외교적 긴장")만 쓰지 않고, 제목·URL 슬러그·행위자·출처로 구분한다.
 */
export function formatGdeltNewsHeadline(event: HeadlineInput): string {
  const rawTitle = event.title?.trim() || null;
  const fromUrl = headlineFromGdeltSourceUrl(event.sourceUrl);
  const host = hostFromGdeltUrl(event.sourceUrl);
  const tagLabel = gdeltQueryTagLabel(event.queryTag);
  const placeLike = rawTitle && !isBareOrTagTitle(rawTitle) ? rawTitle : null;

  if (
    placeLike &&
    fromUrl &&
    !fromUrl.toLowerCase().includes(placeLike.toLowerCase().slice(0, Math.min(12, placeLike.length)))
  ) {
    return `${placeLike} · ${fromUrl}`;
  }
  if (fromUrl) return fromUrl;
  if (placeLike && host) return `${placeLike} · ${host}`;
  if (placeLike) return placeLike;

  const bits: string[] = [];
  if (tagLabel) bits.push(tagLabel);
  if (event.country) bits.push(event.country);
  if (event.actor1Country || event.actor2Country) {
    bits.push(`${event.actor1Country || "?"}↔${event.actor2Country || "?"}`);
  }
  const cat = event.category
    ? CATEGORY_LABEL_KO[event.category as EventCategory] || event.category
    : null;
  if (cat) bits.push(cat);
  if (host) bits.push(host);

  const joined = bits.filter(Boolean).join(" · ");
  return joined || "GDELT 속보";
}

/** API mapPoint용 — 저장 title을 개별 뉴스처럼 채운다. */
export function buildGdeltPointTitle(input: {
  name: string | null;
  url: string | null;
  queryTag: string | null;
}): string {
  return formatGdeltNewsHeadline({
    title: input.name,
    sourceUrl: input.url,
    queryTag: input.queryTag,
    category: "Strategic developments",
  });
}

const TIER_BADGE_BORDER: Record<EventTier, string> = {
  war: "rgba(239, 68, 68, 0.6)",
  diplomatic: "rgba(251, 146, 60, 0.6)",
  alliance: "rgba(20, 184, 166, 0.55)",
  protest: "rgba(148, 163, 184, 0.5)",
};

const IMPORTANCE_BADGE: Record<
  Extract<GdeltImportanceGrade, "S" | "A">,
  { border: string; bg: string; color: string }
> = {
  S: {
    border: "rgba(250, 204, 21, 0.85)",
    bg: "rgba(120, 53, 15, 0.92)",
    color: "rgba(254, 243, 199, 0.98)",
  },
  A: {
    border: "rgba(251, 146, 60, 0.8)",
    bg: "rgba(124, 45, 18, 0.9)",
    color: "rgba(255, 237, 213, 0.96)",
  },
};

/** 지도 마커 하단 「뉴스」 뱃지 — S/A는 등급 강조 */
export function createNewsAlertBadgeElement(
  tier: EventTier,
  importanceGrade?: GdeltImportanceGrade,
): HTMLElement {
  const badge = document.createElement("span");
  const marked =
    importanceGrade && isMarkedGdeltImportance(importanceGrade) ? importanceGrade : null;
  badge.textContent = marked ? gdeltImportanceShortLabel(marked) : "뉴스";
  badge.setAttribute("aria-hidden", "true");
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.marginTop = "-1px";
  badge.style.padding = marked ? "1px 6px" : "1px 5px";
  badge.style.borderRadius = "9999px";
  if (marked === "S" || marked === "A") {
    const style = IMPORTANCE_BADGE[marked];
    badge.style.border = `1px solid ${style.border}`;
    badge.style.background = style.bg;
    badge.style.color = style.color;
    badge.style.fontWeight = "700";
    badge.style.boxShadow =
      marked === "S"
        ? "0 0 8px rgba(250, 204, 21, 0.55)"
        : "0 1px 3px rgba(2, 8, 20, 0.45)";
  } else {
    badge.style.border = `1px solid ${TIER_BADGE_BORDER[tier]}`;
    badge.style.background = "rgba(8, 18, 36, 0.9)";
    badge.style.color = "rgba(255, 237, 213, 0.96)";
    badge.style.fontWeight = "600";
    badge.style.boxShadow = "0 1px 3px rgba(2, 8, 20, 0.45)";
  }
  badge.style.fontSize = "8px";
  badge.style.lineHeight = "1.25";
  badge.style.letterSpacing = "-0.02em";
  badge.style.whiteSpace = "nowrap";
  badge.style.pointerEvents = "none";
  return badge;
}

/** 위치 핀 + 뉴스 뱃지를 하나의 마커 루트로 묶음 */
export function wrapNewsAlertMarker(
  pinEl: HTMLElement,
  tier: EventTier,
  importanceGrade?: GdeltImportanceGrade,
): { root: HTMLElement; pin: HTMLElement } {
  const root = document.createElement("div");
  root.className = "gdelt-news-alert-marker";
  if (importanceGrade && isMarkedGdeltImportance(importanceGrade)) {
    root.dataset.importance = importanceGrade;
  }
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.transform = "translate(-50%, -100%)";
  root.style.pointerEvents = "none";

  pinEl.style.transform = "none";
  pinEl.style.pointerEvents = "auto";

  root.appendChild(pinEl);
  root.appendChild(createNewsAlertBadgeElement(tier, importanceGrade));
  return { root, pin: pinEl };
}
