/**
 * 전 지구 AIS 표본 — 최신 수신순으로 자르면 수신국이 촘촘한 유럽만 남고 호르무즈·홍해는 비었다.
 * 1) 해운 길목(CHOKEPOINT_BOXES)에 먼저 자리를 배정하고
 * 2) 남은 자리는 15° 격자 칸을 돌아가며 채워 전 세계가 고르게 보이게 한다.
 */
export type SampleBox = {
  id: string;
  south: number;
  north: number;
  west: number;
  east: number;
};

export const CHOKEPOINT_BOXES: readonly SampleBox[] = [
  { id: "hormuz", south: 23.5, north: 27.8, west: 53.5, east: 58.5 },
  { id: "bab-el-mandeb", south: 11, north: 16, west: 41, east: 45.5 },
  { id: "red-sea-suez", south: 26.5, north: 32, west: 31.5, east: 35 },
  { id: "malacca-singapore", south: 0.8, north: 6.5, west: 99, east: 105 },
  { id: "black-sea", south: 41, north: 46.8, west: 27.5, east: 41.5 },
  { id: "taiwan-strait", south: 22, north: 26.5, west: 117.5, east: 121.5 },
  { id: "gibraltar", south: 35.5, north: 36.5, west: -6.3, east: -4.8 },
  { id: "panama", south: 7.5, north: 10, west: -80.5, east: -79 },
];

/** 길목 하나가 차지하는 최대 비율 (max 대비) */
export const CHOKEPOINT_SHARE = 0.07;
const GRID_DEG = 15;

type Pt = { lat: number; lng: number };

export function inSampleBox(p: Pt, b: SampleBox): boolean {
  return p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;
}

export function balanceWorldSample<T extends Pt>(items: readonly T[], max: number): T[] {
  if (max <= 0) return [];
  if (items.length <= max) return [...items];

  const perBox = Math.max(1, Math.floor(max * CHOKEPOINT_SHARE));
  const picked = new Set<T>();
  for (const box of CHOKEPOINT_BOXES) {
    let n = 0;
    for (const it of items) {
      if (n >= perBox) break;
      if (inSampleBox(it, box) && !picked.has(it)) {
        picked.add(it);
        n++;
      }
    }
  }

  // 남은 자리 — 격자 칸 라운드로빈 (입력 순서 = 최신순 유지)
  const cells = new Map<string, T[]>();
  for (const it of items) {
    if (picked.has(it)) continue;
    const key = `${Math.floor(it.lat / GRID_DEG)}:${Math.floor(it.lng / GRID_DEG)}`;
    const list = cells.get(key);
    if (list) list.push(it);
    else cells.set(key, [it]);
  }
  const queues = [...cells.values()];
  for (let round = 0; picked.size < max; round++) {
    let any = false;
    for (const q of queues) {
      if (round < q.length) {
        any = true;
        picked.add(q[round]);
        if (picked.size >= max) break;
      }
    }
    if (!any) break;
  }
  return [...picked];
}
