/**
 * 「묻기」→ 레이어 ON — 의도 태그 화이트리스트 + 규칙 매칭.
 * LLM은 애매할 때만 태그 JSON을 고르고, 실제 패치는 여기서만 만든다.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import {
  RED_SEA_HOUTHI_STACK,
  resolveHotTheaterFocus,
  type HotTheaterLayerPatch,
} from "@/lib/hotTheaterLayers";
import type { DailyRanksPayload } from "@/lib/dailyRanks";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import { LAYER_PREF_LABELS } from "@/lib/viewPackages";

export type AskLayersIntentId =
  | "middle-east"
  | "red-sea-houthi"
  | "ukraine"
  | "korea"
  | "china-taiwan"
  | "shipping-choke"
  | "today-hot";

export const ASK_LAYERS_INTENT_IDS: AskLayersIntentId[] = [
  "middle-east",
  "red-sea-houthi",
  "ukraine",
  "korea",
  "china-taiwan",
  "shipping-choke",
  "today-hot",
];

export type AskLayersFly = { lat: number; lng: number; altitude: number };

export type AskLayersResolved = {
  intent: AskLayersIntentId;
  patch: HotTheaterLayerPatch;
  fly: AskLayersFly | null;
  labelKo: string;
  labelEn: string;
  replyKo: string;
  replyEn: string;
  /** true only keys that will be turned on (for chips) */
  onKeys: Array<keyof LayerPrefs>;
};

const FLY: Record<string, AskLayersFly> = {
  "middle-east": {
    lat: THEATER_FLY_TO["middle-east"].lat,
    lng: THEATER_FLY_TO["middle-east"].lng,
    altitude: 1.55,
  },
  ukraine: { lat: 48.5, lng: 37.5, altitude: 1.35 },
  korea: {
    lat: THEATER_FLY_TO.korea.lat,
    lng: THEATER_FLY_TO.korea.lng,
    altitude: 0.75,
  },
  "china-taiwan": {
    lat: THEATER_FLY_TO["china-taiwan"].lat,
    lng: THEATER_FLY_TO["china-taiwan"].lng,
    altitude: 0.95,
  },
  "choke-bab-el-mandeb": { lat: 12.61, lng: 43.35, altitude: 0.8 },
  "choke-hormuz": { lat: 26.58, lng: 56.25, altitude: 0.72 },
};

const SHIPPING_CHOKE_STACK: HotTheaterLayerPatch = {
  showShippingLanes: true,
  showLogisticsRisk: true,
  showPorts: true,
  showAis: true,
  showOilPipelines: true,
  showGasPipelines: true,
  showLngTerminals: true,
};

