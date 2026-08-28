"use client";

import { useEffect, useMemo } from "react";
import { useControl, useMap } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { CesiumIonLoader } from "@loaders.gl/3d-tiles";
import {
  setCityBuildingsMercator,
  type BasemapMapLike,
} from "@/lib/basemapMode";
import { cesiumOsmBuildingsEndpointUrl } from "@/lib/osmBuildings3d";

/**
 * Cesium OSM Buildings 창문 패턴 — CesiumJS customShader가 아니라
 * deck.gl ScenegraphLayer의 color filter. 실사 사진이 아니라 격자 발광.
 */
const OSM_WINDOW_SHADER = {
  name: "osm-windows",
  fs: `\
void osmWindows_filterColor(inout vec4 color, vec3 positionWorld) {
  float h = abs(positionWorld.z);
  if (h < 5.0) {
    return;
  }
  float cellX = fract(positionWorld.x * 0.42);
  float cellY = fract(h * 0.32);
  float pane = step(0.18, cellX) * step(cellX, 0.82) * step(0.16, cellY) * step(cellY, 0.78);
  vec3 glow = vec3(0.92, 0.88, 0.72);
  color.rgb = mix(color.rgb * 0.78, glow, pane * 0.62);
}
`,
  inject: {
    "fs:DECKGL_FILTER_COLOR":
      "osmWindows_filterColor(color, geometry.worldPosition);",
  },
};

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay?.setProps(props);
  return null;
}

function asMapLibreMap(mapLike: unknown): BasemapMapLike | null {
  if (!mapLike || typeof mapLike !== "object") return null;
  const maybeRef = mapLike as { getMap?: () => unknown };
  const raw = typeof maybeRef.getMap === "function" ? maybeRef.getMap() : mapLike;
  if (!raw || typeof raw !== "object") return null;
  return raw as BasemapMapLike;
}

function firstSymbolLayerId(map: BasemapMapLike): string | undefined {
  try {
    const layers = map.getStyle()?.layers ?? [];
    return layers.find((layer) => layer.type === "symbol")?.id;
  } catch {
    return undefined;
  }
}

export type OsmBuildingsOverlayProps = {
  accessToken: string;
};

/**
 * MapLibre `<Map>` 자식. interleaved MapboxOverlay로 WebGL 컨텍스트를 공유한다.
 * 세슘 Viewer를 만들지 않는다.
 */
export function OsmBuildingsOverlay({ accessToken }: OsmBuildingsOverlayProps) {
  const maps = useMap();
  const mapObj = asMapLibreMap(maps.current);

  useEffect(() => {
    if (!mapObj) return;
    setCityBuildingsMercator(mapObj, true);
    return () => setCityBuildingsMercator(mapObj, false);
  }, [mapObj]);

  const beforeId = mapObj ? firstSymbolLayerId(mapObj) : undefined;

  const layers = useMemo(() => {
    if (!accessToken) return [];
    return [
      new Tile3DLayer({
        id: "cesium-osm-buildings",
        data: cesiumOsmBuildingsEndpointUrl(),
        loader: CesiumIonLoader as never,
        loadOptions: {
          "cesium-ion": { accessToken },
          tileset: {
            throttleRequests: true,
            maxRequests: 8,
            maximumScreenSpaceError: 24,
          },
        },
        pickable: false,
        opacity: 1,
        beforeId,
        onTilesetLoad: (tileset) => {
          try {
            tileset.setProps({
              maximumScreenSpaceError: 24,
              throttleRequests: true,
            });
          } catch {
            /* Tileset3D API drift */
          }
        },
        _subLayerProps: {
          scenegraph: {
            _lighting: "pbr",
            modules: [OSM_WINDOW_SHADER],
          },
        },
      } as ConstructorParameters<typeof Tile3DLayer>[0]),
    ];
  }, [accessToken, beforeId]);

  return <DeckGLOverlay interleaved layers={layers} />;
}
