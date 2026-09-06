/**
 * AIS 선박 마커의 **symbol 레이어 경로** — 항공기(milAircraftSymbols.ts)와 동일 패턴.
 *
 * ── 왜 이제야 만들었나 ──────────────────────────────────────────────
 * milAircraftSymbols.ts 주석에 "선박은 8방위 실루엣·위장선 등 상태 조합이
 * 많아 별도 설계가 필요하다"고 적어둔 후속 과제다. 실제로 뜯어보면:
 *
 *  - 일반 상선/어선/여객선/탱커 등은 색만 다른 화살표 아이콘 하나 —
 *    `aisCommercialPointColor()`가 반환하는 색이 유형별로 유한(7종)하므로
 *    항공기처럼 그냥 구워서 `icon-rotate`로 회전시키면 된다.
 *  - 군함(구축·호위·초계·순양·상륙·순찰·지원·미분류)·잠수함·위장 상선은
 *    실제로는 임의 각도로 회전하지 않는다. 옆모습(E/W) 실루엣 2장을 화면
 *    기준 침로(카메라 방위 대비 상대 침로)에 따라 골라 쓸 뿐이다 — 기존
 *    DOM 마커도 CSS transform 회전이 아니라 아이콘 자체를 바꿔치기했다.
 *  - 항모는 조감(top-down) 실루엣 하나뿐이고 일반 상선처럼 `icon-rotate`로
 *    돈다(useGlobeMapGlobeProps.htmlRotation에서 항모는 aspect-hull 취급을
 *    안 받는다 — 그대로 유지).
 *
 * 그래서 레이어를 두 개로 나눈다:
 *   1. `AIS_HEADING_SYMBOL_LAYER_ID` — 일반 상선 + 항모. `icon-rotation-alignment: map`,
 *      `icon-rotate: heading` (항공기와 동일 방식).
 *   2. `AIS_ASPECT_SYMBOL_LAYER_ID` — 군함·잠수함·위장 상선. `icon-rotation-alignment: viewport`,
 *      rotate 고정 0 — 방향은 아이콘 자체(E/W 둘 중 하나)가 담당한다.
 *
 * 두 레이어 모두 `properties.index`는 **같은 items 배열**을 가리킨다 —
 * 항공기(military+civil 결합) 패턴과 동일하게, 사본을 만들 이유가 없다.
 *
 * ── 옆모습 방향은 카메라 방위(mapBearingDeg)에 좌우된다 ────────────────
 * 항공기와 달리 이 아이콘들은 "진짜 회전"이 아니라 "카메라에서 봤을 때
 * 뱃머리가 왼쪽이냐 오른쪽이냐"만 표시한다. 그래서 지도를 돌리면 (드물게)
 * E/W가 바뀔 수 있다 — 기존 DOM 마커와 동일한 동작이다. 매 프레임 재계산을
 * 피하려고 방위를 5° 단위로 양자화한 뒤에만 다시 굽는다(aisSymbolBearingBucket).
 */

import type { AisVessel } from "@/data/geoTypes";
import { SUBMARINE_PROFILE_SIZE, type SubmarineIconSize } from "@/data/submarineSilhouette";
import {
  SURFACE_COMBATANT_PROFILE_SIZE,
  type SurfaceCombatantIconSize,
} from "@/data/surfaceCombatantSilhouette";
import { CARRIER_MARKER_ICON_SIZE, type CarrierDeckIconSize } from "@/data/usCarrierDeckSilhouette";
import {
  aisCommercialPointColor,
  AIS_SURFACE_COMBATANT_FILL,
  usesSurfaceCombatantDeckIcon,
} from "@/lib/aisVesselClass";
import { aisShipIconSvg, aisVesselHeadingDeg } from "@/lib/aisVesselMarkers";
import {
  SHADOW_FLEET_MARKER_SIZE,
  shadowFleetFacingFromRelativeHeading,
  shadowFleetIconSvg,
  shadowFleetRelativeHeading,
} from "@/lib/shadowFleetDeckIcon";
import {
  submarineFacingFromRelativeHeading,
  submarineProfileIconSvg,
} from "@/lib/submarineDeckIcon";
import {
  surfaceCombatantFacingFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  warshipProfileIconSvg,
} from "@/lib/surfaceCombatantDeckIcon";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

export const AIS_HEADING_SYMBOL_SOURCE_ID = "ais-heading-symbols-source";
export const AIS_HEADING_SYMBOL_LAYER_ID = "ais-heading-symbols";
export const AIS_ASPECT_SYMBOL_SOURCE_ID = "ais-aspect-symbols-source";
export const AIS_ASPECT_SYMBOL_LAYER_ID = "ais-aspect-symbols";

type Facing = "e" | "w";

