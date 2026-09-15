import type { FeatureCollection, Geometry } from "geojson";

/**
 * 진영 블록 국가 음영 — axisHubCountryPolygons.ts(CRINK 4국 · 관계망 하이라이트)와는
 * 별개 오버레이. 이쪽은 "세계지도를 진영별로 칠하는" 정적 배경색 토글이다.
 *
 * 소속 우선순위(다중 소속 시): CRINK > CSTO(CRINK연계) > AUKUS > NATO
 *   > us-bilateral-treaty(미국 양자조약) > us-security-partner(기지주둔·조약없음).
 * 예) 미국·영국은 NATO 회원이지만 이 오버레이에서는 AUKUS 색으로 표시 —
 *     AUKUS(2021, 3개국)가 더 특정적인 분류이기 때문.
 *
 * us-bilateral-treaty / us-security-partner 두 값은 "나토/오커스 같은 명명된 다자조약이
 * 아니면 전부 미분류"였던 원래 설계의 아시아·중동 사각지대를 메우기 위해 추가됨 — 한국·일본은
 * 정식 양자 상호방위조약 + 상시주둔이 있는데도 다자블록 회원이 아니라는 이유만으로 인도·이스라엘
 * 같은 비동맹/무조약국과 똑같이 무색 처리되던 문제. 다자조약보다 우선순위는 낮지만(더 넓은 범주),
 * "조약 자체가 없는 나라들"과는 명확히 구분한다.
 *
 * 데이터 출처(scripts/build-allied-bloc-countries.js 참고):
 *  - NATO: nato.int 회원국 목록 (2024, 스웨덴 가입 포함, 32개국)
 *  - AUKUS: 2021 AUKUS 안보협정 3개 서명국
 *  - CRINK: 서방 국방 당국·언론이 쓰는 통칭 (조약 아님, "그래서 동맹이다"가 아님)
 *  - CSTO: 러시아 주도 집단안보조약기구 (odkb-csto.org), CRINK 비중복 5개국
 *  - us-bilateral-treaty: 한미상호방위조약(1953)·미일안보조약(1960)·美-필리핀 MDT(1951)·
 *    美-태국 조약(1954, SEATO는 1977 해체) — 4개국 모두 정식 조약 텍스트 존재.
 *    단 필리핀(EDCA 순환배치, 완전 상시 아님)·태국(조약은 있으나 상시기지 없음)은
 *    한국·일본(조약+상시기지)보다 옅게 표시 — WEAKER_BILATERAL_ISO 참고.
 *  - us-security-partner: 카타르(알우데이드, 중동 최대 미군기지)·바레인(美 5함대 사령부) —
 *    기지는 실제로 있으나 방위협력협정(DCA) 수준이라 정식 상호방위조약은 아닌 특수 조합.
 * 국경선은 Natural Earth 110m — 세계지도 배경색 용도이며 정밀 국경 주장이 아니다.
 * (KOR/JPN/PHL/THA/QAT/BHR 6개국은 이번 추가 시점에 public/data/full/countries.json에서
 * 추출·단순화해 수기 병합함 — 다음에 원본 NE110 소스로 전체 재빌드할 때 해상도를 맞추면 됨.)
 */
export type AlliedBloc =
  | "nato"
  | "aukus"
  | "crink"
  | "crink-aligned"
  | "us-bilateral-treaty"
  | "us-security-partner";

export const ALLIED_BLOC_LABEL: Record<AlliedBloc, { ko: string; en: string }> = {
  nato: { ko: "NATO", en: "NATO" },
  aukus: { ko: "AUKUS", en: "AUKUS" },
  crink: { ko: "CRINK (중·러·이란·북한)", en: "CRINK (China–Russia–Iran–N. Korea)" },
  "crink-aligned": { ko: "CSTO (러시아 주도 · CRINK 연계)", en: "CSTO (Russia-led, CRINK-aligned)" },
  "us-bilateral-treaty": {
    ko: "미국 양자 상호방위조약 (한국·일본·필리핀·태국)",
    en: "US bilateral defense treaty (Korea/Japan/Philippines/Thailand)",
  },
  "us-security-partner": {
    ko: "미군 기지 주둔 · 정식조약 없음 (카타르·바레인)",
    en: "US base-hosting, no formal treaty (Qatar/Bahrain)",
  },
};

