/**
 * ADS-B 전 세계 폴링.
 *
 * 군용은 `/v2/mil` 한 번으로 전 세계.
 * 민항은 반경 격자. OpenAPI 는 250nm 상한이라고 적혀 있지만,
 * 2026-09-24 라이브 조회는 1500nm 까지 200 을 돌려줬다. 1000nm 로 두고
 * 대륙이 빠지지 않게 중심을 배치한다. 키가 있으면 ADSBexchange `/v2/all`
 * 한 번이 격자를 대체한다. 셀 단위로 얇혀 한 지역이 상한을 다 먹지 않게 한다.
 */

export const ADSB_LOL_RADIUS_NM = 1000;

export type AdsbWorldHub = { id: string; lat: number; lng: number };

/** 1000nm 원으로 대륙과 주요 대양 항로가 겹치게 둔 중심점. */
export const ADSB_WORLD_HUBS: readonly AdsbWorldHub[] = [
  { id: "us-east", lat: 39, lng: -80 },
  { id: "us-west", lat: 38, lng: -118 },
  { id: "alaska", lat: 64, lng: -152 },
  { id: "hawaii", lat: 21, lng: -157 },
  { id: "mexico", lat: 23, lng: -102 },
  { id: "brazil", lat: -12, lng: -50 },
  { id: "andes", lat: -15, lng: -72 },
  { id: "south-cone", lat: -35, lng: -65 },
  { id: "europe", lat: 50, lng: 10 },
  { id: "moscow", lat: 56, lng: 40 },
  { id: "west-africa", lat: 8, lng: 0 },
  { id: "east-africa", lat: 0, lng: 35 },
  { id: "south-africa", lat: -26, lng: 26 },
  { id: "gulf", lat: 26, lng: 50 },
  { id: "india", lat: 22, lng: 78 },
  { id: "se-asia", lat: 8, lng: 108 },
  { id: "east-asia", lat: 35, lng: 128 },
  { id: "china-west", lat: 40, lng: 90 },
  { id: "siberia", lat: 60, lng: 95 },
  { id: "australia", lat: -25, lng: 135 },
  { id: "nz", lat: -41, lng: 174 },
];

export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Math.min(Math.max(1, limit), items.length);
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: workers }, () => run()));
  return out;
}

/**
 * 피드 앞쪽(ICAO hex 순)만 자르면 한 나라로 몰린다.
 * 위경도 셀에 상한을 두고 라운드로빈으로 전 세계에 나눠 담는다.
 */
export function thinWorldwide<T extends { lat: number; lng: number }>(
  items: readonly T[],
  options: { cellDeg: number; perCell: number; max: number },
): T[] {
  const cell = options.cellDeg;
  if (cell <= 0 || options.max <= 0) return [];
  const cells = new Map<string, T[]>();
  for (const item of items) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
    const key = `${Math.floor(item.lat / cell)}:${Math.floor(item.lng / cell)}`;
    const bucket = cells.get(key);
    if (!bucket) cells.set(key, [item]);
    else if (bucket.length < options.perCell) bucket.push(item);
  }
  const buckets = [...cells.values()];
  const out: T[] = [];
  for (let round = 0; out.length < options.max; round += 1) {
    let added = false;
    for (const bucket of buckets) {
      const item = bucket[round];
      if (!item) continue;
      out.push(item);
      added = true;
      if (out.length >= options.max) break;
    }
    if (!added) break;
  }
  return out;
}
