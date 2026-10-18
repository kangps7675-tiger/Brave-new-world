import { LAB_UI } from "@/lib/labFlag";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 화면 모드는 하나(지정학=conflict)다. 위성(세슘)은 모드가 아니라 사건 카드의
 * "위성으로 보기"를 눌렀을 때만 들어간다. 지경학·역사·라이브는 실험실(lab)로만 남긴다.
 * 바닷길(지경학)은 지정학 지도 안의 프리셋으로 만들 예정 — 별도 모드를 두지 않는다.
 */
export function coerceViewerMode(mode: ViewerMode, lab: boolean = LAB_UI): ViewerMode {
  if (lab) return mode;
  return mode === "satellite" ? "satellite" : "conflict";
}

/** 저장된 모드·링크로 부팅할 때는 위성으로 바로 시작하지 않는다. */
export function coerceBootViewerMode(mode: ViewerMode, lab: boolean = LAB_UI): ViewerMode {
  if (lab) return mode;
  return "conflict";
}
