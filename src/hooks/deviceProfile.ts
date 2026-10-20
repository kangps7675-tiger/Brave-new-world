"use client";

import { useSyncExternalStore } from "react";
import {
  DESKTOP_WIDE_QUERY,
  TABLET_QUERY,
  type DeviceProfile,
} from "@/hooks/deviceQueries";
import { PHONE_QUERY } from "@/hooks/phoneQuery";
import { isPhoneDevice } from "@/hooks/usePhoneUi";

export type { DeviceProfile };
export { TABLET_QUERY, DESKTOP_WIDE_QUERY, DEVICE_BOOT_SCRIPT } from "@/hooks/deviceQueries";

/**
 * 기기 프로파일 — 폰 / 태블릿 / 데스크톱 / 와이드 데스크톱.
 * 폰은 지구본 미마운트, 태블릿은 지구본+사이드 독, 와이드는 넓은 사이드바.
 */
export function resolveDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") return "desktop";
  try {
    if (isPhoneDevice()) return "phone";
    if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
    if (window.matchMedia(DESKTOP_WIDE_QUERY).matches) return "desktop-wide";
    return "desktop";
  } catch {
    return "desktop";
  }
}

function subscribeDevice(onStoreChange: () => void) {
  const queries = [PHONE_QUERY, TABLET_QUERY, DESKTOP_WIDE_QUERY].map((q) =>
    window.matchMedia(q),
  );
  for (const mq of queries) mq.addEventListener("change", onStoreChange);
  return () => {
    for (const mq of queries) mq.removeEventListener("change", onStoreChange);
  };
}

export function useDeviceProfile(): DeviceProfile {
  return useSyncExternalStore(subscribeDevice, resolveDeviceProfile, () => "desktop");
}

export function useTabletUi(): boolean {
  return useDeviceProfile() === "tablet";
}

export function useDesktopWideUi(): boolean {
  return useDeviceProfile() === "desktop-wide";
}
