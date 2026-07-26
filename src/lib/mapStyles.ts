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
  const isPhoto = basemapMode === "photo";

  return {
    vectorBase: true,
    mapStyleUrl: getMapLibreStyleUrl(basemapMode),
    globeImageUrl: null,
    bumpImageUrl: null,
    backgroundColor: isPhoto ? "#0a1628" : globe.backgroundColor,
    oceanColor: isPhoto ? "#1a3a5c" : globe.oceanColor,
    landFillColor: polygon.defaultFill,
    coastlineColor: cyberCoastlineColor(),
    borderColor: polygon.strokeColor,
    conflictZoneFill: polygon.conflictZoneFill,
    borderStrokeWidth: polygon.strokeWidth,
    countryColors: {},
  };
}
