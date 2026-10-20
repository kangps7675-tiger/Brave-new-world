/**
 * peacesciencer(CoW dyad-year + contiguity + Thompson strategic rivalry) 기반
 * 국가쌍 역사 배경. 수치 뼈대는 `scripts/export-peacesciencer-dyads.R` 산출물,
 * 유저 문장은 ELI5 메커니즘 1–2문장(학술 덤프 금지).
 *
 * 재생성: `Rscript scripts/export-peacesciencer-dyads.R`
 * → scripts/data/peacesciencer-dyads-draft.json 을 보고 아래 카피를 검수·갱신.
 */

export type PeaceScienceActorId =
  | "russia"
  | "ukraine"
  | "china"
  | "taiwan"
  | "japan"
  | "us"
  | "india"
  | "pakistan"
  | "israel"
  | "iran"
  | "nk"
  | "sk";

/** CoW Direct Contiguity conttype (v3.2) — 0 = 비접경 */
export type CowConttype = 0 | 1 | 2 | 3 | 4 | 5;

export type PeaceScienceDyad = {
  id: string;
  /** flash actor id 쌍 (순서 무관) */
  actors: [PeaceScienceActorId, PeaceScienceActorId];
  ccode1: number;
  ccode2: number;
  yearMin: number;
  yearMax: number;
  /** CoW conttype — 1=육지/강 접경, 2–5=수역 거리 단계, 0=비접경 */
  conttype: CowConttype;
  /** Thompson et al. strategic rivalry로 코딩된 연도 수 (1946+ 패널 기준) */
  rivalryYears: number;
  /** 유저용 배경 — What 다음에 붙는 한 겹 */
  backgroundKo: string;
  backgroundEn: string;
  /** 데이터 커버리지 고지용 */
  dataNoteKo: string;
  dataNoteEn: string;
};

/**
 * 2026-03 peacesciencer export 스냅샷.
 * conttype/rivalryYears는 스크립트 JSON과 동기. 문장은 사람이 검수한 ELI5.
 */