/** 일반 상선 아이콘 색 버킷 — aisCommercialPointColor()의 유한 분기와 1:1 대응 */
type GenericBucket = "default" | "tanker" | "cargo" | "passenger" | "fishing" | "hsc" | "special";
const GENERIC_BUCKETS: GenericBucket[] = [
  "default",
  "tanker",
  "cargo",
  "passenger",
  "fishing",
  "hsc",
  "special",
];
/** 버킷당 대표 shipType — aisCommercialPointColor 분기(g값)만 맞으면 되므로 아무 값이나 대표값 사용 */
const GENERIC_BUCKET_SAMPLE_SHIP_TYPE: Record<GenericBucket, number> = {
  default: 0,
  tanker: 80,
  cargo: 70,
  passenger: 60,
  fishing: 20,
  hsc: 40,
  special: 30,
};

/** 군함(35/55)·other 분기는 실제로는 도달하지 않는다 — 군함은 전부 aspect-hull 경로로 빠진다. */
function genericBucket(shipType: number | null | undefined): GenericBucket {
  if (shipType == null || !Number.isFinite(shipType)) return "default";
  const g = Math.floor(shipType / 10);
  switch (g) {
    case 8:
      return "tanker";
    case 7:
      return "cargo";
    case 6:
      return "passenger";
    case 2:
      return "fishing";
    case 4:
      return "hsc";
    case 3:
      return "special";
    default:
      return "default";
  }
}

/** 기존 shipColor()의 알파 보정(0.98)까지 동일하게 재현 */
function genericBucketColor(bucket: GenericBucket): string {
  const raw = aisCommercialPointColor(GENERIC_BUCKET_SAMPLE_SHIP_TYPE[bucket]);
  return raw.replace(/[\d.]+\)$/, "0.98)") || raw;
}

const GENERIC_ICON_SIZE_PX = 22;
export const AIS_CARRIER_ICON_ID = "ais-carrier";

export function aisGenericIconId(bucket: GenericBucket): string {
  return `ais-generic-${bucket}`;
}
export function aisSurfaceCombatantIconId(facing: Facing): string {
  return `ais-surface-${facing}`;
}
export function aisSubmarineIconId(facing: Facing): string {
  return `ais-submarine-${facing}`;
}
export function aisShadowFleetIconId(facing: Facing): string {
  return `ais-shadow-${facing}`;
}

function loadSvgImage(svg: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(width, height);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load AIS vessel silhouette SVG"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

type MapLike = {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData,
    options?: { pixelRatio?: number },
  ) => void;
};

/**
 * 14종(일반 7 + 군함 2 + 잠수함 2 + 위장상선 2 + 항모 1) 아이콘을 스타일에 등록.
 * 이미 있으면 건너뛴다. 스타일 교체(베이스맵 전환) 시 다시 불러야 한다 — 항공기와 동일.
 */
export async function ensureAisSymbolImages(map: MapLike): Promise<void> {
  const jobs: Promise<void>[] = [];
  const add = (id: string, svg: string, width: number, height: number) => {
    if (map.hasImage(id)) return;
    jobs.push(
      loadSvgImage(svg, width * 2, height * 2).then((img) => {
        if (map.hasImage(id)) return;
        map.addImage(id, img, { pixelRatio: 2 });
      }),
    );
  };

  for (const bucket of GENERIC_BUCKETS) {
    add(
      aisGenericIconId(bucket),
      aisShipIconSvg(genericBucketColor(bucket), GENERIC_ICON_SIZE_PX * 2, false),
      GENERIC_ICON_SIZE_PX,
      GENERIC_ICON_SIZE_PX,
    );
  }

  const surfaceSize: SurfaceCombatantIconSize = SURFACE_COMBATANT_PROFILE_SIZE;
  const subSize: SubmarineIconSize = SUBMARINE_PROFILE_SIZE;
  const shadowSize = SHADOW_FLEET_MARKER_SIZE;
  for (const facing of ["e", "w"] as const) {
    add(
      aisSurfaceCombatantIconId(facing),
      warshipProfileIconSvg(AIS_SURFACE_COMBATANT_FILL, surfaceSize, facing),
      surfaceSize.width,
      surfaceSize.height,
    );
    add(
      aisSubmarineIconId(facing),
      submarineProfileIconSvg(AIS_SURFACE_COMBATANT_FILL, subSize, facing),
      subSize.width,
      subSize.height,
    );
    add(
      aisShadowFleetIconId(facing),
      shadowFleetIconSvg("#ef4444", shadowSize, facing),
      shadowSize.width,
      shadowSize.height,
    );
  }

  const carrierSize: CarrierDeckIconSize = CARRIER_MARKER_ICON_SIZE;
  add(
    AIS_CARRIER_ICON_ID,
    carrierDeckIconSvg(carrierSize, AIS_SURFACE_COMBATANT_FILL),
    carrierSize.width,
    carrierSize.height,
  );

  await Promise.all(jobs);
}

