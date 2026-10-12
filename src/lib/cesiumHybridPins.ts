/**
 * 관측(Cesium) — 하이브리드전 사건 핀.
 * 구역별 색으로 구분하고, 기관·국가 후원 개입이 의심된 건은 흰 이중 테두리를 얹는다.
 * 지구 뒤편 가림·깊이 정책은 호출 쪽(CesiumSatelliteGlobe)의 공용 규칙을 따른다.
 */

import type { HybridIncidentPin } from "@/lib/hybridIncidentPins";
import {
  HYBRID_ZONE_LABEL_EN,
  HYBRID_ZONE_LABEL_KO,
  hybridKindLabel,
  type HybridZone,
} from "@/lib/liveuamap/hybridWarfare";

type CesiumNS = typeof import("cesium");

export const HYBRID_PIN_PREFIX = "hybrid-pin:";

export const HYBRID_ZONE_COLOR: Record<HybridZone, string> = {
  "ce-europe": "#f97316",
  europe: "#38bdf8",
  "n-europe": "#a78bfa",
  asia: "#f43f5e",
  world: "#facc15",
};

const SIZE_PX = 30;
const HEIGHT_M = 2_500;
const iconCache = new Map<string, string>();

/** 다이아몬드 + 느낌표 — 전투 핀(삼각형)·항적 화살과 겹치지 않는 실루엣 */
function pinIconUri(color: string, agency: boolean): string {
  const key = `${color}:${agency ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const ring = agency
    ? `<path d="M16 1.5 L30.5 16 L16 30.5 L1.5 16 Z" fill="none" stroke="#ffffff" stroke-width="1.6"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE_PX}" height="${SIZE_PX}" viewBox="0 0 32 32">
${ring}
<path d="M16 4 L28 16 L16 28 L4 16 Z" fill="${color}" fill-opacity="0.92" stroke="rgba(15,23,42,0.7)" stroke-width="1.2" stroke-linejoin="round"/>
<rect x="14.6" y="9.5" width="2.8" height="9" rx="1.2" fill="#0f172a"/>
<circle cx="16" cy="21.8" r="1.7" fill="#0f172a"/>
</svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  iconCache.set(key, uri);
  return uri;
}

export function hybridPinName(pin: HybridIncidentPin, lang: "ko" | "en"): string {
  const zone = lang === "en" ? HYBRID_ZONE_LABEL_EN[pin.zone] : HYBRID_ZONE_LABEL_KO[pin.zone];
  const kind = hybridKindLabel(pin.kind, lang);
  const agency =
    pin.agency ? (lang === "en" ? " · agency suspected" : " · 기관 개입 의심") : "";
  return `${pin.title}\n${zone} · ${kind}${agency}`;
}

/**
 * @param depthTestDistance 라이브 마커 공용 깊이 정책 값 (원거리 Infinity / 근접 0)
 */
export function syncHybridPinEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  pins: readonly HybridIncidentPin[],
  options: { depthTestDistance: number; lang: "ko" | "en" },
): void {
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(120_000, 1.5, 22_000_000, 0.8);

  for (const pin of pins) {
    if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
    const id = `${HYBRID_PIN_PREFIX}${pin.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, HEIGHT_M);
    const image = pinIconUri(HYBRID_ZONE_COLOR[pin.zone], pin.agency);
    const name = hybridPinName(pin, options.lang);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = name;
      existing.billboard.image = new Cesium.ConstantProperty(image);
      existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(
        options.depthTestDistance,
      );
      continue;
    }
    viewer.entities.add({
      id,
      name,
      position,
      billboard: {
        image,
        width: SIZE_PX,
        height: SIZE_PX,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: options.depthTestDistance,
        scaleByDistance,
        color: Cesium.Color.WHITE,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith(HYBRID_PIN_PREFIX) &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
