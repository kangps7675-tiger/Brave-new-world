/**
 * 전장 HTML 오버레이(사망자·상황 콜아웃·뉴스 네온)가 같은 좌표에 쌓이지 않게 분리.
 * MapLibre는 react-globe.gl의 htmlAltitude를 쓰지 않아 한 평면에 겹치던 문제를 보정한다.
 */

export type DeconflictableOverlay = {
  displayKind?: string;
  lat: number;
  lng: number;
};

const SEPARATE_KINDS = new Set([
  "casualty-skull",
  "situation-callout",
  "news-stream-neon",
]);

/** admin1 스케일에서 한 덩어리로 보이는 거리(°) */
const MIN_SEP_DEG = 0.28;

const NUDGE: Record<string, { dLat: number; dLng: number }> = {
  // 사망자는 실좌표 유지
  "casualty-skull": { dLat: 0, dLng: 0 },
  // 콜아웃: 북서쪽
  "situation-callout": { dLat: 0.22, dLng: -0.18 },
  // 뉴스 네온: 남동쪽
  "news-stream-neon": { dLat: -0.16, dLng: 0.2 },
};

/**
 * 서로 너무 가까운 전장 오버레이만 종류별 고정 오프셋으로 밀어 낸다.
 * 이미 충분히 떨어진 마커는 그대로 둔다. 오프셋은 원좌표 기준 1회만 적용.
 */
export function deconflictTheaterHtmlOverlays<T extends DeconflictableOverlay>(
  markers: readonly T[],
): T[] {
  const out = markers.map((m) => ({ ...m }));
  const targetIdx: number[] = [];
  for (let i = 0; i < out.length; i += 1) {
    const kind = out[i].displayKind;
    if (kind && SEPARATE_KINDS.has(kind)) targetIdx.push(i);
  }
  if (targetIdx.length < 2) return out;

  const needsNudge = new Set<number>();
  for (let a = 0; a < targetIdx.length; a += 1) {
    for (let b = a + 1; b < targetIdx.length; b += 1) {
      const ia = targetIdx[a];
      const ib = targetIdx[b];
      const ma = markers[ia];
      const mb = markers[ib];
      if ((ma.displayKind ?? "") === (mb.displayKind ?? "")) continue;
      const dist = Math.hypot(ma.lat - mb.lat, ma.lng - mb.lng);
      if (dist >= MIN_SEP_DEG) continue;
      needsNudge.add(ia);
      needsNudge.add(ib);
    }
  }

  for (const idx of needsNudge) {
    const kind = out[idx].displayKind ?? "";
    const nudge = NUDGE[kind];
    if (!nudge || (nudge.dLat === 0 && nudge.dLng === 0)) continue;
    const origin = markers[idx];
    out[idx] = {
      ...out[idx],
      lat: Math.max(-85, Math.min(85, origin.lat + nudge.dLat)),
      lng: origin.lng + nudge.dLng,
    };
  }

  return out;
}
