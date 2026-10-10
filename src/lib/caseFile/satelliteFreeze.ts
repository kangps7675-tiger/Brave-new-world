/**
 * 위성 전후 장면 → R2 저장 + 서버 봉인 근거.
 * 결과 판단: 광학 전후 쌍(구름 통과) > 레이더 전후 쌍 > 확인 불가.
 */

import { uploadCaseEvidenceBytes } from "@/lib/caseFile/r2Upload";
import {
  CHIP_RADIUS_KM,
  CLOUD_BLOCKED_MIN,
  fetchSatellitePair,
  opticalCloudBlocked,
  type SatelliteChip,
} from "@/lib/caseFile/satelliteImagery";
import { sealServerFrozenPayload, type ServerFrozenPayload } from "@/lib/caseFile/serverFreeze";
import type { CaseIncident } from "@/lib/caseFile/types";

export type SatelliteFrameMeta = {
  collection: string;
  sceneId: string;
  datetime: string;
  cloudTile: number | null;
  cloudLocal: number | null;
  imageKey: string | null;
};

export type SatelliteResults = {
  /** 판정에 쓸 쌍 — optical | sar | none */
  mode: "optical" | "sar" | "none";
  before: SatelliteFrameMeta | null;
  after: SatelliteFrameMeta | null;
  opticalBefore: SatelliteFrameMeta | null;
  opticalAfter: SatelliteFrameMeta | null;
  cloudBlocked: boolean;
  chipRadiusKm: number;
  bbox: [number, number, number, number];
  attribution: string;
  notes: string[];
};

export type SatelliteFreezeResult = {
  payload: ServerFrozenPayload;
  results: SatelliteResults;
  /** 근거 대표 이미지 (사건 후) */
  imageKey: string | null;
  shows: string;
  limits: string;
};

function pct(v: number | null): string {
  return v == null ? "?" : `${Math.round(v * 100)}%`;
}

async function storeFrame(
  caseId: string,
  evidenceId: string,
  label: string,
  chip: SatelliteChip | null,
): Promise<SatelliteFrameMeta | null> {
  if (!chip) return null;
  const up = await uploadCaseEvidenceBytes({
    caseId,
    name: `${evidenceId}-${label}`,
    bytes: chip.png,
    contentType: "image/png",
  });
  return {
    collection: chip.collection,
    sceneId: chip.sceneId,
    datetime: chip.datetime,
    cloudTile: chip.cloudTile,
    cloudLocal: chip.cloudLocal,
    imageKey: "error" in up ? null : up.imageKey,
  };
}

export async function freezeSatelliteEvidence(args: {
  caseId: string;
  evidenceId: string;
  incident: CaseIncident;
}): Promise<SatelliteFreezeResult | { error: string }> {
  const { place, occurredAt } = args.incident;
  if (!place || !occurredAt) return { error: "사건 위치·시각을 먼저 설정하세요." };
  const incidentMs = Date.parse(occurredAt);
  if (!Number.isFinite(incidentMs)) return { error: "사건 시각 형식이 올바르지 않습니다" };

  const pair = await fetchSatellitePair({
    lat: place.lat,
    lng: place.lng,
    incidentIso: new Date(incidentMs).toISOString(),
  });

  const opticalBefore = await storeFrame(args.caseId, args.evidenceId, "s2-before", pair.optical.before);
  const opticalAfter = await storeFrame(args.caseId, args.evidenceId, "s2-after", pair.optical.after);
  const sarBefore = await storeFrame(args.caseId, args.evidenceId, "s1-before", pair.sar?.before ?? null);
  const sarAfter = await storeFrame(args.caseId, args.evidenceId, "s1-after", pair.sar?.after ?? null);

  const cloudBlocked =
    opticalCloudBlocked(pair.optical.before) || opticalCloudBlocked(pair.optical.after);
  const opticalUsable = Boolean(opticalBefore?.imageKey && opticalAfter?.imageKey && !cloudBlocked);
  const sarUsable = Boolean(sarBefore?.imageKey && sarAfter?.imageKey);
  const mode: SatelliteResults["mode"] = opticalUsable ? "optical" : sarUsable ? "sar" : "none";
  const before = mode === "optical" ? opticalBefore : mode === "sar" ? sarBefore : null;
  const after = mode === "optical" ? opticalAfter : mode === "sar" ? sarAfter : null;

  const notes = [...pair.notes];
  if (cloudBlocked) {
    notes.push(
      `광학 영상 구름 — 전 ${pct(pair.optical.before?.cloudLocal ?? pair.optical.before?.cloudTile ?? null)}, 후 ${pct(pair.optical.after?.cloudLocal ?? pair.optical.after?.cloudTile ?? null)} (${Math.round(CLOUD_BLOCKED_MIN * 100)}% 이상이면 확인 불가)`,
    );
  }
  const year = new Date(incidentMs).getUTCFullYear();
  const results: SatelliteResults = {
    mode,
    before,
    after,
    opticalBefore,
    opticalAfter,
    cloudBlocked,
    chipRadiusKm: CHIP_RADIUS_KM,
    bbox: pair.bbox,
    attribution: `Contains modified Copernicus Sentinel data ${year}`,
    notes,
  };

  const usableCount = (before?.imageKey ? 1 : 0) + (after?.imageKey ? 1 : 0);
  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "satellite",
    queriedAt: new Date().toISOString(),
    query: {
      lat: place.lat,
      lng: place.lng,
      radiusKm: CHIP_RADIUS_KM,
      incidentIso: new Date(incidentMs).toISOString(),
      provider: "copernicus-dataspace",
      candidates: pair.candidates,
    },
    resultHash: "",
    // 전후 쌍이 다 있어야 비교 근거 — 하나뿐이면 0으로 봐서 맥락 처리
    resultCount: usableCount === 2 ? 2 : 0,
    results,
    pickId: after?.sceneId,
  });

  const label = mode === "sar" ? "Sentinel-1 레이더" : "Sentinel-2";
  const shows =
    mode === "none"
      ? cloudBlocked
        ? "사건 전후 광학 영상이 구름에 가려 확인 불가"
        : "사건 전후 비교 가능한 위성 장면 없음"
      : `${label} 전 ${before!.datetime.slice(0, 10)} · 후 ${after!.datetime.slice(0, 10)} 비교 영상 (지점 반경 ${CHIP_RADIUS_KM}km)`;
  const limits = [
    "해상도 약 10m — 큰 화재·탄 자국·대형 구조물 변화만 보이며 건물 한 채 피해는 판단 어려움",
    mode === "sar" ? "레이더 영상은 구름을 통과하지만 색이 없고 해석에 숙련이 필요" : null,
    mode === "optical"
      ? `사건 지점 구름 전 ${pct(before!.cloudLocal ?? before!.cloudTile)}, 후 ${pct(after!.cloudLocal ?? after!.cloudTile)}`
      : null,
    ...notes,
    results.attribution,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    payload,
    results,
    imageKey: after?.imageKey ?? opticalAfter?.imageKey ?? null,
    shows,
    limits,
  };
}
