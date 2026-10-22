/** 사건 주변 맥락 — 근처 해협·감시 시설 이름 (2D 위치 지도의 작은 라벨용) */

import { CHOKEPOINTS } from "@/data/chokepoints";
import { ENERGY_FACILITIES, ENERGY_FACILITY_KIND_EN, ENERGY_FACILITY_KIND_KO } from "@/data/energyFacilities";

export type NearbyPlace = { id: string; name: string; lat: number; lng: number; kind: "choke" | "facility" };

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearbyPlaces(lat: number, lng: number, lang: "ko" | "en", radiusKm = 400, max = 4): NearbyPlace[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const out: Array<NearbyPlace & { d: number }> = [];
  for (const c of CHOKEPOINTS) {
    const d = km(lat, lng, c.lat, c.lng);
    if (d <= radiusKm) out.push({ id: c.slug, name: c.name[lang], lat: c.lat, lng: c.lng, kind: "choke", d });
  }
  for (const f of ENERGY_FACILITIES) {
    const d = km(lat, lng, f.lat, f.lng);
    if (d <= radiusKm) {
      const kind = lang === "en" ? ENERGY_FACILITY_KIND_EN[f.kind] : ENERGY_FACILITY_KIND_KO[f.kind];
      out.push({
        id: f.id,
        name: `${lang === "en" ? f.nameEn : f.nameKo} · ${kind}`,
        lat: f.lat,
        lng: f.lng,
        kind: "facility",
        d,
      });
    }
  }
  return out
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((p) => {
      const rest = { ...p } as Partial<typeof p>;
      delete rest.d;
      return rest as Omit<typeof p, "d">;
    });
}
