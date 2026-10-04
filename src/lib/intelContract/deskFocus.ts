/**
 * 워치보드 안건 1개 → 세슘 포커스 1세트.
 * 카메라 엔진은 GlobeDashboard의 switchToObserveAndFly를 재사용한다.
 */

import type { WatchboardItem } from "@/lib/intelContract/buildObserveWatchboard";
import type {
  DisplayGrade,
  ObservationModality,
} from "@/lib/intelContract/types";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";

export type DeskFocusKind =
  | "theater-sitrep"
  | "maritime-alert"
  | "conflict-cluster";

export type DeskFocus = {
  itemId: string;
  kind: DeskFocusKind;
  grade: DisplayGrade;
  lat: number;
  lng: number;
  altitude: number;
  windowHours: 72;
  clusterId?: string;
  sitrepRegion?: TheaterSitrepRegionId;
  cesiumAlertId?: string;
  /** PIR 빈칸 — 해당 modality 레이어 슬롯 희미 */
  pirMissing: ObservationModality[];
  /** PIR 필요 채널 (HUD 슬롯) */
  pirRequired: ObservationModality[];
  /** 번들에 실제로 있는 modality */
  modalitiesPresent: ObservationModality[];
  /** Gate independenceCount — 교차 링 겹수 */
  independenceCount: number;
  /** 반증 히트 — >0이면 식힘·링 접힘 */
  disconfirmHitCount: number;
  /** 안건 시각 — 72h 페이드 */
  occurredAt: string | null;
  title: string;
  /** hold면 히어로 핀 없이 카메라만 */
  showHeroPin: boolean;
  /** hold→active 승격 모션 */
  promoteFromHold: boolean;
  /** 검증 시퀀스 시작 시각 (ms epoch) */
  sequenceStartedAt: number;
};

/** sitrep 지역 → 카메라 앵커 (기존 THEATER_FLY_TO 재사용·국소 보정) */
export const SITREP_FLY_ANCHOR: Record<
  TheaterSitrepRegionId,
  { lat: number; lng: number; altitude: number }
> = {
  ukraine: THEATER_FLY_TO["russia-ukraine"],
  iran: { lat: 28.5, lng: 52.0, altitude: 1.35 },
  yemen: { lat: 15.0, lng: 43.2, altitude: 1.25 },
};

export type DeskGradeVisual = {
  pixelSize: number;
  outlineWidth: number;
  alpha: number;
  pulse: boolean;
  colorCss: string;
};

/** 등급 → 포커스 핀 시각 */
export function deskGradeVisual(grade: DisplayGrade): DeskGradeVisual {
  if (grade === "high") {
    return {
      pixelSize: 22,
      outlineWidth: 4,
      alpha: 1,
      pulse: true,
      colorCss: "#5eead4",
    };
  }
  if (grade === "std") {
    return {
      pixelSize: 16,
      outlineWidth: 3,
      alpha: 0.95,
      pulse: true,
      colorCss: "#2dd4bf",
    };
  }
  if (grade === "low") {
    return {
      pixelSize: 11,
      outlineWidth: 2,
      alpha: 0.55,
      pulse: false,
      colorCss: "#94a3b8",
    };
  }
  // hold / drop — 점선 느낌의 희미한 점
  return {
    pixelSize: 8,
    outlineWidth: 1,
    alpha: 0.35,
    pulse: false,
    colorCss: "#64748b",
  };
}

/**
 * PIR 빈칸 → 세슘 슬롯 불투명도 배수.
 * 1 = 정상, 낮을수록 해당 채널이 “비어 있음”으로 보임.
 */
export type DeskSlotOpacity = {
  sensor: number;
  alert: number;
  media: number;
  stat: number;
};

export function deskSlotOpacity(
  pirMissing: ObservationModality[],
): DeskSlotOpacity {
  const miss = new Set(pirMissing);
  return {
    sensor: miss.has("sensor") ? 0.28 : 1,
    alert: miss.has("alert") ? 0.28 : 1,
    media: miss.has("media") ? 0.4 : 1,
    stat: miss.has("stat") || miss.has("official") ? 0.4 : 1,
  };
}

/** 비포커스 핀 기본 디밍 (스포트라이트) */
export const DESK_NON_FOCUS_ALPHA = 0.28;

export function watchboardItemToDeskFocus(
  item: WatchboardItem,
  lang: "ko" | "en" = "ko",
  opts?: { promoteFromHold?: boolean },
): DeskFocus | null {
  const kind: DeskFocusKind | null =
    item.kind === "hold"
      ? item.sitrepRegion
        ? "theater-sitrep"
        : item.cesiumAlertId
          ? "maritime-alert"
          : item.clusterId
            ? "conflict-cluster"
            : null
      : item.kind === "theater-sitrep" ||
          item.kind === "maritime-alert" ||
          item.kind === "conflict-cluster"
        ? item.kind
        : null;
  if (!kind) return null;

  let lat = item.lat;
  let lng = item.lng;
  let altitude = item.altitude ?? 0.85;

  if (
    (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) &&
    item.sitrepRegion
  ) {
    const a = SITREP_FLY_ANCHOR[item.sitrepRegion];
    lat = a.lat;
    lng = a.lng;
    altitude = a.altitude;
  }

  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  const topPir = item.pirStatuses[0];
  const pirMissing = topPir?.missing ?? [];
  const pirRequired = topPir?.required?.length
    ? [...topPir.required]
    : (["media", "sensor"] as ObservationModality[]);
  const modSet = new Set(
    item.gate.bundle.observations.map((o) => o.modality),
  );
  const modalitiesPresent = (
    ["sensor", "alert", "media", "official", "stat", "tip"] as ObservationModality[]
  ).filter((m) => modSet.has(m));
  const independenceCount = Math.max(
    1,
    item.gate.bundle.independenceCount || modalitiesPresent.length || 1,
  );

  const disc = item.gate.bundle.disconfirmLog;

  return {
    itemId: item.id,
    kind,
    grade: item.grade,
    lat,
    lng,
    altitude,
    windowHours: 72,
    clusterId: item.clusterId,
    sitrepRegion: item.sitrepRegion,
    cesiumAlertId: item.cesiumAlertId,
    pirMissing: [...pirMissing],
    pirRequired,
    modalitiesPresent,
    independenceCount,
    disconfirmHitCount: disc.queried ? disc.hitCount : 0,
    occurredAt: item.occurredAt,
    title: lang === "en" ? item.titleEn : item.titleKo,
    showHeroPin: item.grade !== "hold" && item.grade !== "drop",
    promoteFromHold: Boolean(opts?.promoteFromHold),
    sequenceStartedAt: Date.now(),
  };
}

/** 포커스 점에서 대략적 거리(km) — 스포트라이트 반경 판정용 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 스포트라이트 반경(km) — 전장 sitrep은 넓게, 클러스터/경보는 좁게 */
export function deskSpotlightRadiusKm(kind: DeskFocusKind): number {
  if (kind === "theater-sitrep") return 650;
  if (kind === "maritime-alert") return 420;
  return 220;
}
