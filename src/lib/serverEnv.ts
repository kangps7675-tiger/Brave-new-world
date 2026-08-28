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

/** Cesium ion — OSM Buildings 3D Tiles. 비면 지형 모드는 fill-extrusion 폴백. */
export function getCesiumIonToken(): string | null {
  const raw =
    process.env.CESIUM_ION_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() ||
    "";
  return raw || null;
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
  };
}
