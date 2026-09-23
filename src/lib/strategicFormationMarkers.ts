import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  ALL_STRATEGIC_POSTURE_SEEDS,
  STRATEGIC_SUPPORT_LINKS,
  strategicFacilityById,
  type StrategicPostureSeed,
  type StrategicPostureVariant,
} from "@/data/strategicFormations";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import type { TransportPath } from "@/data/geoTypes";

/**
 * 지정학 개관 — 핵심 거점(동맹/CRINK)·명명된 전략태세 라벨.
 *
 * 기존 hover-card 전역 리듀서(useHoverCard.ts)를 거치지 않고, 마커 자신이
 * mouseenter/mouseleave로 로컬 툴팁을 여닫는다 — "호버하면 뭔지 설명"을
 * 이 레이어 하나로 완결시켜, 이미 방대한 useHoverCard.ts 디스패치에
 * 새 케이스를 추가하지 않고도(그만큼 회귀 위험 없이) 같은 효과를 낸다.
 */
export type StrategicPostureHtmlMarker = StrategicPostureSeed & {
  markerId: string;
  displayKind: "strategic-posture";
};

export function strategicPostureHtmlMarkers(): StrategicPostureHtmlMarker[] {
  return ALL_STRATEGIC_POSTURE_SEEDS.map((seed) => ({
    ...seed,
    markerId: `strategic-posture-${seed.id}`,
    displayKind: "strategic-posture" as const,
  }));
}

/** 동맹 거점 간 "전략지원" 연결선 — 대권호, 항상 실선(옅은 시안) */
export function strategicSupportArrowPaths(lang: LabelLanguage = "ko"): TransportPath[] {
  const out: TransportPath[] = [];
  for (const link of STRATEGIC_SUPPORT_LINKS) {
    const from = strategicFacilityById(link.fromId);
    const to = strategicFacilityById(link.toId);
    if (!from || !to) continue;
    const points = greatCircleArc(from.lat, from.lng, to.lat, to.lng, 24, 0.06);
    out.push({
      id: link.id,
      kind: "strategic-support-arrow" as TransportPath["kind"],
      name: lang === "en" ? link.nameEn : link.nameKo,
      scalerank: 1,
      lengthKm: null,
      accentColor: "rgba(45, 212, 191, 0.85)",
      bbox: {
        minLat: Math.min(from.lat, to.lat),
        minLng: Math.min(from.lng, to.lng),
        maxLat: Math.max(from.lat, to.lat),
        maxLng: Math.max(from.lng, to.lng),
      },
      points,
      meta: {
        mode: "strategic-support",
        fromName: lang === "en" ? from.nameEn : from.nameKo,
        toName: lang === "en" ? to.nameEn : to.nameKo,
      },
    });
  }
  return out;
}

const VARIANT_ACCENT: Record<StrategicPostureVariant, { fg: string; glow: string; border: string }> = {
  "facility-allied": { fg: "#38bdf8", glow: "rgba(56, 189, 248, 0.85)", border: "rgba(56, 189, 248, 0.9)" },
  "facility-crink": { fg: "#f87171", glow: "rgba(248, 113, 113, 0.85)", border: "rgba(248, 113, 113, 0.9)" },
  formation: { fg: "#fbbf24", glow: "rgba(251, 191, 36, 0.75)", border: "rgba(251, 191, 36, 0.85)" },
};

/** 5각 별 SVG — 동맹/CRINK 거점 공용, 색만 다름 */
function starSvg(color: string): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 1.5l2.98 6.86 7.47.66-5.65 4.94 1.7 7.29L12 17.27 5.5 21.25l1.7-7.29-5.65-4.94 7.47-.66L12 1.5z"/></svg>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let tooltipStyleInjected = false;
function ensureTooltipStyle() {
  if (tooltipStyleInjected || typeof document === "undefined") return;
  if (document.getElementById("strategic-posture-style")) {
    tooltipStyleInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = "strategic-posture-style";
  style.textContent = `
.strategic-posture-marker .strategic-posture-tip {
  opacity: 0;
  transform: translate(-50%, -6px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.strategic-posture-marker:hover .strategic-posture-tip {
  opacity: 1;
  transform: translate(-50%, -10px);
}
`;
  document.head.appendChild(style);
  tooltipStyleInjected = true;
}

/**
 * 핵심 거점(동맹/CRINK) — 별 아이콘, 호버 시 이름+설명 툴팁.
 * 전역 hover-card 리듀서를 타지 않는 자기완결형 마커 (pointer-events:auto).
 */
export function createStrategicPostureElement(
  marker: StrategicPostureHtmlMarker,
  lang: LabelLanguage = "ko",
): HTMLElement {
  ensureTooltipStyle();
  const en = lang === "en";
  const accent = VARIANT_ACCENT[marker.variant];
  const name = en ? marker.nameEn : marker.nameKo;
  const desc = en ? marker.descEn : marker.descKo;

  const root = document.createElement("div");
  root.className = "strategic-posture-marker";
  root.style.cssText = [
    "position:relative",
    "pointer-events:auto",
    "cursor:default",
    "user-select:none",
    "z-index:3",
  ].join(";");

  if (marker.variant === "formation") {
    root.style.transform = "translate(-50%, -50%)";
    const chip = document.createElement("div");
    chip.style.cssText = [
      "padding:2px 7px",
      "border-radius:999px",
      `border:1px dashed ${accent.border}`,
      "background:rgba(15,23,42,0.72)",
      `color:${accent.fg}`,
      "font-size:9.5px",
      "font-weight:600",
      "letter-spacing:0.02em",
      "white-space:nowrap",
      `box-shadow:0 0 8px ${accent.glow}`,
      "backdrop-filter:blur(2px)",
    ].join(";");
    chip.textContent = name;
    root.appendChild(chip);
  } else {
    root.style.transform = "translate(-50%, -50%)";
    const badge = document.createElement("div");
    badge.style.cssText = [
      "width:18px",
      "height:18px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "border-radius:999px",
      "background:rgba(15,23,42,0.78)",
      `border:1px solid ${accent.border}`,
      `box-shadow:0 0 9px ${accent.glow}`,
    ].join(";");
    badge.innerHTML = starSvg(accent.fg);
    root.appendChild(badge);
  }

  const tip = document.createElement("div");
  tip.className = "strategic-posture-tip";
  tip.style.cssText = [
    "position:absolute",
    "left:50%",
    "bottom:100%",
    "min-width:180px",
    "max-width:240px",
    "padding:7px 9px",
    "border-radius:6px",
    `border:1px solid ${accent.border}`,
    "background:rgba(9,12,20,0.95)",
    "color:#e2e8f0",
    "font-size:11px",
    "line-height:1.4",
    "pointer-events:none",
    "z-index:20",
    "box-shadow:0 6px 18px rgba(0,0,0,0.45)",
  ].join(";");
  const sideLabel =
    marker.variant === "facility-allied"
      ? en
        ? "Allied facility"
        : "동맹측 거점"
      : marker.variant === "facility-crink"
        ? en
          ? "CRINK facility"
          : "CRINK측 거점"
        : en
          ? "Named formation"
          : "명명된 전략태세";
  tip.innerHTML = `<div style="font-weight:700;color:${accent.fg};margin-bottom:2px">${escapeHtml(
    name,
  )}</div><div style="opacity:0.6;font-size:9.5px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px">${escapeHtml(
    sideLabel,
  )}</div><div style="opacity:0.92">${escapeHtml(desc)}</div>`;
  root.appendChild(tip);

  return root;
}
