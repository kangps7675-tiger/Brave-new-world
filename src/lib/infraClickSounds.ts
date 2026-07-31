/**
 * 인프라·이동체 레이어 클릭 사운드 매핑.
 * 재생은 SoundEffectsBridge 버스(emitLayerClickSounds)로 전달.
 */

import type { AudioEventId } from "@/data/audioManifest";
import type { StaticPointKind } from "@/data/geoTypes";
import type { AisMilitaryKind } from "@/lib/aisVesselClass";
import type { PlaySoundOptions } from "@/hooks/useSoundStream";

export type LayerClickCue = {
  eventId: AudioEventId;
  volumeScale?: number;
  durationMs?: number;
};

/** 민간기 — 두 트랙 겹침 */
export const CIVIL_AIRCRAFT_CUES: LayerClickCue[] = [
  { eventId: "aircraft-civil-pass", volumeScale: 0.85, durationMs: 6500 },
  { eventId: "aircraft-civil-pa", volumeScale: 0.55, durationMs: 6500 },
];

/** 군사기지 — 세 트랙 겹침 */
export const MIL_BASE_CUES: LayerClickCue[] = [
  { eventId: "mil-base-heli", volumeScale: 0.55, durationMs: 7000 },
  { eventId: "mil-base-crowd", volumeScale: 0.42, durationMs: 7000 },
  { eventId: "mil-base-armor", volumeScale: 0.5, durationMs: 7000 },
];

/** 항모 클릭 — 기존 갑판 앰비언트 + 라디오 저음 깔개 */
export const CARRIER_CLICK_CUES: LayerClickCue[] = [
  { eventId: "carrier-deck-ambient", volumeScale: 1.05, durationMs: 9000 },
  { eventId: "carrier-radio-bed", volumeScale: 0.32, durationMs: 9000 },
];

const STATIC_KIND_CUES: Partial<Record<StaticPointKind, LayerClickCue[]>> = {
  airport: [{ eventId: "airport-walla", volumeScale: 0.9, durationMs: 5500 }],
  port: [{ eventId: "port-ambient", volumeScale: 0.95, durationMs: 5500 }],
  "lng-terminal": [{ eventId: "oil-spike", volumeScale: 0.85, durationMs: 4500 }],
  chokepoint: [{ eventId: "chokepoint-drone", volumeScale: 0.75, durationMs: 5000 }],
  "logistics-hub": [{ eventId: "logistics-hub-crane", volumeScale: 0.8, durationMs: 5500 }],
  "submarine-tunnel": [
    { eventId: "submarine-tunnel-ambience", volumeScale: 0.7, durationMs: 6000 },
  ],
  "nuclear-site": [{ eventId: "nuclear-plant", volumeScale: 0.65, durationMs: 6000 }],
  "gem-nuclear": [{ eventId: "nuclear-plant", volumeScale: 0.65, durationMs: 6000 }],
  "gem-oil-gas-plant": [{ eventId: "oil-gas-plant", volumeScale: 0.7, durationMs: 5500 }],
  "gem-oil-gas-extraction": [{ eventId: "oil-gas-plant", volumeScale: 0.65, durationMs: 5500 }],
  "gem-coal-plant": [{ eventId: "coal-mining", volumeScale: 0.7, durationMs: 5500 }],
  "gem-coal-mine": [{ eventId: "coal-mining", volumeScale: 0.75, durationMs: 5500 }],
  "gem-coal-terminal": [{ eventId: "coal-mining", volumeScale: 0.7, durationMs: 5500 }],
  "gem-iron-ore": [{ eventId: "heavy-industry", volumeScale: 0.7, durationMs: 5500 }],
  "gem-steel": [{ eventId: "heavy-industry", volumeScale: 0.7, durationMs: 5500 }],
  "gem-cement": [{ eventId: "heavy-industry", volumeScale: 0.7, durationMs: 5500 }],
  "gem-chemical": [{ eventId: "heavy-industry", volumeScale: 0.7, durationMs: 5500 }],
  "military-base": MIL_BASE_CUES,
  "missile-silo": [{ eventId: "missile-silo", volumeScale: 0.7, durationMs: 6000 }],
  "strategic-missile-base": [{ eventId: "missile-silo", volumeScale: 0.7, durationMs: 6000 }],
  "missile-test-site": [{ eventId: "ballistic-travel", volumeScale: 0.75, durationMs: 5000 }],
  "cable-landing": [{ eventId: "submarine-cable", volumeScale: 0.6, durationMs: 4500 }],
  "economic-center": [
    { eventId: "construction-ambient", volumeScale: 0.85, durationMs: 5000 },
  ],
  "ai-data-center": [{ eventId: "datacenter-hum", volumeScale: 0.9, durationMs: 5000 }],
  "internet-exchange": [{ eventId: "datacenter-hum", volumeScale: 0.85, durationMs: 5000 }],
};

