import { getSourceNote } from "@/data/sourceCatalog";
import type { CommercialUseFlag } from "@/lib/caseFile/types";
import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";

/** sourceCatalog layerId 후보 — sourceKey 접두어와 맞춤 */
const LAYER_BY_KIND: Partial<Record<string, string>> = {
  firms: "firms-fires",
  neptun: "neptun",
  "tzeva-adom": "tzeva-adom",
  ais: "ais",
  liveua: "liveuamap-frontline-events",
  ukmto: "ukmto-incidents",
};

/**
 * 근거 sourceKey → 상업 이용 플래그.
 * catalog의 prohibited는 대외 근거로 쓰기 어려우니 license-required로 올린다.
 */
export function commercialUseForSourceKey(sourceKey: string): CommercialUseFlag {
  const kind = evidenceSourceKind(sourceKey);
  if (kind === "manual" || kind === "media" || kind === "photo" || kind === "other") {
    return "unknown";
  }
  // Copernicus Sentinel: 출처 표기 시 상업 이용 가능. 수동 위성 URL은 출처 불명
  if (kind === "satellite") {
    return /^sentinel-[12]\b/i.test(sourceKey.trim()) ? "allowed" : "unknown";
  }
  if (kind === "official") return "unknown";
  // OpenStreetMap ODbL — 출처 표기 시 허용
  if (kind === "facility") return "allowed";
  // ADS-B 제공처(ADSBExchange·OpenSky)와 DeepState는 상업 이용에 별도 허락 필요
  if (kind === "adsb" || kind === "control-zone") return "license-required";

  const layerId = LAYER_BY_KIND[kind] ?? sourceKey.split(/[:/|]/)[0];
  const note = layerId ? getSourceNote(layerId) : undefined;
  if (!note) return "unknown";

  if (note.commercialUse === "allowed") return "allowed";
  if (note.commercialUse === "prohibited" || note.commercialUse === "license-required") {
    return "license-required";
  }
  return "unknown";
}
