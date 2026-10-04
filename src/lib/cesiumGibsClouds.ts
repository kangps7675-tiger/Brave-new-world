/**
 * Cesium 관측 모드 — NASA GIBS 구름.
 *
 * 기본: 풀 볼륨 레이마칭 (cesiumGibsCloudsVolume).
 * 폴백: 저/중/고 다층 껍질 → WMTS imagery.
 *
 * @see https://nasa-gibs.github.io/gibs-api-docs/
 */

import { observeRequestRender } from "@/lib/cesiumObserveRenderGovernor";
import {
  attachVolumetricCloudPrimitive,
  CLOUD_VOLUME_BOTTOM_M,
  CLOUD_VOLUME_TOP_M,
  type VolumetricCloudHandle,
} from "@/lib/cesiumGibsCloudsVolume";

/** 출처 표기 */
export const GIBS_CLOUDS_CREDIT = {
  label: "NASA GIBS clouds",
  url: "https://earthdata.nasa.gov/gibs",
} as const;

/** 표준 일일 운량 (글로벌 커버) */
export const GIBS_CLOUD_LAYER_ID = "MODIS_Terra_Cloud_Fraction_Day";

/** NRT 운량 — 더 최근 스냅에 가깝다 (커버리지·가용성은 가변) */
export const GIBS_CLOUD_LAYER_ID_NRT = "AIRS_L2_Total_Cloud_Fraction_Day";

/** 궤도에서 구름 최대 농도 — 땅을 가리지 않게 낮게 (전 층 합산 목표) */
export const GIBS_CLOUD_SHELL_ALPHA = 0.34;

export const GIBS_CLOUD_MAX_LEVEL = 6;

/** 시각적 바람 드리프트 (데이터 갱신과 별개) */
export const CLOUD_SHELL_REVOLUTION_SEC = 11 * 60;
/** idle governor — 구름 회전은 상시 preRender 대신 저주기 interval */
export const CLOUD_SHELL_SPIN_INTERVAL_MS = 400;

/**
 * 다층 3D 구름 껍질 (저→고).
 * 실제 운고(수 km)보다 과장해 궤도에서 시차가 읽히게 한다.
 */
export const CLOUD_3D_SHELLS = [
  {
    id: "low",
    altitudeM: 52_000,
    alphaScale: 0.5,
    spinScale: 1,
    densityMin: 0.52,
    densityMax: 1.01,
  },
  {
    id: "mid",
    altitudeM: 74_000,
    alphaScale: 0.38,
    spinScale: 0.78,
    densityMin: 0.26,
    densityMax: 0.7,
  },
  {
    id: "high",
    altitudeM: 98_000,
    alphaScale: 0.26,
    spinScale: 0.58,
    densityMin: 0.06,
    densityMax: 0.42,
  },
] as const;

export type Cloud3dShellDef = (typeof CLOUD_3D_SHELLS)[number];

/** 최상층 고도 — 페이드·레거시 호환 */
export const CLOUD_SHELL_ALTITUDE_M =
  CLOUD_3D_SHELLS[CLOUD_3D_SHELLS.length - 1]!.altitudeM;

/** 최하층 고도 — 카메라가 이 아래로 들어가면 구름 소거 */
export const CLOUD_SHELL_LOWEST_ALTITUDE_M = CLOUD_3D_SHELLS[0]!.altitudeM;

/** 이 고도 이상: 전역 뷰 — 구름 최대 */
export const CLOUD_FADE_START_HEIGHT_M = 520_000;

/** 이 고도 이하: 지상 접근 — 구름 소거 */
export const CLOUD_FADE_END_HEIGHT_M = 55_000;

/** 실제 데이터 재조회 주기 — “라이브”에 가깝게 */
export const GIBS_CLOUD_REFRESH_MS = 20 * 60_000;

export const GIBS_CLOUD_SNAPSHOT_SIZE = { width: 2048, height: 1024 } as const;

export type GibsCloudLayerPick = {
  layerId: string;
  time: string;
  nrt: boolean;
};

