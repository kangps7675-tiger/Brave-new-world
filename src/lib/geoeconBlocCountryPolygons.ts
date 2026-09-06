import type { FeatureCollection, Geometry } from "geojson";

/**
 * 지경학 진영(서방/우호권 · 반서방/CRINK연계 · 비동맹권) 국가 음영.
 * alliedBlocCountryPolygons.ts(지정학 — NATO/AUKUS/CRINK/CSTO)와는 별개 오버레이 —
 * 이쪽은 군사동맹이 아니라 경제협력조약·플랫폼 회원국 기준.
 *
 * 데이터 출처·다중소속 처리 규칙은 scripts/build-geoecon-bloc-countries.js 주석 참고.
 * RCEP 단독 소속국, SCO의 인도·파키스탄은 camp가 "none"이라 이 레이어에 안 뜬다 —
 * "중국 주도 조직 회원 = 반서방"이라고 단정하지 않기 위한 의도적 설계.
 */
export type GeoEconCamp = "pro-western" | "anti-western" | "non-aligned";

export const GEOECON_CAMP_LABEL: Record<GeoEconCamp, { ko: string; en: string }> = {
  "pro-western": { ko: "서방/우호권 (G7·EU·CPTPP·USMCA·IPEF)", en: "Western-aligned (G7/EU/CPTPP/USMCA/IPEF)" },
  "anti-western": { ko: "반서방/CRINK연계 (EAEU·SCO)", en: "Anti-Western/CRINK-aligned (EAEU/SCO)" },
  "non-aligned": { ko: "비동맹권 (ASEAN·Mercosur·AfCFTA)", en: "Non-aligned bloc (ASEAN/Mercosur/AfCFTA)" },
};

export const GEOECON_MEMBERSHIP_LABEL: Record<string, string> = {
  g7: "G7",
  eu: "EU",
  cptpp: "CPTPP",
  usmca: "USMCA",
  ipef: "IPEF",
  eaeu: "EAEU",
  sco: "SCO",
  asean: "ASEAN",
  mercosur: "Mercosur",
  afcfta: "AfCFTA",
  rcep: "RCEP",
};

const CAMP_FILL: Record<GeoEconCamp, string> = {
  "pro-western": "#2563eb",
  "anti-western": "#ea580c",
  "non-aligned": "#16a34a",
};
const CAMP_STROKE: Record<GeoEconCamp, string> = {
  "pro-western": "rgba(96, 165, 250, 0.85)",
  "anti-western": "rgba(251, 146, 60, 0.85)",
  "non-aligned": "rgba(74, 222, 128, 0.85)",
};
const CAMP_FILL_OPACITY: Record<GeoEconCamp, number> = {
  "pro-western": 0.14,
  "anti-western": 0.16,
  "non-aligned": 0.12,
};

function isGeoEconCamp(value: unknown): value is GeoEconCamp {
  return value === "pro-western" || value === "anti-western" || value === "non-aligned";
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
    if (!isGeoEconCamp(camp)) return []; // "none" (인도·파키스탄 등) — 의도적으로 안 그림
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
