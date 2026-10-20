import type { EventTier } from "@/data/geoTypes";
import {
  FRESH_PIN_HEX,
  TIER_PIN_HEX,
  locationPinSvg,
  tierPinFill,
} from "@/lib/locationPinMarker";

type LocationPinIconProps = {
  tier?: EventTier;
  color?: string;
  size?: number;
  fresh?: boolean;
  className?: string;
  glowColor?: string;
};

export function LocationPinIcon({
  tier,
  color,
  size = 18,
  fresh = false,
  className,
  glowColor,
}: LocationPinIconProps) {
  const fill = color ?? (tier ? tierPinFill(tier) : FRESH_PIN_HEX);
  const stroke =
    tier === "protest" || fill.toLowerCase() === "#e2e8f0"
      ? "rgba(56, 189, 248, 0.82)"
      : "rgba(8, 18, 36, 0.55)";

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: Math.round(size * (32 / 22)),
        filter: fresh ? `drop-shadow(0 0 4px ${FRESH_PIN_HEX})` : undefined,
      }}
      dangerouslySetInnerHTML={{
        __html: locationPinSvg({
          fill,
          size,
          stroke,
          freshRing: fresh,
          glowColor,
        }),
      }}
    />
  );
}

export { TIER_PIN_HEX, FRESH_PIN_HEX };
