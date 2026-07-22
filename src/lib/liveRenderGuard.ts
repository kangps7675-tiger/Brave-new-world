import type { GlobeLodTier } from "@/lib/globeLod";
import { FIRMS_FIRE_MAX_BY_TIER } from "@/lib/viewportCull";
import { isClientApiStubMode } from "@/lib/runtimeConfig.client";

/** 줌아웃일수록 HTML 마커(ADS-B/AIS) DOM 비용을 강하게 컷 */
const MIL_HTML_DISPLAY_BY_TIER: Record<GlobeLodTier, number> = {
  global: 28,
  continent: 48,
  regional: 72,
  near: 110,
  village: 150,
};

const AIS_HTML_DISPLAY_BY_TIER: Record<GlobeLodTier, number> = {
  global: 32,
  continent: 48,
  regional: 72,
  near: 100,
  village: 120,
};

const AIR_HTML_DISPLAY_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 64,
  regional: 110,
  near: 180,
  village: 280,
};

/**
 * Live(API_STUB_MODE=false) 렌더·폴링 안전장치. **삭제·완화 금지** (렉 기둥).
 * stub ON: 기존(또는 약간 빠른) 간격 · stub OFF: 보수적 간격·상한.
 *
 * 데이터 계층은 2층 — @see docs/data-architecture-2tier.md
 *   1층 창고(R2/D1) → 2층 빨대(폴링). lite/full은 1층 해상도 옵션일 뿐.
 *
 * stub OFF 전: D1 cron 채움 · R2 CDN · 이 파일·레이어 cap 유지.
 */

export {
  GDELT_CLIENT_RING_CAP,
  STREAM_INGEST_BURST_MS,
  TELEGRAM_CLIENT_RING_CAP,
} from "@/lib/streamIngestGuard";


/** FIRMS API max — 화면 상한보다 크게 받지 않음 (state 폭증 방지) */
export function firmsLiveFetchMax(tier: GlobeLodTier): number {
  return FIRMS_FIRE_MAX_BY_TIER[tier];
}

/** 서버 FIRMS hard cap과 동일 값 (route.ts 로컬 상수) — query max 무시 상한 */
export const FIRMS_SERVER_HARD_CAP = 900;

/** Tzeva: 라이브 3s는 과함 → 15s */
export function liveTzevaPollMs(): number {
  return isClientApiStubMode() ? 3_000 : 15_000;
}

/** NewFeeds Iran attacks/news: upstream 5min cache → client 60s / 5min */
export function liveNewfeedsPollMs(): number {
  return isClientApiStubMode() ? 60_000 : 5 * 60_000;
}

/** Telegram alerts: 라이브 12s → 30s */
export function liveTelegramPollMs(): number {
  return isClientApiStubMode() ? 12_000 : 30_000;
}

/** Telegram sync POST: 라이브 60s → 120s */
export function liveTelegramSyncPollMs(): number {
  return isClientApiStubMode() ? 60_000 : 120_000;
}

/** FIRMS bbox/주기 갱신 */
export function liveFirmsPollMs(): number {
  return isClientApiStubMode() ? 3 * 60_000 : 5 * 60_000;
}

/** GDELT 이벤트 폴링 */
export function liveGdeltPollMs(): number {
  return isClientApiStubMode() ? 15 * 60_000 : 20 * 60_000;
}

/** AIS 선박 */
export function liveAisPollMs(): number {
  return isClientApiStubMode() ? 60_000 : 90_000;
}

export function liveAisFetchMax(): number {
  return isClientApiStubMode() ? 250 : 120;
}

/** 화면 HTML 마커 상한 (fetch 상한과 별도 — 줌아웃 렉 완화) */
export function liveAisDisplayMax(tier: GlobeLodTier): number {
  return Math.min(liveAisFetchMax(), AIS_HTML_DISPLAY_BY_TIER[tier]);
}

/** ADS-B 군용기 */
export function liveMilPollMs(): number {
  return isClientApiStubMode() ? 45_000 : 75_000;
}

export function liveMilFetchMax(): number {
  return isClientApiStubMode() ? 400 : 150;
}

export function liveMilDisplayMax(tier: GlobeLodTier): number {
  return Math.min(liveMilFetchMax(), MIL_HTML_DISPLAY_BY_TIER[tier]);
}

/** 민간 항적 (지경학) */
export function liveAirTrafficPollMs(): number {
  return isClientApiStubMode() ? 40_000 : 55_000;
}

export function liveAirTrafficFetchMax(): number {
  return isClientApiStubMode() ? 350 : 280;
}

export function liveAirTrafficDisplayMax(tier: GlobeLodTier): number {
  return Math.min(liveAirTrafficFetchMax(), AIR_HTML_DISPLAY_BY_TIER[tier]);
}

/** 고도 → ADS-B 조회 반경(NM) */
export function airTrafficDistNm(altitude: number): number {
  if (altitude >= 1.9) return 650;
  if (altitude >= 1.35) return 380;
  if (altitude >= 0.85) return 200;
  if (altitude >= 0.45) return 110;
  return 60;
}

/** 미 항모 */
export function liveUsCarriersPollMs(): number {
  return isClientApiStubMode() ? 5 * 60_000 : 8 * 60_000;
}

/** Yahoo 티커 스트립 */
export function liveTickerPollMs(): number {
  return isClientApiStubMode() ? 10 * 60_000 : 15 * 60_000;
}

/** Intel 뉴스 스트림 (RSS) — stub OFF 시 더 느리게 */
export function liveNewsPollMs(): number {
  return isClientApiStubMode() ? 90_000 : 150_000;
}

/** NAVAREA D1 스냅샷 — 뉴스 스트림과 같은 리듬 (상류 TXT는 cron 30분) */
export function liveNavareaPollMs(): number {
  return liveNewsPollMs();
}

/** 동영상 뉴스(메타) — 본 뉴스보다 훨씬 느리게 */
export function liveVideoNewsPollMs(): number {
  return isClientApiStubMode() ? 5 * 60_000 : 10 * 60_000;
}

/** 동영상 클립 상한 (클릭 재생 · 카드만) */
export function liveVideoNewsFetchMax(): number {
  return isClientApiStubMode() ? 24 : 12;
}

/** 카메라 조작·백그라운드 탭 중 라이브 새로고침 보류 */
export function shouldDeferLiveNetworkRefresh(cameraMoving: boolean): boolean {
  if (isClientApiStubMode()) return false;
  if (typeof document !== "undefined" && document.hidden) return true;
  return cameraMoving;
}
