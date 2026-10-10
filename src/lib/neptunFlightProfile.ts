/**
 * NEPTUN 공중 위협 고도·궤적 프로파일.
 * - UAV(Shahed/Geran): 수천 m 순항 → 목표 접근 시 가미카제 돌진
 * - KAB: 수천 m에서 완만 활공 하강
 * - ballistic: 이스칸데르식 준탄도
 *   발사 → 정점 → 급강하 → 수평비행 → 목표 상공 수직 낙하
 */

import type { NeptunLiveThreat } from "@/lib/neptun";

/** 순항/표시 고도 (지형 상대 m) — 드론·활공폭탄은 수천 m대 */
export const NEPTUN_CRUISE_HEIGHT_M: Record<string, number> = {
  uav: 3_500,
  recon: 4_200,
  kab: 4_800,
  missile: 6_500,
  ballistic: 16_000, // 기본값=수평비행 구간 (실제는 프로파일로 덮음)
  mig31k: 11_000,
  unknown: 3_800,
};

/** 이스칸데르식 정점·수평 고도 (정점 80km, 이후 저고도 수평) */
export const ISKANDER_APOGEE_M = 80_000;
export const ISKANDER_LEVEL_M = 16_000;

/** Shahed/Geran — 순항 끝에서 돌진 시작 (정규화 진행도) */
export const SHAHED_DIVE_START = 0.84;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(u: number): number {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

/**
 * 이스칸데르식 고도 프로파일 — 정규화 진행도 t∈[0,1]
 * (대략 500km 사거리 다이어그램 비율)
 *  0.00–0.36  급상승 → 정점
 *  0.36–0.58  급강하 → 수평고도
 *  0.58–0.88  수평비행 (요격 회피 구간)
 *  0.88–1.00  목표 상공 수직 낙하
 */
export function iskanderHeightM(t01: number): number {
  const t = clamp01(t01);
  if (t <= 0.36) {
    const u = t / 0.36;
    // 가속 상승 후 정점 안착
    return ISKANDER_APOGEE_M * Math.sin(u * (Math.PI / 2));
  }
  if (t <= 0.58) {
    const u = (t - 0.36) / (0.58 - 0.36);
    return ISKANDER_APOGEE_M + (ISKANDER_LEVEL_M - ISKANDER_APOGEE_M) * smoothstep(u);
  }
  if (t <= 0.88) {
    const u = (t - 0.58) / (0.88 - 0.58);
    // 수평비행 — 약간의 고도 요동
    return ISKANDER_LEVEL_M * (0.94 + 0.06 * Math.sin(u * Math.PI * 2));
  }
  const u = (t - 0.88) / (1 - 0.88);
  // 수직 낙하 — 후반 가속
  return ISKANDER_LEVEL_M * (1 - u * u * u);
}

/**
 * Shahed/Geran 고도 — 정규화 진행도 t∈[0,1]
 *  0.00–0.84  수천 m 순항 (소폭 요동)
 *  0.84–1.00  가미카제 돌진 (급강하 → 지면)
 */
export function shahedHeightM(cruiseM: number, t01: number): number {
  const t = clamp01(t01);
  if (t <= SHAHED_DIVE_START) {
    const u = t / SHAHED_DIVE_START;
    // 순항: 고도 유지 + 약한 파형
    return cruiseM * (0.94 + 0.06 * Math.sin(u * Math.PI * 3));
  }
  const u = (t - SHAHED_DIVE_START) / (1 - SHAHED_DIVE_START);
  // 돌진: 초반 완만 → 후반 가속 낙하
  const dive = u * u;
  return Math.max(80, cruiseM * (1 - dive));
}

/** 드론·활공폭탄 등 수천 m 순항 궤적 (완만) */
export function cruiseTrailHeightM(cruiseM: number, t01: number, mode: "uav" | "kab" | "missile"): number {
  const t = clamp01(t01);
  if (mode === "kab") {
    // 활공: 수천 m에서 천천히 하강
    return cruiseM * (1.08 - 0.28 * t);
  }
  if (mode === "missile") {
    return cruiseM * (0.7 + 0.3 * t);
  }
  // UAV / Geran: 순항 → 단말 돌진
  return shahedHeightM(cruiseM, t);
}

/**
 * 탄도 위협의 현재 비행 단계 추정 (0=발사 … 1=명중).
 * 트레일 시각·길이가 없으면 수평비행 중반(이스칸데르 특징 구간)으로 둔다.
 */
export function estimateBallisticProgress(threat: NeptunLiveThreat): number {
  const trail = threat.trail ?? [];
  if (trail.length < 2) return 0.72;

  const first = trail[0];
  const last = trail[trail.length - 1];
  const t0 = Date.parse(first.t);
  const t1 = Date.parse(last.t);
  const ageSec =
    Number.isFinite(t0) && Number.isFinite(t1)
      ? Math.max(0, (Date.now() - t0) / 1000)
      : trail.length * 12;
  // ~7분 사거리 비행을 0→1로
  const byAge = clamp01(ageSec / 420);
  const byCount = clamp01(trail.length / 18);
  // 관측 중인 탄도는 대개 중후반 — 너무 초기로 떨어지지 않게
  return Math.max(0.2, clamp01(0.5 * byAge + 0.5 * byCount));
}

/**
 * Shahed/Geran 비행 단계 (0=이륙 직후 … 1=돌진 명중).
 * 트레일 없으면 순항 중반 — 대부분은 공중에 떠 있고, 긴 궤적일수록 돌진에 가깝다.
 */
export function estimateShahedProgress(threat: NeptunLiveThreat): number {
  const trail = threat.trail ?? [];
  if (trail.length < 2) return 0.55;

  const first = trail[0];
  const last = trail[trail.length - 1];
  const t0 = Date.parse(first.t);
  const t1 = Date.parse(last.t);
  const ageSec =
    Number.isFinite(t0) && Number.isFinite(t1)
      ? Math.max(0, (Date.now() - t0) / 1000)
      : trail.length * 40;
  // 장거리 순항(~2h)을 0→1로 — 실제 돌진은 매우 짧아 궤적 후반에 몰림
  const byAge = clamp01(ageSec / 7_200);
  const byCount = clamp01(trail.length / 28);
  return Math.max(0.15, clamp01(0.45 * byAge + 0.55 * byCount));
}

function isShahedType(type: string): boolean {
  return type === "uav" || type === "recon";
}

export function neptunDisplayHeightM(threat: NeptunLiveThreat): number {
  if (threat.type === "ballistic") {
    const progress = Math.max(0.2, estimateBallisticProgress(threat));
    return Math.max(400, iskanderHeightM(progress));
  }
  const cruise = NEPTUN_CRUISE_HEIGHT_M[threat.type] ?? NEPTUN_CRUISE_HEIGHT_M.unknown;
  if (isShahedType(threat.type)) {
    return Math.max(80, shahedHeightM(cruise, estimateShahedProgress(threat)));
  }
  return cruise;
}

/**
 * 트레일 점 i의 고도.
 * ballistic: 현재 진행도를 끝점으로, 과거 구간을 이스칸데르 프로파일로 샘플.
 * uav/recon: 순항→돌진 창을 궤적에 펼침.
 */
export function neptunTrailPointHeightM(
  threat: NeptunLiveThreat,
  pointIndex: number,
  pointCount: number,
): number {
  if (threat.type === "ballistic") {
    const current = Math.max(0.2, estimateBallisticProgress(threat));
    const window = 0.42;
    const u = pointCount <= 1 ? 1 : pointIndex / (pointCount - 1);
    const t = current - (1 - u) * window;
    return Math.max(200, iskanderHeightM(t));
  }
  const cruise = NEPTUN_CRUISE_HEIGHT_M[threat.type] ?? NEPTUN_CRUISE_HEIGHT_M.unknown;
  if (isShahedType(threat.type)) {
    const current = estimateShahedProgress(threat);
    const window = 0.5;
    const u = pointCount <= 1 ? 1 : pointIndex / (pointCount - 1);
    const t = current - (1 - u) * window;
    return Math.max(80, shahedHeightM(cruise, t));
  }
  const u = pointCount <= 1 ? 1 : (pointIndex + 1) / (pointCount + 1);
  if (threat.type === "kab") return cruiseTrailHeightM(cruise, u, "kab");
  if (threat.type === "missile") return cruiseTrailHeightM(cruise, u, "missile");
  return cruiseTrailHeightM(cruise, u, "uav");
}

export function neptunGroundRadiusM(type: string): number {
  switch (type) {
    case "ballistic":
      return 900;
    case "missile":
    case "mig31k":
      return 520;
    case "kab":
      return 380;
    case "uav":
    case "recon":
      return 300;
    default:
      return 340;
  }
}
