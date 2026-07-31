/**
 * CVN 공중俯視 갑판 실루엣 — 군함색(검정) 채움.
 * 옆모습(profile)은 레거시로 유지하되, 지도 표지는 이 俯視를 쓴다.
 */
import {
  CARRIER_ANGLED_RUNWAY_PATH,
  CARRIER_AXIAL_RUNWAY_PATH,
  CARRIER_CENTERLINE_PATH,
  CARRIER_DECK_VIEWBOX,
  CARRIER_HULL_OUTLINE_PATH,
  CARRIER_ISLAND_PATH,
  CARRIER_MARKER_ICON_SIZE,
  CARRIER_PROFILE_E,
  CARRIER_PROFILE_W,
  CARRIER_RADAR_DOMES,
  type CarrierDeckIconSize,
} from "@/data/usCarrierDeckSilhouette";
import { AIS_WARSHIP_FILL } from "@/lib/aisVesselClass";

export { surfaceCombatantFacingFromRelativeHeading as carrierFacingFromRelativeHeading } from "@/data/surfaceCombatantSilhouette";

/**
 * CVN 옆모습 — 레거시/테스트용. 지도 기본 표지는 {@link carrierDeckIconSvg}.
 */
export function carrierProfileIconSvg(
  fillColor: string = AIS_WARSHIP_FILL,
  size: CarrierDeckIconSize = CARRIER_MARKER_ICON_SIZE,
  facing: "e" | "w" = "e",
): string {
  const { width, height } = size;
  const drawing = facing === "w" ? CARRIER_PROFILE_W : CARRIER_PROFILE_E;
  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="${fillColor}" stroke="rgba(255,255,255,0.65)" stroke-width="0.4" stroke-linejoin="miter"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 64 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.94)"
        stroke-width="1.0"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
      ${details}
    </svg>
  `.trim();
}

/**
 * CVN 공중俯視 — 항모답게 보이는 갑판 실루엣 + 군함 공용 검정.
 */
export function carrierDeckIconSvg(
  size: CarrierDeckIconSize = CARRIER_MARKER_ICON_SIZE,
  fillColor: string = AIS_WARSHIP_FILL,
): string {
  const { width, height } = size;
  const { width: vbW, height: vbH } = CARRIER_DECK_VIEWBOX;
  const domes = CARRIER_RADAR_DOMES.map(
    (d) =>
      `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="rgba(248,250,252,0.55)" stroke="rgba(255,255,255,0.75)" stroke-width="0.35"/>`,
  ).join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="${CARRIER_HULL_OUTLINE_PATH}"
        fill="${fillColor}"
        stroke="rgba(255,255,255,0.92)"
        stroke-width="0.85"
        stroke-linejoin="round"
      />
      <path d="${CARRIER_AXIAL_RUNWAY_PATH}" fill="none" stroke="rgba(248,250,252,0.88)" stroke-width="0.7" stroke-linecap="round"/>
      <path d="${CARRIER_ANGLED_RUNWAY_PATH}" fill="none" stroke="rgba(248,250,252,0.72)" stroke-width="0.55" stroke-linecap="round"/>
      <path d="${CARRIER_CENTERLINE_PATH}" fill="none" stroke="rgba(250,204,21,0.75)" stroke-width="0.35" stroke-linecap="round"/>
      <path d="${CARRIER_ISLAND_PATH}" fill="${fillColor}" stroke="rgba(255,255,255,0.85)" stroke-width="0.45" stroke-linejoin="miter"/>
      ${domes}
    </svg>
  `.trim();
}

export function carrierDeckGlowShadow(): string {
  return `0 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(239,68,68,0.38)`;
}
