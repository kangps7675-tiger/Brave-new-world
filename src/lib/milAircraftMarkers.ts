import type { MilitaryAircraft } from "@/data/geoTypes";
import { MIL_AIRCRAFT_MARKER_ICON_SIZE } from "@/data/milAircraftSilhouettes";
import {
  classifyMilAircraft,
  milAircraftRoleLabel,
  type MilAircraftKindInfo,
} from "@/lib/milAircraftKind";
import { milAircraftGlowShadow, milAircraftIconSvg } from "@/lib/milAircraftIcon";

export const MIL_AIRCRAFT_MARKER_ROOT_CLASS = "mil-aircraft-marker-root";

let stylesReady = false;

function ensureMilMarkerStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-mil-aircraft-markers", "1");
  style.textContent = `
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} .mil-aircraft-icon-wrap {
      line-height: 0;
    }
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} .mil-aircraft-icon {
      display: block;
      transform-origin: 50% 50%;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.75));
    }
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} button:hover .mil-aircraft-icon {
      filter: drop-shadow(0 0 10px rgba(248,113,113,0.55)) drop-shadow(0 2px 4px rgba(0,0,0,0.75));
    }
  `;
  document.head.appendChild(style);
}

function headingDeg(aircraft: MilitaryAircraft): number | null {
  const raw = aircraft.track ?? aircraft.trueHeading ?? aircraft.magHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  return ((raw % 360) + 360) % 360;
}

/** MapLibre Marker rotation (map-aligned). 코가 위쪽인 실루엣 기준. */
export function milAircraftMarkerRotationDeg(aircraft: MilitaryAircraft): number {
  return headingDeg(aircraft) ?? 0;
}

export function createMilAircraftBadge(
  aircraft: MilitaryAircraft,
  handlers: {
    onHover: (aircraft: MilitaryAircraft | null) => void;
    onClick: (aircraft: MilitaryAircraft) => void;
  },
  options?: {
    lang?: "ko" | "en";
    kind?: MilAircraftKindInfo;
    /** military=지정학 군용, civil=지경학 민간 운항 */
    palette?: "military" | "civil";
  },
): HTMLElement {
  ensureMilMarkerStyles();
  const lang = options?.lang ?? "ko";
  const palette = options?.palette ?? "military";
  // 민간 운항은 여객기(수송기) 실루엣으로 통일
  const kind =
    options?.kind ??
    (palette === "civil"
      ? {
          role: "transport" as const,
          labelKo: "여객기",
          labelEn: "Airliner",
        }
      : classifyMilAircraft(aircraft));
  const roleLabel =
    palette === "civil"
      ? lang === "en"
        ? "Airliner"
        : "여객기"
      : milAircraftRoleLabel(kind, lang);
  const track = headingDeg(aircraft);
  // B-52 / Tu-95 급은 전투기보다 확실히 크게 (장폭 전략폭격기)
  const iconSize =
    kind.role === "bomber"
      ? { width: 46, height: 46 }
      : kind.role === "transport" || kind.role === "tanker" || kind.role === "awacs"
        ? { width: 34, height: 34 }
        : kind.role === "helicopter" || kind.role === "gunship"
          ? { width: 30, height: 30 }
          : MIL_AIRCRAFT_MARKER_ICON_SIZE;

  const titleBits = [
    aircraft.callsign || aircraft.hex.toUpperCase(),
    roleLabel,
    aircraft.type,
    aircraft.altitude != null ? `${aircraft.altitude} ft` : null,
    aircraft.groundSpeed != null ? `${aircraft.groundSpeed} kn` : null,
    track != null ? `${Math.round(track)}°` : null,
  ].filter(Boolean);

  const outer = document.createElement("div");
  outer.className = MIL_AIRCRAFT_MARKER_ROOT_CLASS;
  outer.dataset.milRole = kind.role;
  outer.dataset.milHex = aircraft.hex;
  if (track != null) outer.dataset.milTrack = String(Math.round(track));

  const inner = document.createElement("button");
  inner.type = "button";
  inner.className = "mil-aircraft-marker";
  inner.setAttribute("role", "img");
  inner.setAttribute(
    "aria-label",
    `${roleLabel} ${aircraft.callsign || aircraft.hex}`,
  );
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
  inner.style.transition = "transform 0.15s ease";

  const iconWrap = document.createElement("span");
  iconWrap.className = "mil-aircraft-icon-wrap";
  iconWrap.style.display = "block";
  iconWrap.style.width = `${iconSize.width}px`;
  iconWrap.style.height = `${iconSize.height}px`;

  const icon = document.createElement("span");
  icon.className = "mil-aircraft-icon";
  icon.style.display = "block";
  icon.style.width = `${iconSize.width}px`;
  icon.style.height = `${iconSize.height}px`;
  // 회전은 MapLibre Marker.rotation + rotationAlignment="map" 가 담당 (코=위)
  if (track == null) {
    icon.style.transform = "rotate(-18deg)";
    icon.style.opacity = "0.8";
  }
  icon.style.boxShadow = milAircraftGlowShadow(kind.role, palette);
  icon.innerHTML = milAircraftIconSvg(kind.role, iconSize, { palette });
  iconWrap.appendChild(icon);

  // 캐릭터(역할 배지·콜사인) 없이 실루엣만
  inner.append(iconWrap);
  outer.append(inner);

  inner.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.1)";
    handlers.onHover(aircraft);
  });
  inner.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    handlers.onHover(null);
  });
  inner.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(aircraft);
  });

  return outer;
}
