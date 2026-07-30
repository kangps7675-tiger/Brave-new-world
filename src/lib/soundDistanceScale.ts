import type { AudioEventId } from "@/data/audioManifest";

/**
 * 줌(고도)에 따라 폭음·총격·포격 볼륨만 살짝 달라지게.
 * 사이렌/경보벨은 제외. 전장음은 들리게 하되 놀람 방지 캡 유지.
 */

/** 원샷 — 탄착 폭발 / 전선 교전음 */
const ONE_SHOT_ZOOM_IDS = new Set<AudioEventId>([
  "neptun-impact",
  "firms-combat-burst",
  "firms-exercise",
  "gdelt-war-sting",
  "frontline-gunfire",
  "frontline-gunfire-distant-auto",
  "frontline-bombing",
  "frontline-artillery-shot",
  "frontline-mlrs",
  "frontline-fpv-drone",
  "frontline-fpv-detonation",
]);

/** 루프 앰비언트 — 전선 rumble / 긴장 / 경제 현장 */
const AMBIENT_ZOOM_IDS = new Set<AudioEventId>([
  "frontline-artillery-ambient",
  "dispute-tension-high",
  "taiwan-strait-tension",
  "carrier-deck-ambient",
  "port-ambient",
  "construction-ambient",
  "pipeline-hum",
  "datacenter-hum",
]);

const ONE_SHOT_HARD_CAP = 0.55;
/** 탄착·FPV 폭발 — 전장 가까이에서 더 크게 */
const LOUD_ONESHOT_HARD_CAP = 0.92;
const LOUD_ONESHOT_IDS = new Set<AudioEventId>([
  "neptun-impact",
  "frontline-fpv-detonation",
  "firms-combat-burst",
]);
/** 전선 포격·총성 — regional LOD 진입부터 크게 들리게 */
const FRONTLINE_ONESHOT_HARD_CAP = 0.9;
const FRONTLINE_ONESHOT_IDS = new Set<AudioEventId>([
  "frontline-gunfire",
  "frontline-gunfire-distant-auto",
  "frontline-bombing",
  "frontline-artillery-shot",
  "frontline-mlrs",
  "frontline-fpv-drone",
]);
const AMBIENT_HARD_CAP = 0.22;
/** 전선 rumble 베드만 상한 상향 */
const FRONTLINE_AMBIENT_HARD_CAP = 0.42;

/** altitude 높을수록(멀수록) 작음 · 줌인일수록 커짐 */
export function zoomVolumeFactor(altitude: number): number {
  const far = 2.2;
  const near = 0.55;
  const t = Math.min(1, Math.max(0, (far - altitude) / (far - near)));
  // 멀 때 0.55 → 가까울 때 1.0
  return 0.55 + 0.45 * t;
}

export function isZoomScaledSound(eventId: AudioEventId): boolean {
  return ONE_SHOT_ZOOM_IDS.has(eventId) || AMBIENT_ZOOM_IDS.has(eventId);
}

export function scaledSoundVolume(
  eventId: AudioEventId,
  baseVolume: number,
  altitude: number | null | undefined,
): number {
  const alt = typeof altitude === "number" && Number.isFinite(altitude) ? altitude : 1.6;
  if (!isZoomScaledSound(eventId)) {
    return Math.min(1, Math.max(0, baseVolume));
  }
  const factor = zoomVolumeFactor(alt);
  const raw = baseVolume * factor;
  const cap = AMBIENT_ZOOM_IDS.has(eventId)
    ? eventId === "frontline-artillery-ambient"
      ? FRONTLINE_AMBIENT_HARD_CAP
      : AMBIENT_HARD_CAP
    : LOUD_ONESHOT_IDS.has(eventId)
      ? LOUD_ONESHOT_HARD_CAP
      : FRONTLINE_ONESHOT_IDS.has(eventId)
        ? FRONTLINE_ONESHOT_HARD_CAP
        : ONE_SHOT_HARD_CAP;
  return Math.min(cap, Math.max(0, raw));
}
