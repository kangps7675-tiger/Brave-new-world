/**
 * 핵탄두 보유량 오버레이 — 각국 좌표 위 ICBM 형상 흰색 SVG + 탄두 수.
 * 출처: Our World in Data (FAS Nuclear Notebook 기반 시계열).
 * https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines.csv
 */

export type NuclearStockpileSeed = {
  /** ISO3 국가 코드 */
  code: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  /** 최신 연도 탄두 수 */
  warheads: number;
  /** 데이터 기준 연도 */
  year: number;
};

export const NUCLEAR_STOCKPILE_SOURCE = {
  titleKo: "핵탄두 보유량",
  titleEn: "Nuclear warhead stockpiles",
  provider: "Our World in Data",
  attribution: "Our World in Data · FAS Nuclear Notebook",
  url: "https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines",
  year: 2026,
} as const;

/**
 * OWID CSV(최신 2026년) 기준 보유국 스냅샷.
 * South Africa(폐기)·World(합계)는 지도 마커에서 제외.
 * 좌표는 국토 중앙부 대표점.
 */
export const NUCLEAR_STOCKPILE_SEEDS: NuclearStockpileSeed[] = [
  { code: "RUS", nameKo: "러시아", nameEn: "Russia", lat: 60.0, lng: 90.0, warheads: 4400, year: 2026 },
  { code: "USA", nameKo: "미국", nameEn: "United States", lat: 39.5, lng: -98.35, warheads: 3700, year: 2026 },
  { code: "CHN", nameKo: "중국", nameEn: "China", lat: 35.5, lng: 103.0, warheads: 620, year: 2026 },
  { code: "FRA", nameKo: "프랑스", nameEn: "France", lat: 46.6, lng: 2.4, warheads: 290, year: 2026 },
  { code: "GBR", nameKo: "영국", nameEn: "United Kingdom", lat: 54.0, lng: -2.4, warheads: 225, year: 2026 },
  { code: "IND", nameKo: "인도", nameEn: "India", lat: 22.8, lng: 79.0, warheads: 190, year: 2026 },
  { code: "PAK", nameKo: "파키스탄", nameEn: "Pakistan", lat: 30.2, lng: 69.5, warheads: 170, year: 2026 },
  { code: "ISR", nameKo: "이스라엘", nameEn: "Israel", lat: 31.4, lng: 35.0, warheads: 90, year: 2026 },
  { code: "PRK", nameKo: "북한", nameEn: "North Korea", lat: 40.2, lng: 127.0, warheads: 60, year: 2026 },
];

/**
 * 카메라 고도에 맞춘 마커 배율.
 * 줌아웃(고도↑)이면 살짝 작아지고, 줌인(고도↓)이면 커져 국가 위에 붙어 보임.
 */
