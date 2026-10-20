import type { EventTier, GreatPowerScope } from "@/data/geoTypes";
import { FRESH_RING_COLOR, TIER_COLORS, isFreshEvent, type ScoredEvent } from "@/data/eventTiers";
import { GDELT_NEWS_ALERT_LABEL, wrapNewsAlertMarker } from "@/lib/gdeltNewsAlert";
import { CYBER_WAR_ROOM_THEME } from "@/lib/cyberWarRoomTheme";
import { getZoomOutScale } from "@/lib/zoomScale";
import { safeColor, safeNumber } from "@/lib/svgSafe";

export const TIER_PIN_HEX: Record<EventTier, string> = {
  war: "#ef4444",
  diplomatic: "#fb923c",
  alliance: "#14b8a6",
  protest: "#e2e8f0",
};

export const FRESH_PIN_HEX = "#facc15";

export type LocationPinOptions = {
  fill: string;
  size?: number;
  stroke?: string;
  freshRing?: boolean;
  glowColor?: string;
};

export function tierPinFill(tier: EventTier): string {
  return TIER_PIN_HEX[tier];
}

export function eventPinFill(event: Pick<ScoredEvent, "eventTier" | "createdAt" | "eventDate">): string {
  return tierPinFill(event.eventTier);
}

export function locationPinSvg({
  fill,
  size = 22,
  stroke = "rgba(8, 18, 36, 0.55)",
  freshRing = false,
  glowColor,
}: LocationPinOptions): string {
  // 이 결과는 dangerouslySetInnerHTML 로 주입되므로 속성값을 검증한다.
  const safeFill = safeColor(fill, "#ef4444");
  const safeStroke = safeColor(stroke, "rgba(8, 18, 36, 0.55)");
  const px = safeNumber(size, 22);
  const height = Math.round(px * (32 / 22));
  const ring = freshRing
    ? `<circle cx="12" cy="11" r="10.5" fill="none" stroke="${FRESH_PIN_HEX}" stroke-width="1.8" opacity="0.9"/>`
    : "";
  const glow = glowColor
    ? `<ellipse cx="12" cy="30" rx="5" ry="1.6" fill="${safeColor(glowColor, "transparent")}" opacity="0.55"/>`
    : "";

  return `
    <svg width="${px}" height="${height}" viewBox="0 0 24 32" fill="none" aria-hidden="true" style="display:block;overflow:visible">
      ${glow}
      ${ring}
      <path
        d="M12 1.5C7.86 1.5 4.5 4.86 4.5 9c0 6.2 7.5 19.5 7.5 19.5S19.5 15.2 19.5 9C19.5 4.86 16.14 1.5 12 1.5Z"
        fill="${safeFill}"
        stroke="${safeStroke}"
        stroke-width="1.2"
      />
      <circle cx="12" cy="9" r="3.25" fill="rgba(255,255,255,0.88)"/>
    </svg>
  `;
}

export function getEventPinSize(
  scope: GreatPowerScope | null | undefined,
  altitude = 1,
): number {
  const base = scope === "rivalry" ? 28 : scope === "intervention" ? 24 : 22;
  return Math.max(10, Math.round(base * getZoomOutScale(altitude)));
}

type EventPinPoint = ScoredEvent & {
  markerId: string;
  displayKind: "event";
};

/** 분쟁 외교사 에피소드 — 좌표 픽스 핀 */
export function createFrictionPinElement(
  fill: string,
  label: string,
  size = 26,
): HTMLElement {
  const el = document.createElement("div");
  el.className = "friction-episode-pin pointer-events-none";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  el.title = label;
  el.style.width = `${size}px`;
  el.style.height = `${Math.round(size * (32 / 22))}px`;
  el.style.transform = "translate(-50%, -100%)";
  el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.55))";
  el.innerHTML = locationPinSvg({
    fill,
    size,
    stroke: "rgba(8, 12, 24, 0.7)",
    freshRing: true,
    glowColor: fill,
  });
  return el;
}

