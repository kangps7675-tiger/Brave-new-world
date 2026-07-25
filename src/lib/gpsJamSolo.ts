/**
 * GPSJam 솔로 모드 — ON 시 다른 레이어 boolean을 전부 끄고 재밍 히트맵만 남긴다.
 * OFF 시 호출측이 스냅샷을 복원한다.
 */
import type { LayerPrefs } from "@/lib/layerPrefs";

const PRESERVE_KEYS = new Set<keyof LayerPrefs>([
  "labelLanguage",
  "mobileHomeView",
  "showGpsInterference",
]);

/** 현재 prefs에서 GPSJam 솔로용 패치 생성 (다른 레이어 OFF) */
export function buildGpsJamSoloPatch(prefs: LayerPrefs): Partial<LayerPrefs> {
  const patch: Partial<LayerPrefs> = { showGpsInterference: true };
  for (const key of Object.keys(prefs) as Array<keyof LayerPrefs>) {
    if (PRESERVE_KEYS.has(key)) continue;
    const val = prefs[key];
    if (typeof val === "boolean" && val === true) {
      (patch as Record<string, boolean>)[key] = false;
    }
  }
  return patch;
}
