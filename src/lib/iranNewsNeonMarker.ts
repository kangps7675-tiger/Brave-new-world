/**
 * 이란 NewFeeds HTML 폴백 배지 (기본 표시는 MapLibre 빨간 구체).
 * NewFeeds = 이란 국영·공식 매체 → 빨간 구체 — 흰 네온(UCDP 속보)과 혼용하지 않음.
 */

import type { NewfeedsAttackPoint, NewfeedsSeverity } from "@/lib/newfeeds";
import { severityColor } from "@/lib/newfeeds";
import { localizeNewfeedsLocation, localizeNewfeedsTitle } from "@/lib/newfeedsI18n";

export const IRAN_NEWS_NEON_ROOT = "iran-news-neon-marker";

let stylesReady = false;

function ensureStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-iran-news-neon-markers", "1");
  style.textContent = `
    @keyframes iran-news-ripple {
      0% {
        transform: translate(-50%, -50%) scale(0.3);
        opacity: 0.85;
      }
      65% {
        opacity: 0.22;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.7);
        opacity: 0;
      }
    }
    @keyframes iran-news-core-glow {
      0%, 100% {
        box-shadow:
          0 0 5px 1px rgba(239, 68, 68, 0.95),
          0 0 12px 4px rgba(220, 38, 38, 0.5),
          0 0 22px 8px rgba(185, 28, 28, 0.28);
      }
      50% {
        box-shadow:
          0 0 7px 2px rgba(248, 113, 113, 1),
          0 0 18px 6px rgba(239, 68, 68, 0.7),
          0 0 28px 10px rgba(220, 38, 38, 0.4);
      }
    }
    .${IRAN_NEWS_NEON_ROOT} {
      position: relative;
      width: 12px;
      height: 12px;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      cursor: pointer;
    }
    .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      border: 1.5px solid rgba(239, 68, 68, 0.9);
      box-shadow: 0 0 10px 1px rgba(220, 38, 38, 0.45);
      animation: iran-news-ripple 2.6s ease-out infinite;
      pointer-events: none;
    }
    .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple:nth-child(2) {
      animation-delay: 0.85s;
    }
    .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple:nth-child(3) {
      animation-delay: 1.7s;
    }
    .${IRAN_NEWS_NEON_ROOT} .iran-news-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 8px;
      margin: -4px 0 0 -4px;
      border-radius: 9999px;
      background: radial-gradient(circle at 35% 30%, #fecaca 0%, #ef4444 45%, #b91c1c 100%);
      animation: iran-news-core-glow 1.9s ease-in-out infinite;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple,
      .${IRAN_NEWS_NEON_ROOT} .iran-news-core {
        animation: none !important;
      }
      .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple:nth-child(n+2) {
        display: none;
      }
      .${IRAN_NEWS_NEON_ROOT} .iran-news-ripple:first-child {
        opacity: 0.45;
        transform: translate(-50%, -50%) scale(1.1);
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function severityIntensity(severity: string | undefined): number {
  if (severity === "major") return 1;
  if (severity === "high") return 0.82;
  if (severity === "medium") return 0.62;
  return 0.45;
}

function parseRgba(color: string): { r: number; g: number; b: number; a: number } | null {
  const m = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] != null ? Number(m[4]) : 1,
  };
}

export type IranNewsNeonAttack = NewfeedsAttackPoint & {
  markerId: string;
  /** 가장 가까운 HAPI IRN admin1 태그 */
  hapiTag?: string | null;
};

export function createIranNewsNeonBadge(
  attack: IranNewsNeonAttack,
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: IranNewsNeonAttack | null) => void;
    onClick?: (item: IranNewsNeonAttack) => void;
  },
): HTMLElement {
  ensureStyles();
  const intensity = severityIntensity(attack.severity);
  const sev = (attack.severity || "medium") as NewfeedsSeverity;
  const fill = severityColor(sev);
  const rgba = parseRgba(fill);
  const root = document.createElement("div");
  root.className = IRAN_NEWS_NEON_ROOT;
  root.dataset.markerId = attack.markerId;
  root.dataset.severity = attack.severity || "low";
  const title = localizeNewfeedsTitle(attack.title, lang);
  const location = localizeNewfeedsLocation(attack.location, lang);
  const tagLine = attack.hapiTag
    ? `HAPI · ${attack.hapiTag}`
    : "";
  root.title = [title, location, tagLine].filter(Boolean).join("\n");
  root.setAttribute("role", "img");
  root.setAttribute(
    "aria-label",
    escapeAttr(
      lang === "en" ? `Iran incident · ${title}` : `이란 사건 · ${title}`,
    ),
  );
  root.style.opacity = String(0.75 + intensity * 0.25);

  for (let i = 0; i < 3; i += 1) {
    const ripple = document.createElement("span");
    ripple.className = "iran-news-ripple";
    const size = 4 + intensity * 2.5;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    if (rgba) {
      ripple.style.borderColor = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0.9)`;
      ripple.style.boxShadow = `0 0 10px 1px rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0.45)`;
    }
    root.appendChild(ripple);
  }

  const core = document.createElement("span");
  core.className = "iran-news-core";
  const corePx = 1.5 + intensity * 0.75;
  core.style.width = `${corePx}px`;
  core.style.height = `${corePx}px`;
  core.style.margin = `${-corePx / 2}px 0 0 ${-corePx / 2}px`;
  if (rgba) {
    core.style.background = `radial-gradient(circle at 35% 30%, rgba(254, 226, 226, 0.95) 0%, rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0.95) 48%, rgba(${Math.max(0, rgba.r - 40)}, ${Math.max(0, rgba.g - 20)}, ${Math.max(0, rgba.b - 20)}, 1) 100%)`;
  }
  root.appendChild(core);

  root.addEventListener("mouseenter", () => handlers?.onHover?.(attack));
  root.addEventListener("mouseleave", () => handlers?.onHover?.(null));
  root.addEventListener("click", (ev) => {
    ev.stopPropagation();
    handlers?.onClick?.(attack);
  });

  return root;
}

/** NewFeeds 좌표 → 가장 가까운 이란 HAPI 전선 라벨 */
export function nearestIranHapiTag(
  lat: number,
  lng: number,
  fronts: Array<{ locationCode: string; admin1Name: string; lat: number; lng: number }>,
  maxDeg = 3.5,
): string | null {
  let best: { name: string; d: number } | null = null;
  for (const front of fronts) {
    if (front.locationCode !== "IRN") continue;
    const d = Math.hypot(lat - front.lat, lng - front.lng);
    if (d > maxDeg) continue;
    if (!best || d < best.d) best = { name: front.admin1Name, d };
  }
  return best?.name ?? null;
}
