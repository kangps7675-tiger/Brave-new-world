/**
 * Killer Content Contract — 인터페이스만 (P3 비구현).
 * Stage는 camera / settle / governor / cinemaPref만 공개.
 * Content는 Stage에 마커·마켓 로직을 넣지 않고 sync·패널만 카메라 위에 그린다.
 */

/** Stage가 Content에 넘기는 공개면 — 이 네 축 외 import 금지 */
export type ObserveStagePublicApi = {
  camera: ObserveStageCameraApi;
  settle: ObserveStageSettleApi;
  governor: ObserveStageGovernorApi;
  cinemaPref: ObserveStageCinemaPrefApi;
};

export type ObserveStageCameraApi = {
  /** 프로그램 카메라 이동 (flyTo / intro 소유는 Stage) */
  flyTo: (opts: {
    lat: number;
    lng: number;
    heightM?: number;
    durationMs?: number;
  }) => void;
  getHeightM: () => number;
  getCenter: () => { lat: number; lng: number } | null;
};

export type ObserveStageSettleApi = {
  armSettle: () => void;
  isSettling: () => boolean;
};

export type ObserveStageGovernorApi = {
  hold: (ownerId: string) => void;
  release: (ownerId: string) => void;
  requestRender: () => void;
};

export type ObserveStageCinemaPrefApi = {
  read: () => boolean;
  write: (on: boolean) => void;
};

export type KillerContentAxisId =
  | "google-liveua"
  | "ais-tagging"
  | "markets-window";

export type KillerContentSurface =
  | "cesium-sync"
  | "html-panel"
  | "cesium-sync+html";

export type KillerContentAxisContract = {
  id: KillerContentAxisId;
  roleKo: string;
  roleEn: string;
  surface: KillerContentSurface;
  /** Stage 완료 후 폴리시 순서 — 1이 최우선 */
  polishOrder: 1 | 2 | 3;
  /** 현행 대표 경로 (문서용 — 구현 import 없음) */
  paths: readonly string[];
};

/** 보조 레이어 — 킬러 3축을 가리지 않게 clutter 뒤에서만 */
export type AuxiliaryContentLayerId =
  | "firms"
  | "breaking-flash"
  | "conflict-events"
  | "air-raid"
  | "missiles";

export type ObserveClutterBudget = {
  /** Cesium entity 표시 상한 (킬러 축이 먼저 소진) */
  entitiesRemaining: number;
  /** HTML banner/toast 상한 */
  bannersRemaining: number;
};

export type ObserveContentContext = {
  stage: ObserveStagePublicApi;
  /**
   * 킬러 3축 우선. FIRMS/속보 등 보조는 이 예산 뒤에서만.
   * 값은 Host가 채우며, Content는 초과 표시 금지.
   */
  clutter?: ObserveClutterBudget;
  /** 추적 중 엔티티 — idle spin 게이트와 공유 (읽기 전용) */
  trackedEntityId?: string | null;
};

/**
 * Content 레이어 경계.
 * mount/sync/dispose만 — look / intro / idle spin / cinema 배율 금지.
 */
export type ObserveContentLayer<TSnapshot = unknown> = {
  readonly axis: KillerContentAxisId;
  mount?(ctx: ObserveContentContext): void;
  sync(ctx: ObserveContentContext, snapshot: TSnapshot): void;
  dispose?(): void;
};