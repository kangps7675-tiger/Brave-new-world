/**
 * 장면 딥링크가 항적(live) 모드인지 — 해당 링크는 지도 카메라를 덮어쓰지 않는다.
 */
import type { SceneLinkState } from "@/lib/sceneLink";

export function isObserveScene(scene: SceneLinkState | null | undefined): boolean {
  return scene?.mode === "live";
}
