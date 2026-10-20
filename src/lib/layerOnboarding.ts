/**
 * 첫 화면·레이어 ON 온보딩용 카피·매핑.
 * 독자: 지정학을 잘 모르는 아마추어 성인 (ELI5, 장난감 비유 금지).
 */

import {
  FIRST_SCREEN_CONFLICT_ON,
  FIRST_SCREEN_ECONOMY_ON,
  FIRST_SCREEN_LIVE_ON,
} from "@/lib/firstScreenLayers";
import { explainLayer } from "@/lib/layerHoverExplain";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

export const LAYER_ON_COACH_SEEN_KEY = "cv-layer-on-coach-seen-v1";

/** 패널 data-layer-toggle id → explainLayer에 쓰는 키 */
const LAYER_EXPLAIN_ALIAS: Record<string, string> = {
  "war-zones": "conflict-zones",
  shipping: "trade-routes",
  "logistics-risk": "critical-nodes",
  ukraine: "viina-ukraine-control",
  "diplomatic-tension": "dispute-zones-me",
};

function explainToggleLayer(layerId: string, lang: LabelLanguage): string | null {
  return (
    explainLayer(layerId, lang) ??
    explainLayer(LAYER_EXPLAIN_ALIAS[layerId] ?? "", lang)
  );
}

/** LayerPrefs 불리언 키 → 패널·범례 data-layer-toggle / explainLayer id */
export const PREF_TO_LAYER_META: Partial<
  Record<
    keyof LayerPrefs,
    { layerId: string; titleKo: string; titleEn: string }
  >
> = {
  showUkraineControl: {
    layerId: "ukraine",
    titleKo: "누가 어디를 잡았나 (우크라·중동)",
    titleEn: "Who holds the ground (UA · ME)",
  },
  showWarZones: {
    layerId: "war-zones",
    titleKo: "전쟁·교전 구역",
    titleEn: "War & combat zones",
  },
  showAlliedBlocs: {
    layerId: "allied-blocs",
    titleKo: "진영(나라 면 색)",
    titleEn: "Alliance / camp fills",
  },
  showIslandChains: {
    layerId: "island-chains",
    titleKo: "도련선·미군 방어선",
    titleEn: "Island chains · US lines",
  },
  showEastAsiaAdiz: {
    layerId: "east-asia-adiz",
    titleKo: "방공식별구역(ADIZ)",
    titleEn: "East Asia ADIZ",
  },
  showGeoEconBlocs: {
    layerId: "geoecon-blocs",
    titleKo: "경제협력 진영",
    titleEn: "Geoeconomic camps",
  },
  showPorts: {
    layerId: "ports",
    titleKo: "주요 항구",
    titleEn: "Major ports",
  },
  showShippingLanes: {
    layerId: "shipping",
    titleKo: "해상 항로",
    titleEn: "Shipping lanes",
  },
  showLogisticsRisk: {
    layerId: "logistics-risk",
    titleKo: "물류 급소·초크",
    titleEn: "Logistics chokepoints",
  },
  showAirports: {
    layerId: "airports",
    titleKo: "주요 공항",
    titleEn: "Major airports",
  },
  showAis: {
    layerId: "ais",
    titleKo: "선박 위치(AIS)",
    titleEn: "Ship tracks (AIS)",
  },
  showAirTraffic: {
    layerId: "air-traffic",
    titleKo: "민간 항공기(ADS-B)",
    titleEn: "Civilian air (ADS-B)",
  },
  showMilitaryActivity: {
    layerId: "military-activity",
    titleKo: "군사 항공기",
    titleEn: "Military aircraft",
  },
  showGpsInterference: {
    layerId: "gps-interference",
    titleKo: "GPS 간섭 추정",
    titleEn: "GPS interference",
  },
  showDiplomaticTension: {
    layerId: "diplomatic-tension",
    titleKo: "외교 긴장 구역",
    titleEn: "Diplomatic tension",
  },
  showFirmsFires: {
    layerId: "firms-fires",
    titleKo: "위성 열점(FIRMS)",
    titleEn: "Satellite heat (FIRMS)",
  },
  showGdeltWar: {
    layerId: "gdelt-war",
    titleKo: "뉴스 · 전투·충돌",
    titleEn: "News · combat",
  },
  showConflictEvents: {
    layerId: "conflict-events",
    titleKo: "전장 사건 핀",
    titleEn: "Conflict event pins",
  },
  showAxisNetwork: {
    layerId: "axis-network",
    titleKo: "CRINK 축 연결",
    titleEn: "CRINK axis links",
  },
  showMilitaryBases: {
    layerId: "military-bases",
    titleKo: "군사기지",
    titleEn: "Military bases",
  },
  showUsCarriers: {
    layerId: "us-carriers",
    titleKo: "미 항모 대략 위치",
    titleEn: "U.S. carrier approx.",
  },
  showNeptun: {
    layerId: "neptun",
    titleKo: "우크라 공중 위협",
    titleEn: "Ukraine air threats",
  },
  showTelegramOsint: {
    layerId: "telegram-osint",
    titleKo: "텔레그램 OSINT",
    titleEn: "Telegram OSINT",
  },
  showOilPipelines: {
    layerId: "oil-pipelines",
    titleKo: "송유관",
    titleEn: "Oil pipelines",
  },
  showGasPipelines: {
    layerId: "gas-pipelines",
    titleKo: "가스관",
    titleEn: "Gas pipelines",
  },
  showSubmarineCables: {
    layerId: "submarine-cables",
    titleKo: "해저 통신 케이블",
    titleEn: "Submarine cables",
  },
};

