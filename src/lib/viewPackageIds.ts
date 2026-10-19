/**
 * 뉴스 피드 묶음 id — 예전 viewPackages.ts(지구본 시선 패키지)에서 타입만 분리.
 * 뉴스 파이프라인(feedCatalog·newsStreamService)이 피드 묶음 선택에 쓴다.
 */
export type ViewPackageId =
  | "conflict-watch"
  | "geo-trader"
  | "frontline-live"
  | "satellite-eye"
  | "live-tracks"
  | "custom";

export type ViewerMode = "conflict" | "history" | "economy" | "satellite" | "live";

export const DEFAULT_PACKAGE_SELECTION: ViewPackageId[] = ["frontline-live"];
