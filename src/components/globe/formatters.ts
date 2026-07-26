import type { SearchPlace } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { LANG_CHOICE_KEY, WELCOME_GATE_KEY } from "@/components/globe/constants";

export function truncateOverview(text: string, maxLen = 140) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function docLang(): "ko" | "en" {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ko";
}

export function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeLabelText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[|/\\,_\-]{4,}/g, " ")
    .trim();
}

export function isAbnormalCityLabel(value: string) {
  if (!value) return true;
  if (value.length > 64) return true;
  if (/^(null|undefined|unknown|n\/a|na|none)$/i.test(value)) return true;
  if (/(.)\1{5,}/.test(value)) return true;
  // 깨진 인코딩(모지베이크) 휴리스틱
  if (/Ã.|Â.|â.|ðŸ|ï¿½/.test(value)) return true;
  if (/[\u0080-\u009f]/.test(value)) return true;

  const symbolMatches = value.match(/[^\p{L}\p{N}\s.'()\-]/gu) || [];
  return symbolMatches.length >= Math.max(3, Math.floor(value.length / 3));
}

export function getSafePlaceLabel(
  item: Pick<SearchPlace, "name" | "nameKo" | "country" | "type">,
  labelLanguage: LabelLanguage,
) {
  const englishName = normalizeLabelText(item.name);
  const koreanName = normalizeLabelText(item.nameKo);

  // 한국어 모드여도 깨진 한글이면 영문(NAMEASCII) 우선
  const preferredName =
    labelLanguage === "ko" && koreanName && !isAbnormalCityLabel(koreanName)
      ? koreanName
      : englishName;

  const candidates = [preferredName, englishName, koreanName];
  const valid = candidates.find((candidate) => candidate && !isAbnormalCityLabel(candidate));
  return valid || "도시";
}

export function hostFromUrl(url: string | null) {
  if (!url) return "source url 없음";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDateTime(value: string) {
  if (!value) return "생성 전";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** 의도적 재진입만 — ?entry=1 (개발 매 새로고침 루프 금지) */
export function forceEntryGateReplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get("entry") === "1" || q.get("welcome") === "1";
  } catch {
    return false;
  }
}

export function readWelcomeGateDone(): boolean {
  if (typeof window === "undefined") return true;
  if (forceEntryGateReplay()) return false;
  try {
    return localStorage.getItem(WELCOME_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeGateDone() {
  if (forceEntryGateReplay()) return;
  try {
    localStorage.setItem(WELCOME_GATE_KEY, "1");
  } catch {
    // ignore
  }
}

export function readLangChoiceDone(): boolean {
  if (typeof window === "undefined") return true;
  if (forceEntryGateReplay()) return false;
  try {
    return localStorage.getItem(LANG_CHOICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLangChoiceDone() {
  if (forceEntryGateReplay()) return;
  try {
    localStorage.setItem(LANG_CHOICE_KEY, "1");
  } catch {
    // ignore
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}
