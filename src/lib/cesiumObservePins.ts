/**
 * Observe ISR/센서 HUD 핀 — Google 실사 위 접지 디스크 + 니들 + 코어.
 * MapLibre 네온 배지를 복제하지 않는다.
 */

import { OBSERVE_CATEGORY_HEX } from "@/lib/observeSensorStyle";

export type ObservePinKind = "event" | "conflict" | "strike" | "ground";

export type ObserveSensorPinOpts = {
  /** 코어 색 (#rrggbb) */
  coreHex: string;
  kind?: ObservePinKind;
  /** 포커스 — 외곽 펄스 링 1겹 */
  focused?: boolean;
  /** grade 링 (conflict) */
  ringHex?: string;
  ringWidth?: number;
};

const URI_CACHE = new Map<string, string>();

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 카테고리 accent → 실사에 맞는 약간 톤 다운 hex */
export function observePinCoreHex(accent: string | undefined): string {
  const raw = OBSERVE_CATEGORY_HEX[accent ?? ""] ?? OBSERVE_CATEGORY_HEX.white;
  return raw;
}

/**
 * 48×64 — tip at (24,60). BOTTOM origin에 맞춤.
 * 접지 디스크 → 니들 → 코어 → (선택) 글리프/포커스 링
 */
export function observeSensorPinSvg(opts: ObserveSensorPinOpts): string {
  const core = opts.coreHex;
  const kind = opts.kind ?? "event";
  const focused = Boolean(opts.focused);
  const ring = opts.ringHex ?? "rgba(248,250,252,0.9)";
  const rw = Math.max(1.2, opts.ringWidth ?? 1.6);

  const focusRing = focused
    ? `<circle cx="24" cy="22" r="16" fill="none" stroke="${ring}" stroke-width="1.4" opacity="0.85"/>`
    : "";

  let glyph = "";
  if (kind === "strike") {
    glyph = `<polygon points="24,16 28,26 20,26" fill="#fff7ed" opacity="0.95"/>`;
  } else if (kind === "ground") {
    glyph = `<path d="M19 17 L29 27 M29 17 L19 27" stroke="#fafaf9" stroke-width="2.1" stroke-linecap="round"/>`;
  } else if (kind === "conflict") {
    glyph = `<circle cx="24" cy="22" r="${5.2 + rw * 0.15}" fill="none" stroke="${ring}" stroke-width="${rw}" opacity="0.95"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
  <!-- 접지 그림자 -->
  <ellipse cx="24" cy="58" rx="9" ry="3.2" fill="rgba(2,6,23,0.55)"/>
  <!-- 니들 -->
  <path d="M24 12 C16.5 12 11 18.2 11 26.2 C11 36.5 24 52 24 52 C24 52 37 36.5 37 26.2 C37 18.2 31.5 12 24 12Z"
    fill="rgba(15,23,42,0.92)" stroke="rgba(248,250,252,0.88)" stroke-width="1.35"/>
  <!-- 헤드 디스크 -->
  <circle cx="24" cy="22" r="9.5" fill="rgba(2,6,23,0.55)" stroke="rgba(248,250,252,0.55)" stroke-width="0.9"/>
  ${focusRing}
  <!-- 코어 -->
  <circle cx="24" cy="22" r="5.6" fill="${core}" stroke="rgba(2,6,23,0.85)" stroke-width="1.2"/>
  ${glyph}
</svg>`;
}

export function observeSensorPinUri(opts: ObserveSensorPinOpts): string {
  const key = [
    opts.coreHex,
    opts.kind ?? "event",
    opts.focused ? "1" : "0",
    opts.ringHex ?? "",
    (opts.ringWidth ?? 0).toFixed(2),
  ].join("|");
  let uri = URI_CACHE.get(key);
  if (!uri) {
    uri = svgDataUri(observeSensorPinSvg(opts));
    URI_CACHE.set(key, uri);
  }
  return uri;
}

/** 궤도에서 작게, 직하에서 선명 */
export const OBSERVE_PIN_NEAR_M = 120_000;
export const OBSERVE_PIN_FAR_M = 12_000_000;
export const OBSERVE_PIN_NEAR_SCALE = 1.35;
export const OBSERVE_PIN_FAR_SCALE = 0.28;

export const OBSERVE_PIN_WIDTH = 36;
export const OBSERVE_PIN_HEIGHT = 48;
