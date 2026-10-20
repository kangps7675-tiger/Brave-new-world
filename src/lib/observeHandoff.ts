/**
 * 사건 → 3D 관측(Cesium) 이어보기 딥링크.
 * 기존 `?scene=1&mode=satellite&lat=&lng=&alt=` 형식을 재사용한다.
 *
 * UI: 속보 양피지 「3D로 관측하기」 → switchToObserveAndFly
 * 공유: getSceneForShareResolved(mode=satellite) → buildSceneUrl
 */
import { buildSceneUrl, type SceneLinkState } from "@/lib/sceneLink";
import type { LayerPrefs } from "@/lib/layerPrefs";

const DEFAULT_OBSERVE_ALT = 0.85;

export function buildObserveSceneUrl(
  origin: string,
  opts: {
    lat: number;
    lng: number;
    altitude?: number;
    prefs?: LayerPrefs;
    asOf?: string | null;
  },
): string {
  const emptyPrefs = (opts.prefs ?? {}) as LayerPrefs;
  return buildSceneUrl(origin, {
    mode: "satellite",
    lat: opts.lat,
    lng: opts.lng,
    altitude: opts.altitude ?? DEFAULT_OBSERVE_ALT,
    prefs: emptyPrefs,
    asOf: opts.asOf ?? null,
  });
}

/** 파싱된 scene이 관측(Cesium) 핸드오프인지 */
export function isObserveScene(scene: SceneLinkState | null | undefined): boolean {
  return scene?.mode === "satellite" || scene?.mode === "live";
}
