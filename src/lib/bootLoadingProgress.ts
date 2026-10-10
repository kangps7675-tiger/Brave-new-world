import type { AppDataLoadProgress } from "@/lib/fetchAppDataStream";

/** 번들 로딩 구간 상한 (%) */
export const BUNDLE_PROGRESS_CAP = 18;

/**
 * 데이터·엔진이 아직일 때 UI가 넘지 않는 상한.
 * 예전에 데이터만 끝나면 97→합산 ~98%로 뛰어 멈춘 것처럼 보였고,
 * 유저가 렉으로 오해하고 이탈했다.
 */
export const ACTIVE_LOAD_CAP = 78;

/** 데이터는 끝났고 지도 엔진만 남았을 때 시작점 (여기서 soft-crawl) */
export const WAITING_GLOBE_BASE = 80;

/** 지도 준비 전 soft-crawl 상한 — 100은 진짜 준비될 때만 */
export const WAITING_GLOBE_CAP = 94;

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
 * - 둘 다 준비 → 100
 * - 데이터만 끝 · 글로브 대기 → WAITING_GLOBE_BASE (합산 ~84%, soft-crawl은 BootLoader)
 * - 로딩 중 → 데이터 비중으로 올리되 ACTIVE_LOAD_CAP 이하
 */
export function computeDashboardBootProgress(opts: {
  globeReady: boolean;
  isLoading: boolean;
  appDataLoadProgress: AppDataLoadProgress | null;
}): number {
  if (!opts.isLoading && opts.globeReady) return 100;
  // 데이터 끝 · 지도 그리는 중 — 98%로 점프하지 않음
  if (!opts.isLoading) return WAITING_GLOBE_BASE;

  const dataPct = appDataProgressPercent(opts.appDataLoadProgress);
  const globePct = opts.globeReady ? 100 : 0;
  return Math.min(
    ACTIVE_LOAD_CAP,
    Math.round(globePct * 0.25 + dataPct * 0.75),
  );
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

/**
 * 데이터 완료 후 지도 대기 구간 — 시간이 갈수록 천천히 올라가게 (멈춘 느낌 제거).
 * @param waitMs 대기 경과 ms
 * @param spanMs 이 시간에 WAITING_GLOBE_CAP까지 (기본 28초)
 */
export function waitingGlobeCrawlBonus(
  waitMs: number,
  spanMs = 28_000,
): number {
  if (waitMs <= 0) return 0;
  const t = Math.min(1, waitMs / spanMs);
  // ease-out: 초반에 조금 오르고 후반은 더디게
  const eased = 1 - (1 - t) * (1 - t);
  return (WAITING_GLOBE_CAP - WAITING_GLOBE_BASE) * eased;
}
