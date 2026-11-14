/**
 * 호르무즈 입구의 상선 정박지.
 * 지명이 있으면 지명을 우선한다. 없으면 45km 안에서 가장 가까운 정박지로 붙인다.
 * 하사브 앞 통항대(약 26.4N 56.5E)는 하사브로 들어가고, 주바일 같은 걸프 안쪽은 빠진다.
 */

export type AnchorageId = "khasab" | "khor-fakkan" | "fujairah";

export type Anchorage = {
  id: AnchorageId;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  place: RegExp;
};

/** 검사 순서 = 더 좁은 지명 우선 */
export const HORMUZ_ANCHORAGES: Anchorage[] = [
  {
    id: "khor-fakkan",
    nameKo: "호르 파칸",
    nameEn: "Khor Fakkan",
    lat: 25.35,
    lng: 56.37,
    place: /khor[\s-]?fakkan|khawr[\s-]?fakkan|호르\s*파칸/i,
  },
  {
    id: "fujairah",
    nameKo: "푸자이라",
    nameEn: "Fujairah",
    lat: 25.17,
    lng: 56.52,
    place: /fujairah|fujayrah|푸자이라/i,
  },
  {
    id: "khasab",
    nameKo: "하사브",
    nameEn: "Khasab",
    lat: 26.2,
    lng: 56.27,
    place: /khasab|khawr khasab|musandam|하사브|bukha/i,
  },
];

const OTHER = { id: "other" as const, nameKo: "그 외 걸프·해협", nameEn: "Other Gulf · strait" };

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat = (aLat * Math.PI) / 180;
  const x = dLng * Math.cos(lat) * 6371;
  const y = dLat * 6371;
  return Math.hypot(x, y);
}

export function anchorageAt(lat: number, lng: number, text?: string | null): Anchorage | null {
  const blob = text ?? "";
  if (blob) {
    const named = HORMUZ_ANCHORAGES.find((a) => a.place.test(blob));
    if (named) return named;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let nearest: Anchorage | null = null;
  let nearestKm = 45;
  for (const a of HORMUZ_ANCHORAGES) {
    const km = kmBetween(lat, lng, a.lat, a.lng);
    if (km <= nearestKm) {
      nearest = a;
      nearestKm = km;
    }
  }
  return nearest;
}

type AnchorageRow = { lat: number; lng: number; place?: string | null; detail?: string | null; title?: string | null };

export function groupByHormuzAnchorage<T extends AnchorageRow>(items: readonly T[]): { id: string; nameKo: string; nameEn: string; items: T[] }[] {
  const buckets = new Map<string, { id: string; nameKo: string; nameEn: string; items: T[] }>();
  const order = [...HORMUZ_ANCHORAGES.map((a) => a.id), OTHER.id];
  for (const item of items) {
    const hit = anchorageAt(item.lat, item.lng, `${item.place ?? ""} ${item.title ?? ""} ${item.detail ?? ""}`);
    const key = hit?.id ?? OTHER.id;
    const nameKo = hit?.nameKo ?? OTHER.nameKo;
    const nameEn = hit?.nameEn ?? OTHER.nameEn;
    const cur = buckets.get(key) ?? { id: key, nameKo, nameEn, items: [] };
    cur.items.push(item);
    buckets.set(key, cur);
  }
  return order.flatMap((id) => {
    const g = buckets.get(id);
    return g && g.items.length > 0 ? [g] : [];
  });
}
