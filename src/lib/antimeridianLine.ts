/**
 * MapLibre는 경도를 -180~180으로만 잇는다.
 * 날짜변경선을 넘는 짧은 구간(태평양 항로)은 경도 차가 180°를 넘어
 * 지도 전체를 가로지르는 긴 선으로 그려진다.
 * 그 지점에서 선을 끊어, 각 조각이 날짜변경선에서 만나게 한다.
 */

export type LngLat = [lng: number, lat: number];

export function splitAntimeridianCoordinates(coordinates: LngLat[]): LngLat[][] {
  if (coordinates.length < 2) return coordinates.length === 0 ? [] : [coordinates];

  const parts: LngLat[][] = [[coordinates[0]!]];

  for (let i = 1; i < coordinates.length; i += 1) {
    const part = parts[parts.length - 1]!;
    const prev = part[part.length - 1]!;
    const cur = coordinates[i]!;
    const raw = cur[0] - prev[0];
    if (Math.abs(raw) <= 180) {
      part.push(cur);
      continue;
    }

    const shortDelta = raw > 0 ? raw - 360 : raw + 360;
    const boundary = shortDelta > 0 ? 180 : -180;
    const distToBoundary = boundary - prev[0];

    if (Math.abs(shortDelta) < 1e-9 || Math.abs(distToBoundary) < 1e-6) {
      const other = boundary > 0 ? -180 : 180;
      parts.push([
        [other, prev[1]],
        cur,
      ]);
      continue;
    }

    const t = Math.max(0, Math.min(1, distToBoundary / shortDelta));
    const lat = prev[1] + (cur[1] - prev[1]) * t;
    const endLng = boundary;
    const startLng = boundary > 0 ? -180 : 180;
    part.push([endLng, lat]);
    parts.push([
      [startLng, lat],
      cur,
    ]);
  }

  return parts.filter((part) => part.length >= 2);
}
