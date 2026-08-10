/**
 * MapLibre ↔ Cesium hybrid (방법 B) feature flags.
 * Default ON — set NEXT_PUBLIC_CESIUM_HYBRID=false to disable.
 * 하드웨어가 약하면 `isCesiumHybridHardwareOk`가 런타임에 막습니다.
 */

import {
  isCesiumHybridHardwareOk,
  type CesiumHybridHardwareInput,
} from "@/lib/cesium/hybridCapability";

export function isCesiumHybridEnabled(): boolean {
  if (typeof process === "undefined") return true;
  return process.env.NEXT_PUBLIC_CESIUM_HYBRID !== "false";
}

export function getCesiumBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CESIUM_BASE_URL?.trim()
      : undefined;
  if (fromEnv) return fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`;
  return "/cesium/";
}

export function getCesiumIonToken(): string | null {
  if (typeof process === "undefined") return null;
  const t = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim();
  return t && t.length > 8 ? t : null;
}

/** env ON + 비폰 + 하드웨어 OK (+ Ultra-Lite면 OFF) */
export function shouldMountCesiumHybrid(opts?: {
  isPhoneUi?: boolean;
  ultraLite?: boolean;
  hardware?: CesiumHybridHardwareInput;
}): boolean {
  if (opts?.isPhoneUi) return false;
  if (!isCesiumHybridEnabled()) return false;
  if (typeof window === "undefined") return false;
  return isCesiumHybridHardwareOk({
    ultraLite: opts?.ultraLite,
    ...opts?.hardware,
  });
}

export {
  isCesiumHybridHardwareOk,
  isWeakGpuRenderer,
  probeGpuRenderer,
} from "@/lib/cesium/hybridCapability";