const BLOC_FILL: Record<AlliedBloc, string> = {
  nato: "#3b82f6",
  aukus: "#14b8a6",
  crink: "#dc2626",
  "crink-aligned": "#f97316",
  "us-bilateral-treaty": "#6366f1",
  "us-security-partner": "#ca8a04",
};

const BLOC_STROKE: Record<AlliedBloc, string> = {
  nato: "rgba(96, 165, 250, 0.9)",
  aukus: "rgba(45, 212, 191, 0.9)",
  crink: "rgba(248, 113, 113, 0.9)",
  "crink-aligned": "rgba(251, 146, 60, 0.9)",
  "us-bilateral-treaty": "rgba(129, 140, 248, 0.9)",
  "us-security-partner": "rgba(234, 179, 8, 0.9)",
};

const BLOC_FILL_OPACITY: Record<AlliedBloc, number> = {
  nato: 0.16,
  aukus: 0.26,
  crink: 0.2,
  "crink-aligned": 0.18,
  "us-bilateral-treaty": 0.16,
  "us-security-partner": 0.16,
};

function isAlliedBloc(value: unknown): value is AlliedBloc {
  return (
    value === "nato" ||
    value === "aukus" ||
    value === "crink" ||
    value === "crink-aligned" ||
    value === "us-bilateral-treaty" ||
    value === "us-security-partner"
  );
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * CSTO 회원국 중 소속이 논쟁적인 나라 — 조약상 정회원이나 사실상 활동 정지.
 * 아르메니아: 2024~ 회의 불참·분담금 3년 미납·자국 총리가 "제명돼도 좋다"고 공언,
 * CSTO 사무총장도 2026-08 "사실상 불참 중"이라 확인(공식 제명 결정은 아직 없음).
 * 출처: armradio.am(2026-08-27), aa.com.tr CSTO 설명 기사.
 * → 같은 진한 채움 대신 옅은 채움 + 낮은 불투명도로 "소속 논쟁 중"임을 시각적으로 구분.
 */
const DISPUTED_MEMBERSHIP_ISO = new Set<string>(["ARM"]);

/**
 * us-bilateral-treaty 안에서도 "조약은 있으나 완전한 상시주둔은 아닌" 나라 —
 * 필리핀(EDCA 순환배치, 2023~ 9개 사이트로 확대됐지만 영구기지는 아님),
 * 태국(1954 조약 명목상 유지, SEATO 해체 후 상시기지 없음).
 * 한국·일본(조약+상시기지)과 같은 칸이지만 옅은 채움으로 결속도 차이를 표시 —
 * DISPUTED_MEMBERSHIP_ISO(CSTO-아르메니아)와 동일한 시각화 패턴.
 */
const WEAKER_BILATERAL_ISO = new Set<string>(["PHL", "THA"]);

/** allied-bloc-countries.json → MapLibre fill/stroke 프로퍼티 페인트 */
export function paintAlliedBlocCountriesGeoJson(
  source: FeatureCollection | null | undefined,
  options?: { includeCsto?: boolean },
): FeatureCollection {
  if (!source?.features?.length) return EMPTY_FC;
  const includeCsto = options?.includeCsto ?? false;

  const features = source.features.flatMap((feature) => {
    const props = feature.properties ?? {};
    const bloc = props.bloc;
    if (!isAlliedBloc(bloc)) return [];
    if (bloc === "crink-aligned" && !includeCsto) return [];
    if (!feature.geometry) return [];

    const iso = String(props.iso);
    const isWeakerTier =
      (bloc === "crink-aligned" && DISPUTED_MEMBERSHIP_ISO.has(iso)) ||
      (bloc === "us-bilateral-treaty" && WEAKER_BILATERAL_ISO.has(iso));

    return [
      {
        type: "Feature" as const,
        id: typeof props.iso === "string" ? props.iso : undefined,
        geometry: feature.geometry as Geometry,
        properties: {
          iso: props.iso,
          name: typeof props.name === "string" ? props.name : props.iso,
          bloc,
          disputed: isWeakerTier,
          fill: BLOC_FILL[bloc],
          fillOpacity: isWeakerTier ? BLOC_FILL_OPACITY[bloc] * 0.3 : BLOC_FILL_OPACITY[bloc],
          stroke: BLOC_STROKE[bloc],
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
