import type { AudioEventId } from "@/data/audioManifest";

/**
 * 전쟁 효과음(총격·포성·공습 사이렌·폭발·드론 타격) — 끔.
 * 신속속보 타전(hero-breaking)·등불 깔개·양피지 종이음은 허용 목록에 넣지 않는다.
 */
const WAR_COMBAT_SOUND_IDS = new Set<AudioEventId>([
  "tzeva-red-alert",
  "tzeva-all-clear",
  "neptun-air-alert",
  "nato-perimeter-klaxon",
  "neptun-impact",
  "neptun-uav-flyby",
  "neptun-ballistic",
  "frontline-fpv-drone",
  "frontline-fpv-detonation",
  "frontline-gunfire",
  "frontline-gunfire-distant-auto",
  "frontline-bombing",
  "frontline-artillery-shot",
  "frontline-mlrs",
  "frontline-artillery-ambient",
  "gdelt-war-sting",
  "firms-combat-burst",
  "ballistic-travel",
  "aircraft-military",
  "mil-submarine",
  "mil-base-heli",
  "mil-base-crowd",
  "mil-base-armor",
  "missile-silo",
  // 전역 궤도 먼 천둥 — 게임 같다는 이유로 끔
  "global-thunder-a",
  "global-thunder-b",
  "global-thunder-c",
  "globe-global-thunder",
]);

export function isWarCombatSound(eventId: AudioEventId): boolean {
  return WAR_COMBAT_SOUND_IDS.has(eventId);
}
