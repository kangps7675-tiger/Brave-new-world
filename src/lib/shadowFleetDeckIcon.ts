import {
  SHADOW_FLEET_ASPECT_DRAWINGS,
  SHADOW_FLEET_MARKER_SIZE,
  shadowFleetAspectFromRelativeHeading,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
} from "@/data/shadowFleetSilhouette";

/** 위장선박 AIS — 빨강 실루엣 */
const DEFAULT_FILL = "#ef4444";

export {
  shadowFleetAspectFromRelativeHeading,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
  SHADOW_FLEET_MARKER_SIZE,
};

/**
 * 위장·다크플리트 — Farnborough식 상선 옆모습 실루엣 (빨강 통일).
 */
export function shadowFleetIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: { width: number; height: number } = SHADOW_FLEET_MARKER_SIZE,
  aspect: ShadowFleetAspect = "e",
): string {
  const { width, height } = size;
  const drawing = SHADOW_FLEET_ASPECT_DRAWINGS[aspect];
  const detailFill = "rgba(127,29,29,0.92)";

  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="${detailFill}" stroke="rgba(254,226,226,0.35)" stroke-width="0.35" stroke-linejoin="round"/>`,
    )
    .join("");

  const wires = (drawing.wires ?? [])
    .map(
      (w) =>
        `<path d="${w}" fill="none" stroke="rgba(254,202,202,0.75)" stroke-width="0.55" stroke-linecap="round"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 8 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.88)"
        stroke-width="1.0"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      ${details}
      ${wires}
    </svg>
  `.trim();
}
