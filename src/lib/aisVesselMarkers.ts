import type { AisVessel } from "@/data/geoTypes";
import { SUBMARINE_PROFILE_SIZE } from "@/data/submarineSilhouette";
import { SURFACE_COMBATANT_PROFILE_SIZE } from "@/data/surfaceCombatantSilhouette";
import { CARRIER_MARKER_ICON_SIZE } from "@/data/usCarrierDeckSilhouette";
import {
  aisCommercialPointColor,
  aisDisplayTypeLabel,
  AIS_SURFACE_COMBATANT_FILL,
  AIS_WARSHIP_FILL,
  isAisAspectHullMarker,
  usesSurfaceCombatantDeckIcon,
} from "@/lib/aisVesselClass";
import {
  SHADOW_FLEET_MARKER_SIZE,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetIconSvg,
  shadowFleetRelativeHeading,
} from "@/lib/shadowFleetDeckIcon";
import {
  surfaceCombatantFacingFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  warshipProfileIconSvg,
} from "@/lib/surfaceCombatantDeckIcon";
import {
  submarineFacingFromRelativeHeading,
  submarineProfileIconSvg,
} from "@/lib/submarineDeckIcon";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

export const AIS_VESSEL_MARKER_ROOT_CLASS = "ais-vessel-marker-root";

let stylesReady = false;

function ensureAisMarkerStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-ais-vessel-markers", "1");
  style.textContent = `
    .${AIS_VESSEL_MARKER_ROOT_CLASS} .ais-vessel-icon {
      display: block;
      transform-origin: 50% 50%;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.75));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS} button:hover .ais-vessel-icon {
      filter: drop-shadow(0 0 8px rgba(125,211,252,0.65)) drop-shadow(0 1px 3px rgba(0,0,0,0.75));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-military="1"] .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2.5px rgba(239,68,68,0.38));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-military="1"] button:hover .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(239,68,68,0.48));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-surface="1"] .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2.5px rgba(239,68,68,0.38));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-surface="1"] button:hover .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(239,68,68,0.48));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-submarine="1"] .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2.5px rgba(239,68,68,0.38));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-submarine="1"] button:hover .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(239,68,68,0.48));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-carrier="1"] .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2.5px rgba(239,68,68,0.38));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-carrier="1"] button:hover .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(239,68,68,0.48));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-shadow="1"] .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(239,68,68,0.45));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS}[data-ais-shadow="1"] button:hover .ais-vessel-icon {
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 5px rgba(239,68,68,0.55));
    }
  `;
  document.head.appendChild(style);
}

/**
 * COG 우선, 없으면 true heading.
 * 8방위 헐 표지(수상·잠수함·그림자함대)는 저속에서도 침로 유지.
 */
export function aisVesselHeadingDeg(
  vessel: AisVessel,
  options?: { allowStationaryHeading?: boolean },
): number | null {
  const raw = vessel.courseOverGround ?? vessel.trueHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw >= 360) return null;
  const sog = vessel.speedOverGround;
  const allowStopped =
    options?.allowStationaryHeading ||
    isAisAspectHullMarker(vessel.militaryKind) ||
    Boolean(vessel.disguised);
  if (!allowStopped && sog != null && Number.isFinite(sog) && sog < 0.4) return null;
  return ((raw % 360) + 360) % 360;
}

function shipColor(vessel: AisVessel): string {
  if (vessel.disguised) return "#c45c5c";
  if (vessel.category === "military") {
    return AIS_SURFACE_COMBATANT_FILL;
  }
  const c = aisCommercialPointColor(vessel.shipType);
  return c.replace(/[\d.]+\)$/, "0.98)") || c;
}

