import type { DataProfile, RuntimeConfig } from "@/lib/runtimeConfig.types";

export type { DataProfile, RuntimeConfig } from "@/lib/runtimeConfig.types";

export function getServerDataProfile(): DataProfile {
  const env = process.env.DATA_PROFILE;
  if (env === "full") return "full";
  if (env === "lite") return "lite";
  return "lite";
}

export function isApiStubMode(): boolean {
  return process.env.API_STUB_MODE !== "false";
}

export function isNeptunEnabled(): boolean {
  return process.env.NEPTUN_ENABLED?.trim() === "true";
}

export function isTzevaAdomEnabled(): boolean {
  return process.env.TZEVA_ADOM_ENABLED?.trim() === "true";
}

export function isTelegramOsintEnabled(): boolean {
  return process.env.TELEGRAM_OSINT_ENABLED?.trim() === "true";
}

export function getSyncPollMs(): number {
  const parsed = Number(process.env.SYNC_POLL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}

export function getDataCdnBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_DATA_CDN?.trim() ||
    process.env.DATA_CDN_BASE?.trim() ||
    "";
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Cesium ion — Google Photorealistic 3D / World Terrain / OSM Buildings. */
export function getCesiumIonToken(): string | null {
  const raw =
    process.env.CESIUM_ION_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() ||
    "";
  return raw || null;
}

/**
 * 관측 모드 Google Photorealistic 3D Tiles.
 * 기본 on. GPU/쿼터 부담 시 `CESIUM_GOOGLE_3D=0`.
 * Ion Community 플랜은 개인·비상업 약관·쿼터를 확인할 것.
 */
export function isCesiumGoogle3dEnabled(): boolean {
  const raw = process.env.CESIUM_GOOGLE_3D?.trim().toLowerCase();
  if (!raw) return true;
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    dataProfile: getServerDataProfile(),
    apiStubMode: isApiStubMode(),
    neptunEnabled: isNeptunEnabled(),
    tzevaAdomEnabled: isTzevaAdomEnabled(),
    telegramOsintEnabled: isTelegramOsintEnabled(),
    syncPollMs: getSyncPollMs(),
    dataCdnBase: getDataCdnBase(),
    cesiumIonToken: getCesiumIonToken(),
    cesiumGoogle3dEnabled: isCesiumGoogle3dEnabled(),
  };
}
