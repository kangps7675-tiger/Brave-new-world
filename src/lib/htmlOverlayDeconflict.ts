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
 *
 * ── 성능 계약 (중요) ────────────────────────────────────────────────
 * **실제로 밀린 마커만 새 객체가 되고, 나머지는 참조가 그대로 유지된다.**
 *
 * 이전 구현은 첫 줄에서 `markers.map((m) => ({ ...m }))` 로 전 마커를 복사했다.
 * 밀어낼 대상은 SEPARATE_KINDS 3종뿐인데도 1000개 전부의 객체 identity가
 * 매번 새로 만들어졌고, 그 결과 MapGlobeView의 모든 `<Marker>` props가
 * "바뀐 것"으로 판정돼 React 재조정 + ref 콜백이 전량 재실행됐다.
 *
 * 또 O(n²) 전수 비교를 격자 해시(cell = MIN_SEP_DEG)로 바꿔 근접 후보만 본다.
 * 이 함수는 htmlOverlayMarkers 재계산마다 도는 핫패스이므로 위 두 성질을
 * 깨뜨리지 말 것.
 */
export function deconflictTheaterHtmlOverlays<T extends DeconflictableOverlay>(
  markers: readonly T[],
): T[] {
  const targetIdx: number[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const kind = markers[i].displayKind;
    if (kind && SEPARATE_KINDS.has(kind)) targetIdx.push(i);
  }
  // 밀어낼 후보가 2개 미만이면 원본 배열을 그대로 (복사조차 하지 않는다)
  if (targetIdx.length < 2) return markers as T[];

  /** 격자 해시 — 한 칸이 MIN_SEP_DEG이므로 이웃 3x3칸만 보면 충분하다 */
  const cellKey = (lat: number, lng: number) =>
    `${Math.floor(lat / MIN_SEP_DEG)}:${Math.floor(lng / MIN_SEP_DEG)}`;

  const grid = new Map<string, number[]>();
  for (const idx of targetIdx) {
    const m = markers[idx];
    const key = cellKey(m.lat, m.lng);
    const bucket = grid.get(key);
    if (bucket) bucket.push(idx);
    else grid.set(key, [idx]);
  }

  const needsNudge = new Set<number>();
  for (const idx of targetIdx) {
    const ma = markers[idx];
    const baseLat = Math.floor(ma.lat / MIN_SEP_DEG);
    const baseLng = Math.floor(ma.lng / MIN_SEP_DEG);

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const bucket = grid.get(`${baseLat + dy}:${baseLng + dx}`);
        if (!bucket) continue;
        for (const other of bucket) {
          if (other === idx) continue;
          const mb = markers[other];
          // 같은 종류끼리는 겹쳐도 밀지 않는다 (기존 동작 유지)
          if ((ma.displayKind ?? "") === (mb.displayKind ?? "")) continue;
          if (Math.hypot(ma.lat - mb.lat, ma.lng - mb.lng) >= MIN_SEP_DEG) continue;
          needsNudge.add(idx);
          needsNudge.add(other);
        }
      }
    }
  }

  // 실제로 밀 것이 없으면 원본 그대로 — 참조 안정성 유지
  let mutated = false;
  for (const idx of needsNudge) {
    const nudge = NUDGE[markers[idx].displayKind ?? ""];
    if (nudge && (nudge.dLat !== 0 || nudge.dLng !== 0)) {
      mutated = true;
      break;
    }
  }
  if (!mutated) return markers as T[];

  // 여기서 처음 배열을 복사한다. 원소는 밀린 것만 새 객체.
  const out = markers.slice() as T[];
  for (const idx of needsNudge) {
    const origin = markers[idx];
    const nudge = NUDGE[origin.displayKind ?? ""];
    if (!nudge || (nudge.dLat === 0 && nudge.dLng === 0)) continue;
    out[idx] = {
      ...origin,
      lat: Math.max(-85, Math.min(85, origin.lat + nudge.dLat)),
      lng: origin.lng + nudge.dLng,
    };
  }

  return out;
}
