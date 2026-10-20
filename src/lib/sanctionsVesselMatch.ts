import type { StaticPoint } from "@/data/geoTypes";
import { DISGUISED_VESSELS } from "@/data/disguisedVessels";

/**
 * 다크플리트/무기고 선박(AIS_Tracker 시드)을 실제 제재 리스트
 * (OFAC SDN · UN · EU · UK — sanctions-entities.json)와 이름 대조로 조인.
 *
 * disguisedVessels.ts의 classification: "sanctioned"는 intelNotes에
 * 사람이 손으로 적어둔 서술일 뿐 실제 제재 엔티티와 대조된 게 아니었다.
 * 이 모듈은 그 갭을 메운다 — 신규 데이터소스 없이 기존 두 레이어만 조인.
 */

export type SanctionsVesselMatch = {
  entityName: string;
  list: string;
  /** sanctions-entities.json 스냅샷 기준일 (자동 동기 없음 — 갱신 시 이 값도 같이 갱신) */
  asOf: string;
};

/**
 * sanctions-entities.json은 scripts/fetch-sigint-layers.js가 GitHub 미러(Skytuhua/SIGINT)를
 * 수동으로 한 번 받아온 스냅샷이다. 자동 동기 없음 — scripts/vendor/sigint-news-layers/ATTRIBUTION.md
 * 의 Fetched 타임스탬프가 실제 기준일. 재수집 시 이 값도 같이 갱신할 것.
 */
export const SANCTIONS_SNAPSHOT_AS_OF = "2026-07-08";

function normEntityName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function listLabelFromMeta(point: StaticPoint): string {
  const meta = point.meta ?? {};
  const candidate =
    (typeof meta.list === "string" && meta.list) ||
    (typeof meta.program === "string" && meta.program) ||
    (typeof meta.source === "string" && meta.source) ||
    (typeof meta.authority === "string" && meta.authority) ||
    null;
  return candidate ? String(candidate) : "OFAC/UN/EU/UK 제재 리스트";
}

/**
 * sanctions-entities.json StaticPoint[] → 정규화 이름 인덱스.
 * name 필드만 신뢰 가능 스키마이므로 이름 기반 매칭이 1차 키.
 */
function buildSanctionsNameIndex(
  sanctionsPoints: StaticPoint[],
): Map<string, { entityName: string; list: string }> {
  const index = new Map<string, { entityName: string; list: string }>();
  for (const point of sanctionsPoints) {
    if (!point.name) continue;
    index.set(normEntityName(point.name), {
      entityName: point.name,
      list: listLabelFromMeta(point),
    });
  }
  return index;
}

/**
 * DISGUISED_VESSELS(다크플리트 시드) 각각을 제재 리스트와 대조.
 * 선명·별칭 완전일치(정규화 후)만 인정 — 오탐 방지를 위해 부분일치는 쓰지 않는다.
 */
export function matchDisguisedVesselsAgainstSanctions(
  sanctionsPoints: StaticPoint[],
): Map<string, SanctionsVesselMatch> {
  const nameIndex = buildSanctionsNameIndex(sanctionsPoints);
  const matches = new Map<string, SanctionsVesselMatch>();

  for (const vessel of DISGUISED_VESSELS) {
    const candidates = [vessel.shipName, ...vessel.aliases];
    for (const candidate of candidates) {
      const hit = nameIndex.get(normEntityName(candidate));
      if (hit) {
        matches.set(vessel.id, { ...hit, asOf: SANCTIONS_SNAPSHOT_AS_OF });
        break;
      }
    }
  }
  return matches;
}