function firstScreenPatch(mode: ViewerMode): Partial<Record<keyof LayerPrefs, boolean>> {
  if (mode === "economy") return FIRST_SCREEN_ECONOMY_ON;
  if (mode === "live") return FIRST_SCREEN_LIVE_ON;
  return FIRST_SCREEN_CONFLICT_ON;
}

export type FirstScreenLayerLine = {
  prefKey: keyof LayerPrefs;
  layerId: string;
  title: string;
  body: string;
};

/** 지금 모드에서 기본으로 켜져 있는 레이어 목록 (설명 포함) */
export function listFirstScreenLayerLines(
  mode: ViewerMode,
  lang: LabelLanguage,
): FirstScreenLayerLine[] {
  const patch = firstScreenPatch(mode);
  const en = lang === "en";
  const lines: FirstScreenLayerLine[] = [];
  for (const key of Object.keys(patch) as (keyof LayerPrefs)[]) {
    if (!patch[key]) continue;
    const meta = PREF_TO_LAYER_META[key];
    if (!meta) continue;
    const body =
      explainToggleLayer(meta.layerId, lang) ??
      (en
        ? "An information layer on the map. Turn it off anytime in ≡."
        : "지도 위에 얹힌 정보층입니다. ≡ 에서 언제든 끌 수 있습니다.");
    lines.push({
      prefKey: key,
      layerId: meta.layerId,
      title: en ? meta.titleEn : meta.titleKo,
      body,
    });
  }
  return lines;
}

/** 투어·양피지용 — 기본 ON 레이어를 짧게 나열 */
export function firstScreenLayersTourBody(mode: ViewerMode, lang: LabelLanguage): string {
  const lines = listFirstScreenLayerLines(mode, lang);
  const en = lang === "en";
  if (lines.length === 0) {
    return en
      ? "No layers are forced on yet — pick what you need in ≡."
      : "지금은 특별히 강제 켜진 레이어가 없습니다. ≡ 에서 궁금한 것만 켜 보세요.";
  }
  const intro = en
    ? "Already on for this view (you can turn any off in ≡):"
    : "이 화면에서 이미 켜져 있는 것들입니다 (≡ 에서 끌 수 있어요):";
  const bullets = lines.map((l) => `· ${l.title} — ${l.body}`).join("\n");
  const outro = en
    ? "\n\nTap Next when you’ve read this. Nothing else auto-advances."
    : "\n\n다 읽으셨으면 「다음」만 눌러 주세요. 화면을 눌러도 다음으로 가지 않습니다.";
  return `${intro}\n${bullets}${outro}`;
}

export type LayerOnCoachPayload = {
  prefKey: keyof LayerPrefs;
  layerId: string;
  title: string;
  body: string;
};

/** prev→next에서 불리언이 하나만 false→true 일 때만 (일괄 패키지 적용은 제외) */
export function detectSingleLayerTurnOn(
  prev: LayerPrefs,
  next: LayerPrefs,
): LayerOnCoachPayload | null {
  const turnedOn: (keyof LayerPrefs)[] = [];
  for (const key of Object.keys(PREF_TO_LAYER_META) as (keyof LayerPrefs)[]) {
    const a = prev[key];
    const b = next[key];
    if (typeof a === "boolean" && typeof b === "boolean" && !a && b) {
      turnedOn.push(key);
    }
  }
  if (turnedOn.length !== 1) return null;
  const prefKey = turnedOn[0]!;
  const meta = PREF_TO_LAYER_META[prefKey];
  if (!meta) return null;
  return {
    prefKey,
    layerId: meta.layerId,
    title: "",
    body: "",
  };
}

export function buildLayerOnCoachCopy(
  payload: Pick<LayerOnCoachPayload, "prefKey" | "layerId">,
  lang: LabelLanguage,
): LayerOnCoachPayload {
  const meta = PREF_TO_LAYER_META[payload.prefKey];
  const en = lang === "en";
  const title = meta ? (en ? meta.titleEn : meta.titleKo) : en ? "Layer on" : "레이어 켜짐";
  const layerId = payload.layerId || meta?.layerId || "";
  const explain = explainToggleLayer(layerId, lang);
  const body = en
    ? `${explain ?? "This layer is now drawn on the map."}\n\nLook at the highlighted control — that’s the switch you just turned on. Tap Got it when ready.`
    : `${explain ?? "이 정보가 지도 위에 그려지기 시작했습니다."}\n\n빛나는 곳이 방금 켜신 스위치입니다. 읽으셨으면 「알겠어요」를 눌러 주세요.`;
  return { prefKey: payload.prefKey, layerId, title, body };
}

function readSeenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(LAYER_ON_COACH_SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSeenSet(seen: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LAYER_ON_COACH_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

export function hasSeenLayerOnCoach(layerId: string): boolean {
  return readSeenSet().has(layerId);
}

export function markLayerOnCoachSeen(layerId: string): void {
  const seen = readSeenSet();
  seen.add(layerId);
  writeSeenSet(seen);
}

/** 스포트라이트 타깃 — 패널 토글 → 범례 → 패널 버튼 (우선순위 순) */
export function layerCoachTargetCandidates(layerId: string): string[] {
  return [
    `[data-layer-toggle="${layerId}"]`,
    `[data-layer-id="${layerId}"]`,
    "#layer-panel-toggle",
  ];
}

export function resolveLayerCoachTarget(layerId: string): string {
  for (const sel of layerCoachTargetCandidates(layerId)) {
    if (typeof document !== "undefined" && document.querySelector(sel)) return sel;
  }
  return "#layer-panel-toggle";
}
