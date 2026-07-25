import type { StaticPoint } from "@/data/geoTypes";
import { staticKindLabel } from "@/lib/hoverLabels";

/** HTML 실루엣 마커로 그리는 정적 포인트 kinds (globe points와 이중 렌더 금지) */
export const HTML_STATIC_KINDS = new Set<StaticPoint["kind"]>([
  "airport",
  "port",
  "military-base",
  "ai-data-center",
  "economic-center",
  "nuclear-site",
  "lng-terminal",
  "chokepoint",
  "logistics-hub",
  "resource",
  "critical-node",
]);

export function isHtmlStaticKind(kind: StaticPoint["kind"]): boolean {
  return HTML_STATIC_KINDS.has(kind);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSvg(body: string, size = 28, view = 32): string {
  return `<svg class="infra-static-icon" width="${size}" height="${size}" viewBox="0 0 ${view} ${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}

/**
 * AI 데이터센터 — 긴 평지붕 건물 + 지붕 HVAC 격자 (아이소메트릭 단순 도면).
 * 보라 서버랙/이모지 스타일 금지 · 파란색 건물만.
 */
function dataCenterSvg(): string {
  const uid = `dc${Math.random().toString(36).slice(2, 8)}`;
  // 지붕 HVAC 큐브 (작은 아이소메트릭 박스) — 격자 배치
  const hvac = (cx: number, cy: number) => `
    <path d="M${cx} ${cy - 1.4} L${cx + 1.6} ${cy - 0.55} L${cx} ${cy + 0.3} L${cx - 1.6} ${cy - 0.55} Z" fill="#1e3a8a" stroke="#dbeafe" stroke-width="0.25"/>
    <path d="M${cx - 1.6} ${cy - 0.55} L${cx} ${cy + 0.3} L${cx} ${cy + 1.5} L${cx - 1.6} ${cy + 0.65} Z" fill="#1d4ed8"/>
    <path d="M${cx + 1.6} ${cy - 0.55} L${cx} ${cy + 0.3} L${cx} ${cy + 1.5} L${cx + 1.6} ${cy + 0.65} Z" fill="#2563eb"/>
  `;

  return wrapSvg(
    `
    <defs>
      <linearGradient id="${uid}-roof" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#93c5fd"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
      <linearGradient id="${uid}-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#60a5fa"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
      <linearGradient id="${uid}-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#2563eb"/>
        <stop offset="100%" stop-color="#1e3a8a"/>
      </linearGradient>
    </defs>
    <ellipse cx="16" cy="28.2" rx="12" ry="2.2" fill="#0f172a" opacity="0.35"/>
    <path d="M4 12 L16 6 L28 12 L16 18 Z" fill="url(#${uid}-roof)" stroke="#dbeafe" stroke-width="0.7" stroke-linejoin="round"/>
    <path d="M4 12 L16 18 L16 26 L4 20 Z" fill="url(#${uid}-front)" stroke="#bfdbfe" stroke-width="0.55" stroke-linejoin="round"/>
    <path d="M16 18 L28 12 L28 20 L16 26 Z" fill="url(#${uid}-side)" stroke="#93c5fd" stroke-width="0.55" stroke-linejoin="round"/>
    ${hvac(10.5, 10.2)}
    ${hvac(14.0, 10.2)}
    ${hvac(17.5, 10.2)}
    ${hvac(21.0, 10.2)}
    ${hvac(12.2, 12.4)}
    ${hvac(15.7, 12.4)}
    ${hvac(19.2, 12.4)}
    <g fill="#0ea5e9" stroke="#e0f2fe" stroke-width="0.3" opacity="0.95">
      <rect x="24.2" y="14.2" width="2.4" height="1.5" rx="0.2"/>
      <rect x="23.4" y="16.0" width="2.4" height="1.5" rx="0.2"/>
      <rect x="22.6" y="17.8" width="2.4" height="1.5" rx="0.2"/>
    </g>
    <path d="M7 14.2 L14.5 18 M7 16.2 L14.5 20 M7 18.2 L14.5 22" fill="none" stroke="#bfdbfe" stroke-width="0.45" opacity="0.55"/>
  `,
    32,
    32,
  );
}

/** 도시 스카이라인 = 경제중심지 */
function economicCenterSvg(): string {
  return wrapSvg(`
    <rect x="4" y="14" width="5" height="12" rx="0.6" fill="#34d399" stroke="#a7f3d0" stroke-width="0.6"/>
    <rect x="10" y="8" width="6" height="18" rx="0.6" fill="#10b981" stroke="#6ee7b7" stroke-width="0.6"/>
    <rect x="17" y="12" width="5" height="14" rx="0.6" fill="#059669" stroke="#6ee7b7" stroke-width="0.6"/>
    <rect x="23" y="16" width="4" height="10" rx="0.5" fill="#047857" stroke="#a7f3d0" stroke-width="0.5"/>
    <rect x="11.5" y="11" width="1.2" height="1.2" fill="#ecfdf5" opacity="0.85"/>
    <rect x="14" y="11" width="1.2" height="1.2" fill="#ecfdf5" opacity="0.7"/>
    <rect x="11.5" y="14" width="1.2" height="1.2" fill="#ecfdf5" opacity="0.75"/>
    <rect x="14" y="14" width="1.2" height="1.2" fill="#ecfdf5" opacity="0.6"/>
    <path d="M3 26 H29" stroke="#6ee7b7" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
  `);
}

/** 냉각탑 = 원자력 */
function nuclearSvg(): string {
  return wrapSvg(`
    <ellipse cx="11" cy="24" rx="5" ry="2" fill="#facc15" opacity="0.35"/>
    <ellipse cx="21" cy="24" rx="5" ry="2" fill="#facc15" opacity="0.35"/>
    <path d="M7 24 C7 14 9 8 11 6 C13 8 15 14 15 24 Z" fill="#fde047" stroke="#fef9c3" stroke-width="0.7"/>
    <path d="M17 24 C17 14 19 8 21 6 C23 8 25 14 25 24 Z" fill="#eab308" stroke="#fef9c3" stroke-width="0.7"/>
    <circle cx="16" cy="12" r="3.2" fill="none" stroke="#fef08a" stroke-width="1.1"/>
    <path d="M16 8.8 V15.2 M12.8 12 H19.2" stroke="#fef08a" stroke-width="0.9"/>
  `);
}

/** LNG 저장탱크 */
function lngSvg(): string {
  return wrapSvg(`
    <ellipse cx="16" cy="22" rx="10" ry="3.5" fill="#fb923c" opacity="0.35"/>
    <rect x="7" y="10" width="18" height="12" rx="8" fill="#f97316" stroke="#fed7aa" stroke-width="0.8"/>
    <ellipse cx="16" cy="10" rx="9" ry="3" fill="#fdba74"/>
    <path d="M10 14 H22 M10 17 H22" stroke="#fff7ed" stroke-width="0.7" opacity="0.55"/>
  `, 26);
}

/** 초크포인트 — 닻 + 주황 글로우 */
function chokepointSvg(): string {
  return wrapSvg(`
    <circle cx="16" cy="16" r="13" fill="#fb923c" opacity="0.18"/>
    <circle cx="16" cy="16" r="9" fill="#f97316" opacity="0.22"/>
    <path d="M16 6 V20 M12 10 H20" stroke="#ffedd5" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M16 20 C10 20 8 24 8 26 M16 20 C22 20 24 24 24 26" fill="none" stroke="#fdba74" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="16" cy="8" r="2.2" fill="#ffedd5"/>
  `);
}

/** 광물·자원 — 분쟁 빗금 박스 응용: 테두리 박스 안에 자원별 모양을 빽빽히 채움 (하트 제외) */
type ResourceShapeId =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hex"
  | "bar"
  | "cross"
  | "ring";

type ResourceStyle = { color: string; shape: ResourceShapeId };

const RESOURCE_STYLES: Record<string, ResourceStyle> = {
  Lithium: { color: "#38bdf8", shape: "circle" },
  Cobalt: { color: "#818cf8", shape: "hex" },
  Copper: { color: "#f59e0b", shape: "square" },
  Nickel: { color: "#a3e635", shape: "triangle" },
  "Rare Earths": { color: "#e879f9", shape: "diamond" },
  Graphite: { color: "#94a3b8", shape: "bar" },
  PGM: { color: "#f472b6", shape: "ring" },
  "Platinum Group Metals": { color: "#f472b6", shape: "ring" },
  Uranium: { color: "#facc15", shape: "cross" },
  Iron: { color: "#fb7185", shape: "bar" },
  "Iron Ore": { color: "#fb7185", shape: "bar" },
  Gold: { color: "#fbbf24", shape: "hex" },
  Manganese: { color: "#2dd4bf", shape: "diamond" },
  Titanium: { color: "#7dd3fc", shape: "triangle" },
  Bauxite: { color: "#d97706", shape: "square" },
  Oil: { color: "#78350f", shape: "circle" },
  Gas: { color: "#38bdf8", shape: "circle" },
  Coal: { color: "#18181b", shape: "square" },
  Phosphate: { color: "#84cc16", shape: "hex" },
  Potash: { color: "#c084fc", shape: "diamond" },
  Diamond: { color: "#a5f3fc", shape: "diamond" },
  Tin: { color: "#a16207", shape: "bar" },
  Tungsten: { color: "#64748b", shape: "cross" },
  Molybdenum: { color: "#6366f1", shape: "hex" },
  Zinc: { color: "#4ade80", shape: "square" },
  Chromium: { color: "#22c55e", shape: "triangle" },
  Silver: { color: "#e2e8f0", shape: "circle" },
  Helium: { color: "#f472b6", shape: "ring" },
};

function normalizeMineralKey(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const t = raw.trim();
  if (RESOURCE_STYLES[t]) return t;
  const lower = t.toLowerCase();
  if (lower.includes("rare earth")) return "Rare Earths";
  if (lower.includes("platinum") || lower.includes("pgm") || lower.includes("palladium")) {
    return "Platinum Group Metals";
  }
  if (lower.includes("lithium")) return "Lithium";
  if (lower.includes("cobalt")) return "Cobalt";
  if (lower.includes("copper")) return "Copper";
  if (lower.includes("nickel")) return "Nickel";
  if (lower.includes("graphite")) return "Graphite";
  if (lower.includes("uranium")) return "Uranium";
  if (lower.includes("iron")) return "Iron";
  if (lower.includes("gold")) return "Gold";
  if (lower.includes("manganese")) return "Manganese";
  if (lower.includes("titanium")) return "Titanium";
  if (lower.includes("bauxite")) return "Bauxite";
  if (lower.includes("coal")) return "Coal";
  if (lower.includes("helium")) return "Helium";
  if (lower.includes("gas") || lower.includes("lng")) return "Gas";
  if (lower.includes("oil") || lower.includes("crude")) return "Oil";
  if (lower.includes("phosphate") || lower.includes("phosphor")) return "Phosphate";
  if (lower.includes("potash")) return "Potash";
  if (lower.includes("diamond")) return "Diamond";
  if (lower.includes("tungsten") || lower.includes("wolfram")) return "Tungsten";
  if (lower.includes("molybdenum") || lower.includes("moly")) return "Molybdenum";
  if (lower.includes("chromium") || lower.includes("chrome")) return "Chromium";
  if (lower.includes("silver")) return "Silver";
  if (lower.includes("zinc")) return "Zinc";
  if (lower.includes("tin")) return "Tin";
  return t;
}

export function mineralMarkerColor(mineralType: unknown): string {
  const key = normalizeMineralKey(mineralType);
  return RESOURCE_STYLES[key]?.color ?? "#fbbf24";
}

function mineralShape(mineralType: unknown): ResourceShapeId {
  const key = normalizeMineralKey(mineralType);
  return RESOURCE_STYLES[key]?.shape ?? "square";
}

function shapeAt(shape: ResourceShapeId, cx: number, cy: number, r: number, color: string): string {
  switch (shape) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
    case "square": {
      const s = r * 1.55;
      return `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${color}"/>`;
    }
    case "triangle":
      return `<path d="M${cx} ${cy - r} L${cx + r} ${cy + r * 0.85} L${cx - r} ${cy + r * 0.85} Z" fill="${color}"/>`;
    case "diamond":
      return `<path d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z" fill="${color}"/>`;
    case "hex": {
      const a = r;
      const b = r * 0.55;
      return `<path d="M${cx} ${cy - a} L${cx + b} ${cy - a * 0.5} L${cx + b} ${cy + a * 0.5} L${cx} ${cy + a} L${cx - b} ${cy + a * 0.5} L${cx - b} ${cy - a * 0.5} Z" fill="${color}"/>`;
    }
    case "bar":
      return `<rect x="${cx - r * 1.1}" y="${cy - r * 0.45}" width="${r * 2.2}" height="${r * 0.9}" rx="0.35" fill="${color}"/>`;
    case "cross":
      return `<path d="M${cx - r * 0.35} ${cy - r} H${cx + r * 0.35} V${cy - r * 0.35} H${cx + r} V${cy + r * 0.35} H${cx + r * 0.35} V${cy + r} H${cx - r * 0.35} V${cy + r * 0.35} H${cx - r} V${cy - r * 0.35} H${cx - r * 0.35} Z" fill="${color}"/>`;
    case "ring":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${Math.max(0.7, r * 0.45)}"/>`;
    default:
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${color}"/>`;
  }
}

