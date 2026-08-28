export type DataProfile = "lite" | "full";

/** 서버에서만 읽고 클라이언트에는 props로 주입 — NEXT_PUBLIC 사용 금지 (dataCdnBase 제외) */
export type RuntimeConfig = {
  dataProfile: DataProfile;
  apiStubMode: boolean;
  neptunEnabled: boolean;
  tzevaAdomEnabled: boolean;
  telegramOsintEnabled: boolean;
  syncPollMs: number;
  /**
   * R2/CDN public base (예: https://data.example.com).
   * 설정 시 dataPath()가 /data/... 대신 CDN을 씀. 비우면 로컬 public.
   */
  dataCdnBase: string | null;
  /**
   * Cesium ion 토큰 — 지형 모드 고줌 OSM 3D Buildings 타일 fetch용.
   * 브라우저로 넘어가지만 NEXT_PUBLIC_ 접두사는 쓰지 않고 서버에서 주입.
   */
  cesiumIonToken: string | null;
};

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  dataProfile: "lite",
  apiStubMode: true,
  neptunEnabled: false,
  tzevaAdomEnabled: false,
  telegramOsintEnabled: false,
  syncPollMs: 5 * 60 * 1000,
  dataCdnBase: null,
  cesiumIonToken: null,
};
