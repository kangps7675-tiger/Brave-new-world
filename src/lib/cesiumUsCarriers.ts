/**
 * 관측(Cesium) — 미 항모 갑판 아이콘 + 추정 해역 링.
 * USNI 보도는 해역 단위라 정확 좌표가 아니다 → 모항이 아니면 반경 링으로 불확실성을 보인다.
 */
import type { UsCarrier } from "@/data/geoTypes";
import { US_CARRIER_STATUS_COLORS, US_CARRIER_STATUS_LABELS } from "@/data/usCarriers";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

export const CESIUM_CARRIER_PREFIX = "carrier:";
const RING_PREFIX = "carrier-ring:";
/** 해역 추정 반경 — 보도 해역 중심 좌표에서 실제 위치까지 흔히 수백 km */
const AREA_RING_M = 250_000;

let deckIconUri: string | null = null;
function deckIcon(): string {
  if (!deckIconUri) {
    deckIconUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      carrierDeckIconSvg({ width: 44, height: 22 }),
    )}`;
  }
  return deckIconUri;
}

function asOfText(c: UsCarrier): string {
  if (!c.asOf) return "기준 시드(보도 미반영)";
  const days = Math.floor((Date.now() - Date.parse(c.asOf)) / 86_400_000);
  const date = c.asOf.slice(0, 10);
  return Number.isFinite(days) && days >= 0 ? `${date} 보도 (${days}일 전)` : `${date} 보도`;
}

export function usCarrierHoverLabel(c: UsCarrier): string {
  return `${c.name} (${c.hull}) · ${c.location} · ${US_CARRIER_STATUS_LABELS[c.status]} · ${asOfText(c)}`;
}

export function syncUsCarrierEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  carriers: UsCarrier[],
  show: boolean,
): void {
  const seen = new Set<string>();
  if (show) {
    for (const c of carriers) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      const id = `${CESIUM_CARRIER_PREFIX}${c.id}`;
      const ringId = `${RING_PREFIX}${c.id}`;
      seen.add(id);
      const position = Cesium.Cartesian3.fromDegrees(c.lng, c.lat, 0);
      const statusColor = Cesium.Color.fromCssColorString(US_CARRIER_STATUS_COLORS[c.status]);
      const name = usCarrierHoverLabel(c);
      const labelText = `${c.name.replace(/^USS\s+/i, "")} ${c.hull}`;

      const existing = viewer.entities.getById(id);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = name;
        if (existing.label) {
          existing.label.text = new Cesium.ConstantProperty(labelText);
          existing.label.fillColor = new Cesium.ConstantProperty(statusColor);
        }
      } else {
        viewer.entities.add({
          id,
          name,
          position,
          billboard: {
            image: deckIcon(),
            width: 44,
            height: 22,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: labelText,
            font: "600 11px system-ui, sans-serif",
            fillColor: statusColor,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      // 모항·정비 중이면 위치가 확실 — 해역 추정일 때만 링
      const ring = viewer.entities.getById(ringId);
      if (c.status === "deployed") {
        seen.add(ringId);
        if (ring) {
          ring.position = new Cesium.ConstantPositionProperty(position);
        } else {
          viewer.entities.add({
            id: ringId,
            name,
            position,
            ellipse: {
              semiMajorAxis: AREA_RING_M,
              semiMinorAxis: AREA_RING_M,
              height: 0,
              material: statusColor.withAlpha(0.07),
              outline: true,
              outlineColor: statusColor.withAlpha(0.55),
            },
          });
        }
      }
    }
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    const id = entity.id;
    if (typeof id !== "string") continue;
    if (!id.startsWith(CESIUM_CARRIER_PREFIX) && !id.startsWith(RING_PREFIX)) continue;
    if (!seen.has(id)) stale.push(entity);
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