/**
 * 자원 박스 — 테두리 + 반투명 바탕 + 격자 모양 채움.
 * 분쟁 빗금 박스와 같은 언어, 빗금 대신 자원별 도형.
 */
function resourceSvg(mineralType: unknown): string {
  const color = mineralMarkerColor(mineralType);
  const shape = mineralShape(mineralType);
  const cells: string[] = [];
  const cols = 4;
  const rows = 4;
  const pad = 5.2;
  const box = 32;
  const inner = box - pad * 2;
  const stepX = inner / cols;
  const stepY = inner / rows;
  const r = Math.min(stepX, stepY) * 0.28;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = pad + stepX * (col + 0.5);
      const cy = pad + stepY * (row + 0.5);
      cells.push(shapeAt(shape, cx, cy, r, color));
    }
  }
  return wrapSvg(
    `
    <rect x="2.5" y="2.5" width="27" height="27" rx="1.2" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.35" stroke-opacity="0.95"/>
    <rect x="4.2" y="4.2" width="23.6" height="23.6" rx="0.6" fill="none" stroke="${color}" stroke-width="0.45" stroke-opacity="0.45"/>
    ${cells.join("")}
  `,
    34,
    32,
  );
}

/** 크리티컬 노드 — 육각 골드 */
function criticalNodeSvg(): string {
  return wrapSvg(`
    <path d="M16 4 L26 10 V22 L16 28 L6 22 V10 Z" fill="#fbbf24" stroke="#fef3c7" stroke-width="1" opacity="0.95"/>
    <circle cx="16" cy="16" r="3.5" fill="#78350f" opacity="0.35"/>
    <circle cx="16" cy="16" r="2" fill="#fde68a"/>
  `);
}

