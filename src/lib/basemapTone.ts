/**
 * 베이스맵 밝기 톤.
 * 인텔(다크 벡터) = dark, 지형(밝은 OSM 벡터) = light.
 *
 * 명령형 DOM 마커 팩토리는 prop을 못 받으므로 모듈 전역 톤을 읽는다.
 * React 경로(레이어 paint·accessor)는 톤을 인자로 받아 memo 의존성이 정확히 잡히게 한다.
 */

export type BasemapTone = "dark" | "light";

let activeTone: BasemapTone = "dark";

export function setActiveBasemapTone(tone: BasemapTone): void {
  activeTone = tone;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.basemapTone = tone;
  }
}

export function activeBasemapTone(): BasemapTone {
  return activeTone;
}

export function isLightTone(tone: BasemapTone = activeTone): boolean {
  return tone === "light";
}
