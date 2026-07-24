import type { AppDataLoadProgress } from "@/lib/fetchAppDataStream";

/** 번들 로딩 구간 상한 (%) */
export const BUNDLE_PROGRESS_CAP = 18;

export function appDataProgressPercent(progress: AppDataLoadProgress | null): number {
  if (!progress) return 0;
  if (progress.phase === "ready") return 100;
  if (progress.contentLength && progress.contentLength > 0) {
    return Math.min(
      100,
      Math.round((progress.bytesReceived / progress.contentLength) * 100),
    );
  }
  if (progress.bytesReceived > 0) {
    return Math.min(92, Math.round(progress.bytesReceived / 4096));
  }
  return progress.phase === "parsing" ? 85 : 8;
}

/**
 * 대시보드 부트 진행률 (0–100).
 * 예전: 데이터 100% + 글로브 0% → 65 → 합산 후 ~71%에 고착.
 * 지금은 데이터만 끝나도 상단으로 올리고, 둘 다 준비되면 100.
 */
export function computeDashboardBootProgress(opts: {
  globeReady: boolean;
  isLoading: boolean;
  appDataLoadProgress: AppDataLoadProgress | null;
}): number {
  if (!opts.isLoading && opts.globeReady) return 100;
  // 데이터 로드 끝 · 글로브 초기화만 남음 — 71% 고착 방지
  if (!opts.isLoading) return 97;

  const dataPct = appDataProgressPercent(opts.appDataLoadProgress);
  const globePct = opts.globeReady ? 100 : 0;
  // 엔진 25% + 데이터 75% (데이터 쪽이 체감 진행에 더 가깝게)
  return Math.min(99, Math.round(globePct * 0.25 + dataPct * 0.75));
}

export function combineBootProgress(
  bundlePct: number,
  dashboardPct: number,
  bundleReady: boolean,
): number {
  if (!bundleReady) return Math.min(BUNDLE_PROGRESS_CAP, Math.round(bundlePct));
  if (dashboardPct >= 100) return 100;
  const scaled = BUNDLE_PROGRESS_CAP + (dashboardPct / 100) * (100 - BUNDLE_PROGRESS_CAP);
  return Math.min(100, Math.round(scaled));
}