export function getNuclearOverlayScale(altitude: number): number {
  const a = Math.max(0.06, Number.isFinite(altitude) ? altitude : 1.8);
  // 고도 1.8 기준 ~0.7, 넓게 줌아웃하면 하한 유지
  const raw = 1.05 / (a + 0.55);
  return Math.min(1.0, Math.max(0.42, raw));
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NUCLEAR_NUMBER_FONT =
  'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';

/**
 * 북한 화성-18형 형태를 참고한 3단 ICBM 실루엣 — 흰색.
 * (색은 원본과 다르게 흰색 단색, 이모지 아님 · 순수 SVG path)
 * 뾰족한 탄두 노즈콘 → 원통형 동체(단 분리선) → 하단 안정핀 → 노즐.
 */
export function nuclearIcbmSvg(px: number): string {
  const size = Math.max(14, Math.round(px));
  const h = Math.round(size * 2.6);
  return `<svg class="nuclear-icbm-svg" width="${size}" height="${h}" viewBox="0 0 24 64" aria-hidden="true" style="display:block;flex-shrink:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.9))">
  <path fill="#ffffff" stroke="rgba(15,23,42,0.55)" stroke-width="0.8" stroke-linejoin="round" d="M12 1.5c2.9 2.6 4.3 6.2 4.3 10.4v33.5c0 2.6-.5 4.4-1.6 6.4l-1.1 2.1h-3.2l-1.1-2.1c-1.1-2-1.6-3.8-1.6-6.4V11.9C7.7 7.7 9.1 4.1 12 1.5z"/>
  <path fill="#ffffff" stroke="rgba(15,23,42,0.55)" stroke-width="0.8" stroke-linejoin="round" d="M7.7 40.5l-3.9 4.1c-1 1.1-1.5 2.3-1.5 3.7v3.3l5.4-2.6zM16.3 40.5l3.9 4.1c1 1.1 1.5 2.3 1.5 3.7v3.3l-5.4-2.6z"/>
  <path fill="#ffffff" stroke="rgba(15,23,42,0.55)" stroke-width="0.8" stroke-linejoin="round" d="M9.4 53.9h5.2l-1 5.4c-.15.8-.85 1.4-1.6 1.4s-1.45-.6-1.6-1.4z"/>
  <path fill="none" stroke="rgba(15,23,42,0.45)" stroke-width="0.8" stroke-linecap="round" d="M8 22h8M8 34h8M8.4 12.5c1.1-1 6.1-1 7.2 0"/>
</svg>`;
}

export type NuclearOverlayInput = {
  code: string;
  nameKo: string;
  nameEn: string;
  warheads: number;
  year: number;
  lang: "ko" | "en";
  altitude?: number;
};

/**
 * 핵탄두 마커 — ICBM 아이콘 + 탄두 수. 호버 시 국가명·연도·출처 툴팁.
 */
export function createNuclearStockpileElement(
  input: NuclearOverlayInput,
): HTMLElement {
  const en = input.lang === "en";
  const scale = getNuclearOverlayScale(input.altitude ?? 1.8);
  const iconPx = Math.round(15 + 9 * scale);
  const numPx = Math.round(10 + 7 * scale);
  const name = en ? input.nameEn : input.nameKo;
  const countLabel = en ? "warheads" : "핵탄두";

  const el = document.createElement("div");
  el.className = "nuclear-icbm-marker";
  el.dataset.code = input.code;
  el.style.position = "relative";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.gap = "1px";
  el.style.pointerEvents = "auto";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.style.zIndex = "6";
  // 좌표 바로 위(bottom-center 앵커)에 붙게
  el.style.transform = "translate(-50%, -100%) scale(1)";
  el.style.transformOrigin = "50% 100%";

  const iconWrap = document.createElement("div");
  iconWrap.className = "nuclear-icbm-icon";
  iconWrap.innerHTML = nuclearIcbmSvg(iconPx);

  const num = document.createElement("div");
  num.className = "nuclear-icbm-count";
  num.textContent = input.warheads.toLocaleString("en-US");
  num.style.color = "#ffffff";
  num.style.fontFamily = NUCLEAR_NUMBER_FONT;
  num.style.fontWeight = "700";
  num.style.fontSize = `${numPx}px`;
  num.style.lineHeight = "1";
  num.style.letterSpacing = "0.01em";
  num.style.fontVariantNumeric = "tabular-nums";
  num.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
  num.style.webkitTextStroke = "0.25px rgba(0,0,0,0.4)";

  const tip = document.createElement("div");
  tip.className = "nuclear-icbm-tip";
  tip.style.position = "absolute";
  tip.style.left = "50%";
  tip.style.bottom = "100%";
  tip.style.transform = "translate(-50%, -6px)";
  tip.style.marginBottom = "2px";
  tip.style.padding = "5px 8px";
  tip.style.borderRadius = "5px";
  tip.style.border = "1px solid rgba(255,255,255,0.28)";
  tip.style.background = "rgba(8,12,20,0.9)";
  tip.style.color = "rgba(255,255,255,0.96)";
  tip.style.fontFamily =
    'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';
  tip.style.fontWeight = "600";
  tip.style.fontSize = "10px";
  tip.style.lineHeight = "1.4";
  tip.style.whiteSpace = "nowrap";
  tip.style.opacity = "0";
  tip.style.transition = "opacity 0.18s ease";
  tip.style.pointerEvents = "none";
  tip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
  tip.innerHTML = `<div style="font-weight:700">${escapeHtml(name)}</div>
    <div>${escapeHtml(input.warheads.toLocaleString("en-US"))} ${escapeHtml(countLabel)} · ${input.year}</div>
    <div style="opacity:0.7;font-size:9px;margin-top:2px">Our World in Data</div>`;

  el.append(tip, iconWrap, num);

  const show = () => {
    tip.style.opacity = "1";
  };
  const hide = () => {
    tip.style.opacity = "0";
  };
  el.addEventListener("mouseenter", show);
  el.addEventListener("mouseleave", hide);
  el.addEventListener(
    "touchend",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (tip.style.opacity === "1") hide();
      else {
        show();
        setTimeout(hide, 2200);
      }
    },
    { passive: false },
  );

  return el;
}

/** 카메라 고도 변경 시 아이콘·숫자 크기 동기화 */
export function applyNuclearOverlayScale(
  el: HTMLElement,
  scale: number,
  visible = true,
): void {
  const s = Math.min(1.0, Math.max(0.42, scale));
  const iconPx = Math.round(15 + 9 * s);
  const numPx = Math.round(10 + 7 * s);
  const visScale = visible ? 1 : 0.86;
  el.style.transform = `translate(-50%, -100%) scale(${visScale})`;
  el.style.transformOrigin = "50% 100%";

  const svg = el.querySelector<SVGElement>(".nuclear-icbm-svg");
  if (svg) {
    svg.setAttribute("width", String(iconPx));
    svg.setAttribute("height", String(Math.round(iconPx * 2.6)));
  }
  const num = el.querySelector<HTMLElement>(".nuclear-icbm-count");
  if (num) num.style.fontSize = `${numPx}px`;
}
