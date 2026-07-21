import {
  SURFACE_COMBATANT_ASPECT_DRAWINGS,
  SURFACE_COMBATANT_MARKER_SIZE,
  SURFACE_COMBATANT_VIEWBOX,
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  type SurfaceCombatantAspect,
  type SurfaceCombatantIconSize,
} from "@/data/surfaceCombatantSilhouette";

const DEFAULT_FILL = "#ef4444";

export {
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  type SurfaceCombatantAspect,
};

/**
 * 화면 상대 침로에 맞는 8방위 구축함형 실루엣.
 * N=俯視(날카로운 함수·평 함미), E/W=Burke급 옆모습, 대각=3/4.
 */
export function surfaceCombatantIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: SurfaceCombatantIconSize = SURFACE_COMBATANT_MARKER_SIZE,
  aspect: SurfaceCombatantAspect = "n",
): string {
  const { width, height } = size;
  const vb = `${SURFACE_COMBATANT_VIEWBOX.width} ${SURFACE_COMBATANT_VIEWBOX.height}`;
  const glowId = `ddg-glow-${aspect}-${width}`;
  const drawing = SURFACE_COMBATANT_ASPECT_DRAWINGS[aspect];

  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(15,23,42,0.48)" stroke="rgba(255,255,255,0.55)" stroke-width="0.65" stroke-linejoin="round"/>`,
    )
    .join("");

  const highlights = (drawing.highlights ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(248,250,252,0.72)" stroke="rgba(255,255,255,0.35)" stroke-width="0.4" stroke-linejoin="round"/>`,
    )
    .join("");

  const radomes = (drawing.radomes ?? [])
    .map(
      (r) =>
        `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="rgba(248,250,252,0.88)" stroke="rgba(15,23,42,0.45)" stroke-width="0.55"/>`,
    )
    .join("");

  const axis = drawing.axis
    ? `<path d="${drawing.axis}" stroke="rgba(250,204,21,0.5)" stroke-width="0.65" stroke-linecap="round" stroke-dasharray="1.5 1.2"/>`
    : "";

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="${glowId}" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.94)"
        stroke-width="1.05"
        stroke-linejoin="miter"
        stroke-linecap="square"
        filter="url(#${glowId})"
      />
      ${axis}
      ${details}
      ${highlights}
      ${radomes}
    </svg>
  `.trim();
}

export function surfaceCombatantGlowShadow(fillColor: string = DEFAULT_FILL): string {
  return `0 0 10px ${fillColor}cc, 0 0 18px ${fillColor}66, 0 2px 6px rgba(0,0,0,0.55)`;
}
