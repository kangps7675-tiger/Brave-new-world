import {
  SHADOW_FLEET_ASPECT_DRAWINGS,
  SHADOW_FLEET_MARKER_SIZE,
  SHADOW_FLEET_VIEWBOX,
  shadowFleetAspectFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
} from "@/data/shadowFleetSilhouette";

const DEFAULT_FILL = "#db2777";

export {
  shadowFleetAspectFromRelativeHeading,
  shadowFleetRelativeHeading,
  type ShadowFleetAspect,
  SHADOW_FLEET_MARKER_SIZE,
};

/**
 * 위장·다크플리트(불법 그림자 함대) — 컨테이너/화물선형 8방위 실루엣.
 * 흘수선 적색 · 컨테이너 스택 · 선미/중부 함교.
 */
export function shadowFleetIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: { width: number; height: number } = SHADOW_FLEET_MARKER_SIZE,
  aspect: ShadowFleetAspect = "n",
): string {
  const { width, height } = size;
  const vb = `${SHADOW_FLEET_VIEWBOX.width} ${SHADOW_FLEET_VIEWBOX.height}`;
  const glowId = `shadow-fleet-glow-${aspect}-${width}`;
  const drawing = SHADOW_FLEET_ASPECT_DRAWINGS[aspect];

  const boot = drawing.bootStripe
    ? `<path d="${drawing.bootStripe}" fill="#b91c1c" stroke="rgba(127,29,29,0.85)" stroke-width="0.45" stroke-linejoin="round"/>`
    : "";

  const containers = (drawing.containers ?? [])
    .map(
      (d, i) =>
        `<path d="${d}" fill="${i % 2 === 0 ? "rgba(30,41,59,0.88)" : "rgba(71,85,105,0.9)"}" stroke="rgba(244,114,182,0.5)" stroke-width="0.45" stroke-linejoin="round"/>`,
    )
    .join("");

  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(15,23,42,0.55)" stroke="rgba(248,250,252,0.5)" stroke-width="0.55" stroke-linejoin="round"/>`,
    )
    .join("");

  const highlights = (drawing.highlights ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(248,250,252,0.78)" stroke="rgba(255,255,255,0.35)" stroke-width="0.35" stroke-linejoin="round"/>`,
    )
    .join("");

  const radomes = (drawing.radomes ?? [])
    .map(
      (r) =>
        `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="rgba(226,232,240,0.9)" stroke="rgba(15,23,42,0.45)" stroke-width="0.5"/>`,
    )
    .join("");

  const axis = drawing.axis
    ? `<path d="${drawing.axis}" stroke="rgba(244,114,182,0.45)" stroke-width="0.55" stroke-linecap="round" stroke-dasharray="1.4 1.1"/>`
    : "";

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="${glowId}" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.88)"
        stroke-width="1.0"
        stroke-linejoin="miter"
        stroke-linecap="square"
        filter="url(#${glowId})"
      />
      ${boot}
      ${containers}
      ${axis}
      ${details}
      ${highlights}
      ${radomes}
    </svg>
  `.trim();
}
