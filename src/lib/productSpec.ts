/**
 * 제품 스펙 싱글소스 — 문서·CI·UI 캡은 이 값을 따른다.
 * 숫자 변경 시 README / stub-off-checklist / deferred-status 와
 * `npm run verify:product-spec` 이 함께 맞아야 한다.
 */

export {
  ACTIVE_LAYER_CAP_DEFAULT,
  ACTIVE_LAYER_CAP_ULTRA,
} from "@/lib/layerExclusiveCap";

export {
  MAX_ON_LAYERS,
  MAX_ON_LAYERS_ECONOMY,
} from "@/lib/viewPackages";

/**
 * stub OFF 폴링 간격(ms) — liveRenderGuard 와 동일해야 함.
 * 문서 표는 이 테이블을 기준으로 적는다.
 */
export const STUB_OFF_POLL_MS = {
  tzeva: 15_000,
  telegram: 30_000,
  newsRss: 150_000,
  firms: 5 * 60_000,
  ais: 90_000,
  milAdsB: 75_000,
  ticker: 15 * 60_000,
} as const;

export const STUB_OFF_FETCH_MAX = {
  ais: 120,
  milAdsB: 150,
} as const;
