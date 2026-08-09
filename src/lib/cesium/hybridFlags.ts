/**
 * MapLibre ↔ Cesium hybrid (방법 B) feature flags.
 * Default ON — set NEXT_PUBLIC_CESIUM_HYBRID=false to disable.
 */

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
