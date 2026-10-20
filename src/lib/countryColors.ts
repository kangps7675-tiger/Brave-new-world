export const COUNTRY_STROKE_COLOR = "rgba(255, 255, 255, 0.55)";
export const COUNTRY_BORDER_PATH_COLOR = "rgba(255, 255, 255, 0.95)";
/**
 * 국가 면은 클릭/호버용으로만 두고 채움은 투명.
 * 다색 반투명 채움은 분쟁·기지·금수 등과 겹치면 탁한 혼색이 남.
 * 국경 시각은 country-border path가 담당.
 */
export const COUNTRY_FILL_ALTITUDE = 0.0008;

/** 텍스처/MapLibre 베이스맵 — 국가 면·테두리 없음 */
export const COUNTRY_TEXTURE_MODE_FILL = "rgba(0, 0, 0, 0)";

/** three-globe/polished 호환 — undefined·transparent 대신 사용 */
export const POLYGON_NO_STROKE = "rgba(0, 0, 0, 0)";

/** 국가 폴리곤 채움 — cyber-war-room: 단일 톤 + 분쟁국 강조 */
export function getCountryFillColor(
  countryKey: string | null | undefined,
  options: {
    defaultFill: string;
    conflictFill?: string;
    conflictKeys?: ReadonlySet<string>;
    countryColors?: Record<string, string>;
  },
) {
  if (countryKey && options.conflictKeys?.has(countryKey) && options.conflictFill) {
    return options.conflictFill;
  }
  if (countryKey && options.countryColors?.[countryKey]) {
    return options.countryColors[countryKey];
  }
  return options.defaultFill;
}