export type AisSymbolInput = AisVessel & { markerId?: string; displayKind?: string };

export type AisSymbolModel = {
  /** 일반 상선 + 항모 — icon-rotate(heading), rotation-alignment: map */
  headingGeojson: GeoJSON.FeatureCollection;
  /** 군함·잠수함·위장상선 — rotate 고정 0, rotation-alignment: viewport (E/W 아이콘 교체) */
  aspectGeojson: GeoJSON.FeatureCollection;
  /** properties.index → 원본 선박. 두 레이어가 같은 배열을 공유한다. */
  items: AisSymbolInput[];
};

const EMPTY_MODEL: AisSymbolModel = {
  headingGeojson: { type: "FeatureCollection", features: [] },
  aspectGeojson: { type: "FeatureCollection", features: [] },
  items: [],
};

/** 카메라 방위를 5° 단위로 양자화 — 옆모습 E/W 재계산 빈도를 억제 (기존 코드베이스 관례와 동일) */
export function aisSymbolBearingBucket(mapBearingDeg: number): number {
  const norm = ((mapBearingDeg % 360) + 360) % 360;
  return Math.round(norm / 5) * 5;
}

/**
 * `buildAircraftSymbolModel`과 동일한 역할. 두 레이어로 나눠 담는다.
 * `mapBearingDeg`는 호출 전에 {@link aisSymbolBearingBucket}로 양자화해서 넘기는 걸 권장 —
 * 그래야 memo deps가 회전 중에도 자주 안 바뀐다.
 */
export function buildAisSymbolModel(
  vessels: readonly AisSymbolInput[],
  mapBearingDeg: number,
): AisSymbolModel {
  if (vessels.length === 0) return EMPTY_MODEL;

  const headingFeatures: GeoJSON.Feature[] = [];
  const aspectFeatures: GeoJSON.Feature[] = [];
  const items: AisSymbolInput[] = [];

  for (const vessel of vessels) {
    const lat = Number(vessel.lat);
    const lng = Number(vessel.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const disguised = Boolean(vessel.disguised);
    const military = vessel.category === "military";
    const surface = !disguised && military && usesSurfaceCombatantDeckIcon(vessel.militaryKind);
    const submarine = !disguised && military && vessel.militaryKind === "submarine";
    const carrier = !disguised && military && vessel.militaryKind === "carrier";
    const aspectHull = disguised || surface || submarine;

    const index = items.length;
    items.push(vessel);

    if (aspectHull) {
      // 저속에서도 침로 유지(allowStationaryHeading) — 기존 badge 생성 규칙과 동일
      const heading = aisVesselHeadingDeg(vessel, { allowStationaryHeading: true });
      const relative = disguised
        ? shadowFleetRelativeHeading(heading ?? 0, mapBearingDeg)
        : surfaceCombatantRelativeHeading(heading ?? 0, mapBearingDeg);
      const facing: Facing = disguised
        ? shadowFleetFacingFromRelativeHeading(relative)
        : submarine
          ? submarineFacingFromRelativeHeading(relative)
          : surfaceCombatantFacingFromRelativeHeading(relative);
      const icon = disguised
        ? aisShadowFleetIconId(facing)
        : submarine
          ? aisSubmarineIconId(facing)
          : aisSurfaceCombatantIconId(facing);
      aspectFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          index,
          icon,
          rotate: 0,
          // 침로 미상 — 기존 DOM 배지의 opacity 규칙 그대로(위장 0.78 / 군함·잠수함 0.72)
          opacity: heading == null ? (disguised ? 0.78 : 0.72) : 1,
        },
      });
      continue;
    }

    // 일반 상선 + 항모 — useGlobeMapGlobeProps.htmlRotation과 동일하게
    // allowStationaryHeading 옵션 없이 계산한다 (항모도 기존 배선과 동일하게 취급).
    const heading = aisVesselHeadingDeg(vessel);
    const icon = carrier ? AIS_CARRIER_ICON_ID : aisGenericIconId(genericBucket(vessel.shipType));
    headingFeatures.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        index,
        icon,
        // 침로 없으면 -20° 기울여 "미상" 표시 (기존 DOM 아이콘 규칙 그대로)
        rotate: heading ?? -20,
        opacity: heading == null ? 0.72 : 1,
      },
    });
  }

  return {
    headingGeojson: { type: "FeatureCollection", features: headingFeatures },
    aspectGeojson: { type: "FeatureCollection", features: aspectFeatures },
    items,
  };
}
