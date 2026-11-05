/**
 * 북한 미사일 탄도 포물선 힌트 — 발사점에서 동해 방향으로 그리는 대략의 궤적.
 * 탄착 미확정: 동해 방향 포물선만 표시 (NEPTUN 실시간 궤적과 구분).
 */

/** 종류별 사거리(대략 km)·정점고도(m)·방위(도, 정북=0) — 동해·일본해 쪽 힌트 */
function arcParams(kind: string): {
  rangeKm: number;
  apexM: number;
  bearingDeg: number;
} {
  switch (kind) {
    case "space-launch":
      return { rangeKm: 520, apexM: 220_000, bearingDeg: 95 };
    case "hypersonic":
      return { rangeKm: 380, apexM: 110_000, bearingDeg: 100 };
    case "slbm":
      return { rangeKm: 280, apexM: 85_000, bearingDeg: 105 };
    case "cruise":
      // 순항은 낮은 비행 — 얕은 포물선
      return { rangeKm: 220, apexM: 8_000, bearingDeg: 110 };
    case "artillery":
      return { rangeKm: 60, apexM: 12_000, bearingDeg: 90 };
    case "ballistic":
    default:
      return { rangeKm: 340, apexM: 95_000, bearingDeg: 98 };
  }
}

export type BallisticArcSample = {
  lat: number;
  lng: number;
  heightM: number;
};

/**
 * 발사점 → 동해 방향 탄도 포물선 (h = 4·H·t·(1−t)).
 * 지구 곡면 위 방위각으로 전진. 과거 내역 카드의 웹 그래픽이 이 샘플을 쓴다.
 */
export function ballisticArcSamples(
  lat: number,
  lng: number,
  kind: string,
): BallisticArcSample[] {
  const { rangeKm, apexM, bearingDeg } = arcParams(kind);
  const R = 6_371; // km
  const steps = 28;
  const pts: BallisticArcSample[] = [];
  const br = (bearingDeg * Math.PI) / 180;
  const lat0 = (lat * Math.PI) / 180;
  const lon0 = (lng * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const h = 4 * apexM * t * (1 - t);
    const d = (rangeKm * t) / R;
    const lat1 = Math.asin(
      Math.sin(lat0) * Math.cos(d) + Math.cos(lat0) * Math.sin(d) * Math.cos(br),
    );
    const lon1 =
      lon0 +
      Math.atan2(
        Math.sin(br) * Math.sin(d) * Math.cos(lat0),
        Math.cos(d) - Math.sin(lat0) * Math.sin(lat1),
      );
    pts.push({
      lng: (lon1 * 180) / Math.PI,
      lat: (lat1 * 180) / Math.PI,
      heightM: h,
    });
  }
  return pts;
}
