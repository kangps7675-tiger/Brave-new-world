/**
 * 해상 기상 요약 — D1 `marine_weather` 행을 화면·사건 카드가 읽는 모양으로. 순수 함수만(테스트 대상).
 *
 *  - 해역 예보: 지점별로 "지금 / +24h / +48h / +72h" 에 가장 가까운 예보 행을 고른다.
 *  - 사건 당시: 분석값(f000, 6시간 간격) 중 사건 시각에 가장 가까운 행 × 사건에 가장 가까운 지점.
 *    지점이 멀거나 시각이 멀면 "당시 바다는 이랬다"고 말하지 않고 null.
 */

import { beaufort, seaStateKo } from "@/lib/marineWeather/gfsWave";

export type WxRow = {
  pointId: string;
  validTime: string;
  gridLat: number;
  gridLng: number;
  hsM: number | null;
  periodS: number | null;
  windMs: number | null;
  windDirDeg: number | null;
  swellM: number | null;
};

/** 격자 한 칸(≈28km)보다 한참 멀면 그 바다 얘기가 아니다. 지점 간격이 성기므로 200km 까지만 */
export const INCIDENT_MAX_POINT_KM = 200;
/** f000 은 6시간 간격 → 사건 시각과 3시간(+여유 30분) 넘게 벌어지면 쓰지 않는다 */
export const INCIDENT_MAX_OFFSET_MIN = 210;
/** 예보 칸을 고를 때 목표 시각과 이만큼까지만 벗어나도 인정 */
export const FORECAST_PICK_TOLERANCE_MIN = 210;

export const MS_TO_KN = 1.943844;

const R_KM = 6371;
function rad(d: number) {
  return (d * Math.PI) / 180;
}
export function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function knots(windMs: number | null): number | null {
  return windMs == null || !Number.isFinite(windMs) ? null : Math.round(windMs * MS_TO_KN);
}

export type SeaAtIncident = {
  pointId: string;
  distKm: number;
  validTime: string;
  /** 사건 시각 − 관측(분석) 시각, 분 (부호 있음) */
  offsetMin: number;
  hsM: number | null;
  periodS: number | null;
  windKn: number | null;
  windDirDeg: number | null;
  beaufort: number | null;
  seaStateKo: string | null;
};

/**
 * 사건 당시 바다. `rows` 는 분석값(f000) 행들(여러 지점·여러 사이클).
 * 지점은 사건과 가장 가까운 하나, 시각은 그 지점에서 사건과 가장 가까운 행.
 */
export function seaAtIncident(
  rows: WxRow[],
  incident: { lat: number; lng: number; atIso: string },
): SeaAtIncident | null {
  const t = Date.parse(incident.atIso);
  if (!Number.isFinite(t) || rows.length === 0) return null;

  let bestPoint: { id: string; km: number } | null = null;
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.pointId)) continue;
    seen.add(r.pointId);
    const km = kmBetween(incident.lat, incident.lng, r.gridLat, r.gridLng);
    if (!bestPoint || km < bestPoint.km) bestPoint = { id: r.pointId, km };
  }
  if (!bestPoint || bestPoint.km > INCIDENT_MAX_POINT_KM) return null;

  let best: WxRow | null = null;
  let bestGap = Infinity;
  for (const r of rows) {
    if (r.pointId !== bestPoint.id) continue;
    const vt = Date.parse(r.validTime);
    if (!Number.isFinite(vt)) continue;
    const gap = Math.abs(vt - t);
    if (gap < bestGap) {
      best = r;
      bestGap = gap;
    }
  }
  if (!best || bestGap > INCIDENT_MAX_OFFSET_MIN * 60_000) return null;
  if (best.hsM == null && best.windMs == null) return null;

  return {
    pointId: best.pointId,
    distKm: Math.round(bestPoint.km),
    validTime: best.validTime,
    offsetMin: Math.round((t - Date.parse(best.validTime)) / 60_000),
    hsM: best.hsM,
    periodS: best.periodS,
    windKn: knots(best.windMs),
    windDirDeg: best.windDirDeg,
    beaufort: beaufort(best.windMs),
    seaStateKo: seaStateKo(best.hsM),
  };
}

export type ForecastCell = {
  validTime: string;
  hsM: number | null;
  periodS: number | null;
  windKn: number | null;
  windDirDeg: number | null;
  beaufort: number | null;
  seaStateKo: string | null;
} | null;

export type PointForecast = {
  pointId: string;
  /** offsets 와 같은 순서. 해당 시각 근처 예보가 없으면 null */
  cells: ForecastCell[];
};

export type ForecastSummary = {
  offsetsH: number[];
  points: PointForecast[];
  /** 앞으로 72시간 안에서 가장 높은 파고 */
  peak: { pointId: string; hsM: number; validTime: string } | null;
};

export const FORECAST_OFFSETS_H = [0, 24, 48, 72];

function cellOf(r: WxRow): NonNullable<ForecastCell> {
  return {
    validTime: r.validTime,
    hsM: r.hsM,
    periodS: r.periodS,
    windKn: knots(r.windMs),
    windDirDeg: r.windDirDeg,
    beaufort: beaufort(r.windMs),
    seaStateKo: seaStateKo(r.hsM),
  };
}

/** `rows` 는 한 사이클의 예보 행들(여러 지점 × 예보시간). nowMs 는 "지금". */
export function summarizeForecast(rows: WxRow[], nowMs: number, offsetsH = FORECAST_OFFSETS_H): ForecastSummary {
  const byPoint = new Map<string, WxRow[]>();
  for (const r of rows) {
    const list = byPoint.get(r.pointId) ?? [];
    list.push(r);
    byPoint.set(r.pointId, list);
  }

  const points: PointForecast[] = [];
  let peak: ForecastSummary["peak"] = null;
  const horizonEnd = nowMs + Math.max(...offsetsH) * 3_600_000 + FORECAST_PICK_TOLERANCE_MIN * 60_000;

  for (const [pointId, list] of byPoint) {
    const cells = offsetsH.map((h) => {
      const target = nowMs + h * 3_600_000;
      let best: WxRow | null = null;
      let bestGap = Infinity;
      for (const r of list) {
        const gap = Math.abs(Date.parse(r.validTime) - target);
        if (gap < bestGap) {
          best = r;
          bestGap = gap;
        }
      }
      return best && bestGap <= FORECAST_PICK_TOLERANCE_MIN * 60_000 ? cellOf(best) : null;
    });
    points.push({ pointId, cells });

    for (const r of list) {
      const vt = Date.parse(r.validTime);
      if (r.hsM == null || vt < nowMs - 3 * 3_600_000 || vt > horizonEnd) continue;
      if (!peak || r.hsM > peak.hsM) peak = { pointId, hsM: r.hsM, validTime: r.validTime };
    }
  }
  points.sort((a, b) => a.pointId.localeCompare(b.pointId));
  return { offsetsH, points, peak };
}
