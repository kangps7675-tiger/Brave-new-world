/**
 * 최신순 LIMIT 으로 자르면 마지막에 수집된 배치(해역)가 한도를 독차지해 한쪽 바다만 남는다.
 * 격자(기본 6°) 칸마다 번갈아 한 척씩 뽑아 전 지구에 고르게 펼친다. 입력 순서(최신순)는 칸 안에서 유지.
 */
export function spreadByGrid<T extends { lat: number; lng: number }>(
  items: readonly T[],
  max: number,
  cellDeg = 6,
): T[] {
  if (max <= 0) return [];
  if (items.length <= max) return [...items];
  const cells = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.floor((item.lat + 90) / cellDeg)}:${Math.floor((item.lng + 180) / cellDeg)}`;
    const list = cells.get(key);
    if (list) list.push(item);
    else cells.set(key, [item]);
  }
  const queues = [...cells.values()];
  const out: T[] = [];
  for (let round = 0; out.length < max; round++) {
    let took = false;
    for (const q of queues) {
      if (round < q.length) {
        out.push(q[round]);
        took = true;
        if (out.length >= max) break;
      }
    }
    if (!took) break;
  }
  return out;
}