/** UTC 날짜 문자열 YYYY-MM-DD */
export function gibsUtcDateString(dayOffset = 0, now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + dayOffset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @deprecated → gibsUtcDateString(-1) 과 동일 (어제) */
export function gibsCloudDateUtc(now = new Date()): string {
  return gibsUtcDateString(-1, now);
}

/**
 * 라이브에 가까운 후보: NRT·당일 우선, 그다음 어제/그제 MODIS.
 * (완전 초실시간은 불가 — GIBS 지연 한계를 후보 탐색으로 완화)
 */
export function gibsCloudLayerCandidates(now = new Date()): GibsCloudLayerPick[] {
  const today = gibsUtcDateString(0, now);
  const yesterday = gibsUtcDateString(-1, now);
  const day2 = gibsUtcDateString(-2, now);
  return [
    { layerId: GIBS_CLOUD_LAYER_ID_NRT, time: today, nrt: true },
    { layerId: GIBS_CLOUD_LAYER_ID_NRT, time: yesterday, nrt: true },
    { layerId: GIBS_CLOUD_LAYER_ID, time: today, nrt: false },
    { layerId: GIBS_CLOUD_LAYER_ID, time: yesterday, nrt: false },
    { layerId: GIBS_CLOUD_LAYER_ID, time: day2, nrt: false },
  ];
}

export function gibsCloudWmtsUrlTemplate(
  time = gibsCloudDateUtc(),
  layerId = GIBS_CLOUD_LAYER_ID,
): string {
  const root = layerId.includes("AIRS") || layerId.includes("NRT")
    ? "https://gibs.earthdata.nasa.gov/wmts/epsg3857/all/"
    : "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
  return (
    `${root}${layerId}/default/${time}/` +
    `GoogleMapsCompatible_Level${GIBS_CLOUD_MAX_LEVEL}/{z}/{y}/{x}.png`
  );
}

export function gibsCloudGlobeSnapshotUrl(
  time = gibsCloudDateUtc(),
  width = GIBS_CLOUD_SNAPSHOT_SIZE.width,
  height = GIBS_CLOUD_SNAPSHOT_SIZE.height,
  layerId = GIBS_CLOUD_LAYER_ID,
): string {
  const params = new URLSearchParams({
    REQUEST: "GetMap",
    LAYERS: layerId,
    CRS: "EPSG:4326",
    TIME: time,
    WRAP: "DAY",
    BBOX: "-180,-90,180,90",
    FORMAT: "image/png",
    WIDTH: String(width),
    HEIGHT: String(height),
    TRANSPARENT: "TRUE",
  });
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params.toString()}`;
}

/**
 * 카메라 높이(m) → 구름 불투명도 배율.
 * 전역(멀리)에서도 1이지만, 텍스처 자체가 구름만 흰색·대기는 투명.
 */
export function cloudShellFadeForCameraHeightM(heightM: number): number {
  if (!Number.isFinite(heightM)) return 1;
  // 운층·껍질 안으로 들어가면 소거 (지상 관측 시 가림 방지)
  const floorM = Math.min(CLOUD_VOLUME_BOTTOM_M, CLOUD_SHELL_LOWEST_ALTITUDE_M) * 0.92;
  if (heightM <= floorM) return 0;
  if (heightM <= CLOUD_FADE_END_HEIGHT_M) return 0;
  if (heightM >= CLOUD_FADE_START_HEIGHT_M) return 1;
  const t =
    (heightM - CLOUD_FADE_END_HEIGHT_M) /
    (CLOUD_FADE_START_HEIGHT_M - CLOUD_FADE_END_HEIGHT_M);
  return smoothstep(0, 1, t);
}

/**
 * 구름만 순백, 대기·육지 배경·옅은 연무는 alpha 0.
 * 전역에서도 땅이 비치도록 컷을 세게 잡는다.
 */
export function keyCloudPixelsForShell(
  data: Uint8ClampedArray,
  _alphaScale = 1,
): void {
  void _alphaScale;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const srcA = (data[i + 3] ?? 0) / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // 채도 있는 팔레트(파란/보라 운량색)는 버림 — 밝은 무채색만 구름
    const maxC = Math.max(r, g, b) / 255;
    const minC = Math.min(r, g, b) / 255;
    const sat = maxC > 1e-3 ? (maxC - minC) / maxC : 0;
    const whiteness = 1 - sat;
    const cloud = smoothstep(0.48, 0.88, lum) * smoothstep(0.35, 0.75, whiteness);
    const a = Math.round(cloud * srcA * 255);
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = a;
  }
}

/**
 * 키잉된 구름 alpha를 밀도 대역으로 나눠 저/중/고 층 텍스처를 만든다.
 * dens = alpha/255. 대역이 겹치면 층간 부드러운 블렌드.
 */
export function extractCloudDensityBand(
  src: Uint8ClampedArray,
  densityMin: number,
  densityMax: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const lo = Math.min(densityMin, densityMax);
  const hi = Math.max(densityMin, densityMax);
  const soft = Math.max(0.04, (hi - lo) * 0.22);
  for (let i = 0; i < src.length; i += 4) {
    const a = (src[i + 3] ?? 0) / 255;
    if (a <= 0.01) continue;
    const w =
      smoothstep(lo - soft, lo + soft, a) *
      (1 - smoothstep(hi - soft, hi + soft, a));
    const outA = Math.round(a * w * 255);
    if (outA <= 0) continue;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = outA;
  }
  return out;
}

/** 키잉된 data URL → 층별 data URL (maxShells만큼) */
export async function buildCloud3dLayerTextures(
  keyedDataUrl: string,
  shells: readonly Cloud3dShellDef[] = CLOUD_3D_SHELLS,
): Promise<string[]> {
  const img = await loadCrossOriginImage(keyedDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const urls: string[] = [];
  for (const shell of shells) {
    const band = extractCloudDensityBand(src, shell.densityMin, shell.densityMax);
    const layer = ctx.createImageData(canvas.width, canvas.height);
    layer.data.set(band);
    ctx.putImageData(layer, 0, 0);
    urls.push(canvas.toDataURL("image/png"));
  }
  return urls;
}

/** 키잉 후 구름 픽셀 비율 — 빈 스냅(실패·야간) 걸러내기 */
export function cloudPixelCoverageRatio(data: Uint8ClampedArray): number {
  let cloud = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4) {
    total += 1;
    if ((data[i] ?? 0) > 24) cloud += 1;
  }
  return total > 0 ? cloud / total : 0;
}

export type AttachGibsCloudsOpts = {
  alpha?: number;
  /** Cinema 토글 등 — 매 fade마다 최신 알파 */
  getAlpha?: () => number;
  /**
   * volume = 풀 볼륨 레이마칭 (기본)
   * shells = 다층 껍질만
   */
  mode?: "volume" | "shells";
  /** shells 모드 / volume 폴백 시 껍질 수 */
  maxShells?: 1 | 2 | 3;
  enableTileOverlay?: boolean;
};

type CesiumNS = typeof import("cesium");

type ShellRuntime = {
  primitive: import("cesium").Primitive;
  appearance: import("cesium").MaterialAppearance;
  spinScale: number;
  alphaScale: number;
};

export function attachGibsClouds(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  opts?: AttachGibsCloudsOpts,
): () => void {
  const resolveBaseAlpha = () =>
    clamp01(opts?.getAlpha?.() ?? opts?.alpha ?? GIBS_CLOUD_SHELL_ALPHA);
  const preferVolume = opts?.mode !== "shells";
  const maxShells = Math.min(3, Math.max(1, opts?.maxShells ?? 3)) as 1 | 2 | 3;
  let cancelled = false;
  let refreshTimer: number | null = null;
  let removeCameraChanged: (() => void) | null = null;
  let spinTimer: number | null = null;
  let volumeHandle: VolumetricCloudHandle | null = null;
  let shells: ShellRuntime[] = [];
  let fallbackLayer: import("cesium").ImageryLayer | null = null;
  const t0 = performance.now();
  const scratchCarto = new Cesium.Cartographic();

  const cameraHeightM = (): number => {
    try {
      const carto = Cesium.Cartographic.fromCartesian(
        viewer.camera.positionWC,
        viewer.scene.globe.ellipsoid,
        scratchCarto,
      );
      return carto?.height ?? Number.POSITIVE_INFINITY;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  };

  const clearShell = () => {
    if (removeCameraChanged) {
      removeCameraChanged();
      removeCameraChanged = null;
    }
    if (spinTimer != null) {
      window.clearInterval(spinTimer);
      spinTimer = null;
    }
    if (volumeHandle) {
      try {
        volumeHandle.destroy();
      } catch {
        /* ignore */
      }
      volumeHandle = null;
    }
    if (!viewer.isDestroyed()) {
      for (const shell of shells) {
        try {
          viewer.scene.primitives.remove(shell.primitive);
        } catch {
          /* ignore */
        }
      }
    }
    shells = [];
  };

  const clearFallback = () => {
    if (fallbackLayer && !viewer.isDestroyed()) {
      try {
        viewer.imageryLayers.remove(fallbackLayer, false);
      } catch {
        /* ignore */
      }
    }
    fallbackLayer = null;
  };

  const applyFade = (fade: number) => {
    const base = resolveBaseAlpha() * fade;
    if (volumeHandle) {
      // 볼륨 셰이더는 내부에서 산란·알파를 쌓으므로 약간 높게
      volumeHandle.setOpacity(Math.min(1, base * 2.4));
    }
    for (const shell of shells) {
      if (shell.primitive.isDestroyed()) continue;
      const op = base * shell.alphaScale;
      shell.primitive.show = op > 0.015;
      const mat = shell.appearance.material as
        | { uniforms?: { color?: import("cesium").Color } }
        | undefined;
      const color = mat?.uniforms?.color;
      if (color) {
        color.red = 1;
        color.green = 1;
        color.blue = 1;
        color.alpha = op;
      }
    }
    if (fallbackLayer) {
      fallbackLayer.show = base > 0.02;
      fallbackLayer.alpha = Math.min(0.26, base * 0.7);
    }
  };

  const bindAltitudeFadeLoop = () => {
    if (removeCameraChanged) {
      removeCameraChanged();
      removeCameraChanged = null;
    }
    if (spinTimer != null) {
      window.clearInterval(spinTimer);
      spinTimer = null;
    }
    const scratchRot = new Cesium.Matrix3();
    const scratchMat = new Cesium.Matrix4();
    const tick = (spin: boolean) => {
      if (viewer.isDestroyed()) return;
      const fade = cloudShellFadeForCameraHeightM(cameraHeightM());
      applyFade(fade);
      if (spin && fade > 0.02) {
        const elapsed = (performance.now() - t0) / 1000;
        const period = CLOUD_SHELL_REVOLUTION_SEC;
        const angle = ((elapsed % period) / period) * Math.PI * 2;
        if (volumeHandle) {
          volumeHandle.setSpinAngle(angle);
        }
        for (const shell of shells) {
          if (shell.primitive.isDestroyed()) continue;
          const shellAngle =
            (((elapsed * shell.spinScale) % period) / period) * Math.PI * 2;
          Cesium.Matrix3.fromRotationZ(shellAngle, scratchRot);
          Cesium.Matrix4.fromRotationTranslation(
            scratchRot,
            Cesium.Cartesian3.ZERO,
            scratchMat,
          );
          shell.primitive.modelMatrix = Cesium.Matrix4.clone(scratchMat);
        }
      }
      observeRequestRender();
    };
    removeCameraChanged = viewer.camera.changed.addEventListener(() => {
      tick(false);
    });
    spinTimer = window.setInterval(() => tick(true), CLOUD_SHELL_SPIN_INTERVAL_MS);
    tick(true);
  };

  const attachFallbackWmts = (pick: GibsCloudLayerPick) => {
    clearShell();
    clearFallback();
    if (viewer.isDestroyed() || cancelled) return;
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: gibsCloudWmtsUrlTemplate(pick.time, pick.layerId),
      credit: `${GIBS_CLOUDS_CREDIT.label} · ${pick.layerId} (${pick.time})`,
      maximumLevel: GIBS_CLOUD_MAX_LEVEL,
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
    });
    fallbackLayer = viewer.imageryLayers.addImageryProvider(provider);
    fallbackLayer.saturation = 0.08;
    fallbackLayer.brightness = 1.04;
    applyFade(cloudShellFadeForCameraHeightM(cameraHeightM()));
    bindAltitudeFadeLoop();
  };

  const makeShellAppearance = (
    imageUrl: string,
    initialAlpha: number,
  ): import("cesium").MaterialAppearance =>
    new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Image", {
        image: imageUrl,
        transparent: true,
        color: new Cesium.Color(1.0, 1.0, 1.0, initialAlpha),
      }),
      translucent: true,
      closed: true,
      faceForward: false,
      renderState: {
        depthMask: false,
        blending: {
          enabled: true,
          equationRgb: Cesium.BlendEquation.ADD,
          equationAlpha: Cesium.BlendEquation.ADD,
          functionSourceRgb: Cesium.BlendFunction.SOURCE_ALPHA,
          functionDestinationRgb: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
          functionSourceAlpha: Cesium.BlendFunction.ONE,
          functionDestinationAlpha: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        },
      },
    });

  const attachShellFallback = async (
    keyedImageUrl: string,
    pick: GibsCloudLayerPick,
  ) => {
    const defs = CLOUD_3D_SHELLS.slice(0, maxShells);
    const baseAlpha = resolveBaseAlpha();
    const vertexFormat =
      Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
    const baseR = Cesium.Ellipsoid.WGS84.maximumRadius;

    let layerUrls: string[];
    try {
      layerUrls =
        maxShells > 1
          ? await buildCloud3dLayerTextures(keyedImageUrl, defs)
          : [keyedImageUrl];
    } catch {
      layerUrls = defs.map(() => keyedImageUrl);
    }
    if (viewer.isDestroyed() || cancelled) return;

    const next: ShellRuntime[] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]!;
      const imageUrl = layerUrls[i] ?? keyedImageUrl;
      const r = baseR + def.altitudeM;
      const appearance = makeShellAppearance(
        imageUrl,
        baseAlpha * def.alphaScale,
      );
      const primitive = viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.EllipsoidGeometry({
              radii: new Cesium.Cartesian3(r, r, r),
              vertexFormat,
            }),
          }),
          appearance,
          asynchronous: true,
          allowPicking: false,
          modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
        }),
      );
      next.push({
        primitive,
        appearance,
        spinScale: def.spinScale,
        alphaScale: def.alphaScale,
      });
    }
    shells = next;
    applyFade(cloudShellFadeForCameraHeightM(cameraHeightM()));
    bindAltitudeFadeLoop();
    void pick;
  };

  const attachRotatingShells = async (
    keyedImageUrl: string,
    pick: GibsCloudLayerPick,
  ) => {
    clearShell();
    clearFallback();
    if (viewer.isDestroyed() || cancelled) return;

    if (preferVolume) {
      try {
        volumeHandle = attachVolumetricCloudPrimitive(Cesium, viewer, keyedImageUrl, {
          opacity: Math.min(1, resolveBaseAlpha() * 2.4),
        });
        // 볼륨 상한 고도를 유니폼에 맞춤 (지구 반경 변동 대비)
        const mats = volumeHandle.primitive.appearance as
          | { material?: { uniforms?: { outerRadius?: number; innerRadius?: number } } }
          | undefined;
        const baseR = Cesium.Ellipsoid.WGS84.maximumRadius;
        if (mats?.material?.uniforms) {
          mats.material.uniforms.innerRadius = baseR + CLOUD_VOLUME_BOTTOM_M;
          mats.material.uniforms.outerRadius = baseR + CLOUD_VOLUME_TOP_M;
        }
        applyFade(cloudShellFadeForCameraHeightM(cameraHeightM()));
        bindAltitudeFadeLoop();
        return;
      } catch (err) {
        console.warn(
          "[cesiumGibsClouds] volumetric clouds failed → multi-shell:",
          err,
        );
        volumeHandle = null;
      }
    }

    await attachShellFallback(keyedImageUrl, pick);
  };

  const rebuild = async () => {
    if (viewer.isDestroyed() || cancelled) return;
    const candidates = gibsCloudLayerCandidates();
    for (const pick of candidates) {
      if (cancelled || viewer.isDestroyed()) return;
      const snapUrl = gibsCloudGlobeSnapshotUrl(
        pick.time,
        GIBS_CLOUD_SNAPSHOT_SIZE.width,
        GIBS_CLOUD_SNAPSHOT_SIZE.height,
        pick.layerId,
      );
      try {
        const keyed = await loadKeyedCloudTexture(snapUrl, 1);
        if (cancelled || viewer.isDestroyed()) return;
        // 커버리지 너무 낮으면 다음 후보 (빈/실패 스냅)
        const probe = await probeKeyedCoverage(keyed);
        if (probe < 0.004) continue;
        await attachRotatingShells(keyed, pick);
        return;
      } catch {
        // try next candidate
      }
    }
    // 전부 실패 → 어제 MODIS WMTS
    const fallback =
      candidates.find((c) => c.layerId === GIBS_CLOUD_LAYER_ID) ??
      candidates[candidates.length - 1]!;
    attachFallbackWmts(fallback);
  };

  void rebuild();
  refreshTimer = window.setInterval(() => {
    void rebuild();
  }, GIBS_CLOUD_REFRESH_MS);

  return () => {
    cancelled = true;
    if (refreshTimer != null) window.clearInterval(refreshTimer);
    refreshTimer = null;
    clearShell();
    clearFallback();
  };
}

export async function loadKeyedCloudTexture(
  url: string,
  alphaScale = 1,
): Promise<string> {
  const img = await loadCrossOriginImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  if (canvas.width < 8 || canvas.height < 8) {
    throw new Error("cloud snapshot too small");
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  keyCloudPixelsForShell(imageData.data, alphaScale);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function probeKeyedCoverage(dataUrl: string): Promise<number> {
  const img = await loadCrossOriginImage(dataUrl);
  const canvas = document.createElement("canvas");
  const w = Math.min(256, img.naturalWidth || img.width);
  const h = Math.min(128, img.naturalHeight || img.height);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return cloudPixelCoverageRatio(imageData.data);
}

function loadCrossOriginImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cloud image load failed: ${url}`));
    img.src = url;
  });
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return GIBS_CLOUD_SHELL_ALPHA;
  return Math.min(1, Math.max(0, n));
}
