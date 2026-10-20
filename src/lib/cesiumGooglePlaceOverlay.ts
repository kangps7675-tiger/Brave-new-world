/**
 * 관측(Cesium) — Google Earth식 지명·POI·도로 라벨 오버레이.
 * Photorealistic 3D Tiles에는 draping, 글로브에는 imagery layer.
 * Ion Google 2D 실패 시 CARTO labels-only로 폴백.
 */

type CesiumNS = typeof import("cesium");

/** Cesium ion — Google Maps 2D (roadmap / overlay 문서 예시 asset) */
export const GOOGLE_2D_ION_ASSET_ID = "3830184";

/** CARTO labels-only — Google 2D 불가 시 도로·POI·지명 타일 */
export const CARTO_LABELS_ONLY_URL =
  "https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png";

export type ObservePlaceOverlayHandle = {
  dispose: () => void;
  setLanguage: (lang: "ko" | "en") => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setGoogleTileset: (
    tileset: import("cesium").Cesium3DTileset | null,
  ) => Promise<void>;
};

type OverlayState = {
  enabled: boolean;
  language: "ko" | "en";
  googleTileset: import("cesium").Cesium3DTileset | null;
  globeLayer: import("cesium").ImageryLayer | null;
  tilesetLayer: import("cesium").ImageryLayer | null;
  source: "google" | "carto" | null;
};

function googleLanguage(lang: "ko" | "en"): string {
  return lang === "ko" ? "ko" : "en_US";
}

function googleRegion(lang: "ko" | "en"): string {
  return lang === "ko" ? "KR" : "US";
}

async function createGoogleOverlayProvider(
  Cesium: CesiumNS,
  lang: "ko" | "en",
): Promise<import("cesium").ImageryProvider | null> {
  try {
    // Google2DImageryProvider.getTileCredits may return Credit[] | undefined;
    // Cesium ImageryProvider requires Credit[] — cast at the boundary.
    return (await Cesium.Google2DImageryProvider.fromIonAssetId({
      assetId: GOOGLE_2D_ION_ASSET_ID,
      overlayLayerType: "layerRoadmap",
      language: googleLanguage(lang),
      region: googleRegion(lang),
      maximumLevel: 22,
    })) as import("cesium").ImageryProvider;
  } catch (err) {
    console.warn("[cesiumGooglePlaceOverlay] Google 2D overlay skipped:", err);
    return null;
  }
}

function createCartoLabelsProvider(Cesium: CesiumNS): import("cesium").ImageryProvider {
  return new Cesium.UrlTemplateImageryProvider({
    url: CARTO_LABELS_ONLY_URL,
    credit: "© CARTO · © OpenStreetMap contributors",
    maximumLevel: 20,
  });
}

function removeGlobeLayer(
  viewer: import("cesium").Viewer,
  layer: import("cesium").ImageryLayer | null,
): void {
  if (!layer) return;
  try {
    if (viewer.imageryLayers.contains(layer)) {
      viewer.imageryLayers.remove(layer, true);
    }
  } catch {
    /* already gone */
  }
}

function removeTilesetLayer(
  tileset: import("cesium").Cesium3DTileset | null,
  layer: import("cesium").ImageryLayer | null,
): void {
  if (!tileset || !layer) return;
  const layers = (
    tileset as {
      imageryLayers?: {
        contains: (l: import("cesium").ImageryLayer) => boolean;
        remove: (l: import("cesium").ImageryLayer, destroy?: boolean) => void;
      };
    }
  ).imageryLayers;
  if (!layers) return;
  try {
    if (layers.contains(layer)) layers.remove(layer, true);
  } catch {
    /* already gone */
  }
}

async function rebuildOverlay(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  state: OverlayState,
): Promise<void> {
  removeGlobeLayer(viewer, state.globeLayer);
  removeTilesetLayer(state.googleTileset, state.tilesetLayer);
  state.globeLayer = null;
  state.tilesetLayer = null;
  state.source = null;

  if (!state.enabled || viewer.isDestroyed()) return;

  let provider = await createGoogleOverlayProvider(Cesium, state.language);
  let source: "google" | "carto" = "google";
  if (!provider) {
    provider = createCartoLabelsProvider(Cesium);
    source = "carto";
  }

  const globeLayer = viewer.imageryLayers.addImageryProvider(provider);
  globeLayer.alpha = 0.92;
  state.globeLayer = globeLayer;
  state.source = source;

  const tileset = state.googleTileset;
  const tilesetLayers = tileset
    ? (
        tileset as {
          imageryLayers?: {
            addImageryProvider: (
              p: import("cesium").ImageryProvider,
            ) => import("cesium").ImageryLayer;
          };
        }
      ).imageryLayers
    : undefined;

  if (tileset && tilesetLayers && typeof tilesetLayers.addImageryProvider === "function") {
    try {
      // draping용 별도 provider (동일 세션 타일)
      let drapeProvider = provider;
      if (source === "google") {
        drapeProvider =
          (await createGoogleOverlayProvider(Cesium, state.language)) ?? provider;
      } else {
        drapeProvider = createCartoLabelsProvider(Cesium);
      }
      const draped = tilesetLayers.addImageryProvider(drapeProvider);
      draped.alpha = 0.95;
      state.tilesetLayer = draped;
    } catch (err) {
      console.warn("[cesiumGooglePlaceOverlay] tileset drape skipped:", err);
    }
  }
}

/**
 * Google Earth에 가까운 지명·시설·도로 라벨을 Cesium에 붙인다.
 * dispose / setLanguage / setEnabled / setGoogleTileset으로 수명 관리.
 */
export async function attachObservePlaceNameOverlay(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  options: {
    language?: "ko" | "en";
    enabled?: boolean;
    googleTileset?: import("cesium").Cesium3DTileset | null;
  } = {},
): Promise<ObservePlaceOverlayHandle> {
  const state: OverlayState = {
    enabled: options.enabled !== false,
    language: options.language === "en" ? "en" : "ko",
    googleTileset: options.googleTileset ?? null,
    globeLayer: null,
    tilesetLayer: null,
    source: null,
  };

  await rebuildOverlay(Cesium, viewer, state);

  return {
    dispose: () => {
      state.enabled = false;
      removeGlobeLayer(viewer, state.globeLayer);
      removeTilesetLayer(state.googleTileset, state.tilesetLayer);
      state.globeLayer = null;
      state.tilesetLayer = null;
      state.source = null;
    },
    setLanguage: async (lang) => {
      if (state.language === lang) return;
      state.language = lang;
      await rebuildOverlay(Cesium, viewer, state);
    },
    setEnabled: (enabled) => {
      if (state.enabled === enabled) return;
      state.enabled = enabled;
      void rebuildOverlay(Cesium, viewer, state);
    },
    setGoogleTileset: async (tileset) => {
      if (state.googleTileset === tileset) return;
      removeTilesetLayer(state.googleTileset, state.tilesetLayer);
      state.tilesetLayer = null;
      state.googleTileset = tileset;
      await rebuildOverlay(Cesium, viewer, state);
    },
  };
}
