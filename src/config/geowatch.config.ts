/**
 * 제품 상수 단일 출처(SSOT) — 멋진 신세계 / Brave New World.
 * 캡·폴링(stub OFF)·오버레이 우선순위는 여기만 수정한다.
 * liveRenderGuard는 stub ON/OFF 분기를 유지한 채 이 값을 참조한다.
 */

export const GEOWATCH_CONFIG = {
  caps: {
    /** 일반 모드 레이어 동시 ON 상한 */
    fullModeMaxLayers: 30,
    /** Ultra-Lite 소프트 상한 */
    ultraLiteMaxLayers: 16,
    /**
     * **첫 화면 예산** — 부팅 직후 동시에 켤 레이어 수.
     *
     * 일반 상한(30)과 다른 숫자인 이유:
     *  ① 성능 — 30개는 fetch·addLayer·마커 렌더를 한꺼번에 터뜨린다.
     *     저사양(내장 GPU·8GB)에서 실제로 탭이 죽었다.
     *  ② 가독 — 첫 화면의 합격 기준은 "핀·전선·초크 중 **하나**가 눈에 들어오는가"다.
     *     30개를 켜면 장면이 아니라 덩어리가 된다.
     *
     * 상한은 "여기까지 허용"이고 첫 화면은 "여기서 시작"이다. 같을 이유가 없다.
     * 나머지 레이어는 사용자가 패널에서 켜면 된다.
     */
    firstScreenMaxLayers: 24,
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
      /**
       * 확전 신호 — 임계선을 넘은 사건 보도.
       * 공습·항공 비상보다는 뒤(즉각적 물리 위험이 아님),
       * 훈련·해상 공지보다는 앞(파급이 크다).
       */
      escalation: 25,
      exercise: 30,
      maritime: 40,
      /** Databento 선물 SPIKE — 물리 위험보다 뒤, 긴장컷보다 앞 */
      tickerSpike: 42,
      tensionCut: 50,
      hotTheater: 55,
      coach: 60,
      /** FPS 프로브 제안 — 긴급 배너·코치보다 뒤. 강제 적용 없음 */
      ultraLite: 65,
    },
  },
} as const;

export type GeowatchConfig = typeof GEOWATCH_CONFIG;
