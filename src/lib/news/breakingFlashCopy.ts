import type { LabelLanguage } from "@/lib/layerPrefs";

const FLASH_SUMMARY_MIN = 300;
const FLASH_SUMMARY_MAX = 520;

/** 속보 양피지용 심층 요약 — 등불과 동일 길이대 */
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
  if (clean.length < 80) {
    clean = ko
      ? `${titleTrim}. 현장에서 확인된 속보를 바탕으로 정세·시장 영향 경로를 즉시 정리합니다. 교차 확인이 이어지는 대로 등불·인텔 스택에 반영됩니다.`
      : `${titleTrim}. Immediate desk note on situation and market transmission paths. Updates land on the lamp and intel stack as corroboration arrives.`;
  }
  if (clean.length > FLASH_SUMMARY_MAX) {
    const sliced = clean.slice(0, FLASH_SUMMARY_MAX);
    const lastStop = Math.max(
      sliced.lastIndexOf("。"),
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("…"),
    );
    if (lastStop >= FLASH_SUMMARY_MIN) return sliced.slice(0, lastStop + 1).trim();
    return sliced.trim();
  }
  return clean;
}