export const PEACE_SCIENCE_DYADS: readonly PeaceScienceDyad[] = [
  {
    id: "russia-ukraine",
    actors: ["russia", "ukraine"],
    ccode1: 365,
    ccode2: 369,
    yearMin: 1991,
    yearMax: 2025,
    conttype: 1,
    rivalryYears: 12,
    backgroundKo:
      "두 나라는 육지로 맞닿아 있고, 학술 데이터에서도 전략적 라이벌로 잡힌 기간이 있습니다. 국경·보급선이 바로 붙어 있어서 한 번의 군사 행동이 곧바로 상대 영토와 민간 인프라로 이어지기 쉽습니다.",
    backgroundEn:
      "They share a land border, and peace-science coding marks stretches of strategic rivalry. Because the frontier and supply lines sit flush against each other, a single military move can reach the other side’s territory and civilian infrastructure quickly.",
    dataNoteKo: "CoW 국가체계·접경 · Thompson 전략적 라이벌리 (peacesciencer, 1946–)",
    dataNoteEn: "CoW system/contiguity · Thompson strategic rivalry (peacesciencer, 1946–)",
  },
  {
    id: "china-taiwan",
    actors: ["china", "taiwan"],
    ccode1: 710,
    ccode2: 713,
    yearMin: 1949,
    yearMax: 2025,
    conttype: 2,
    rivalryYears: 77,
    backgroundKo:
      "해협을 사이에 둔 가까운 바다 이웃이며, 전후 패널 거의 전 구간이 전략적 라이벌로 코딩되어 있습니다. 그래서 해·공 순찰과 연습이 조금만 늘어나도 ‘일상’이 아니라 ‘신호’로 읽히는 관계가 오래 이어져 왔습니다.",
    backgroundEn:
      "They are close maritime neighbors across a strait, and nearly the whole postwar panel is coded as a strategic rivalry. Extra air and naval patrols therefore read as signals, not routine traffic, and that pattern has lasted for decades.",
    dataNoteKo: "CoW 접경(근해) · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW near-sea contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "china-japan",
    actors: ["china", "japan"],
    ccode1: 710,
    ccode2: 740,
    yearMin: 1952,
    yearMax: 2025,
    conttype: 5,
    rivalryYears: 30,
    backgroundKo:
      "동중국해로 이어지는 바다 이웃이고, 데이터상 전략적 라이벌로 잡힌 해도 상당합니다. 섬·EEZ·초계기 경로가 겹치는 구간에서 마찰이 반복되기 쉬운 구조입니다.",
    backgroundEn:
      "They are maritime neighbors across the East China Sea, with many years coded as strategic rivalry. Friction tends to recur where islands, EEZs, and patrol tracks overlap.",
    dataNoteKo: "CoW 수역 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW water contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "us-china",
    actors: ["us", "china"],
    ccode1: 2,
    ccode2: 710,
    yearMin: 1946,
    yearMax: 2025,
    conttype: 0,
    rivalryYears: 54,
    backgroundKo:
      "육지로 맞닿지 않은 원거리 강대국 쌍이지만, 전후 패널의 상당 기간이 전략적 라이벌로 코딩되어 있습니다. 직접 국경 충돌보다 동맹·항로·기술·군사 배치가 맞물리는 간접 무대에서 긴장이 쌓이는 관계입니다.",
    backgroundEn:
      "They are not land neighbors, yet much of the postwar panel is coded as a strategic rivalry. Tension more often builds on indirect stages—alliances, sea lanes, technology, and force posture—than on a shared border.",
    dataNoteKo: "CoW 비접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW non-contiguous · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "india-pakistan",
    actors: ["india", "pakistan"],
    ccode1: 750,
    ccode2: 770,
    yearMin: 1947,
    yearMax: 2025,
    conttype: 1,
    rivalryYears: 79,
    backgroundKo:
      "육지 접경이며 독립 이후 패널 거의 전 구간이 전략적 라이벌로 잡혀 있습니다. 국경·카슈미르 축에서 포격·순찰·공중 교전이 되풀이되기 쉬운, 오래 고정된 쌍입니다.",
    backgroundEn:
      "They share a land border, and nearly the entire independence-era panel is coded as a strategic rivalry. Shelling, patrols, and air incidents recur along the frontier and Kashmir axis.",
    dataNoteKo: "CoW 육지 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW land contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "israel-iran",
    actors: ["israel", "iran"],
    ccode1: 630,
    ccode2: 666,
    yearMin: 1948,
    yearMax: 2025,
    conttype: 0,
    rivalryYears: 47,
    backgroundKo:
      "국경을 맞대지 않은 원거리 쌍이지만, 수십 년이 전략적 라이벌로 코딩되어 있습니다. 직접 점령보다 대리 세력·미사일·공습·제재가 맞물리는 간접 충돌이 반복되는 구조입니다.",
    backgroundEn:
      "They do not share a border, yet decades are coded as a strategic rivalry. Conflict more often runs through proxies, missiles, strikes, and sanctions than through occupation of a shared frontier.",
    dataNoteKo: "CoW 비접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW non-contiguous · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "nk-sk",
    actors: ["nk", "sk"],
    ccode1: 731,
    ccode2: 732,
    yearMin: 1949,
    yearMax: 2025,
    conttype: 1,
    rivalryYears: 77,
    backgroundKo:
      "한반도를 가르는 육지 접경이며, 전후 패널 거의 전 구간이 전략적 라이벌로 코딩되어 있습니다. DMZ·해상 북방한계선 근처에서 포격·침투·미사일 시험이 ‘한 건’으로 끝나지 않고 연쇄 대응을 부르기 쉬운 쌍입니다.",
    backgroundEn:
      "They share the land divide of the peninsula, and nearly the whole postwar panel is coded as a strategic rivalry. Near the DMZ and northern limit line, shelling, infiltration, or missile tests rarely stay one-off—they pull counter-moves.",
    dataNoteKo: "CoW 육지 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW land contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "china-india",
    actors: ["china", "india"],
    ccode1: 710,
    ccode2: 750,
    yearMin: 1947,
    yearMax: 2025,
    conttype: 1,
    rivalryYears: 78,
    backgroundKo:
      "히말라야 쪽 육지 접경이며 거의 전 구간이 전략적 라이벌로 잡혀 있습니다. 정식 측량 국경이 아니라 서로 다르게 보는 실질 접촉선(LAC)에서 순찰·도로·초소 경쟁이 반복되는 관계입니다.",
    backgroundEn:
      "They share a Himalayan land frontier, with nearly the full panel coded as a strategic rivalry. Along the Line of Actual Control—not a fully surveyed treaty border—patrols, roads, and outposts keep resetting who holds which ridge.",
    dataNoteKo: "CoW 육지 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW land contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "us-russia",
    actors: ["us", "russia"],
    ccode1: 2,
    ccode2: 365,
    yearMin: 1946,
    yearMax: 2025,
    conttype: 2,
    rivalryYears: 63,
    backgroundKo:
      "베링 해역 등으로 가까운 수역 이웃으로도 코딩되며, 전후 상당 기간이 전략적 라이벌입니다. 유럽·중동·극동에 걸친 동맹과 핵·해군 배치가 한 지역의 사건을 전 세계 긴장으로 키우기 쉬운 쌍입니다.",
    backgroundEn:
      "Coded as near-sea neighbors (including the Bering axis) with long stretches of strategic rivalry. Alliance networks and nuclear or naval posture can lift a regional incident into wider tension.",
    dataNoteKo: "CoW 근해 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW near-sea contiguity · Thompson strategic rivalry (peacesciencer)",
  },
  {
    id: "russia-china",
    actors: ["russia", "china"],
    ccode1: 365,
    ccode2: 710,
    yearMin: 1946,
    yearMax: 2025,
    conttype: 1,
    rivalryYears: 41,
    backgroundKo:
      "긴 육지 접경을 공유하고, 데이터상 라이벌로 잡힌 해도 적지 않습니다. 국경 조약 이후에도 극동·중앙아시아·무기·에너지 축에서 협력과 견제가 동시에 움직이는 관계입니다.",
    backgroundEn:
      "They share a long land border and many rivalry-coded years. Even after border treaties, cooperation and hedging still move together across the Far East, Central Asia, arms, and energy.",
    dataNoteKo: "CoW 육지 접경 · Thompson 전략적 라이벌리 (peacesciencer)",
    dataNoteEn: "CoW land contiguity · Thompson strategic rivalry (peacesciencer)",
  },
];