const PATH_KIND_CUES: Record<string, LayerClickCue[]> = {
  "shipping-lane": [{ eventId: "shipping-lane-sea", volumeScale: 0.7, durationMs: 6000 }],
  rail: [{ eventId: "rail-freight", volumeScale: 0.85, durationMs: 4500 }],
  "submarine-cable": [{ eventId: "submarine-cable", volumeScale: 0.65, durationMs: 4500 }],
  "subsea-pipeline": [{ eventId: "subsea-pipeline", volumeScale: 0.7, durationMs: 5000 }],
  "oil-pipeline": [{ eventId: "pipeline-hum", volumeScale: 0.95, durationMs: 5000 }],
  "gas-pipeline": [{ eventId: "pipeline-hum", volumeScale: 0.95, durationMs: 5000 }],
  "axis-link": [{ eventId: "pipeline-hum", volumeScale: 0.35, durationMs: 2200 }],
};

export function cuesForStaticKind(kind: string): LayerClickCue[] | null {
  return STATIC_KIND_CUES[kind as StaticPointKind] ?? null;
}

export function cuesForPathKind(kind: string): LayerClickCue[] | null {
  return PATH_KIND_CUES[kind] ?? null;
}

export function cuesForAisVessel(opts: {
  disguised?: boolean;
  militaryKind?: AisMilitaryKind | string | null;
}): LayerClickCue[] {
  if (opts.disguised) {
    return [{ eventId: "disguised-vessel", volumeScale: 0.75, durationMs: 5000 }];
  }
  if (opts.militaryKind === "submarine") {
    return [{ eventId: "mil-submarine", volumeScale: 0.8, durationMs: 5500 }];
  }
  if (opts.militaryKind && opts.militaryKind !== "unknown") {
    // 군 수상함 — 상선과 구분: 항모 라디오 저음 재사용보다 상선 계열보다 묵직한 엔진
    return [{ eventId: "ais-merchant", volumeScale: 0.55, durationMs: 4500 }];
  }
  return [{ eventId: "ais-merchant", volumeScale: 0.85, durationMs: 5000 }];
}

export function cuesForAircraft(traffic: "military" | "civil"): LayerClickCue[] {
  if (traffic === "civil") return CIVIL_AIRCRAFT_CUES;
  return [{ eventId: "aircraft-military", volumeScale: 0.9, durationMs: 6000 }];
}

export const CV_LAYER_SOUND_EVENT = "cv-layer-sound";

export type LayerSoundDetail = {
  cues: LayerClickCue[];
} & PlaySoundOptions;

/** 인프라 클릭 — SoundEffectsBridge가 구독 */
export function emitLayerClickSounds(
  cues: LayerClickCue[] | null | undefined,
  playOpts?: PlaySoundOptions,
) {
  if (typeof window === "undefined" || !cues?.length) return;
  window.dispatchEvent(
    new CustomEvent(CV_LAYER_SOUND_EVENT, {
      detail: { cues, ...playOpts } satisfies LayerSoundDetail,
    }),
  );
}
