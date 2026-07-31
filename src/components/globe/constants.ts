import type { AppData, StaticPoint } from "@/data/geoTypes";
import type { LayerCategory } from "@/components/LayerCategoryPanel";
import type { PolygonLayerFeature } from "@/components/globe/types";
import { CYBER_WAR_ROOM_THEME } from "@/lib/cyberWarRoomTheme";
import { CAMERA_IDLE_DEBOUNCE_MS } from "@/lib/globePerformance";
import { groupRgba, pathKindRgba } from "@/lib/layerColorGroups";
import type { BasemapTone } from "@/lib/basemapTone";

/** Ukraine territorial-control map colors (MapLibre / hatch fallbacks) */
export const US_BASE_FILL = "rgba(37, 99, 235, 0.32)";
export const UKRAINE_RU_OCCUPIED_LINE = "rgba(185, 28, 28, 0.72)";
export const UKRAINE_UA_OCCUPIED_LINE = "rgba(56, 189, 248, 0.7)";
export const UKRAINE_RU_FRONT_LINE = "rgba(220, 38, 38, 1)";
export const UKRAINE_UA_FRONT_LINE = "rgba(37, 99, 235, 0.95)";
export const UKRAINE_UA_GAIN_LINE = "rgba(37, 99, 235, 0.88)";
export const UKRAINE_UA_CLAIM_LINE = "rgba(56, 189, 248, 0.9)";
export const UKRAINE_RU_CLAIM_LINE = "rgba(251, 146, 60, 0.88)";
export const UKRAINE_RU_FILL = "rgba(185, 28, 28, 0.38)";
export const UKRAINE_UA_FILL = "rgba(37, 99, 235, 0.28)";
export const UKRAINE_CONTESTED_FILL = "rgba(234, 179, 8, 0.32)";
export const UKRAINE_RU_STROKE = "rgba(220, 38, 38, 0.55)";
export const UKRAINE_UA_STROKE = "rgba(59, 130, 246, 0.5)";
export const UKRAINE_CONTESTED_STROKE = "rgba(234, 179, 8, 0.55)";
export const UKRAINE_CONTROL_ALTITUDE = 0;
export const UKRAINE_COMBAT_ZONE_LINE = "rgba(100, 116, 139, 0.72)";

export const US_BASE_STROKE = "rgba(96, 165, 250, 0.85)";
export const US_BASE_ALTITUDE = 0.0022;
export const CONFLICT_ZONE_ALTITUDE = 0.0016;
/** 무기금수: crisis 군 테두리 */
export const ARMS_EMBARGO_STROKE = groupRgba("crisis", 0.92, "dark");
export const ARMS_EMBARGO_STROKE_WIDTH = 0.72;

export function armsEmbargoStroke(tone: BasemapTone = "dark"): string {
  return groupRgba("crisis", 0.92, tone);
}
export const INTEL_MISSILE_ARC = CYBER_WAR_ROOM_THEME.intel.missileArc;
export const INTEL_NASA_FIRE = CYBER_WAR_ROOM_THEME.intel.nasaFire;
export const TZEVA_ADOM_MARKER = "#ff1744";

function buildInfraColors(tone: BasemapTone) {
  return {
    rail: {
      dim: groupRgba("infra", 0.48, tone),
      glow: groupRgba("infra", 0.72, tone),
    },
    city: {
      dim: tone === "light" ? "rgba(30, 38, 52, 0.5)" : "rgba(255, 255, 255, 0.42)",
      glow: groupRgba("energy", 0.55, tone),
    },
  } as const;
}

const INFRA_COLORS_BY_TONE = {
  dark: buildInfraColors("dark"),
  light: buildInfraColors("light"),
} as const;

export const INFRA_COLORS = INFRA_COLORS_BY_TONE.dark;

export function infraColors(tone: BasemapTone = "dark") {
  return INFRA_COLORS_BY_TONE[tone];
}

export const INFRA_STROKE = {
  rail: { dim: 0.28, glow: 0.82 },
} as const;

/** 경로 레이어 — 군 단위 통일 (항로=infra, 케이블=digital, 파이프=energy) */
function buildPathLayerColors(tone: BasemapTone) {
  return {
    "shipping-lane": pathKindRgba("shipping-lane", 0.82, tone),
    "submarine-cable": pathKindRgba("submarine-cable", 0.86, tone),
    // 파이프 — 줌아웃·바다 위에서 읽히도록 alpha 상향
    "oil-pipeline": pathKindRgba("oil-pipeline", 0.96, tone),
    "gas-pipeline": pathKindRgba("gas-pipeline", 0.94, tone),
    "subsea-pipeline": pathKindRgba("subsea-pipeline", 0.97, tone),
  } as const;
}

