import {
  CYBER_WAR_ROOM_THEME,
  cyberCoastlineColor,
} from "@/lib/cyberWarRoomTheme";
import { getMapLibreStyleUrl } from "@/lib/mapLibreBasemap";
import type { BasemapMode } from "@/lib/basemapMode";

export type GlobeTextureConfig = {
  /** true면 MapLibre 벡터 글로브 단일 렌더 */
  vectorBase: boolean;
  mapStyleUrl: string;
  globeImageUrl: string | null;
  bumpImageUrl: string | null;
  backgroundColor: string;
  oceanColor: string;
  landFillColor: string;
  coastlineColor: string;
  borderColor: string;
  conflictZoneFill: string;
  borderStrokeWidth: number;
  countryColors: Record<string, string>;
};

export function getGlobeTextures(basemapMode: BasemapMode = "intel"): GlobeTextureConfig {
  const { globe, polygon } = CYBER_WAR_ROOM_THEME;
  const isTerrain = basemapMode === "terrain";

  return {
    vectorBase: true,
    mapStyleUrl: getMapLibreStyleUrl(basemapMode),
    globeImageUrl: null,
    bumpImageUrl: null,
    // 지형·인텔 공통 — 지구본 뒤 우주 배경
    backgroundColor: globe.backgroundColor,
    oceanColor: isTerrain ? "#1a3a5c" : globe.oceanColor,
    landFillColor: polygon.defaultFill,
    // 네온 시안 해안선·국경은 밝은 벡터 지도에서 사라짐 → 저명도 틸로 교체
    coastlineColor: isTerrain ? "rgba(14, 91, 107, 0.62)" : cyberCoastlineColor(),
    borderColor: isTerrain ? "rgba(12, 74, 88, 0.9)" : polygon.strokeColor,
    conflictZoneFill: polygon.conflictZoneFill,
    borderStrokeWidth: polygon.strokeWidth,
    countryColors: {},
  };
}