/** 물류 거점 */
function logisticsHubSvg(): string {
  return wrapSvg(`
    <rect x="6" y="12" width="20" height="12" rx="1.5" fill="#f43f5e" stroke="#fecdd3" stroke-width="0.8"/>
    <path d="M6 16 H26 M16 12 V24" stroke="#fff1f2" stroke-width="0.7" opacity="0.5"/>
    <path d="M10 12 V8 H22 V12" fill="none" stroke="#fecdd3" stroke-width="1.1"/>
  `);
}

/**
 * 공항 — 연두색 원 + 흰 항공기(상면) + 활주로 스트라이프.
 * 참조: public/assets/reference/airport-icon-ref.png (배경만 연두로 변경)
 */
export function airportSvg(size = 30): string {
  return wrapSvg(
    `
    <circle cx="16" cy="16" r="15" fill="#a3e635"/>
    <circle cx="16" cy="16" r="15" fill="none" stroke="#ecfccb" stroke-width="0.6" opacity="0.55"/>
    <!-- 활주로 스트라이프 (하단 → 날개) -->
    <path d="M9.2 28.5 L12.6 17.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.95"/>
    <path d="M22.8 28.5 L19.4 17.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.95"/>
    <!-- 동체 -->
    <ellipse cx="16" cy="13.2" rx="2.15" ry="7.2" fill="#fff"/>
    <!-- 주익 -->
    <path d="M16 12.2 L4.5 16.4 L5.2 17.6 L16 15.1 L26.8 17.6 L27.5 16.4 Z" fill="#fff"/>
    <!-- 미익 -->
    <path d="M16 18.8 L11.2 21.6 L11.6 22.5 L16 20.4 L20.4 22.5 L20.8 21.6 Z" fill="#fff"/>
    <!-- 기수 -->
    <ellipse cx="16" cy="6.4" rx="1.55" ry="1.9" fill="#fff"/>
    <!-- 수직미익 -->
    <path d="M16 19.6 L16 22.8 L17.5 21.2 Z" fill="#fff" opacity="0.95"/>
  `,
    size,
    32,
  );
}

