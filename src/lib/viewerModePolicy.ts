import { LAB_UI } from "@/lib/labFlag";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 화면 모드는 하나(지정학=conflict)다. 지경학·역사·라이브는 실험실(lab)로만 남긴다.
 * 바닷길(지경학)은 지정학 지도 안의 프리셋으로 만들 예정 — 별도 모드를 두지 않는다.
 */
export function coerceViewerMode(mode: ViewerMode, lab: boolean = LAB_UI): ViewerMode {
  return lab ? mode : "conflict";
}

/** 저장된 모드·링크로 부팅할 때는 항상 지정학으로 시작한다(실험실 제외). */
export function coerceBootViewerMode(mode: ViewerMode, lab: boolean = LAB_UI): ViewerMode {
  return lab ? mode : "conflict";
}
