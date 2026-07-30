import type { UsCarrier } from "@/data/usCarriers";
import { US_CARRIER_STATUS_COLORS, US_CARRIER_STATUS_LABELS } from "@/data/usCarriers";
import { CARRIER_MARKER_ICON_SIZE } from "@/data/usCarrierDeckSilhouette";
import { AIS_WARSHIP_POINT } from "@/lib/aisVesselClass";
import { isLightTone } from "@/lib/basemapTone";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

export const CARRIER_MARKER_ROOT_CLASS = "carrier-marker-root";
export const CARRIER_MARKER_DEPLOYED_CLASS = "carrier-marker-deployed";
export const CARRIER_MARKER_HOME_CLASS = "carrier-marker-home";

const STACK_GAP_PX = 22;

/** 작전·배치 중인 항모만 (항구·정비 제외) */
export function isOperationalCarrier(carrier: UsCarrier): boolean {
  return carrier.status === "deployed";
}

export function filterVisibleCarriers(carriers: UsCarrier[], showAll: boolean): UsCarrier[] {
  if (showAll) return carriers;
  return carriers.filter(isOperationalCarrier);
}

export function carrierPointColor(_status: UsCarrier["status"]): string {
  return `${AIS_WARSHIP_POINT}e8`;
}

/** 동일 좌표(항구 등) 겹침 시 마커 묶음 세로错開(px) */
export function carrierLabelOffsets(carriers: UsCarrier[]): Map<string, number> {
  const buckets = new Map<string, number>();
  const offsets = new Map<string, number>();

  for (const carrier of carriers) {
    const key = `${carrier.lat.toFixed(2)}:${carrier.lng.toFixed(2)}`;
    const index = buckets.get(key) ?? 0;
    buckets.set(key, index + 1);
    offsets.set(carrier.id, index * STACK_GAP_PX);
  }

  return offsets;
}

export function createUsCarrierBadge(
  carrier: UsCarrier,
  handlers: {
    onHover: (carrier: UsCarrier | null) => void;
    onClick: (carrier: UsCarrier) => void;
  },
  options?: { labelOffsetY?: number },
): HTMLElement {
  const color = US_CARRIER_STATUS_COLORS[carrier.status];
  const deployed = isOperationalCarrier(carrier);
  const stackOffsetY = options?.labelOffsetY ?? 0;

  const outer = document.createElement("div");
  outer.className = [
    CARRIER_MARKER_ROOT_CLASS,
    deployed ? CARRIER_MARKER_DEPLOYED_CLASS : "",
    !deployed && carrier.status === "home" ? CARRIER_MARKER_HOME_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
  outer.dataset.stackOffsetY = String(stackOffsetY);
  outer.dataset.carrierStatus = carrier.status;

  const inner = document.createElement("button");
  inner.type = "button";
  inner.className = ["carrier-marker", deployed ? "carrier-marker--deployed" : ""]
    .filter(Boolean)
    .join(" ");
  inner.setAttribute("role", "img");
  inner.setAttribute("aria-label", `${carrier.name} (${carrier.hull})`);
  inner.title = `${carrier.name} · ${carrier.hull}\n${US_CARRIER_STATUS_LABELS[carrier.status]} · ${carrier.location}`;

  inner.style.display = "flex";
  inner.style.flexDirection = "column";
  inner.style.alignItems = "center";
  inner.style.gap = "2px";
  inner.style.margin = "0";
  inner.style.padding = "0";
  inner.style.background = "transparent";
  inner.style.border = "none";
  inner.style.cursor = "pointer";
  inner.style.transition = "transform 0.15s ease";
  inner.style.pointerEvents = "auto";
  if (!deployed) {
    inner.style.opacity = carrier.status === "maintenance" ? "0.55" : "0.78";
  }

  const iconWrap = document.createElement("span");
  iconWrap.style.display = "block";
  iconWrap.style.width = `${CARRIER_MARKER_ICON_SIZE.width}px`;
  iconWrap.style.height = `${CARRIER_MARKER_ICON_SIZE.height}px`;
  iconWrap.style.flexShrink = "0";
  iconWrap.style.lineHeight = "0";
  iconWrap.style.filter =
    "drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2.5px rgba(239,68,68,0.38))";
  iconWrap.innerHTML = carrierDeckIconSvg(
    carrier.status,
    deployed
      ? { width: CARRIER_MARKER_ICON_SIZE.width + 4, height: CARRIER_MARKER_ICON_SIZE.height + 2 }
      : CARRIER_MARKER_ICON_SIZE,
  );

  const statusBadge = deployed ? document.createElement("span") : null;
  if (statusBadge) {
    statusBadge.textContent = "작전중";
    statusBadge.className = "carrier-status-badge";
    statusBadge.style.display = "block";
    statusBadge.style.marginTop = "1px";
    statusBadge.style.padding = "1px 5px";
    statusBadge.style.borderRadius = "9999px";
    statusBadge.style.border = `1px solid ${color}99`;
    statusBadge.style.background = `${color}33`;
    statusBadge.style.fontSize = "8px";
    statusBadge.style.fontWeight = "700";
    statusBadge.style.lineHeight = "1.2";
    statusBadge.style.letterSpacing = "0.08em";
    statusBadge.style.color = "rgba(254, 242, 242, 0.98)";
    statusBadge.style.textShadow = "0 1px 2px rgba(0,0,0,0.85)";
    statusBadge.style.pointerEvents = "none";
  }

  const label = document.createElement("span");
  label.textContent = carrier.name;
  label.style.display = "block";
  label.style.maxWidth = "72px";
  label.style.fontSize = "9px";
  label.style.fontWeight = "600";
  label.style.lineHeight = "1.2";
  label.style.letterSpacing = "0.01em";
  label.style.textAlign = "center";
  const lightMap = isLightTone();
  label.style.color = lightMap
    ? "rgba(24, 28, 36, 0.94)"
    : "rgba(248, 250, 252, 0.96)";
  label.style.whiteSpace = "normal";
  label.style.wordBreak = "break-word";
  label.style.textShadow = lightMap
    ? "0 0 2px rgba(255,255,255,0.98), 0 1px 2px rgba(255,255,255,0.9)"
    : `0 0 6px ${color}bb, 0 1px 3px rgba(0,0,0,0.92)`;
  label.style.pointerEvents = "none";

  inner.append(iconWrap, ...(statusBadge ? [statusBadge] : []), label);
  outer.append(inner);

  inner.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.08)";
    handlers.onHover(carrier);
  });
  inner.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    handlers.onHover(null);
  });
  inner.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(carrier);
  });

  return outer;
}
