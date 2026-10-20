import type { FinancialMarketHub } from "@/data/financialMarketHubs";
import { hubSessionStatuses } from "@/lib/marketSessions";

export type FinancialHubHtmlMarker = {
  markerId: string;
  displayKind: "financial-hub-html";
  id: string;
  lat: number;
  lng: number;
  labelKo: string;
  labelEn: string;
  open: boolean;
  localClock: string;
};

export function financialHubHtmlMarkers(
  at: Date = new Date(),
): FinancialHubHtmlMarker[] {
  return hubSessionStatuses(at).map(({ hub, open, localClock }) =>
    hubToMarker(hub, open, localClock),
  );
}

function hubToMarker(
  hub: FinancialMarketHub,
  open: boolean,
  localClock: string,
): FinancialHubHtmlMarker {
  return {
    markerId: `financial-hub-${hub.id}`,
    displayKind: "financial-hub-html",
    id: hub.id,
    lat: hub.lat,
    lng: hub.lng,
    labelKo: hub.labelKo,
    labelEn: hub.labelEn,
    open,
    localClock,
  };
}

export function createFinancialHubMarkerElement(
  marker: FinancialHubHtmlMarker,
  lang: "ko" | "en" = "ko",
): HTMLElement {
  const label = lang === "en" ? marker.labelEn : marker.labelKo;
  const open = marker.open;
  const color = open ? "#2dd4bf" : "#64748b";
  const root = document.createElement("div");
  root.className = `financial-hub-marker${open ? " is-open" : " is-closed"}`;
  root.title = `${label} · ${marker.localClock}${open ? " · open" : " · closed"}`;
  root.setAttribute("aria-label", root.title);
  root.style.cssText = [
    "transform:translate(-50%,-50%)",
    "position:relative",
    "width:14px",
    "height:14px",
    "pointer-events:none",
  ].join(";");

  const pin = document.createElement("span");
  pin.style.cssText = [
    "display:block",
    "width:10px",
    "height:10px",
    "margin:2px",
    "border-radius:999px",
    `background:${open ? "rgba(45,212,191,0.95)" : "rgba(30,41,59,0.92)"}`,
    `border:1.5px solid ${color}`,
    open
      ? "box-shadow:0 0 8px rgba(45,212,191,0.75)"
      : "box-shadow:0 0 2px rgba(15,23,42,0.8)",
  ].join(";");
  root.appendChild(pin);

  if (open) {
    const pulse = document.createElement("span");
    pulse.style.cssText = [
      "position:absolute",
      "inset:-4px",
      "border-radius:999px",
      "border:1.5px solid rgba(45,212,191,0.65)",
      "animation:financial-hub-pulse 1.8s ease-out infinite",
      "pointer-events:none",
    ].join(";");
    root.appendChild(pulse);
    ensurePulseKeyframes();
  }

  return root;
}

let pulseInjected = false;
function ensurePulseKeyframes() {
  if (pulseInjected || typeof document === "undefined") return;
  if (document.getElementById("financial-hub-pulse-style")) {
    pulseInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = "financial-hub-pulse-style";
  style.textContent = `
@keyframes financial-hub-pulse {
  0% { transform: scale(0.7); opacity: 0.85; }
  70% { transform: scale(1.55); opacity: 0; }
  100% { transform: scale(1.55); opacity: 0; }
}`;
  document.head.appendChild(style);
  pulseInjected = true;
}
