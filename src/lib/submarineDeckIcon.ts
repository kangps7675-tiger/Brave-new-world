import {
  SUBMARINE_ASPECT_DRAWINGS,
  SUBMARINE_MARKER_SIZE,
  SUBMARINE_PROFILE_SIZE,
  SUBMARINE_VIEWBOX,
  type SubmarineIconSize,
} from "@/data/submarineSilhouette";
import {
  surfaceCombatantFacingFromRelativeHeading,
  type SurfaceCombatantAspect,
} from "@/data/surfaceCombatantSilhouette";

const DEFAULT_FILL = "#0c0c0e";

export {
  surfaceCombatantFacingFromRelativeHeading as submarineFacingFromRelativeHeading,
  SUBMARINE_PROFILE_SIZE,
};

/**
 * 잠수함 실루엣 SVG.
 * AIS 지도는 옆모습(E/W)만 — submarineProfileIconSvg 사용.
 */
export function submarineIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: SubmarineIconSize = SUBMARINE_MARKER_SIZE,
  aspect: SurfaceCombatantAspect = "e",
): string {
  const { width, height } = size;
  const vb = `${SUBMARINE_VIEWBOX.width} ${SUBMARINE_VIEWBOX.height}`;
  const drawing = SUBMARINE_ASPECT_DRAWINGS[aspect];
  const sideProfile = aspect === "e" || aspect === "w";

  const details = drawing.details
    .map((d) =>
      sideProfile
        ? `<path d="${d}" fill="${fillColor}" stroke="rgba(255,255,255,0.65)" stroke-width="0.45" stroke-linejoin="miter"/>`
        : `<path d="${d}" fill="rgba(15,23,42,0.55)" stroke="rgba(255,255,255,0.45)" stroke-width="0.65" stroke-linejoin="round"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.94)"
        stroke-width="${sideProfile ? 1.0 : 1.1}"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
      ${details}
    </svg>
  `.trim();
}

/** AIS·범례 — 옆모습 고정 (조감 미사용) */
export function submarineProfileIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: SubmarineIconSize = SUBMARINE_PROFILE_SIZE,
  facing: "e" | "w" = "e",
): string {
  const full = submarineIconSvg(
    fillColor,
    { width: SUBMARINE_VIEWBOX.width, height: SUBMARINE_VIEWBOX.height },
    facing,
  );
  return full
    .replace(/viewBox="0 0 64 64"/, 'viewBox="0 8 64 44"')
    .replace(/width="64" height="64"/, `width="${size.width}" height="${size.height}"`);
}

export function submarineGlowShadow(_fillColor: string = DEFAULT_FILL): string {
  return `0 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(239,68,68,0.38)`;
}
