import type { FeatureCollection, Geometry } from "geojson";

/**
 * 진영 블록 국가 음영 — axisHubCountryPolygons.ts(CRINK 4국 · 관계망 하이라이트)와는
 * 별개 오버레이. 이쪽은 "세계지도를 진영별로 칠하는" 정적 배경색 토글이다.
 *
 * 소속 우선순위(다중 소속 시): CRINK > CSTO(CRINK연계) > AUKUS > NATO.
 * 예) 미국·영국은 NATO 회원이지만 이 오버레이에서는 AUKUS 색으로 표시 —
 *     AUKUS(2021, 3개국)가 더 특정적인 분류이기 때문.
 *
 * 데이터 출처(scripts/build-allied-bloc-countries.js 참고):
 *  - NATO: nato.int 회원국 목록 (2024, 스웨덴 가입 포함, 32개국)
 *  - AUKUS: 2021 AUKUS 안보협정 3개 서명국
 *  - CRINK: 서방 국방 당국·언론이 쓰는 통칭 (조약 아님, "그래서 동맹이다"가 아님)
 *  - CSTO: 러시아 주도 집단안보조약기구 (odkb-csto.org), CRINK 비중복 5개국
 * 국경선은 Natural Earth 110m — 세계지도 배경색 용도이며 정밀 국경 주장이 아님.
 */
export type AlliedBloc = "nato" | "aukus" | "crink" | "crink-aligned";

export const ALLIED_BLOC_LABEL: Record<AlliedBloc, { ko: string; en: string }> = {
  nato: { ko: "NATO", en: "NATO" },
  aukus: { ko: "AUKUS", en: "AUKUS" },
  crink: { ko: "CRINK (중·러·이란·북한)", en: "CRINK (China–Russia–Iran–N. Korea)" },
  "crink-aligned": { ko: "CSTO (러시아 주도 · CRINK 연계)", en: "CSTO (Russia-led, CRINK-aligned)" },
};

const BLOC_FILL: Record<AlliedBloc, string> = {
  nato: "#3b82f6",
  aukus: "#14b8a6",
  crink: "#dc2626",
  "crink-aligned": "#f97316",
};

const BLOC_STROKE: Record<AlliedBloc, string> = {
  nato: "rgba(96, 165, 250, 0.9)",
  aukus: "rgba(45, 212, 191, 0.9)",
  crink: "rgba(248, 113, 113, 0.9)",
  "crink-aligned": "rgba(251, 146, 60, 0.9)",
};

const BLOC_FILL_OPACITY: Record<AlliedBloc, number> = {
  nato: 0.16,
  aukus: 0.26,
  crink: 0.2,
  "crink-aligned": 0.18,
};

function isAlliedBloc(value: unknown): value is AlliedBloc {
  return (
    value === "nato" || value === "aukus" || value === "crink" || value === "crink-aligned"
  );
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/** allied-bloc-countries.json → MapLibre fill/stroke 프로퍼티 페인트 */
export function paintAlliedBlocCountriesGeoJson(
  source: FeatureCollection | null | undefined,
): FeatureCollection {
  if (!source?.features?.length) return EMPTY_FC;

  const features = source.features.flatMap((feature) => {
    const props = feature.properties ?? {};
    const bloc = props.bloc;
    if (!isAlliedBloc(bloc)) return [];
    if (!feature.geometry) return [];

    return [
      {
        type: "Feature" as const,
        id: typeof props.iso === "string" ? props.iso : undefined,
        geometry: feature.geometry as Geometry,
        properties: {
          iso: props.iso,
          name: typeof props.name === "string" ? props.name : props.iso,
          bloc,
          fill: BLOC_FILL[bloc],
          fillOpacity: BLOC_FILL_OPACITY[bloc],
          stroke: BLOC_STROKE[bloc],
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
