/**
 * CRINK 전략 장소 가제트 — 제목·요약 별칭 → 좌표.
 * Safecast / ReefWatch / 핵시설 시드를 한곳에서 매칭한다.
 */

import type { AxisHubId } from "@/data/axisNetwork";
import { SAFECAST_PRIORITY_SITES } from "@/lib/safecast";
import rawReef from "@/data/reefWatchTargetFeatures.raw.json";

export type CrinkPlace = {
  id: string;
  hub: AxisHubId;
  label: string;
  labelKo: string;
  lat: number;
  lng: number;
  /** 제목·요약 매칭용 (소문자) */
  aliases: string[];
  /** globe bake 시 켤 레이어 힌트 */
  layers?: ("nuclear" | "military" | "reef" | "missile")[];
};

function yongbyon(): CrinkPlace {
  const site = SAFECAST_PRIORITY_SITES.find((s) => s.id === "yongbyon")!;
  return {
    id: "yongbyon",
    hub: "PRK",
    label: "Yongbyon",
    labelKo: "영변",
    lat: site.lat,
    lng: site.lng,
    aliases: ["yongbyon", "영변", "nyongbyon"],
    layers: ["nuclear"],
  };
}

function reefPlaces(): CrinkPlace[] {
  const tier1 = new Set([
    "fiery_cross_reef",
    "subi_reef",
    "mischief_reef",
    "woody_island",
    "thitu_island",
  ]);
  const features = rawReef as Array<{
    key: string;
    name: string;
    lat: number;
    lon: number;
  }>;
  return features
    .filter((f) => tier1.has(f.key))
    .map((f) => ({
      id: f.key,
      hub: "CHN" as const,
      label: f.name,
      labelKo: f.name,
      lat: f.lat,
      lng: f.lon,
      aliases: [
        f.key.replace(/_/g, " "),
        f.name.toLowerCase(),
        ...(f.key === "fiery_cross_reef" ? ["fiery cross", "영서초", "화성초"] : []),
        ...(f.key === "subi_reef" ? ["subi", "주비", "subi reef"] : []),
        ...(f.key === "mischief_reef" ? ["mischief", "미스키프"] : []),
        ...(f.key === "woody_island" ? ["woody island", "영흥도", "woody"] : []),
      ],
      layers: ["reef" as const],
    }));
}

export const CRINK_PLACES: CrinkPlace[] = [
  yongbyon(),
  {
    id: "punggye-ri",
    hub: "PRK",
    label: "Punggye-ri",
    labelKo: "풍계리",
    lat: 41.28,
    lng: 129.09,
    aliases: ["punggye", "punggye-ri", "풍계리", "punggyeri"],
    layers: ["nuclear", "missile"],
  },
  {
    id: "sohae",
    hub: "PRK",
    label: "Sohae",
    labelKo: "서해위성발사장",
    lat: 39.66,
    lng: 124.71,
    aliases: ["sohae", "서해", "tongchang", "동창리", "tongchang-ri"],
    layers: ["missile"],
  },
  {
    id: "natanz",
    hub: "IRN",
    label: "Natanz",
    labelKo: "나탄즈",
    lat: 33.72,
    lng: 51.73,
    aliases: ["natanz", "나탄즈"],
    layers: ["nuclear"],
  },
  {
    id: "fordow",
    hub: "IRN",
    label: "Fordow",
    labelKo: "포르도",
    lat: 34.88,
    lng: 50.99,
    aliases: ["fordow", "fordu", "포르도", "포르도우"],
    layers: ["nuclear"],
  },
  {
    id: "isfahan",
    hub: "IRN",
    label: "Isfahan",
    labelKo: "이스파한",
    lat: 32.65,
    lng: 51.67,
    aliases: ["isfahan", "esfahan", "이스파한", "esfahān"],
    layers: ["nuclear"],
  },
  {
    id: "bushehr",
    hub: "IRN",
    label: "Bushehr",
    labelKo: "부셰르",
    lat: 28.83,
    lng: 50.89,
    aliases: ["bushehr", "부셰르", "bushehr nuclear"],
    layers: ["nuclear"],
  },
  {
    id: "bakhmut",
    hub: "RUS",
    label: "Bakhmut",
    labelKo: "바흐무트",
    lat: 48.59,
    lng: 38.0,
    aliases: ["bakhmut", "артемівськ", "바흐무트", "artemivsk"],
    layers: ["military"],
  },
  {
    id: "avdiivka",
    hub: "RUS",
    label: "Avdiivka",
    labelKo: "아브디이우카",
    lat: 48.14,
    lng: 37.74,
    aliases: ["avdiivka", "avdeevka", "아브디이우카"],
    layers: ["military"],
  },
  {
    id: "pokrovsk",
    hub: "RUS",
    label: "Pokrovsk",
    labelKo: "포크로우스크",
    lat: 48.28,
    lng: 37.18,
    aliases: ["pokrovsk", "포크로우스크", "krasnoarmiisk"],
    layers: ["military"],
  },
  ...reefPlaces(),
];

export type CrinkPlaceHit = {
  placeId: string;
  label: string;
  labelKo: string;
  lat: number;
  lng: number;
  hub: AxisHubId;
};

/**
 * 제목·요약에서 가장 구체적인(별칭 길이 긴) 장소 1건.
 * hub 힌트가 있으면 그 허브 장소만 본다.
 */
export function resolveCrinkPlace(
  text: string,
  hubHint?: AxisHubId | null,
): CrinkPlaceHit | null {
  const blob = text.toLowerCase();
  if (!blob.trim()) return null;

  let best: { place: CrinkPlace; aliasLen: number } | null = null;
  for (const place of CRINK_PLACES) {
    if (hubHint && place.hub !== hubHint) continue;
    for (const alias of place.aliases) {
      const a = alias.toLowerCase();
      if (a.length < 3) continue;
      if (!blob.includes(a)) continue;
      if (!best || a.length > best.aliasLen) {
        best = { place, aliasLen: a.length };
      }
    }
  }
  if (!best) return null;
  const p = best.place;
  return {
    placeId: p.id,
    label: p.label,
    labelKo: p.labelKo,
    lat: p.lat,
    lng: p.lng,
    hub: p.hub,
  };
}

export function crinkPlaceById(id: string): CrinkPlace | undefined {
  return CRINK_PLACES.find((p) => p.id === id);
}

/** Playwright bake 대상 — 전 placeId */
export function crinkBakePlaceIds(): string[] {
  return CRINK_PLACES.map((p) => p.id);
}
