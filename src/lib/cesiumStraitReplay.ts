import type { StraitId } from "@/lib/straitReplay/types";

export type StraitReplayMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dim: boolean;
  kind: "anchor" | "similar" | "focus";
};

export type StraitReplayScene = {
  straitId: StraitId;
  focusId: string | null;
  markers: StraitReplayMarker[];
  onSelectEventId?: (id: string) => void;
};

type CesiumLike = {
  Color: {
    fromCssColorString: (c: string) => unknown;
    WHITE: unknown;
  };
  Cartesian2: new (x: number, y: number) => unknown;
  Cartesian3: {
    fromDegrees: (lng: number, lat: number, h?: number) => unknown;
  };
  NearFarScalar: new (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => unknown;
  LabelStyle: { FILL_AND_OUTLINE: unknown };
  VerticalOrigin: { BOTTOM: unknown };
  HeightReference: { CLAMP_TO_GROUND: unknown };
};

type EntityCollection = {
  add: (opts: Record<string, unknown>) => { id?: string };
  removeById: (id: string) => boolean;
  getById?: (id: string) => unknown;
};

/** 콜론은 prefix:key 파싱용으로 한 번만 — `strait-replay:` 금지 */
const PREFIX = "straitreplay:";

/** Cesium viewer.entities에 해협 이력 마커/라벨을 동기화. */
export function syncStraitReplayEntities(
  Cesium: CesiumLike,
  entities: EntityCollection,
  scene: StraitReplayScene | null,
  prevIds: Set<string>,
): Set<string> {
  for (const id of prevIds) {
    try {
      entities.removeById(id);
    } catch {
      /* ignore */
    }
  }
  const next = new Set<string>();
  if (!scene) return next;

  for (const m of scene.markers) {
    const id = `${PREFIX}${m.id}`;
    const color =
      m.kind === "focus"
        ? Cesium.Color.fromCssColorString("#fbbf24")
        : m.kind === "anchor"
          ? Cesium.Color.fromCssColorString("#5eead4")
          : Cesium.Color.fromCssColorString("#94a3b8");
    entities.add({
      id,
      position: Cesium.Cartesian3.fromDegrees(m.lng, m.lat, 0),
      point: {
        pixelSize: m.kind === "focus" ? 12 : m.dim ? 7 : 9,
        color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: m.label.slice(0, 48),
        font: "11px sans-serif",
        fillColor: color,
        outlineColor: Cesium.Color.fromCssColorString("#041018"),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        translucencyByDistance: new Cesium.NearFarScalar(
          1.5e6,
          1.0,
          8.0e6,
          0.0,
        ),
      },
      properties: {
        straitReplayEventId: m.id,
      },
    });
    next.add(id);
  }
  return next;
}

export function straitReplayEventIdFromEntity(entity: {
  id?: string;
  properties?: { straitReplayEventId?: { getValue?: () => string } };
}): string | null {
  const prop = entity.properties?.straitReplayEventId?.getValue?.();
  if (typeof prop === "string" && prop.length > 0) return prop;
  if (typeof entity.id === "string" && entity.id.startsWith(PREFIX)) {
    return entity.id.slice(PREFIX.length);
  }
  return null;
}