export function aisShipIconSvg(color: string, size: number, military: boolean): string {
  if (military) {
    return warshipProfileIconSvg(color, { width: size + 8, height: Math.round((size + 8) * 0.7) }, "e");
  }
  const w = size;
  const h = size;
  // 코=+Y 델타 쐐기 — 기존 막대 화살보다 짧고, 전술 맵 마커에 가깝게.
  const body = "M16 2.2 L25.5 26.5 L16 21.2 L6.5 26.5 Z";
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="${body}" fill="${color}" stroke="rgba(15,23,42,0.42)" stroke-width="1.05" stroke-linejoin="round"/>
      <circle cx="16" cy="12.5" r="1.25" fill="rgba(255,255,255,0.42)"/>
    </svg>
  `.trim();
}

export function createAisVesselBadge(
  vessel: AisVessel,
  handlers: {
    onHover: (vessel: AisVessel | null) => void;
    onClick: (vessel: AisVessel) => void;
  },
  options?: { lang?: "ko" | "en"; mapBearingDeg?: number },
): HTMLElement {
  ensureAisMarkerStyles();
  const lang = options?.lang ?? "ko";
  const mapBearing = options?.mapBearingDeg ?? 0;
  const military = vessel.category === "military";
  const disguised = Boolean(vessel.disguised);
  /** 구축·호위 등 — 이지스 옆모습 */
  const surface = !disguised && military && usesSurfaceCombatantDeckIcon(vessel.militaryKind);
  const submarine = !disguised && military && vessel.militaryKind === "submarine";
  const carrier = !disguised && military && vessel.militaryKind === "carrier";
  /** 옆모습 E/W — 항모는 俯視+침로 회전 */
  const aspectHull = disguised || surface || submarine;
  const heading = aisVesselHeadingDeg(vessel, { allowStationaryHeading: aspectHull || carrier });
  const color = shipColor(vessel);
  const size = military || disguised ? 28 : 22;

  const relative = aspectHull
    ? disguised
      ? shadowFleetRelativeHeading(heading ?? 0, mapBearing)
      : surfaceCombatantRelativeHeading(heading ?? 0, mapBearing)
    : null;
  const facing: "e" | "w" | null =
    aspectHull && relative != null
      ? disguised
        ? shadowFleetFacingFromRelativeHeading(relative)
        : submarine
          ? submarineFacingFromRelativeHeading(relative)
          : surfaceCombatantFacingFromRelativeHeading(relative)
      : null;
  const aspect = facing;

  const titleBits = [
    vessel.shipName || `MMSI ${vessel.mmsi}`,
    aisDisplayTypeLabel(vessel, lang),
    vessel.disguisedKind === "arsenal-ship"
      ? lang === "en"
        ? "arsenal / shadow"
        : "무기고·위장"
      : vessel.disguisedKind === "dark-fleet"
        ? lang === "en"
          ? "dark fleet"
          : "다크플리트"
        : null,
    vessel.speedOverGround != null ? `${vessel.speedOverGround.toFixed(1)} kn` : null,
    heading != null ? `${Math.round(heading)}°` : lang === "en" ? "no course" : "침로 없음",
  ].filter(Boolean);

  const outer = document.createElement("div");
  outer.className = AIS_VESSEL_MARKER_ROOT_CLASS;
  outer.dataset.aisMmsi = vessel.mmsi;
  if (military) outer.dataset.aisMilitary = "1";
  if (surface) outer.dataset.aisSurface = "1";
  if (submarine) outer.dataset.aisSubmarine = "1";
  if (carrier) outer.dataset.aisCarrier = "1";
  if (disguised) outer.dataset.aisShadow = "1";
  if (aspect) outer.dataset.aisAspect = aspect;
  if (heading != null) outer.dataset.aisHeading = String(Math.round(heading));

  const inner = document.createElement("button");
  inner.type = "button";
  inner.className = "ais-vessel-marker";
  inner.setAttribute("role", "img");
  const roleLabel = disguised
    ? lang === "en"
      ? "Shadow-fleet cargo"
      : "그림자 함대 화물선"
    : submarine
      ? lang === "en"
        ? "Submarine"
        : "잠수함"
      : carrier
        ? lang === "en"
          ? "Aircraft carrier"
          : "항공모함"
        : surface
          ? lang === "en"
            ? "Warship"
            : "군함"
          : military
            ? lang === "en"
              ? "Warship"
              : "군함"
            : lang === "en"
              ? "Vessel"
              : "선박";
  inner.setAttribute("aria-label", `${roleLabel} ${vessel.shipName || vessel.mmsi}`);
  inner.title = titleBits.join(" · ");
  inner.style.display = "flex";
  inner.style.flexDirection = "column";
  inner.style.alignItems = "center";
  inner.style.gap = "1px";
  inner.style.margin = "0";
  inner.style.padding = "0";
  inner.style.background = "transparent";
  inner.style.border = "none";
  inner.style.cursor = "pointer";
  inner.style.pointerEvents = "auto";

  const icon = document.createElement("span");
  icon.className = "ais-vessel-icon";
  if (disguised && facing) {
    icon.style.width = `${SHADOW_FLEET_MARKER_SIZE.width}px`;
    icon.style.height = `${SHADOW_FLEET_MARKER_SIZE.height}px`;
    icon.innerHTML = shadowFleetIconSvg(color, SHADOW_FLEET_MARKER_SIZE, facing);
    if (heading == null) icon.style.opacity = "0.78";
  } else if (submarine && facing) {
    icon.style.width = `${SUBMARINE_PROFILE_SIZE.width}px`;
    icon.style.height = `${SUBMARINE_PROFILE_SIZE.height}px`;
    icon.innerHTML = submarineProfileIconSvg(color, SUBMARINE_PROFILE_SIZE, facing);
    if (heading == null) icon.style.opacity = "0.72";
  } else if (carrier) {
    icon.style.width = `${CARRIER_MARKER_ICON_SIZE.width}px`;
    icon.style.height = `${CARRIER_MARKER_ICON_SIZE.height}px`;
    icon.innerHTML = carrierDeckIconSvg(
      CARRIER_MARKER_ICON_SIZE,
      color || AIS_WARSHIP_FILL,
    );
    if (heading == null) icon.style.opacity = "0.72";
  } else if (surface && facing) {
    icon.style.width = `${SURFACE_COMBATANT_PROFILE_SIZE.width}px`;
    icon.style.height = `${SURFACE_COMBATANT_PROFILE_SIZE.height}px`;
    icon.innerHTML = warshipProfileIconSvg(color, SURFACE_COMBATANT_PROFILE_SIZE, facing);
    if (heading == null) icon.style.opacity = "0.72";
  } else {
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;
    icon.innerHTML = aisShipIconSvg(color, size, military);
    if (heading == null) {
      icon.style.transform = "rotate(-20deg)";
      icon.style.opacity = "0.72";
    }
  }

  inner.append(icon);
  outer.append(inner);

  inner.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.08)";
    handlers.onHover(vessel);
  });
  inner.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    handlers.onHover(null);
  });
  inner.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(vessel);
  });

  return outer;
}
