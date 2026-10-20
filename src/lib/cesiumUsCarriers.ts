/**
 * 관측(Cesium) — 미 항모 갑판 아이콘 + 추정 해역 링.
 * USNI 보도는 해역 단위라 정확 좌표가 아니다 → 모항이 아니면 반경 링으로 불확실성을 보인다.
 * 빌보드/라벨은 지구 뒤편을 뚫지 않게 depth=0 + EllipsoidalOccluder(show)로 가린다.
 * (라이브 AIS처럼 Infinity depth를 쓰지 않는다 — 한 프레임만 오클루전이 늦어도 관통한다.)
 */
import type { UsCarrier } from "@/data/geoTypes";
import { US_CARRIER_STATUS_COLORS, US_CARRIER_STATUS_LABELS } from "@/data/usCarriers";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

export const CESIUM_CARRIER_PREFIX = "carrier:";
export const CESIUM_CARRIER_RING_PREFIX = "carrier-ring:";
const RING_PREFIX = CESIUM_CARRIER_RING_PREFIX;
/** 해역 추정 반경 — 보도 해역 중심 좌표에서 실제 위치까지 흔히 수백 km */
const AREA_RING_M = 250_000;
/** 글로브에 묻히지 않게 살짝 띄움 (m) — depth test 켠 상태에서도 보임 */
const CARRIER_HEIGHT_M = 800;

type GlobeOccluder = {
  isPointVisible: (point: import("cesium").Cartesian3) => boolean;
};

function createGlobeOccluder(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
): GlobeOccluder {
  const Ctor = (Cesium as unknown as {
    EllipsoidalOccluder: new (
      ellipsoid: import("cesium").Ellipsoid,
      cameraPosition: import("cesium").Cartesian3,
    ) => GlobeOccluder;
  }).EllipsoidalOccluder;
  return new Ctor(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
}

/** 카메라 기준 가시 여부 — 빌보드/라벨/타원 show에 매 프레임 평가 */
function occlusionShowProperty(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  position: import("cesium").Cartesian3,
): import("cesium").CallbackProperty {
  return new Cesium.CallbackProperty(() => {
    if (viewer.isDestroyed()) return false;
    return createGlobeOccluder(Cesium, viewer).isPointVisible(position);
  }, false);
}

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
      const position = Cesium.Cartesian3.fromDegrees(c.lng, c.lat, CARRIER_HEIGHT_M);
      const graphicsShow = occlusionShowProperty(Cesium, viewer, position);
      const statusColor = Cesium.Color.fromCssColorString(US_CARRIER_STATUS_COLORS[c.status]);
      const name = usCarrierHoverLabel(c);
      const labelText = `${c.name.replace(/^USS\s+/i, "")} ${c.hull}`;

      const existing = viewer.entities.getById(id);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = name;
        existing.show = true;
        if (existing.billboard) {
          existing.billboard.show = graphicsShow;
          existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(0);
        }
        if (existing.label) {
          existing.label.show = graphicsShow;
          existing.label.text = new Cesium.ConstantProperty(labelText);
          existing.label.fillColor = new Cesium.ConstantProperty(statusColor);
          existing.label.disableDepthTestDistance = new Cesium.ConstantProperty(0);
        }
      } else {
        viewer.entities.add({
          id,
          name,
          position,
          show: true,
          billboard: {
            show: graphicsShow,
            image: deckIcon(),
            width: 44,
            height: 22,
            // 절대 Infinity 금지 — 지구 반대편 관통 방지
            disableDepthTestDistance: 0,
          },
          label: {
            show: graphicsShow,
            text: labelText,
            font: "600 11px system-ui, sans-serif",
            fillColor: statusColor,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 18),
            disableDepthTestDistance: 0,
          },
        });
      }

      // 모항·정비 중이면 위치가 확실 — 해역 추정일 때만 링
      const ring = viewer.entities.getById(ringId);
      if (c.status === "deployed") {
        seen.add(ringId);
        if (ring) {
          ring.position = new Cesium.ConstantPositionProperty(position);
          ring.show = true;
          if (ring.ellipse) {
            ring.ellipse.show = graphicsShow;
          }
        } else {
          viewer.entities.add({
            id: ringId,
            name,
            position,
            show: true,
            ellipse: {
              show: graphicsShow,
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
