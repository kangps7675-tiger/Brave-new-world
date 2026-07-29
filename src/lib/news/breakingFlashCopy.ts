import type { LabelLanguage } from "@/lib/layerPrefs";
import { isMostlyKorean, translateTextToKorean } from "@/lib/koreanTranslate";

const FLASH_SUMMARY_MIN = 180;
const FLASH_SUMMARY_MAX = 420;

/** 속보 양피지용 심층 요약 — 위중 타전용 (과도한 패딩 지양) */
export function deepenSummaryForFlash(
  raw: string | undefined,
  title: string,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  let clean = (raw ?? "").replace(/\s+/g, " ").trim();
  const titleTrim = title.replace(/\s+/g, " ").trim();
  if (
    clean.length < FLASH_SUMMARY_MIN &&
    titleTrim.length > 0 &&
    !clean.toLowerCase().includes(titleTrim.toLowerCase().slice(0, 24))
  ) {
    clean = `${titleTrim}. ${clean}`.trim();
  }
  if (clean.length < 60) {
    clean = ko
      ? `${titleTrim}. 교차확인된 와이어를 바탕으로 즉시 타전합니다.`
      : `${titleTrim}. Immediate flash from corroborated wires.`;
  }
  if (clean.length > FLASH_SUMMARY_MAX) {
    const sliced = clean.slice(0, FLASH_SUMMARY_MAX);
    const lastStop = Math.max(
      sliced.lastIndexOf("。"),
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("…"),
      sliced.lastIndexOf("다. "),
    );
    if (lastStop >= FLASH_SUMMARY_MIN) return sliced.slice(0, lastStop + 1).trim();
    return sliced.trim();
  }
  return clean;
}

/**
 * 한글 UI면 제목·요약을 무조건 한국어로 (이미 한글이면 유지).
 * 번역 실패 시 원문 반환 — 호출측에서 타전 문장 골격은 한국어 템플릿.
 */
export async function ensureFlashCopyKorean(parts: {
  title: string;
  summary?: string;
}): Promise<{ title: string; summary: string }> {
  let title = parts.title.replace(/\s+/g, " ").trim();
  let summary = (parts.summary ?? "").replace(/\s+/g, " ").trim();
  try {
    if (title && !isMostlyKorean(title)) {
      title = await translateTextToKorean(title);
    }
    if (summary && !isMostlyKorean(summary)) {
      summary = await translateTextToKorean(summary);
    }
  } catch {
    /* keep original */
  }
  return { title, summary };
}
