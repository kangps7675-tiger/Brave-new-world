/**
 * 지정학 L2 고리 카탈로그 (MVP).
 * 고리마다 layers ≤ 3 — deepDive layerBudget가 한 번 더 자른다.
 */

import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import type { DeepDiveRing } from "@/lib/deepDive/rings";
import {
  FRICTION_DEEP_DIVE_PATCH,
  TERRITORIAL_DEEP_DIVE_PATCH,
} from "@/lib/deepDive/session";

const PENINSULA: DeepDiveRing[] = [
  {
    id: "peninsula-tension",
    titleKo: "한반도 긴장 구역",
    titleEn: "Peninsula tension zones",
    blurbKo: "전쟁·외교 긴장 구역을 겹쳐 보면, 어디가 실제로 팽팽한지 한눈에 들어옵니다.",
    blurbEn: "Stack war and diplomatic tension zones to see where pressure concentrates.",
    tag: "established",
    layers: {
      showWarZones: true,
      showDiplomaticTension: true,
      showAlliedBlocs: true,
    },
    camera: { lat: 38.0, lng: 127.0, altitude: 1.15 },
  },
  {
    id: "peninsula-bases",
    titleKo: "한·미·일 기지 맥락",
    titleEn: "ROK · US · Japan basing context",
    blurbKo: "기지 점만으로는 동맹 전체가 보이지 않습니다. 긴장 구역과 함께 읽습니다.",
    blurbEn: "Bases alone are not the alliance — read them with tension zones.",
    tag: "reported",
    layers: {
      showRokMilitaryBases: true,
      showMilitaryBases: true,
      showJapanMilitaryBases: true,
    },
    camera: { lat: 36.5, lng: 128.5, altitude: 1.05 },
  },
  {
    id: "peninsula-blocs",
    titleKo: "동맹·진영 그림자",
    titleEn: "Allied bloc silhouette",
    blurbKo: "진영 음영은 조약 목록이 아니라, 공개된 안보 연계의 뼈대입니다.",
    blurbEn: "Bloc shading is a linkage spine — not a treaty checklist.",
    tag: "established",
    layers: {
      showAlliedBlocs: true,
      showDiplomaticTension: true,
      showWarZones: true,
    },
    camera: { lat: 35.0, lng: 130.0, altitude: 1.4 },
  },
];

const TAIWAN: DeepDiveRing[] = [
  {
    id: "taiwan-strait",
    titleKo: "대만해협 · 도련선",
    titleEn: "Taiwan Strait · island chains",
    blurbKo: "해협과 도련선은 ‘닫힌 바다’가 아니라, 통행·억제가 겹치는 좁은 길입니다.",
    blurbEn: "The strait and island chains are contested corridors — not a sealed sea.",
    tag: "established",
    layers: {
      showIslandChains: true,
      showWarZones: true,
      showDiplomaticTension: true,
    },
    camera: { lat: 24.0, lng: 121.0, altitude: 1.0 },
  },
  {
    id: "taiwan-adiz",
    titleKo: "방공식별구역(ADIZ)",
    titleEn: "Air defense identification zone",
    blurbKo: "ADIZ는 영공이 아닙니다. 식별을 요구하는 구역이라, 침범과 다르게 읽어야 합니다.",
    blurbEn: "An ADIZ is not sovereign airspace — it asks for identification, not ownership.",
    tag: "established",
    layers: {
      showEastAsiaAdiz: true,
      showDiplomaticTension: true,
      showIslandChains: true,
    },
    camera: { lat: 25.0, lng: 122.5, altitude: 1.1 },
  },
  {
    id: "taiwan-incidents",
    titleKo: "해협 주변 사건 핀",
    titleEn: "Near-strait incident pins",
    blurbKo: "사건 핀은 속보 타전이 아니라, 공개된 위치 신호입니다. 단정하지 말고 겹쳐 봅니다.",
    blurbEn: "Pins are location signals from open reporting — correlate, don’t conclude.",
    tag: "reported",
    layers: {
      showChinaTaiwanIncidents: true,
      showWarZones: true,
      showIslandChains: true,
    },
    camera: { lat: 23.7, lng: 120.9, altitude: 0.95 },
  },
];

