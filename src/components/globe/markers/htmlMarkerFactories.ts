import { HOVER, staticKindLabel } from "@/lib/hoverLabels";
import { isUsMilitaryOperator } from "@/lib/osmFrontlineBases";
import { getZoomOutScale } from "@/lib/zoomScale";
import { staticMarkerPalette } from "@/lib/staticGlobe";
import { airportSvg, portSvg } from "@/lib/infraStaticMarkers";
import { SITUATION_CALLOUT_ACCENT } from "@/data/situationCalloutTypes";
import { createWarCasualtyOverlayElement } from "@/lib/warCasualtyOverlay";
import { createNuclearStockpileElement } from "@/lib/nuclearStockpiles";
import { docLang, escapeHtml } from "@/components/globe/formatters";
import type {
  CasualtySkullHtmlMarker,
  NuclearStockpileHtmlMarker,
  SituationCalloutMarker,
  StaticGlobePoint,
} from "@/components/globe/types";

function usFlagIconSvg() {
  return `
    <svg width="14" height="10" viewBox="0 0 19 10" aria-hidden="true">
      <rect width="19" height="10" fill="#B22234"/>
      <path d="M0 1.1h19M0 3.3h19M0 5.5h19M0 7.7h19M0 9.9h19" stroke="#fff" stroke-width="0.85"/>
      <rect width="7.6" height="5.4" fill="#3C3B6E"/>
      <g fill="#fff">
        <circle cx="1.1" cy="0.9" r="0.28"/><circle cx="2.5" cy="0.9" r="0.28"/><circle cx="3.9" cy="0.9" r="0.28"/><circle cx="5.3" cy="0.9" r="0.28"/><circle cx="6.7" cy="0.9" r="0.28"/>
        <circle cx="1.8" cy="1.8" r="0.28"/><circle cx="3.2" cy="1.8" r="0.28"/><circle cx="4.6" cy="1.8" r="0.28"/><circle cx="6.0" cy="1.8" r="0.28"/>
        <circle cx="1.1" cy="2.7" r="0.28"/><circle cx="2.5" cy="2.7" r="0.28"/><circle cx="3.9" cy="2.7" r="0.28"/><circle cx="5.3" cy="2.7" r="0.28"/><circle cx="6.7" cy="2.7" r="0.28"/>
        <circle cx="1.8" cy="3.6" r="0.28"/><circle cx="3.2" cy="3.6" r="0.28"/><circle cx="4.6" cy="3.6" r="0.28"/><circle cx="6.0" cy="3.6" r="0.28"/>
        <circle cx="1.1" cy="4.5" r="0.28"/><circle cx="2.5" cy="4.5" r="0.28"/><circle cx="3.9" cy="4.5" r="0.28"/><circle cx="5.3" cy="4.5" r="0.28"/><circle cx="6.7" cy="4.5" r="0.28"/>
      </g>
    </svg>
  `;
}

function genericBaseIconSvg() {
  return `
    <svg width="14" height="12" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="8" width="22" height="14" rx="1" fill="#2563eb" stroke="#bfdbfe" stroke-width="0.8"/>
      <path d="M5 12 H27 M11 8 V22" stroke="#93c5fd" stroke-width="0.7" opacity="0.55"/>
      <circle cx="20" cy="15" r="3" fill="#1d4ed8" stroke="#dbeafe" stroke-width="0.6"/>
    </svg>
  `;
}