/**
 * 항구 — 파란 원 + 흰 닻 (참조 아이콘, 닻만 흰색으로).
 * 참조: public/assets/reference/airport-port-icons-ref.png
 */
export function portSvg(size = 30): string {
  return wrapSvg(
    `
    <circle cx="16" cy="16" r="15" fill="#2563eb"/>
    <circle cx="16" cy="16" r="15" fill="none" stroke="#93c5fd" stroke-width="0.7" opacity="0.65"/>
    <!-- 고리 -->
    <circle cx="16" cy="7.2" r="2.35" fill="none" stroke="#fff" stroke-width="1.85"/>
    <!-- 생크 -->
    <path d="M16 9.4 V20.2" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/>
    <!-- 스톡(가로바) -->
    <path d="M10.2 12.4 H21.8" stroke="#fff" stroke-width="2.05" stroke-linecap="round"/>
    <!-- 암·플룩 -->
    <path d="M16 20.2 C10.2 20.2 7.6 24.2 7.2 27.4" fill="none" stroke="#fff" stroke-width="2.05" stroke-linecap="round"/>
    <path d="M16 20.2 C21.8 20.2 24.4 24.2 24.8 27.4" fill="none" stroke="#fff" stroke-width="2.05" stroke-linecap="round"/>
    <path d="M7.2 27.4 L5.4 25.2 M24.8 27.4 L26.6 25.2" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="16" cy="20.2" r="1.35" fill="#fff"/>
  `,
    size,
    32,
  );
}

