import type { FeatureCollection, Geometry } from "geojson";

/**
 * 지경학 진영(서방/우호권 · 반서방/CRINK연계 · 비동맹권 · 혼합권) 국가 음영.
 * alliedBlocCountryPolygons.ts(지정학 — NATO/AUKUS/CRINK/CSTO)와는 별개 오버레이 —
 * 이쪽은 군사동맹이 아니라 경제협력조약·플랫폼 회원국 기준.
 *
 * 데이터 출처·다중소속 처리 규칙은 scripts/build-geoecon-bloc-countries.js 주석 참고.
 * RCEP은 반서방 캠프로 칠하지 않음. SCO 인도·파키스탄은 mixed.
 */
export type GeoEconCamp = "pro-western" | "anti-western" | "non-aligned" | "mixed";

export const GEOECON_CAMP_LABEL: Record<GeoEconCamp, { ko: string; en: string }> = {
  "pro-western": {
    ko: "서방/우호권 (G7·EU·CPTPP·USMCA·IPEF·Chip4·MSP·I2U2)",
    en: "Western-aligned (G7/EU/CPTPP/USMCA/IPEF/Chip4/MSP/I2U2)",
  },
  "anti-western": {
    ko: "반서방/CRINK연계 (EAEU·SCO·BRI·INSTC)",
    en: "Anti-Western/CRINK-aligned (EAEU/SCO/BRI/INSTC)",
  },
  "non-aligned": {
    ko: "비동맹권 (ASEAN·NAM·AfCFTA·Mercosur)",
    en: "Non-aligned bloc (ASEAN/NAM/AfCFTA/Mercosur)",
  },
  mixed: {
    ko: "혼합권 — 주의 (RCEP·SCO 인도/파키스탄)",
    en: "Mixed — caution (RCEP / SCO India·Pakistan)",
  },
};

export const GEOECON_MEMBERSHIP_LABEL: Record<string, string> = {
  g7: "G7",
  eu: "EU",
  cptpp: "CPTPP",
  usmca: "USMCA",
  ipef: "IPEF",
  chip4: "Chip 4",
  msp: "MSP",
  i2u2: "I2U2",
  eaeu: "EAEU",
  sco: "SCO",
  bri: "BRI MoU",
  instc: "INSTC",
  asean: "ASEAN",
  nam: "NAM",
  mercosur: "Mercosur",
  afcfta: "AfCFTA",
  rcep: "RCEP",
};

const CAMP_FILL: Record<GeoEconCamp, string> = {
  "pro-western": "#2563eb",
  "anti-western": "#ea580c",
  "non-aligned": "#16a34a",
  mixed: "#ca8a04",
};
const CAMP_STROKE: Record<GeoEconCamp, string> = {
  "pro-western": "rgba(96, 165, 250, 0.85)",
  "anti-western": "rgba(251, 146, 60, 0.85)",
  "non-aligned": "rgba(74, 222, 128, 0.85)",
  mixed: "rgba(250, 204, 21, 0.9)",
};
const CAMP_FILL_OPACITY: Record<GeoEconCamp, number> = {
  "pro-western": 0.14,
  "anti-western": 0.16,
  "non-aligned": 0.12,
  mixed: 0.14,
};

function isGeoEconCamp(value: unknown): value is GeoEconCamp {
  return (
    value === "pro-western" ||
    value === "anti-western" ||
    value === "non-aligned" ||
    value === "mixed"
  );
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/** geoecon-bloc-countries.json → MapLibre fill/stroke 프로퍼티 페인트 */
export function paintGeoEconBlocCountriesGeoJson(
  source: FeatureCollection | null | undefined,
): FeatureCollection {
  if (!source?.features?.length) return EMPTY_FC;

  const features = source.features.flatMap((feature) => {
    const props = feature.properties ?? {};
    const camp = props.camp;
    if (!isGeoEconCamp(camp)) return []; // "none" — 의도적으로 안 그림
    if (!feature.geometry) return [];

    const memberships = Array.isArray(props.memberships)
      ? (props.memberships as string[])
      : [];

    return [
      {
        type: "Feature" as const,
        id: typeof props.iso === "string" ? props.iso : undefined,
        geometry: feature.geometry as Geometry,
        properties: {
          iso: props.iso,
          name: typeof props.name === "string" ? props.name : props.iso,
          camp,
          memberships,
          fill: CAMP_FILL[camp],
          fillOpacity: CAMP_FILL_OPACITY[camp],
          stroke: CAMP_STROKE[camp],
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