const DEFAULT_HUB: DeepDiveRing[] = [
  {
    id: "hub-tension",
    titleKo: "전쟁·외교 긴장면",
    titleEn: "War · diplomatic tension",
    blurbKo: "이 허브 주변에서 공개된 긴장·분쟁 구역만 남깁니다.",
    blurbEn: "Keep only published tension and dispute zones around this hub.",
    tag: "established",
    layers: {
      showWarZones: true,
      showDiplomaticTension: true,
      showAlliedBlocs: true,
    },
  },
  {
    id: "hub-axis",
    titleKo: "관계망 호(弧)",
    titleEn: "Partner network arcs",
    blurbKo: "호는 단일 군사동맹이 아닙니다. 외교·에너지·안보 연계의 뼈대입니다.",
    blurbEn: "Arcs are not one alliance — they outline diplomatic, energy, and security links.",
    tag: "reported",
    layers: {
      showAxisNetwork: true,
      showDiplomaticTension: true,
      showWarZones: true,
    },
  },
  {
    id: "hub-gdelt",
    titleKo: "분쟁·시위 신호",
    titleEn: "Conflict · protest signals",
    blurbKo: "GDELT 신호는 언론 멘션 밀도입니다. 전장 확정이 아닙니다.",
    blurbEn: "GDELT marks media-mention density — not a confirmed front line.",
    tag: "estimated",
    layers: {
      showGdeltWar: true,
      showGdeltProtests: true,
      showDiplomaticTension: true,
    },
  },
];

function navLooksLike(navId: string, ...parts: string[]): boolean {
  const key = navId.toLowerCase();
  return parts.some((p) => key.includes(p));
}

/** 심층 키·내비 id로 L2 고리 목록 */
export function resolveGeopoliticsRings(opts: {
  deepDiveKey: string | null;
  navId?: string | null;
  frictionStages?: FrictionTimelineStage[] | null;
}): DeepDiveRing[] {
  const { deepDiveKey, navId, frictionStages } = opts;
  if (!deepDiveKey) return [];

  if (deepDiveKey.startsWith("friction:") && frictionStages && frictionStages.length > 0) {
    return frictionStages.slice(0, 3).map((stage) => ({
      id: `friction-stage-${stage.id}`,
      titleKo: stage.titleKo,
      titleEn: stage.titleEn,
      blurbKo: stage.bodyKo.slice(0, 120) + (stage.bodyKo.length > 120 ? "…" : ""),
      blurbEn: stage.bodyEn.slice(0, 120) + (stage.bodyEn.length > 120 ? "…" : ""),
      tag: "reported" as const,
      layers: { ...FRICTION_DEEP_DIVE_PATCH },
      camera: {
        lat: stage.coordinates[1],
        lng: stage.coordinates[0],
        altitude: 0.9,
      },
    }));
  }

  if (deepDiveKey.startsWith("territorial:")) {
    return [
      {
        id: "territorial-claims",
        titleKo: "주장·분쟁 해역",
        titleEn: "Claimed · disputed waters",
        blurbKo: "다툼 있는 경계는 ‘확정 국경’이 아닙니다. 주장 주체를 함께 봅니다.",
        blurbEn: "Contested lines are claims — not settled borders. Keep the claimant visible.",
        tag: "claimed",
        layers: { ...TERRITORIAL_DEEP_DIVE_PATCH },
      },
      {
        id: "territorial-chains",
        titleKo: "도서·도련 맥락",
        titleEn: "Islands · chain context",
        blurbKo: "도련선과 분쟁 구역을 같이 두면, 왜 이 바다가 시끄러운지 연결됩니다.",
        blurbEn: "Island chains plus dispute zones show why this sea stays loud.",
        tag: "established",
        layers: {
          showIslandChains: true,
          showWarZones: true,
          showDiplomaticTension: true,
        },
      },
      {
        id: "territorial-diplo",
        titleKo: "외교 긴장면",
        titleEn: "Diplomatic tension surface",
        blurbKo: "총성이 없어도 팽팽한 구역이 있습니다. 외교 긴장면을 따로 켭니다.",
        blurbEn: "No gunfire can still mean high tension — isolate the diplomatic surface.",
        tag: "established",
        layers: {
          showDiplomaticTension: true,
          showWarZones: true,
          showAlliedBlocs: true,
        },
      },
    ];
  }

  const id = navId ?? deepDiveKey.replace(/^hub:/, "");
  if (
    navLooksLike(id, "korea", "rok", "peninsula", "pyongyang", "seoul", "hub-prk", "hub-rok")
  ) {
    return PENINSULA;
  }
  if (navLooksLike(id, "taiwan", "taipei", "strait", "hub-twn")) {
    return TAIWAN;
  }
  return DEFAULT_HUB;
}
