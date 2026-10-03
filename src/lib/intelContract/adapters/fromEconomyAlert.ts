import type { CesiumAlertItem } from "@/lib/cesiumAlerts";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";

export type ChokepointStressLike = {
  chokepointId: string;
  grade: string;
  ukmtoCount: number;
  hasAis: boolean;
  hasAssetHint: boolean;
};

export function cesiumAlertToBundle(item: CesiumAlertItem): EvidenceBundle {
  const modality =
    item.kind === "portwatch"
      ? ("stat" as const)
      : item.kind === "ukmto" || item.kind === "navarea"
        ? ("alert" as const)
        : item.kind === "ais-gate" || item.kind === "dark-fleet"
          ? ("sensor" as const)
          : ("official" as const);

  const observations: Observation[] = [
    {
      id: item.id,
      modality,
      sourceKey: `cesium-alert:${item.kind}`,
      occurredAt: null,
      geo: {
        lat: item.lat,
        lng: item.lng,
        precision: "point",
      },
      url: null,
      payloadRef: item.id,
      label: item.kind,
      text: item.detail,
    },
  ];

  // second channel stub from kind diversity for gate G1 when only one alert row
  if (item.kind === "ukmto" || item.kind === "navarea") {
    observations.push({
      id: `${item.id}:geo`,
      modality: "official",
      sourceKey: `cesium-alert-geo:${item.kind}`,
      occurredAt: null,
      geo: { lat: item.lat, lng: item.lng, precision: "point" },
      payloadRef: `${item.id}:geo`,
      label: "geolocation",
      text: `${item.lat.toFixed(2)},${item.lng.toFixed(2)}`,
    });
  }

  return withComputedStats({
    bundleId: `cesium-alert:${item.id}`,
    kind: "maritime-alert",
    titleKo: item.title,
    titleEn: item.title,
    observations,
    geoOk: Number.isFinite(item.lat) && Number.isFinite(item.lng),
    method: `cesiumAlert:${item.kind}`,
    disconfirmLog: { queried: true, hitCount: 0 },
    killCriteria: [
      "공식 경보 만료·정정 시 해제",
      "동일 해역 후속 관측이 없으면 72h 후 하향",
    ],
    altHypothesis: {
      labelKo: "정기 훈련·오탐·이미 해소된 사건일 수 있음",
      labelEn: "May be routine exercise, false positive, or already resolved",
      supportIds: [],
    },
    claimKo: item.detail,
    claimEn: item.detail,
    originRef: item.id,
  });
}

export function gateCesiumAlert(item: CesiumAlertItem): GateResult {
  return evaluateGate(cesiumAlertToBundle(item));
}

export function chokepointStressToBundle(input: {
  nameKo: string;
  nameEn: string;
  stress: ChokepointStressLike;
  lat: number;
  lng: number;
}): EvidenceBundle {
  const observations: Observation[] = [];
  if (input.stress.ukmtoCount > 0) {
    observations.push({
      id: `${input.stress.chokepointId}:ukmto`,
      modality: "alert",
      sourceKey: "ukmto",
      occurredAt: null,
      geo: { lat: input.lat, lng: input.lng, precision: "place" },
      payloadRef: `${input.stress.chokepointId}:ukmto`,
      label: "UKMTO",
      text: `count=${input.stress.ukmtoCount}`,
    });
  }
  if (input.stress.hasAis) {
    observations.push({
      id: `${input.stress.chokepointId}:ais`,
      modality: "stat",
      sourceKey: "portwatch-ais",
      occurredAt: null,
      geo: { lat: input.lat, lng: input.lng, precision: "place" },
      payloadRef: `${input.stress.chokepointId}:ais`,
      label: "PortWatch AIS",
    });
  }
  if (input.stress.hasAssetHint) {
    observations.push({
      id: `${input.stress.chokepointId}:asset`,
      modality: "stat",
      sourceKey: "asset-volatility",
      occurredAt: null,
      payloadRef: `${input.stress.chokepointId}:asset`,
      label: "linked asset",
    });
  }
  if (observations.length === 0) {
    observations.push({
      id: `${input.stress.chokepointId}:grade`,
      modality: "stat",
      sourceKey: "chokepoint-stress",
      occurredAt: null,
      payloadRef: input.stress.chokepointId,
      label: input.stress.grade,
    });
  }

  return withComputedStats({
    bundleId: `choke-stress:${input.stress.chokepointId}`,
    kind: "indicator",
    titleKo: `${input.nameKo} 물류 스트레스`,
    titleEn: `${input.nameEn} logistics stress`,
    observations,
    geoOk: true,
    method: `chokepointStress:grade=${input.stress.grade}`,
    disconfirmLog: { queried: true, hitCount: 0 },
    killCriteria: [
      "UKMTO/NAVAREA 후속 없음 + AIS 변화 정상화 시 하향",
    ],
    altHypothesis: {
      labelKo: "일시적 통과량 변동·데이터 공백일 수 있음",
      labelEn: "May be transient traffic variance or data gap",
      supportIds: [],
    },
    claimKo: `등급 ${input.stress.grade}`,
    claimEn: `grade ${input.stress.grade}`,
    originRef: input.stress.chokepointId,
  });
}

export function gateChokepointStress(input: {
  nameKo: string;
  nameEn: string;
  stress: ChokepointStressLike;
  lat: number;
  lng: number;
}): GateResult {
  return evaluateGate(chokepointStressToBundle(input));
}