function onlyTrueKeys(patch: HotTheaterLayerPatch): Array<keyof LayerPrefs> {
  return (Object.entries(patch) as Array<[keyof LayerPrefs, boolean | undefined]>)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

function buildForIntent(
  intent: AskLayersIntentId,
  ranks?: Pick<DailyRanksPayload, "theater" | "chokepoint"> | null,
): AskLayersResolved {
  if (intent === "today-hot" && ranks) {
    const focus = resolveHotTheaterFocus(ranks);
    if (focus) {
      const onKeys = onlyTrueKeys(focus.patch);
      return {
        intent,
        patch: focus.patch,
        fly: focus.fly,
        labelKo: focus.labelKo,
        labelEn: focus.labelEn,
        replyKo: `오늘 핫존「${focus.labelKo}」에 맞춰 관련 레이어를 켰습니다.`,
        replyEn: `Turned on layers for today's hot zone “${focus.labelEn}”.`,
        onKeys,
      };
    }
  }

  let patch: HotTheaterLayerPatch = {};
  let fly: AskLayersFly | null = null;
  let labelKo = "";
  let labelEn = "";
  let replyKo = "";
  let replyEn = "";

  switch (intent) {
    case "red-sea-houthi":
      patch = {
        ...conceptLayersForConflict("middle-east"),
        ...RED_SEA_HOUTHI_STACK,
      };
      fly = FLY["choke-bab-el-mandeb"];
      labelKo = "홍해·후티 회랑";
      labelEn = "Red Sea · Houthi corridor";
      replyKo =
        "홍해·바브엘만데브 쪽에 맞춰 항로·초크·FIRMS·GDELT·이란 NewFeeds 레이어를 켰습니다.";
      replyEn =
        "Enabled shipping, chokepoint, FIRMS, GDELT, and Iran NewFeeds layers for the Red Sea corridor.";
      break;
    case "middle-east":
      patch = {
        ...conceptLayersForConflict("middle-east"),
        ...RED_SEA_HOUTHI_STACK,
      };
      fly = FLY["middle-east"];
      labelKo = "중동·이란";
      labelEn = "Middle East · Iran";
      replyKo =
        "중동 전장 스택과 이란·중동 공격 소식(NewFeeds) 등 관련 레이어를 켰습니다.";
      replyEn =
        "Enabled the Middle East theater stack including Iran NewFeeds attack markers.";
      break;
    case "ukraine":
      patch = { ...conceptLayersForConflict("russia-ukraine") };
      fly = FLY.ukraine;
      labelKo = "우크라이나";
      labelEn = "Ukraine";
      replyKo = "우크라이나 전선·NEPTUN·전쟁·뉴스 레이어를 켰습니다.";
      replyEn = "Enabled Ukraine front, NEPTUN, war zones, and news layers.";
      break;
    case "korea":
      patch = { ...conceptLayersForConflict("korea") };
      fly = FLY.korea;
      labelKo = "한반도";
      labelEn = "Korean Peninsula";
      replyKo = "한반도·ADIZ·북한 미사일·뉴스 관련 레이어를 켰습니다.";
      replyEn = "Enabled Korea theater, missile, and news-related layers.";
      break;
    case "china-taiwan":
      patch = { ...conceptLayersForConflict("china-taiwan") };
      fly = FLY["china-taiwan"];
      labelKo = "대만·중국";
      labelEn = "Taiwan · China";
      replyKo = "대만해협·도련선·대치 네온 등 관련 레이어를 켰습니다.";
      replyEn = "Enabled Taiwan Strait, island-chain, and incident neon layers.";
      break;
    case "shipping-choke":
      patch = { ...SHIPPING_CHOKE_STACK };
      fly = FLY["choke-hormuz"];
      labelKo = "해상 초크·항로";
      labelEn = "Shipping · chokepoints";
      replyKo = "해상 항로·물류 요충·AIS·에너지관 레이어를 켰습니다.";
      replyEn = "Enabled shipping lanes, logistics hubs, AIS, and energy pipelines.";
      break;
    case "today-hot":
    default:
      patch = {
        ...conceptLayersForConflict("middle-east"),
        ...RED_SEA_HOUTHI_STACK,
      };
      fly = FLY["middle-east"];
      labelKo = "오늘 핫존 (기본)";
      labelEn = "Today hot zone (default)";
      replyKo =
        "랭킹을 못 가져와 중동·홍해 기본 핫존 레이어를 켰습니다. ≡에서 더 조정할 수 있습니다.";
      replyEn =
        "Couldn’t load ranks — enabled default Middle East / Red Sea layers. Fine-tune in ≡.";
      break;
  }

  return {
    intent,
    patch,
    fly,
    labelKo,
    labelEn,
    replyKo,
    replyEn,
    onKeys: onlyTrueKeys(patch),
  };
}

export function isAskLayersIntentId(value: string): value is AskLayersIntentId {
  return (ASK_LAYERS_INTENT_IDS as string[]).includes(value);
}

/** 정규화 질의 — 캐시·규칙용 */
export function normalizeAskQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

type Rule = { intent: AskLayersIntentId; patterns: RegExp[] };

const RULES: Rule[] = [
  {
    intent: "red-sea-houthi",
    patterns: [
      /홍해/,
      /후티/,
      /예멘/,
      /바브/,
      /만데브/,
      /red\s*sea/,
      /houthi/,
      /bab[\s-]*el[\s-]*mandeb/,
      /yemen/,
    ],
  },
  {
    intent: "ukraine",
    patterns: [/우크라/, /키이[ᄇ프]/, /돈바스/, /ukraine/, /kyiv/, /donbas/, /neptun/i],
  },
  {
    intent: "korea",
    patterns: [/한반도/, /북한/, /미사일/, /dmz/, /korea/, /dprk/, /north\s*korea/],
  },
  {
    intent: "china-taiwan",
    patterns: [/대만/, /타이완/, /남중국/, /도련/, /taiwan/, /strait/, /pla\b/i],
  },
  {
    intent: "middle-east",
    patterns: [
      /이란/,
      /중동/,
      /호르무즈/,
      /이스라엘/,
      /가자/,
      /iran/,
      /middle\s*east/,
      /hormuz/,
      /gaza/,
      /israel/,
      /newfeeds?/i,
    ],
  },
  {
    intent: "shipping-choke",
    patterns: [/항로/, /초크/, /수에즈/, /말라카/, /shipping/, /choke/, /suez/, /malacca/, /ais\b/i],
  },
  {
    intent: "today-hot",
    patterns: [/오늘/, /핫/, /hot\s*zone/, /today/, /지금\s*뭐/, /뭐가\s*핫/, /hottest/],
  },
];

/**
 * 규칙만으로 의도 해석. 히트 없으면 null → API가 Haiku 시도.
 */
export function matchAskLayersIntentByRules(query: string): AskLayersIntentId | null {
  const q = normalizeAskQuery(query);
  if (!q) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(q))) return rule.intent;
  }
  return null;
}

export function resolveAskLayersIntent(
  intent: AskLayersIntentId,
  ranks?: Pick<DailyRanksPayload, "theater" | "chokepoint"> | null,
): AskLayersResolved {
  return buildForIntent(intent, ranks);
}

/** 칩 라벨 — LAYER_PREF_LABELS 우선 */
export function askLayersChipLabel(key: keyof LayerPrefs, lang: "ko" | "en"): string {
  const ko = LAYER_PREF_LABELS[key as keyof typeof LAYER_PREF_LABELS];
  if (lang === "ko" && ko) return ko;
  return String(key).replace(/^show/, "").replace(/([A-Z])/g, " $1").trim();
}

/** Haiku용 — 허용 태그만 나열 */
export function askLayersIntentSystemPrompt(): string {
  return [
    "You map a short user question about geopolitics/geoeconomics to ONE intent id.",
    `Allowed ids only: ${ASK_LAYERS_INTENT_IDS.join(", ")}.`,
    'Reply with JSON only: {"intent":"<id>"}. No markdown.',
    "If unclear, use today-hot.",
  ].join(" ");
}