const PATH_LAYER_COLORS_BY_TONE = {
  dark: buildPathLayerColors("dark"),
  light: buildPathLayerColors("light"),
} as const;

export const PATH_LAYER_COLORS = PATH_LAYER_COLORS_BY_TONE.dark;

export function pathLayerColors(tone: BasemapTone = "dark") {
  return PATH_LAYER_COLORS_BY_TONE[tone];
}

export const STATIC_KIND_LABELS: Record<StaticPoint["kind"], string> = {
  airport: "공항",
  port: "항구",
  resource: "자원 매장지",
  "military-base": "군사기지",
  "cable-landing": "케이블 착륙지",
  "nuclear-site": "원자력 시설",
  "internet-exchange": "인터넷 교환점",
  "refugee-camp": "난민 캠프",
  "ucdp-event": "분쟁 사건",
  "ai-data-center": "AI 데이터센터",
  "economic-center": "경제 중심지",
  "sanctions-entity": "제재 대상",
  "space-launch": "우주 발사",
  "missile-silo": "미사일 사일로",
  "strategic-missile-base": "전략미사일 부대",
  "missile-test-site": "미사일 시험장",
  "lng-terminal": "액화가스 터미널",
  chokepoint: "해상 초크포인트",
  "logistics-hub": "핵심 물류 거점",
  "submarine-tunnel": "해저터널",
  "critical-node": "크리티컬 노드",
  "gem-coal-plant": "석탄 발전소",
  "gem-coal-mine": "석탄 광산",
  "gem-coal-terminal": "석탄 터미널",
  "gem-nuclear": "원자력 (GEM)",
  "gem-solar": "태양광",
  "gem-wind": "풍력",
  "gem-hydro": "수력",
  "gem-geothermal": "지열",
  "gem-bioenergy": "바이오에너지",
  "gem-oil-gas-plant": "오일·가스 발전",
  "gem-oil-gas-extraction": "오일·가스 채굴",
  "gem-iron-ore": "철광산",
  "gem-cement": "시멘트",
  "gem-steel": "철강",
  "gem-chemical": "화학",
};

export const EMPTY_OVERLAY_POLYGONS: PolygonLayerFeature[] = [];
export const EMPTY_LAYER_CATEGORIES: LayerCategory[] = [];

export const LAYER_ALTITUDE_SYNC_MIN_DELTA = 0.065;
export const MOVING_IDLE_DELAY_MS = CAMERA_IDLE_DEBOUNCE_MS;
export const INTRO_CAMERA_DURATION_MS = 2200;
export const INTRO_CAMERA_DELAY_MS = 900;
export const INTRO_SESSION_KEY = "cv-intro-seen";
export const WELCOME_GATE_KEY = "geowatch-welcome-gate-v1";
/** 유저가 EN/KO를 한 번이라도 확정했는지 — 등불 직전 게이트 */
export const LANG_CHOICE_KEY = "geowatch-lang-choice-v1";

export const FLOW_PATH_KINDS = new Set([
  "shipping-lane",
  "msr",
  "neptun-projection",
  "axis-link",
  "bri-trade",
  "us-dfc-supply",
]);

export const HEATMAP_MEANINGFUL_DELTA = 28;
export const LABEL_MEANINGFUL_DELTA = 56;
export const PATH_MEANINGFUL_DELTA = 120;
/** HTML 실루엣 마커는 DOM 비용이 커서 뷰포트 포인트보다 더 세게 캡 */
export const INFRA_HTML_MARKER_CAP = 72;
export const LOD_HYSTERESIS_MARGIN = 0.06;
/** 분쟁 외교사(역사 모드) — 줌아웃해도 궤도 밖으로 튕기지 않게 상한 */
export const HISTORY_IMMERSION_MAX_ALTITUDE = 1.38;
export const REGION_FIT_PADDING = 1.18;
export const REGION_MIN_SPAN_DEG = 0.8;
export const REGION_MIN_ALTITUDE = 0.42;
export const REGION_MAX_ALTITUDE = 2.35;

export const emptyData: AppData = {
  generatedAt: "",
  sources: {
    naturalEarth: "",
    gdelt: "",
  },
  countries: [],
  disputes: [],
  places: [],
  events: [],
  roads: [],
  railroads: [],
};