export function createAirportPortBadge(
  point: StaticGlobePoint,
  onHover: (point: StaticGlobePoint | null) => void,
  altitude = 0.2,
): HTMLElement {
  const kind =
    point.kind === "airport" || point.kind === "port" || point.kind === "military-base"
      ? point.kind
      : "airport";
  const palette = staticMarkerPalette(kind);
  const isRoundHub = kind === "airport" || kind === "port";
  const zoomScale = getZoomOutScale(altitude);
  const baseSize =
    kind === "military-base"
      ? Math.max(1, Number(point.tier) || 1) <= 2
        ? 28
        : 24
      : Math.max(1, Number(point.tier) || 1) <= 1
        ? 30
        : 26;
  const size = Math.max(12, Math.round(baseSize * zoomScale));

  const el = document.createElement("div");
  el.className = "hub-marker";
  el.dataset.kind = kind;
  el.setAttribute("role", "img");
  const milCountry = String(point.meta?.country ?? "");
  const milLabel = HOVER.militaryBase(docLang(), milCountry);
  el.setAttribute(
    "aria-label",
    kind === "military-base"
      ? `${milLabel} ${point.name}`
      : `${staticKindLabel(point.kind, docLang())} ${point.name}`,
  );
  el.title =
    kind === "military-base"
      ? `${milLabel} · ${point.name}`
      : `${staticKindLabel(point.kind, docLang())} · ${point.name}`;

  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.borderRadius = isRoundHub ? "9999px" : "6px";
  el.style.background = isRoundHub
    ? "transparent"
    : `
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.28), transparent 42%),
    ${palette.fill}
  `;
  el.style.border = isRoundHub ? "none" : `1px solid ${palette.rim}`;
  el.style.boxShadow = isRoundHub
    ? `0 0 10px ${palette.glow}, 0 3px 8px rgba(2, 8, 20, 0.4)`
    : `
    0 0 0 1px rgba(8, 18, 36, 0.25),
    0 0 10px ${palette.glow},
    0 4px 10px rgba(2, 8, 20, 0.35)
  `;
  el.style.backdropFilter = isRoundHub ? "none" : "blur(4px)";
  if (!isRoundHub) {
    el.style.setProperty("-webkit-backdrop-filter", "blur(4px)");
  }
  el.style.color = palette.ink;
  el.style.fontSize = "12px";
  el.style.lineHeight = "1";
  el.style.transform = "translate(-50%, -50%) scale(0.92)";
  el.style.opacity = "0";
  el.style.pointerEvents = "auto";
  el.style.cursor = "default";
  el.style.userSelect = "none";
  el.style.transition =
    "opacity 320ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease, border-color 280ms ease";

  if (kind === "airport") {
    el.innerHTML = airportSvg(size);
  } else if (kind === "port") {
    el.innerHTML = portSvg(size);
  } else {
    el.innerHTML = isUsMilitaryOperator(milCountry) ? usFlagIconSvg() : genericBaseIconSvg();
  }

  el.addEventListener("mouseenter", () => {
    el.style.transform = "translate(-50%, -50%) scale(1.08)";
    el.style.boxShadow = isRoundHub
      ? `0 0 14px ${palette.glow}, 0 5px 12px rgba(2, 8, 20, 0.45)`
      : `
      0 0 0 1px rgba(8, 18, 36, 0.28),
      0 0 14px ${palette.glow},
      0 6px 14px rgba(2, 8, 20, 0.4)
    `;
    onHover(point);
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.boxShadow = isRoundHub
      ? `0 0 10px ${palette.glow}, 0 3px 8px rgba(2, 8, 20, 0.4)`
      : `
      0 0 0 1px rgba(8, 18, 36, 0.25),
      0 0 10px ${palette.glow},
      0 4px 10px rgba(2, 8, 20, 0.35)
    `;
    onHover(null);
  });
  el.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  return el;
}

export function createSituationCalloutBadge(callout: SituationCalloutMarker): HTMLElement {
  const accent = SITUATION_CALLOUT_ACCENT[callout.side];

  const el = document.createElement("div");
  el.className = "situation-callout";
  el.style.maxWidth = "200px";
  el.style.padding = "6px 8px";
  el.style.borderRadius = "4px";
  el.style.border = `1px solid ${accent.border}`;
  el.style.background = accent.bg;
  el.style.color = "#e2e8f0";
  el.style.fontSize = "11px";
  el.style.lineHeight = "1.35";
  // Marker.offset이 위로 띄움 — CSS는 앵커만 맞춤 (사망자·네온과 한 덩어리로 안 보이게)
  el.style.transform = "translate(-50%, -100%)";
  el.style.opacity = "1";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.style.zIndex = "4";
  el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
  el.innerHTML = `<div style="font-weight:700;color:${accent.title};margin-bottom:2px">${escapeHtml(
    callout.title,
  )}</div><div style="opacity:0.92">${escapeHtml(callout.body)}</div>`;
  return el;
}

/** 지정학 — 전장 공통 사상자 오버레이 (호버 타입라이터 포함) */
export function createCasualtySkullBadge(
  marker: CasualtySkullHtmlMarker,
  altitude = 1.8,
): HTMLElement {
  return createWarCasualtyOverlayElement({
    theaterId: marker.theaterId,
    lat: marker.lat,
    lng: marker.lng,
    killed: marker.killed,
    wounded: marker.wounded,
    woundedDisplay: marker.woundedDisplay,
    killedLabel: marker.killedLabel,
    woundedLabel: marker.woundedLabel,
    elegyLines: marker.elegyLines,
    woundedNote: marker.woundedNote,
    hideWounded: marker.hideWounded,
    territorySpanDeg: marker.territorySpanDeg,
    altitude,
    sourceAttribution: marker.sourceAttribution,
  });
}

export function createNuclearStockpileBadge(
  marker: NuclearStockpileHtmlMarker,
  lang: "ko" | "en",
  altitude = 1.8,
): HTMLElement {
  return createNuclearStockpileElement({
    code: marker.code,
    nameKo: marker.nameKo,
    nameEn: marker.nameEn,
    warheads: marker.warheads,
    year: marker.year,
    lang,
    altitude,
  });
}
