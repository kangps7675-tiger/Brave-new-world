import type {
  AuxiliaryContentLayerId,
  KillerContentAxisContract,
  KillerContentAxisId,
} from "@/lib/cesiumObserveContent/types";

/**
 * Stage 이후 Content 폴리시 순서 (고정).
 * (1) Google+LiveUA 사건 가독 → (2) AIS 태깅/추적 HUD → (3) 증시창 ↔ 지구본 포커스.
 */
export const KILLER_CONTENT_POLICY_ORDER = [
  "google-liveua",
  "ais-tagging",
  "markets-window",
] as const satisfies readonly KillerContentAxisId[];

export const KILLER_CONTENT_AXES: Record<
  KillerContentAxisId,
  KillerContentAxisContract
> = {
  "google-liveua": {
    id: "google-liveua",
    roleKo: "공간 실사 + 전장 사건 세트",
    roleEn: "Photoreal place + battlefield event set",
    surface: "cesium-sync+html",
    polishOrder: 1,
    paths: [
      "src/lib/cesiumGooglePlaceOverlay.ts",
      "src/lib/cesiumLiveuaStrikes.ts",
      "src/lib/cesiumLiveuaGround.ts",
      "src/hooks/useLiveuaObserveFeed.ts",
    ],
  },
  "ais-tagging": {
    id: "ais-tagging",
    roleKo: "해상 식별·추적",
    roleEn: "Maritime identity and track tagging",
    surface: "cesium-sync+html",
    polishOrder: 2,
    paths: [
      "src/components/globe/CesiumSatelliteGlobe.tsx#syncAisBillboardEntities",
      "src/lib/cesiumTrackedEntity.ts",
      "src/hooks/useGevLiveTrack.ts",
    ],
  },
  "markets-window": {
    id: "markets-window",
    roleKo: "지경학 맥락 UI (WebGL 밖)",
    roleEn: "Geoeconomic markets chrome (outside WebGL)",
    surface: "html-panel",
    polishOrder: 3,
    paths: [
      "src/components/StockTickerStrip.tsx",
      "src/lib/stockTickers.ts",
      "src/components/GlobeDashboard.tsx",
    ],
  },
};

/** 보조 레이어 — 킬러 3축 clutter 뒤에서만 유지 */
export const AUXILIARY_CONTENT_LAYERS: readonly AuxiliaryContentLayerId[] = [
  "firms",
  "breaking-flash",
  "conflict-events",
  "air-raid",
  "missiles",
] as const;

export function killerAxesInPolishOrder(): KillerContentAxisContract[] {
  return KILLER_CONTENT_POLICY_ORDER.map((id) => KILLER_CONTENT_AXES[id]);
}

/** Stage 공개면 키 — Content가 이 외 Stage 내부를 만지면 계약 위반 */
export const OBSERVE_STAGE_PUBLIC_KEYS = [
  "camera",
  "settle",
  "governor",
  "cinemaPref",
] as const;
