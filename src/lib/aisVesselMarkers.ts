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

/**
 * 세슘 함선 트래커 — MarineTraffic식 침로 화살.
 * 선종마다 색과 실루엣이 다르다. 코는 뷰박스 위(+Y 화면 북쪽).
 */
export type AisTrackerKind =
  | "cargo"
  | "tanker"
  | "passenger"
  | "fishing"
  | "hsc"
  | "special"
  | "pleasure"
  | "military"
  | "disguised"
  | "other";

export type AisTrackerMark = {
  kind: AisTrackerKind;
  color: string;
  /** 빌보드 한 변(px). 선종마다 덩치가 다르다. */
  px: number;
  hollow: boolean;
};

const TRACKER_COLOR: Record<AisTrackerKind, string> = {
  cargo: "#1B8F3A",
  tanker: "#E10600",
  passenger: "#1565C0",
  fishing: "#F57C00",
  hsc: "#F9A825",
  special: "#00ACC1",
  pleasure: "#C2185B",
  military: "#111827",
  disguised: "#F59E0B",
  other: "#90A4AE",
};

const TRACKER_PX: Record<AisTrackerKind, number> = {
  cargo: 34,
  tanker: 36,
  passenger: 32,
  fishing: 28,
  hsc: 24,
  special: 26,
  pleasure: 22,
  military: 30,
  disguised: 30,
  other: 24,
};

/** ITU class + 군/위장. 위장·군함이 선종 색보다 우선. */
export function aisTrackerKind(vessel: {
  category?: string | null;
  shipType?: number | null;
  disguised?: boolean | null;
}): AisTrackerKind {
  if (vessel.disguised) return "disguised";
  if (vessel.category === "military" || vessel.shipType === 35 || vessel.shipType === 55) {
    return "military";
  }
  const type = vessel.shipType;
  if (type == null || !Number.isFinite(type)) return "other";
  if (type === 30) return "fishing";
  if (type === 36 || type === 37) return "pleasure";
  const g = type >= 10 ? Math.floor(type / 10) : type;
  if (g === 7) return "cargo";
  if (g === 8) return "tanker";
  if (g === 6) return "passenger";
  if (g === 2) return "fishing";
  if (g === 4) return "hsc";
  if (g === 3 || g === 5) return "special";
  return "other";
}

export function aisTrackerMark(vessel: {
  category?: string | null;
  shipType?: number | null;
  disguised?: boolean | null;
}): AisTrackerMark {
  const kind = aisTrackerKind(vessel);
  return {
    kind,
    color: TRACKER_COLOR[kind],
    px: TRACKER_PX[kind],
    hollow: kind === "disguised",
  };
}

/** 코가 위인 화살. kind마다 실루엣이 다르다. */
export function aisTrackerArrowSvg(kind: AisTrackerKind, color: string, size: number): string {
  const stroke = kind === "military" ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.55)";
  const sw = kind === "military" ? 1.35 : 1.05;
  const fill = kind === "disguised" ? "none" : color;
  const body = trackerArrowPath(kind);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${body}
    </svg>
  `
    .trim()
    .replaceAll("{{fill}}", fill)
    .replaceAll("{{stroke}}", stroke)
    .replaceAll("{{sw}}", String(sw));
}

function trackerArrowPath(kind: AisTrackerKind): string {
  const common = `fill="{{fill}}" stroke="{{stroke}}" stroke-width="{{sw}}" stroke-linejoin="round" stroke-linecap="round"`;
  switch (kind) {
    case "tanker":
      return `<path ${common} d="M16 1.2 L29.5 29.5 L16 23.2 L2.5 29.5 Z"/>`;
    case "passenger":
      return `<path ${common} d="M16 1.6 L25 18 L25 30 L7 30 L7 18 Z"/><circle cx="16" cy="22" r="2.1" fill="rgba(255,255,255,0.75)"/>`;
    case "fishing":
      return `<path ${common} d="M16 2.4 L24 29 L16 23.5 L8 29 Z"/><path d="M5 15.5 H27" fill="none" stroke="{{stroke}}" stroke-width="1.6"/>`;
    case "hsc":
      return `<path ${common} d="M16 0.8 L19.2 30 L16 26.2 L12.8 30 Z"/>`;
    case "special":
      return `<path ${common} d="M16 7 L27 30 L16 24.5 L5 30 Z"/>`;
    case "pleasure":
      return `<path ${common} d="M16 5 L22.5 29 L16 24.5 L9.5 29 Z"/>`;
    case "military":
      return `<path ${common} d="M16 1 L26 13.5 L16 10 L6 13.5 Z"/><path ${common} d="M16 13 L26 28.5 L16 23.2 L6 28.5 Z"/>`;
    case "disguised":
      return `<path ${common} d="M16 2 L26 29 L16 23 L6 29 Z"/>`;
    case "other":
      return `<path ${common} d="M16 4 L26 28 L6 28 Z"/>`;
    case "cargo":
    default:
      return `<path ${common} d="M16 1.4 L25.2 30 L16 23.6 L6.8 30 Z"/>`;
  }
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
