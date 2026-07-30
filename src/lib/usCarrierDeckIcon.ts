import type { UsCarrierStatus } from "@/data/usCarriers";
import {
  CARRIER_MARKER_ICON_SIZE,
  CARRIER_PROFILE_E,
  CARRIER_PROFILE_W,
  type CarrierDeckIconSize,
} from "@/data/usCarrierDeckSilhouette";
import { surfaceCombatantFacingFromRelativeHeading } from "@/data/surfaceCombatantSilhouette";
import { AIS_WARSHIP_FILL } from "@/lib/aisVesselClass";

export { surfaceCombatantFacingFromRelativeHeading as carrierFacingFromRelativeHeading };

/**
 * CVN 옆모습 실루엣 — 군함과 동일 검정 채움.
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

/** US 항모 마커·범례 — 상태와 무관하게 군함 공용 검정 (+ 약한 빨간 글로우는 CSS) */
export function carrierDeckIconSvg(
  _status: UsCarrierStatus,
  size: CarrierDeckIconSize = CARRIER_MARKER_ICON_SIZE,
  facing: "e" | "w" = "e",
): string {
  return carrierProfileIconSvg(AIS_WARSHIP_FILL, size, facing);
}

export function carrierDeckGlowShadow(_status: UsCarrierStatus): string {
  return `0 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(239,68,68,0.38)`;
}