function militaryBaseSvg(): string {
  return wrapSvg(`
    <rect x="5" y="8" width="22" height="14" rx="1" fill="#2563eb" stroke="#bfdbfe" stroke-width="0.8"/>
    <path d="M5 12 H27 M11 8 V22" stroke="#93c5fd" stroke-width="0.7" opacity="0.55"/>
    <circle cx="20" cy="15" r="3" fill="#1d4ed8" stroke="#dbeafe" stroke-width="0.6"/>
  `);
}

function iconFor(point: StaticPoint): string {
  switch (point.kind) {
    case "ai-data-center":
      return dataCenterSvg();
    case "economic-center":
      return economicCenterSvg();
    case "nuclear-site":
      return nuclearSvg();
    case "lng-terminal":
      return lngSvg();
    case "chokepoint":
      return chokepointSvg();
    case "logistics-hub":
      return logisticsHubSvg();
    case "critical-node":
      return criticalNodeSvg();
    case "resource":
      return resourceSvg(point.meta?.mineralType ?? point.meta?.commodity);
    case "airport":
      return airportSvg();
    case "port":
      return portSvg();
    case "military-base":
      return militaryBaseSvg();
    default:
      return wrapSvg(`<circle cx="16" cy="16" r="6" fill="#94a3b8"/>`);
  }
}

