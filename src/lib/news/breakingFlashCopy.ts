import type { LabelLanguage } from "@/lib/layerPrefs";
import { isMostlyKorean, translateTextToKorean } from "@/lib/koreanTranslate";

/** 속보 양피지용 심층 요약 — 위중 타전용 (과도한 패딩 지양) */
export function deepenSummaryForFlash(
  raw: string | undefined,
  title: string,
  lang: LabelLanguage,
): string {
  // Preserve supplied details; source excerpts are limited at ingestion.
  void title;
  void lang;
  return (raw ?? "").replace(/\s+/g, " ").trim();
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
