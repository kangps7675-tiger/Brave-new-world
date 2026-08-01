import { GEOWATCH_CONFIG } from "@/config/geowatch.config";
import type { GlobeLodTier } from "@/lib/globeLod";
import { FIRMS_FIRE_MAX_BY_TIER } from "@/lib/viewportCull";
import { isClientApiStubMode } from "@/lib/runtimeConfig.client";

const LIVE = GEOWATCH_CONFIG.polling;

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
 * Ultra-Lite 배수 — 내장 그래픽·8GB RAM 대상.
 *
 * 이전에는 ultraLite가 **레이어를 강제 OFF만** 하고 마커 상한에는 전혀
 * 관여하지 않았다. 그래서 저사양 모드를 켜도 켜둔 레이어의 DOM 마커는
 * 그대로 최대치(민항 280개 등)가 떴다. HTML 마커 하나당 프레임마다
 * project + transform 쓰기 + 오클루전 판정이 도는 구조라, 이게 사실상
 * Ultra-Lite의 효과를 반감시키고 있었다.
 *
 * 0.4배는 "레이어를 끄지 않고도 체감이 바뀌는" 선에서 잡은 값이다.
 * 최소 8개는 남겨 레이어를 켰는데 아무것도 안 보이는 상황을 막는다.
 */
const ULTRA_LITE_MARKER_RATIO = 0.4;
const ULTRA_LITE_MARKER_FLOOR = 8;

function applyUltraLite(max: number, ultraLite?: boolean): number {
  if (!ultraLite) return max;
  return Math.max(ULTRA_LITE_MARKER_FLOOR, Math.round(max * ULTRA_LITE_MARKER_RATIO));
}

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

/** Tzeva: stub 3s · live = SSOT */
export function liveTzevaPollMs(): number {
  return isClientApiStubMode() ? 3_000 : LIVE.tzevaMs;
}

/** NewFeeds Iran attacks/news: stub 60s · live = SSOT */
export function liveNewfeedsPollMs(): number {
  return isClientApiStubMode() ? 60_000 : LIVE.newfeedsMs;
}

/** Telegram alerts: stub 12s · live = SSOT */
export function liveTelegramPollMs(): number {
  return isClientApiStubMode() ? 12_000 : LIVE.telegramMs;
}

/** Telegram sync POST: stub 60s · live = SSOT */
export function liveTelegramSyncPollMs(): number {
  return isClientApiStubMode() ? 60_000 : LIVE.telegramSyncMs;
}

/** FIRMS bbox/주기 갱신 */
export function liveFirmsPollMs(): number {
  return isClientApiStubMode() ? 3 * 60_000 : LIVE.firmsMs;
}

/** GDELT 이벤트 폴링 */
export function liveGdeltPollMs(): number {
  return isClientApiStubMode() ? 15 * 60_000 : LIVE.gdeltMs;
}

/** AIS 선박 */
export function liveAisPollMs(): number {
  return isClientApiStubMode() ? 60_000 : LIVE.aisMs;
}

export function liveAisFetchMax(): number {
  return isClientApiStubMode() ? 250 : 120;
}

/** 화면 HTML 마커 상한 (fetch 상한과 별도 — 줌아웃 렉 완화) */
export function liveAisDisplayMax(tier: GlobeLodTier, ultraLite?: boolean): number {
  return applyUltraLite(Math.min(liveAisFetchMax(), AIS_HTML_DISPLAY_BY_TIER[tier]), ultraLite);
}

/** ADS-B 군용기 */
export function liveMilPollMs(): number {
  return isClientApiStubMode() ? 45_000 : LIVE.milAdsbMs;
}

export function liveMilFetchMax(): number {
  return isClientApiStubMode() ? 400 : 150;
}

export function liveMilDisplayMax(tier: GlobeLodTier, ultraLite?: boolean): number {
  return applyUltraLite(Math.min(liveMilFetchMax(), MIL_HTML_DISPLAY_BY_TIER[tier]), ultraLite);
}

/** 민간 항적 (지경학) */
export function liveAirTrafficPollMs(): number {
  return isClientApiStubMode() ? 40_000 : LIVE.airTrafficMs;
}

export function liveAirTrafficFetchMax(): number {
  return isClientApiStubMode() ? 350 : 280;
}

export function liveAirTrafficDisplayMax(tier: GlobeLodTier, ultraLite?: boolean): number {
  return applyUltraLite(
    Math.min(liveAirTrafficFetchMax(), AIR_HTML_DISPLAY_BY_TIER[tier]),
    ultraLite,
  );
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
  return isClientApiStubMode() ? 5 * 60_000 : LIVE.usCarriersMs;
}

/** Yahoo 티커 스트립 — stub OFF = SSOT tickerMs */
export function liveTickerPollMs(): number {
  return isClientApiStubMode() ? 10 * 60_000 : LIVE.tickerMs;
}

/** Intel 뉴스 스트림 (RSS) — stub OFF 시 SSOT */
export function liveNewsPollMs(): number {
  return isClientApiStubMode() ? 90_000 : LIVE.newsRssMs;
}

/** NAVAREA D1 스냅샷 — 뉴스 스트림과 같은 리듬 (상류 TXT는 cron 30분) */
export function liveNavareaPollMs(): number {
  return liveNewsPollMs();
}

/** 동영상 뉴스(메타) — 본 뉴스보다 훨씬 느리게 */
export function liveVideoNewsPollMs(): number {
  return isClientApiStubMode() ? 5 * 60_000 : LIVE.videoNewsMs;
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