let stylesReady = false;
function ensureStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-infra-static-markers", "1");
  style.textContent = `
    @keyframes choke-glow-pulse {
      0%, 100% { box-shadow: 0 0 10px 4px rgba(251,146,60,0.35); }
      50% { box-shadow: 0 0 18px 8px rgba(249,115,22,0.45); }
    }
    .infra-static-marker-root { pointer-events: auto; }
    .infra-static-marker-root button {
      display: flex; flex-direction: column; align-items: center;
      margin: 0; padding: 0; border: none; background: transparent; cursor: pointer;
    }
    .infra-static-marker-root .infra-static-icon {
      display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.75));
    }
    .infra-static-marker-root[data-kind="chokepoint"] .infra-static-glow {
      width: 34px; height: 34px; border-radius: 9999px;
      background: radial-gradient(circle, rgba(251,146,60,0.45) 0%, rgba(249,115,22,0.12) 55%, transparent 72%);
      animation: choke-glow-pulse 2.8s ease-in-out infinite;
      display: flex; align-items: center; justify-content: center;
    }
    .infra-static-marker-root[data-kind="chokepoint"][data-stress="elevated"] .infra-static-glow {
      background: radial-gradient(circle, rgba(248,113,113,0.55) 0%, rgba(239,68,68,0.18) 55%, transparent 72%);
      animation: choke-glow-pulse 1.6s ease-in-out infinite;
    }
    .infra-static-marker-root[data-kind="chokepoint"][data-stress="watch"] .infra-static-glow {
      background: radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.15) 55%, transparent 72%);
    }
    .infra-static-marker-root[data-kind="chokepoint"][data-stress="normal"] .infra-static-glow {
      background: radial-gradient(circle, rgba(52,211,153,0.45) 0%, rgba(16,185,129,0.12) 55%, transparent 72%);
    }
  `;
  document.head.appendChild(style);
}

export function createInfraStaticBadge(
  point: StaticPoint & { markerId?: string; stressLevel?: string },
  handlers: {
    onHover: (point: (StaticPoint & { markerId?: string }) | null) => void;
    onClick?: (point: StaticPoint & { markerId?: string }) => void;
  },
  options?: { lang?: "ko" | "en"; size?: number },
): HTMLElement {
  ensureStyles();
  const lang = options?.lang ?? "ko";
  const outer = document.createElement("div");
  outer.className = "infra-static-marker-root";
  outer.dataset.kind = point.kind;
  if (point.kind === "chokepoint" && point.stressLevel) {
    outer.dataset.stress = point.stressLevel;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  const kindLabel = staticKindLabel(point.kind, lang);
  btn.setAttribute("role", "img");
  btn.setAttribute("aria-label", `${kindLabel} ${point.name}`);
  btn.title = `${kindLabel} · ${point.name}`;

  if (point.kind === "chokepoint") {
    const glow = document.createElement("span");
    glow.className = "infra-static-glow";
    glow.innerHTML = iconFor(point);
    btn.appendChild(glow);
  } else {
    const wrap = document.createElement("span");
    wrap.innerHTML = iconFor(point);
    btn.appendChild(wrap);
  }

  const label = document.createElement("span");
  label.textContent = point.name;
  label.style.cssText =
    "margin-top:2px;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:600;color:rgba(248,250,252,0.92);text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;";
  // 데이터센터는 건물 도면만 — 이름/이모지 캡션 없음
  if (
    point.kind !== "ai-data-center" &&
    (point.kind === "chokepoint" || point.kind === "critical-node" || (point.tier ?? 3) <= 1)
  ) {
    btn.appendChild(label);
  }

  btn.addEventListener("mouseenter", () => handlers.onHover(point));
  btn.addEventListener("mouseleave", () => handlers.onHover(null));
  if (handlers.onClick) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlers.onClick?.(point);
    });
  }

  outer.appendChild(btn);
  void esc;
  return outer;
}
