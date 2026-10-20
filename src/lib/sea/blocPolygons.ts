import type { Feature, FeatureCollection, Geometry } from "geojson";

/**
 * 진영 국가 면 — CRINK · CSTO · NATO · QUAD · 미국 양자관계.
 * 해역 지도 배경색이다. "누가 어느 편인가"를 한눈에 보이게 할 뿐 정밀 국경 주장이 아니다
 * (Natural Earth 110m). 데이터: public/data/allied-bloc-countries.json
 * (옛 geopolitics-full 의 build-allied-bloc-countries.js 산출물).
 *
 * 우선순위(다중 소속): CRINK > CSTO > AUKUS > QUAD > NATO > 양자조약 > 기지주둔.
 * 색 구성은 서방 진영=청록 계열(AUKUS 진하게, NATO·파트너 연하게), CRINK=적갈색(핵심 진하게,
 * 연계국 연하게)로 두 진영이 한눈에 갈리는 지도 관례를 따른다.
 *
 * 출처: NATO nato.int 회원국, QUAD 미·일·호·인 정상회의, CSTO odkb-csto.org,
 * CRINK 는 서방 국방 당국·언론이 쓰는 통칭(조약 아님),
 * 미국 양자조약 = 한미(1953)·美-필리핀(1951)·美-태국(1954),
 * 기지주둔 = 카타르(알우데이드)·바레인(美 5함대, 정식 상호방위조약은 아님).
 */
export type SeaBloc = "aukus" | "nato" | "quad" | "us-treaty" | "us-base" | "crink" | "csto";

export const SEA_BLOC_LABEL: Record<SeaBloc, string> = {
  aukus: "AUKUS (미·영·호)",
  nato: "NATO",
  quad: "QUAD (일·인)",
  "us-treaty": "미국 양자조약",
  "us-base": "미군 기지 주둔",
  crink: "CRINK (중·러·이란·북한)",
  csto: "CRINK 연계 · CSTO",
};

/** 면 색 — 채움이 또렷해야 진영이 읽히므로 불투명도를 높게 쓴다 */
export const SEA_BLOC_COLOR: Record<SeaBloc, string> = {
  aukus: "#0f5f66",
  nato: "#5d97a3",
  quad: "#7c6bd6",
  "us-treaty": "#7fb3bd",
  "us-base": "#b89a4a",
  crink: "#8a2f27",
  csto: "#cf7a72",
};

const STROKE: Record<SeaBloc, string> = {
  aukus: "rgba(94,200,208,0.9)",
  nato: "rgba(150,205,214,0.9)",
  quad: "rgba(196,181,253,0.95)",
  "us-treaty": "rgba(181,223,230,0.95)",
  "us-base": "rgba(234,200,110,0.9)",
  crink: "rgba(240,128,116,0.9)",
  csto: "rgba(247,170,160,0.9)",
};

const OPACITY: Record<SeaBloc, number> = {
  aukus: 0.62,
  nato: 0.45,
  quad: 0.5,
  "us-treaty": 0.4,
  "us-base": 0.4,
  crink: 0.62,
  csto: 0.45,
};

/** 조약상 회원이지만 사실상 빠져 있는 나라 — 아르메니아(CSTO 불참·분담금 미납) */
const DISPUTED = new Set(["ARM"]);
/** 조약은 있으나 상시 주둔이 아닌 나라 — 필리핀(순환배치), 태국(상시기지 없음) */
const WEAKER = new Set(["PHL", "THA"]);

/** 원본 데이터의 bloc 값 → 우리 쪽 값 */
function blocOf(raw: unknown): SeaBloc | null {
  switch (raw) {
    case "crink":
      return "crink";
    case "crink-aligned":
      return "csto";
    case "nato":
      return "nato";
    case "quad":
      return "quad";
    case "us-bilateral-treaty":
      return "us-treaty";
    case "us-security-partner":
      return "us-base";
    case "aukus":
      return "aukus";
    default:
      return null;
  }
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export function paintBlocPolygons(source: FeatureCollection | null | undefined): FeatureCollection {
  if (!source?.features?.length) return EMPTY;
  const features: Feature<Geometry>[] = [];
  for (const f of source.features) {
    const iso = String(f.properties?.iso ?? "");
    const bloc = blocOf(f.properties?.bloc);
    if (!bloc || !f.geometry) continue;
    const weak = DISPUTED.has(iso) || WEAKER.has(iso);
    features.push({
      type: "Feature",
      id: iso || undefined,
      geometry: f.geometry,
      properties: {
        iso,
        name: String(f.properties?.name ?? iso),
        bloc,
        fill: SEA_BLOC_COLOR[bloc],
        fillOpacity: weak ? OPACITY[bloc] * 0.3 : OPACITY[bloc],
        stroke: STROKE[bloc],
      },
    });
  }
  return { type: "FeatureCollection", features };
}
