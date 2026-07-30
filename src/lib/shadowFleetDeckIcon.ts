import {
  SHADOW_FLEET_ASPECT_DRAWINGS,
  SHADOW_FLEET_MARKER_SIZE,
  shadowFleetAspectFromRelativeHeading,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
} from "@/data/shadowFleetSilhouette";

/** 위장선박 AIS — 빨강 솔리드 실루엣 */
const DEFAULT_FILL = "#ef4444";

export {
  shadowFleetAspectFromRelativeHeading,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
  SHADOW_FLEET_MARKER_SIZE,
};

/**
 * Farnborough식 위장 상선 — 헐·함교·마스트를 동일 색 솔리드 실루엣으로.
 * (어두운 디테일 레이어로 헐만 풍선처럼 보이게 두지 않음)
 */
export function shadowFleetIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: { width: number; height: number } = SHADOW_FLEET_MARKER_SIZE,
  aspect: ShadowFleetAspect = "e",
): string {
  const { width, height } = size;
  const drawing = SHADOW_FLEET_ASPECT_DRAWINGS[aspect];

  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="${fillColor}" stroke="rgba(255,255,255,0.55)" stroke-width="0.4" stroke-linejoin="miter" stroke-linecap="square"/>`,
    )
    .join("");

  const wires = (drawing.wires ?? [])
    .map(
      (w) =>
        `<path d="${w}" fill="none" stroke="${fillColor}" stroke-width="0.7" stroke-linecap="square"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 4 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.92)"
        stroke-width="0.95"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
      ${details}
      ${wires}
    </svg>
  `.trim();
}
