/**
 * Geowatch / 멋진 신세계 — 제품 상수 단일 출처(SSOT).
 * 캡·폴링(stub OFF)·오버레이 우선순위는 여기만 수정한다.
 * liveRenderGuard는 stub ON/OFF 분기를 유지한 채 이 값을 참조한다.
 */

export const GEOWATCH_CONFIG = {
  caps: {
    /** 일반 모드 레이어 동시 ON 상한 */
    fullModeMaxLayers: 30,
    /** Ultra-Lite 소프트 상한 */
    ultraLiteMaxLayers: 16,
  },

  /**
   * stub OFF(라이브) 폴링 간격(ms).
   * stub ON은 liveRenderGuard에서 더 짧은 간격으로 오버라이드.
   */
  polling: {
    newsRssMs: 150_000,
    telegramMs: 30_000,
    telegramSyncMs: 120_000,
    tickerMs: 15 * 60_000,
    gdeltMs: 20 * 60_000,
    firmsMs: 5 * 60_000,
    aisMs: 90_000,
    milAdsbMs: 75_000,
    airTrafficMs: 55_000,
    tzevaMs: 15_000,
    newfeedsMs: 5 * 60_000,
    usCarriersMs: 8 * 60_000,
    videoNewsMs: 10 * 60_000,
  },

  /**
   * 배너/모달 top-1 우선순위 — 낮을수록 우선.
   * 브리핑(양피지)·진입 게이트는 이 큐보다 상위.
   */
  overlay: {
    bannerPriority: {
      airRaid: 10,
      adsbEmergency: 20,
      exercise: 30,
      maritime: 40,
      tensionCut: 50,
      hotTheater: 55,
      coach: 60,
    },
  },
} as const;

export type GeowatchConfig = typeof GEOWATCH_CONFIG;
