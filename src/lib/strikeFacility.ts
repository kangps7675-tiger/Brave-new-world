/**
 * 공습 불꽃 → "어느 시설을 맞혔나" 태그.
 *
 * 랜딩 약속(「불꽃 — 드론·미사일이 떨어진 곳」): 항구·정유소·수출터미널처럼 해운과 닿은 타격은 따로 구분해 보여 준다.
 * 판정 (해역판 energyStrikes.ts 와 같은 원칙):
 *   1. 불꽃 좌표가 감시 시설 반경(+2km) 안 → 그 시설
 *   2. 아니면 제목·본문에 시설 별칭이 나오고, 좌표가 그 시설에서 80km 안 → 그 시설
 *      (별칭만 맞고 수백 km 떨어진 건 다른 도시 속보라 버린다)
 *   3. 둘 다 아니면 태그 없음 — "정유" 단어만으로 시설을 지어내지 않는다
 */

import {
  ENERGY_FACILITIES,
  ENERGY_FACILITY_KIND_EN,
  ENERGY_FACILITY_KIND_KO,
  distanceKm,
  nearestEnergyFacility,
  type EnergyFacility,
} from "@/data/energyFacilities";

export type StrikeFacilityTag = {
  id: string;
  nameKo: string;
  nameEn: string;
  kindKo: string;
  kindEn: string;
  coastal: boolean;
  seaRegion: EnergyFacility["seaRegion"];
};

const ALIAS_MAX_KM = 80;

function toTag(f: EnergyFacility): StrikeFacilityTag {
  return {
    id: f.id,
    nameKo: f.nameKo,
    nameEn: f.nameEn,
    kindKo: ENERGY_FACILITY_KIND_KO[f.kind],
    kindEn: ENERGY_FACILITY_KIND_EN[f.kind],
    coastal: f.coastal,
    seaRegion: f.seaRegion,
  };
}

export function strikeFacilityFor(input: {
  lat: number;
  lng: number;
  text?: string;
}): StrikeFacilityTag | null {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  const near = nearestEnergyFacility(input.lat, input.lng, 2);
  if (near) return toTag(near.facility);
  const text = (input.text ?? "").toLowerCase();
  if (!text) return null;
  for (const f of ENERGY_FACILITIES) {
    if (!f.aliases.some((a) => text.includes(a.toLowerCase()))) continue;
    if (distanceKm(input.lat, input.lng, f.lat, f.lng) <= ALIAS_MAX_KM) return toTag(f);
  }
  return null;
}

/** 지도·양피지에 붙이는 짧은 이름 — "투압세 정유소·항구 · 수출터미널" */
export function strikeFacilityLabel(tag: StrikeFacilityTag, lang: "ko" | "en"): string {
  return lang === "en" ? `${tag.nameEn} · ${tag.kindEn}` : `${tag.nameKo} · ${tag.kindKo}`;
}