/** 전개 단계 콜아웃 — 탭 가능 */
export function createFrictionStageCalloutElement(
  order: number,
  title: string,
  active: boolean,
  onClick: () => void,
  tone: "violet" | "rose" = "violet",
): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className =
    tone === "rose"
      ? "friction-stage-callout territorial-stage-callout pointer-events-auto"
      : "friction-stage-callout pointer-events-auto";
  el.setAttribute("aria-label", title);
  el.title = title;
  const border =
    tone === "rose" ? "rgba(251,113,133,0.45)" : "rgba(196,181,253,0.45)";
  const bg = tone === "rose" ? "rgba(22,13,16,0.92)" : "rgba(18,14,24,0.92)";
  const color = tone === "rose" ? "#ffe4e6" : "#ede9fe";
  const outline =
    tone === "rose" ? "rgba(251,113,133,0.85)" : "rgba(167,139,250,0.85)";
  const badgeBg =
    tone === "rose" ? "rgba(244,63,94,0.35)" : "rgba(139,92,246,0.35)";
  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:6px",
    "transform:translate(-50%,-100%)",
    `border:1px solid ${border}`,
    `background:${bg}`,
    `color:${color}`,
    "border-radius:999px",
    "padding:6px 10px",
    "font-size:11px",
    "font-weight:600",
    "cursor:pointer",
    "white-space:nowrap",
    "max-width:min(70vw,220px)",
    "box-shadow:0 8px 24px rgba(0,0,0,0.45)",
    active ? `outline:2px solid ${outline}` : "",
  ]
    .filter(Boolean)
    .join(";");
  el.innerHTML = `<span style="display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:999px;background:${badgeBg};font-size:10px">${order}</span><span style="overflow:hidden;text-overflow:ellipsis">${title.replace(/</g, "&lt;")}</span>`;
  el.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return el;
}

export function createEventPinElement(
  point: EventPinPoint,
  altitude: number,
  handlers: {
    onHover: (point: EventPinPoint | null) => void;
    onClick: (point: EventPinPoint) => void;
  },
  options?: { newsAlert?: boolean },
): HTMLElement {
  const fresh = isFreshEvent(point);
  const fill = fresh ? CYBER_WAR_ROOM_THEME.intel.telegramMarker : eventPinFill(point);
  const stroke =
    point.eventTier === "protest" ? "rgba(56, 189, 248, 0.82)" : "rgba(8, 18, 36, 0.55)";
  const size = getEventPinSize(point.greatPowerScope, altitude);
  const glowColor = TIER_COLORS[point.eventTier].dot.replace(/[\d.]+\)$/, "0.42)");

  const newsAlert = options?.newsAlert ?? false;
  const el = document.createElement("div");
  el.className = newsAlert ? "location-pin-marker gdelt-news-pin" : "location-pin-marker";
  el.dataset.tier = point.eventTier;
  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    newsAlert ? `${GDELT_NEWS_ALERT_LABEL} · ${point.eventTier}` : `${point.eventTier} event`,
  );
  el.style.width = `${size}px`;
  el.style.height = `${Math.round(size * (32 / 22))}px`;
  el.style.display = "block";
  if (!newsAlert) {
    el.style.transform = "translate(-50%, -100%)";
    el.style.opacity = "0";
  }
  el.style.pointerEvents = "auto";
  el.style.cursor = "pointer";
  el.style.userSelect = "none";
  el.style.filter = fresh
    ? `drop-shadow(0 0 6px ${FRESH_RING_COLOR}) drop-shadow(0 2px 4px rgba(2,8,20,0.45))`
    : "drop-shadow(0 2px 4px rgba(2,8,20,0.45))";
  el.style.transition =
    "opacity 320ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), filter 280ms ease";
  el.innerHTML = locationPinSvg({
    fill,
    size,
    stroke,
    freshRing: fresh,
    glowColor,
  });

  const mount = newsAlert
    ? wrapNewsAlertMarker(el, point.eventTier, point.importanceGrade).root
    : el;
  const hoverTarget = el;

  const setHoverTransform = (scale: number) => {
    if (newsAlert) {
      hoverTarget.style.transform = scale === 1 ? "none" : `scale(${scale})`;
      return;
    }
    hoverTarget.style.transform =
      scale === 1 ? "translate(-50%, -100%) scale(1)" : "translate(-50%, -100%) scale(1.1)";
  };

  const interactionTarget = newsAlert ? hoverTarget : mount;
  interactionTarget.addEventListener("mouseenter", () => {
    setHoverTransform(1.1);
    handlers.onHover(point);
  });
  interactionTarget.addEventListener("mouseleave", () => {
    setHoverTransform(1);
    handlers.onHover(null);
  });
  interactionTarget.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(point);
  });

  return mount;
}
