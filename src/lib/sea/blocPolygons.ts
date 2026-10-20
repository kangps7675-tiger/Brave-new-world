import type { Feature, FeatureCollection, Geometry } from "geojson";

/**
 * 진영 국가 면 — CRINK · CSTO · NATO · QUAD · 미국 양자관계.
 * 해역 지도 배경색이다. "누가 어느 편인가"를 한눈에 보이게 할 뿐 정밀 국경 주장이 아니다
 * (Natural Earth 110m). 데이터: public/data/allied-bloc-countries.json
 * (옛 geopolitics-full 의 build-allied-bloc-countries.js 산출물).
 *
 * 우선순위(다중 소속): CRINK > CSTO > QUAD > NATO > 양자조약 > 기지주둔.
 * 원본의 AUKUS(미·영·호)는 쓰지 않는다 — 미·영은 NATO, 호주는 QUAD 색으로 칠한다.
 *
 * 출처: NATO nato.int 회원국, QUAD 미·일·호·인 정상회의, CSTO odkb-csto.org,
 * CRINK 는 서방 국방 당국·언론이 쓰는 통칭(조약 아님),
 * 미국 양자조약 = 한미(1953)·美-필리핀(1951)·美-태국(1954),
 * 기지주둔 = 카타르(알우데이드)·바레인(美 5함대, 정식 상호방위조약은 아님).
 */
export type SeaBloc = "crink" | "csto" | "quad" | "nato" | "us-treaty" | "us-base";

export const SEA_BLOC_LABEL: Record<SeaBloc, string> = {
  crink: "CRINK (중·러·이란·북한)",
  csto: "CSTO (러시아 주도)",
  nato: "NATO",
  quad: "QUAD (미·일·호·인)",
  "us-treaty": "미국 양자조약",
  "us-base": "미군 기지 주둔",
};

export const SEA_BLOC_COLOR: Record<SeaBloc, string> = {
  crink: "#dc2626",
  csto: "#f97316",
  nato: "#3b82f6",
  quad: "#a855f7",
  "us-treaty": "#60a5fa",
  "us-base": "#ca8a04",
};

const STROKE: Record<SeaBloc, string> = {
  crink: "rgba(248,113,113,0.9)",
  csto: "rgba(251,146,60,0.9)",
  nato: "rgba(96,165,250,0.9)",
  quad: "rgba(216,180,254,0.95)",
  "us-treaty": "rgba(147,197,253,0.95)",
  "us-base": "rgba(234,179,8,0.9)",
};

const OPACITY: Record<SeaBloc, number> = {
  crink: 0.2,
  csto: 0.18,
  nato: 0.16,
  quad: 0.24,
  "us-treaty": 0.18,
  "us-base": 0.16,
};

/** 조약상 회원이지만 사실상 빠져 있는 나라 — 아르메니아(CSTO 불참·분담금 미납) */
const DISPUTED = new Set(["ARM"]);
/** 조약은 있으나 상시 주둔이 아닌 나라 — 필리핀(순환배치), 태국(상시기지 없음) */
const WEAKER = new Set(["PHL", "THA"]);

/** 원본 데이터의 bloc 값 → 우리 쪽 값. AUKUS 는 나라별로 NATO/QUAD 로 옮긴다. */
function blocOf(raw: unknown, iso: string): SeaBloc | null {
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
      return iso === "AUS" ? "quad" : "nato";
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
    const bloc = blocOf(f.properties?.bloc, iso);
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
