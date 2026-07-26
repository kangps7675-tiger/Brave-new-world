/**
 * 전략 미사일 레퍼런스 데이터 타입 · 출처.
 *
 * 산지: scripts/vendor/strategic-missile (원본 KMZ·shapefile·twbx·PDF 그대로 보존)
 * 빌드: scripts/extract-strategic-missile-sources.py → scripts/build-strategic-missile-data.js
 * 서빙: /api/layers/strategic-missile
 */

import type { StaticPoint } from "@/data/geoTypes";

export type StrategicMissileDataset =
  | "silos"
  | "bases"
  | "test-sites"
  | "fields"
  | "launches";

/** 사일로군 요약 — 사일로 중심점과 개수 */
export type MissileSiloComplex = {
  id: string;
  name: string;
  silos: number;
  lat: number;
  lng: number;
};

/**
 * 연구가 훑은 후보 격자 셀.
 *
 * 확인된 사일로가 아니다. 서부 중국 전역(위도 36.7~42.2, 경도 77~107)에 걸쳐
 * "새 후보지가 있는지 들여다본 범위"이고, 위먼·하미·항긴기 3개 사일로군과는
 * 완전히 떨어져 있다(가장 가까운 셀도 120km 이상). 소속 사일로군 정보는 원본에
 * 없고 좌표로도 유도할 수 없어 격자 ID만 그대로 들고 온다.
 */
export type MissileSiloField = {
  id: string;
  /** 원본 GRID_ID (예: SG-146) */
  gridId: string;
  /** [lng, lat] */
  centroid: [number, number];
  /** 닫힌 링, [lng, lat] */
  ring: [number, number][];
};

/** 사일로군 내부 연결 도로 (건설 진척 판독의 핵심 단서) */
export type MissileSiloRoad = {
  id: string;
  complex: string;
  complexId: string;
  coords: [number, number][];
};

export type MissileSiloSurveyBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type MissileSiloFieldsFile = {
  generatedAt: string;
  attribution: string;
  fieldsNote?: string;
  /** 후보 격자가 덮은 조사 범위 — "확인된 사일로 영역"이 아니다 */
  surveyBbox?: MissileSiloSurveyBbox | null;
  complexes: MissileSiloComplex[];
  fields: MissileSiloField[];
  roads: MissileSiloRoad[];
};

/** NTI/CNS 인도·파키스탄 미사일 발사 시험 1건 */
export type MissileLaunchTest = {
  id: string;
  date: string | null;
  country: string;
  missile: string;
  family: string;
  agency: string;
  facility: string;
  lat: number | null;
  lng: number | null;
  /** Success | Failure | Unknown */
  outcome: string;
  apogeeKm: number | null;
  /** 소스가 "1000-1500" 처럼 구간으로 주는 경우가 있어 문자열 */
  rangeKm: string;
  /** ICBM·IRBM·MRBM·SLBM — 핵 투발 가능 계열 여부 */
  nuclearFamily: boolean;
  note: string;
};

export type MissileLaunchTestsFile = {
  generatedAt: string;
  attribution: string;
  launches: MissileLaunchTest[];
};

export type StrategicMissilePayload = {
  dataset: StrategicMissileDataset | "all";
  silos: StaticPoint[];
  bases: StaticPoint[];
  testSites: StaticPoint[];
  complexes: MissileSiloComplex[];
  fields: MissileSiloField[];
  fieldsNote: string | null;
  surveyBbox: MissileSiloSurveyBbox | null;
  roads: MissileSiloRoad[];
  launches: MissileLaunchTest[];
  counts: {
    silos: number;
    bases: number;
    testSites: number;
    fields: number;
    launches: number;
  };
  attribution?: string;
  error?: string;
  fetchedAt: string;
};

export const STRATEGIC_MISSILE_ATTRIBUTION =
  "PLARF Silo Study · NTI/CNS India-Pakistan Missile Launch Tracker · RVSN open-source order of battle";

/** 발사 결과 → 배지 톤 */
export function launchOutcomeTone(outcome: string): "ok" | "fail" | "unknown" {
  const normalized = outcome.toLowerCase();
  if (normalized.startsWith("success")) return "ok";
  if (normalized.startsWith("fail")) return "fail";
  return "unknown";
}

/** 연도별 발사 건수 — 타임라인·랭킹 카드용 집계 */
export function launchesByYear(
  launches: MissileLaunchTest[],
): { year: number; total: number; byCountry: Record<string, number> }[] {
  const years = new Map<number, { total: number; byCountry: Record<string, number> }>();
  for (const launch of launches) {
    if (!launch.date) continue;
    const year = Number(launch.date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const entry = years.get(year) ?? { total: 0, byCountry: {} };
    entry.total += 1;
    entry.byCountry[launch.country] = (entry.byCountry[launch.country] ?? 0) + 1;
    years.set(year, entry);
  }
  return [...years.entries()]
    .map(([year, value]) => ({ year, ...value }))
    .sort((a, b) => a.year - b.year);
}
