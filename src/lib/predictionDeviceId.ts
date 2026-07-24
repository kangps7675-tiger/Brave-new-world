/**
 * 게스트 예측용 익명 deviceId — localStorage UUID.
 * 로그인 계정 연동은 추후 (guestPolicy 키만 예고).
 */

export const PREDICTION_DEVICE_ID_KEY = "geowatch-predict-device-v1";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreatePredictionDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(PREDICTION_DEVICE_ID_KEY)?.trim();
    if (existing && existing.length <= 80) return existing;
    const id = randomUuid();
    window.localStorage.setItem(PREDICTION_DEVICE_ID_KEY, id);
    return id;
  } catch {
    return randomUuid();
  }
}
