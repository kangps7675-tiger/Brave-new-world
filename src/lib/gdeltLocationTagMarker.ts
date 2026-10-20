import { CYBER_WAR_ROOM_THEME } from "@/lib/cyberWarRoomTheme";
import { isFreshEvent, TIER_COLORS, type ScoredEvent } from "@/data/eventTiers";
import { gdeltLocationTagLabel } from "@/lib/gdeltLocationTags";
import { GDELT_NEWS_ALERT_LABEL, wrapNewsAlertMarker } from "@/lib/gdeltNewsAlert";
import { isMarkedGdeltImportance } from "@/lib/gdeltImportance";
import { eventPinFill, locationPinSvg } from "@/lib/locationPinMarker";
import { getZoomOutScale } from "@/lib/zoomScale";

export type GdeltTagHtmlMarker = ScoredEvent & {
  markerId: string;
  displayKind: "gdelt-tag-html";
};

function getGdeltTagPinSize(altitude = 1, marked: boolean): number {
  const base = marked ? 22 : 18;
  return Math.max(14, Math.round(base * getZoomOutScale(altitude)));
}

/** 빨강(전투)·주황(외교)·회색(시위) 위치 핀 + 뉴스 뱃지 (S/A 강조) */
export function createGdeltLocationTagBadge(
  event: GdeltTagHtmlMarker,
  altitude: number,
  handlers: {
    onHover: (event: GdeltTagHtmlMarker | null) => void;
    onClick: (event: GdeltTagHtmlMarker) => void;
  },
): HTMLElement {
  const tier =
    event.eventTier === "war" ||
    event.eventTier === "diplomatic" ||
    event.eventTier === "protest"
      ? event.eventTier
      : "war";
  const marked = isMarkedGdeltImportance(event.importanceGrade);
  const categoryLabel = gdeltLocationTagLabel(tier);
  const label = `${GDELT_NEWS_ALERT_LABEL} · ${categoryLabel}`;
  const fresh = isFreshEvent(event);
  const fill = fresh ? CYBER_WAR_ROOM_THEME.intel.telegramMarker : eventPinFill(event);
  const size = getGdeltTagPinSize(altitude, marked);
  const glowColor =
    event.importanceGrade === "S"
      ? "rgba(250, 204, 21, 0.55)"
      : event.importanceGrade === "A"
        ? "rgba(251, 146, 60, 0.5)"
        : fresh
          ? `${CYBER_WAR_ROOM_THEME.intel.telegramMarker}66`
          : TIER_COLORS[tier].dot.replace(/[\d.]+\)$/, "0.42)");
  const stroke =
    tier === "protest" ? "rgba(56, 189, 248, 0.82)" : "rgba(8, 18, 36, 0.55)";

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "gdelt-location-tag-pin";
  pin.dataset.tier = tier;
  pin.dataset.importance = event.importanceGrade;
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", label);
  pin.title = `${label}\n${event.title || event.category || "GDELT 뉴스"}`;

  pin.style.width = `${size}px`;
  pin.style.height = `${Math.round(size * (32 / 22))}px`;
  pin.style.display = "block";
  pin.style.margin = "0";
  pin.style.padding = "0";
  pin.style.border = "none";
  pin.style.background = "transparent";
  pin.style.cursor = "pointer";
  pin.style.userSelect = "none";
  pin.style.filter = marked
    ? `drop-shadow(0 0 ${event.importanceGrade === "S" ? 10 : 8}px ${glowColor}) drop-shadow(0 2px 4px rgba(2,8,20,0.45))`
    : fresh
      ? `drop-shadow(0 0 6px ${TIER_COLORS.war.dot}) drop-shadow(0 2px 4px rgba(2,8,20,0.45))`
      : `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 2px 4px rgba(2,8,20,0.45))`;
  pin.style.transition = "transform 0.15s ease, filter 0.15s ease";

  pin.innerHTML = locationPinSvg({
    fill,
    size,
    stroke,
    freshRing: fresh || marked,
    glowColor,
  });

  const { root } = wrapNewsAlertMarker(pin, tier, event.importanceGrade);

  const baseFilter = pin.style.filter;
  const hoverFilter = marked
    ? `drop-shadow(0 0 14px ${glowColor}) drop-shadow(0 2px 6px rgba(2,8,20,0.5))`
    : fresh
      ? `drop-shadow(0 0 10px ${TIER_COLORS.war.dot}) drop-shadow(0 2px 6px rgba(2,8,20,0.5))`
      : `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 2px 6px rgba(2,8,20,0.5))`;

  pin.addEventListener("mouseenter", () => {
    pin.style.transform = "scale(1.1)";
    pin.style.filter = hoverFilter;
    handlers.onHover(event);
  });
  pin.addEventListener("mouseleave", () => {
    pin.style.transform = "scale(1)";
    pin.style.filter = baseFilter;
    handlers.onHover(null);
  });
  pin.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    handlers.onClick(event);
  });

  return root;
}
