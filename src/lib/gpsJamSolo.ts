/**
 * GPSJam — 예전에는 ON 시 다른 레이어를 전부 끄는 솔로 모드였다.
 * 항적(live) 모드에서 ADS-B·AIS와 같이 보므로 솔로는 폐기.
 * 호출부가 아직 import하면 빈 패치(재밍 ON만)를 돌려 호환을 유지한다.
 */
import type { LayerPrefs } from "@/lib/layerPrefs";

/** @deprecated 솔로 폐기 — showGpsInterference: true 만 반환 */
export function buildGpsJamSoloPatch(): Partial<LayerPrefs> {
  return { showGpsInterference: true };
}
