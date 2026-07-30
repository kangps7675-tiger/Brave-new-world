import {
  SURFACE_COMBATANT_ASPECT_DRAWINGS,
  SURFACE_COMBATANT_MARKER_SIZE,
  SURFACE_COMBATANT_PROFILE_SIZE,
  SURFACE_COMBATANT_VIEWBOX,
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantFacingFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  type SurfaceCombatantAspect,
  type SurfaceCombatantIconSize,
} from "@/data/surfaceCombatantSilhouette";

const DEFAULT_FILL = "#0c0c0e";

export {
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantFacingFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  SURFACE_COMBATANT_PROFILE_SIZE,
  type SurfaceCombatantAspect,
};

/**
 * 화면 상대 침로에 맞는 수상전투함 실루엣.
 * 호위·구축·초계·순양·미분류 군함 공용 (항모·잠수함 제외).
 * AIS 지도는 옆모습(E/W)만 — 조감·대각 미사용.
 */
export function surfaceCombatantIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: SurfaceCombatantIconSize = SURFACE_COMBATANT_MARKER_SIZE,
  aspect: SurfaceCombatantAspect = "n",
): string {
  const { width, height } = size;
  const vb = `${SURFACE_COMBATANT_VIEWBOX.width} ${SURFACE_COMBATANT_VIEWBOX.height}`;
  const drawing = SURFACE_COMBATANT_ASPECT_DRAWINGS[aspect];
  const sideProfile = aspect === "e" || aspect === "w";

  const details = drawing.details
    .map((d) =>
      sideProfile
        ? `<path d="${d}" fill="rgba(2,6,23,0.55)" stroke="rgba(255,255,255,0.72)" stroke-width="0.55" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="rgba(15,23,42,0.48)" stroke="rgba(255,255,255,0.55)" stroke-width="0.65" stroke-linejoin="round"/>`,
    )
    .join("");

  const highlights = (drawing.highlights ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(248,250,252,0.78)" stroke="rgba(255,255,255,0.4)" stroke-width="0.35" stroke-linejoin="round"/>`,
    )
    .join("");

  const radomes = (drawing.radomes ?? [])
    .map(
      (r) =>
        `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="rgba(248,250,252,0.92)" stroke="rgba(15,23,42,0.5)" stroke-width="0.55"/>`,
    )
    .join("");

  const axis =
    !sideProfile && drawing.axis
      ? `<path d="${drawing.axis}" stroke="rgba(250,204,21,0.5)" stroke-width="0.65" stroke-linecap="round" stroke-dasharray="1.5 1.2"/>`
      : "";

  const waves = (drawing.waves ?? [])
    .map(
      (w, i) =>
        `<path d="${w}" fill="none" stroke="rgba(255,255,255,${0.55 - i * 0.12})" stroke-width="${1.15 - i * 0.15}" stroke-linecap="round"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${waves}
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.96)"
        stroke-width="${sideProfile ? 1.05 : 1.15}"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
      ${axis}
      ${details}
      ${highlights}
      ${radomes}
    </svg>
  `.trim();
}

/** 주간 함정 이동기·리스트 — 옆모습 고정 실루엣 (수면 포함 크롭) */
export function warshipProfileIconSvg(
  fillColor: string = "#ef4444",
  size: SurfaceCombatantIconSize = SURFACE_COMBATANT_PROFILE_SIZE,
  facing: "e" | "w" = "e",
): string {
  const full = surfaceCombatantIconSvg(
    fillColor,
    { width: SURFACE_COMBATANT_VIEWBOX.width, height: SURFACE_COMBATANT_VIEWBOX.height },
    facing,
  );
  // 64² 전체 중 함·웨이크 구간만 보이게 크롭
  return full.replace(
    /viewBox="0 0 64 64"/,
    'viewBox="0 4 64 56"',
  ).replace(
    /width="64" height="64"/,
    `width="${size.width}" height="${size.height}"`,
  );
}

export function surfaceCombatantGlowShadow(): string {
  return `0 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(239,68,68,0.38)`;
}
