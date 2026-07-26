import type { UkraineSettlement } from "@/data/geoTypes";
import { activeBasemapTone, type BasemapTone } from "@/lib/basemapTone";
import {
  getPlaceLabelColor,
  isMegacityLabelVisible,
  type PlaceLabelTier,
} from "@/lib/placeLabelColors";

/** 비대도시 거주지 — 이 고도 이하에서만 이름 표시 */
export const UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE = 0.05;

export const UA_MEGACITY_LABEL_SIZE_DEG = 0.065;
export const UA_SETTLEMENT_LABEL_SIZE_DEG = 0.003;

const UA_DOT_RADIUS_DEG = 0.004;

/** 우크라 전황 라벨용 규모 — 주요도시 / 중소도시 / 마을 */
export function getUkraineSettlementTier(
  population: number | null | undefined,
): PlaceLabelTier {
  const pop = population ?? 0;
  if (pop >= 1_500_000) return "megacity";
  if (pop >= 100_000) return "city";
  if (pop >= 10_000) return "town";
  return "village";
}

export function isUkraineSettlementLabelVisible(
  tier: PlaceLabelTier,
  altitude: number,
): boolean {
  const a = Number.isFinite(altitude) ? altitude : UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE;
  if (tier === "megacity") return isMegacityLabelVisible(a);
  return a <= UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE;
}

/** 거주지 이름 텍스트 높이(°) — 등급별 고정 크기 */
export function getUkraineSettlementLabelSize(
  tier: PlaceLabelTier,
  altitude: number,
): number {
  if (!isUkraineSettlementLabelVisible(tier, altitude)) return 0;
  if (tier === "megacity") return UA_MEGACITY_LABEL_SIZE_DEG;
  return UA_SETTLEMENT_LABEL_SIZE_DEG;
}

/** 위치 점 반경(°) */
export function getUkraineSettlementDotRadius(
  tier: PlaceLabelTier,
  altitude: number,
): number {
  if (!isUkraineSettlementLabelVisible(tier, altitude)) return 0;
  return UA_DOT_RADIUS_DEG;
}

export function getUkraineSettlementLabelAltitude(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  if (a <= 0.05) return 0.0024;
  if (a <= 0.12) return 0.0026;
  return 0.003;
}

/** 인텔 = 노랑/흰색 · 지형(밝은 맵) = 어두운 잉크 */
export function getUkraineSettlementLabelColor(
  tier: PlaceLabelTier,
  tone: BasemapTone = activeBasemapTone(),
): string {
  return getPlaceLabelColor(tier, true, tone);
}

export function createUkraineSettlementLabelElement(
  name: string,
  tier: PlaceLabelTier,
): HTMLElement {
  const tone = activeBasemapTone();
  const el = document.createElement("span");
  el.textContent = name || "마을";
  el.className = "ua-settlement-label";
  el.style.fontWeight = "700";
  el.style.fontFamily = 'ui-sans-serif, system-ui, "Segoe UI", sans-serif';
  el.style.fontSize = tier === "megacity" ? "11px" : "9px";
  el.style.color = getUkraineSettlementLabelColor(tier, tone);
  el.style.textShadow =
    tone === "light"
      ? "0 0 2px rgba(255,255,255,0.98), 0 1px 3px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.65)"
      : "0 0 4px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.85)";
  el.style.whiteSpace = "nowrap";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.lineHeight = "1.1";
  return el;
}

export function ukraineControlStatusLabel(
  status: UkraineSettlement["controlStatus"],
): string {
  if (status === "RU") return "러시아 주장";
  if (status === "CONTESTED") return "경합";
  return "우크라이나 주장";
}

export function isInUkraineTheater(lat: number, lng: number): boolean {
  return lat >= 43.5 && lat <= 53.5 && lng >= 21.5 && lng <= 41.5;
}
