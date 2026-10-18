/**
 * API 스텁 모드 전용 예시 데이터 — 화면 확인용. 실제 사건·선박이 아니다(이름에 "예시" 표기).
 * 실제 점수 로직을 그대로 돌려서 만든다 → 로직이 바뀌면 스텁 화면도 같이 바뀐다.
 */

import { scoreCandidates, summarizeMatch, type TrackPoint, type VesselTrack } from "@/lib/strikeMatch/scoreCandidates";
import type { StrikeCase, StrikeMatchResult } from "@/lib/strikeMatch/server";
import type { WarRiskRegionId } from "@/lib/warRisk/extractPremium";

const T0 = Date.parse("2026-10-15T09:20:00Z");
const iso = (m: number) => new Date(T0 + m * 60_000).toISOString();

/** base 분(사건 시각 기준) 에 lat0 에 있도록, base+from ~ base+to 구간을 북쪽으로 항해 */
function line(lat0: number, lng: number, sog: number, from: number, to: number, base = 0): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (let m = from; m <= to; m += 30) {
    pts.push({ lat: lat0 + (m / 60) * (sog / 60), lng, sog, cog: 340, sampledAt: iso(base + m) });
  }
  return pts;
}

function build(
  c: StrikeCase,
  tracks: VesselTrack[],
  limits: string[],
): StrikeMatchResult & { warRiskRegion: WarRiskRegionId } {
  const candidates = scoreCandidates(
    { lat: c.lat, lng: c.lng, atIso: c.occurredAt, vesselType: c.reportedVesselType, vesselName: c.reportedVesselName },
    tracks,
  );
  const s = summarizeMatch(candidates);
  return {
    incident: c,
    status: s.status,
    top: s.top,
    candidates,
    nearbyCount: s.nearbyCount,
    limits,
    trackSource: "ais_position_history",
    warRiskRegion: "red-sea",
  };
}

const CASE_A: StrikeCase = {
  id: "stub-a",
  source: "ukmto",
  typeName: "Attack",
  occurredAt: iso(0),
  lat: 14.6,
  lng: 42.1,
  place: "(예시) 호데이다 서쪽 40해리",
  region: "Red Sea",
  reportedVesselName: null,
  reportedVesselType: "Bulk Carrier",
  detail: "(예시) 상선 선장이 우현 근처 미상 발사체 폭발을 보고. 선원 무사, 선박은 다음 기항지로 향함.",
};

const CASE_B: StrikeCase = {
  ...CASE_A,
  id: "stub-b",
  occurredAt: iso(-60 * 26),
  lat: 13.1,
  lng: 43.2,
  place: "(예시) 모카 남서쪽 25해리",
  reportedVesselName: "MV EXAMPLE STAR",
  reportedVesselType: "Tanker",
  detail: "(예시) MV EXAMPLE STAR 피격 보고, 화재 발생.",
};

export const STRIKES_STUB = [
  build(
    CASE_A,
    [
      {
        mmsi: "000000001",
        name: "예시 벌커",
        imo: "0000001",
        shipType: 70,
        category: "commercial",
        points: [
          ...line(14.45, 42.12, 11, -180, 0),
          { lat: 14.62, lng: 42.12, sog: 1.2, cog: 120, sampledAt: iso(30) },
          { lat: 14.62, lng: 42.13, sog: 0.8, cog: 130, sampledAt: iso(60) },
        ],
      },
      { mmsi: "000000002", name: "예시 컨테이너", imo: null, shipType: 71, category: "commercial", points: line(14.4, 42.3, 14, -180, 180) },
      { mmsi: "000000003", name: "예시 호위함", imo: null, shipType: 35, category: "military", points: line(14.5, 42.0, 16, -180, 180) },
    ],
    ["(예시 데이터 — API 스텁 모드)", "경보에 선명이 없어 '확인'은 불가 — 항적 정황으로만 판단"],
  ),
  build(
    { ...CASE_B },
    [
      {
        mmsi: "000000004",
        name: "EXAMPLE STAR",
        imo: "0000004",
        shipType: 80,
        category: "commercial",
        points: [
          ...line(13.08, 43.25, 12, -180, 0, -60 * 26),
          { lat: 13.09, lng: 43.25, sog: 0.5, cog: 0, sampledAt: iso(-60 * 26 + 30) },
        ],
      },
    ],
    ["(예시 데이터 — API 스텁 모드)"],
  ),
];
