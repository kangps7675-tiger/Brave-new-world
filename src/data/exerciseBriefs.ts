import type { MilitaryExercise, ExerciseSource } from "@/lib/militaryExercises";

/**
 * 수동 검증한 훈련 사건 시드. 원문을 확인한 것만 좌표(place-reference)를 붙여
 * 지도·fly-to 대상이 되게 한다. 확인 전 후보는 exerciseReports.ts의 뉴스 수집을 거친다.
 * 지명 기반 좌표는 편집 참조점이며 공식 훈련구역 경계가 아니다.
 */

function source(name: string, url: string, official = true): ExerciseSource {
  return { name, url, official };
}

export const CURATED_EXERCISES: MilitaryExercise[] = [
  {
    id: "curated-ex-freedom-edge-2026-09",
    title: "한미일 다영역훈련 '프리덤 에지' (2026)",
    summary:
      "합참 발표에 따르면 한국·미국·일본이 2026년 9월 7일부터 11일까지 제주 동·남방 공해상·공역에서 " +
      "다영역훈련 '프리덤 에지'를 실시했다. 탄도미사일 발사 징후 포착부터 탐지·추적·요격에 이르는 " +
      "공중·미사일방어 협조 절차와 해상미사일방어, 대잠전, 방공, 다해적, 사이버 방어 훈련을 검증했다. " +
      "한국 이지스구축함 서애류성룡함·율곡이이함, 미 이지스구축함 벤폴드함, 일본 이지스구축함 아타고함· " +
      "아사히함 등 함정 6척과 해상초계기·전투기·공중급유기가 참가했으며, 훈련 범위는 일본 내 군사시설과 " +
      "지휘소까지 확대됐다.",
    performer: "MULTI",
    exerciseKind: "named_exercise",
    locationLabel: "제주 동·남방 공해상",
    actors: ["rok", "us", "jp"],
    coalition: "rok-us-jp",
    theater: "korea",
    lat: 32.6,
    lng: 128.3,
    geojson: {
      type: "Polygon",
      coordinates: [[
        [127.0, 31.5], [130.0, 31.5], [130.0, 34.0], [127.0, 34.0], [127.0, 31.5],
      ]],
    },
    startsAt: "2026-09-07",
    endsAt: "2026-09-11",
    announcedAt: "2026-08-28",
    confidence: "announced",
    sources: [
      source("합동참모본부 발표 인용 · 뉴스핌", "https://www.newspim.com/news/view/20260913000051"),
      source("합동참모본부 발표 인용 · 데일리안", "https://www.dailian.co.kr/news/view/1683575/한미일-프리덤-에지-훈련-내달-711-2026"),
    ],
    rfGapNote: null,
    active: true,
    ingestedAt: "2026-09-22T00:00:00.000Z",
  },
  {
    id: "curated-ex-han-kuang-2026",
    title: "대만 연례 '한광훈련' (2026)",
    summary:
      "대만 국방부는 2026년 8월 5일부터 14일까지 대만 전역에서 '한광훈련'을 실시했다. 1984년부터 매년 " +
      "실시하는 이 훈련은 중국군이 대만을 봉쇄하고 대만해협을 건너 상륙을 시도하는 상황을 가정한다. " +
      "M1A2T 에이브럼스 전차와 드론을 이용한 '벌떼전술', 상륙 차단 훈련, 통신 마비 상황을 가정한 모바일 " +
      "인터넷 속도 저하 시나리오 등이 포함됐다. 훈련 이후 9월에는 동남부 해·공역에서 실탄훈련이 이어질 " +
      "예정이라고 보도됐다.",
    performer: "ROC",
    exerciseKind: "named_exercise",
    locationLabel: "대만 전역",
    actors: ["tw"],
    coalition: null,
    theater: "china-taiwan",
    lat: 23.7,
    lng: 120.9,
    geojson: {
      type: "Polygon",
      coordinates: [[
        [119.3, 21.8], [122.1, 21.8], [122.1, 25.4], [119.3, 25.4], [119.3, 21.8],
      ]],
    },
    startsAt: "2026-08-05",
    endsAt: "2026-08-14",
    announcedAt: "2026-08-05",
    confidence: "announced",
    sources: [
      source("대만 국방부 발표 인용 · 경향신문", "https://www.khan.co.kr/article/202608051717001/"),
      source("대만 국방부 발표 인용 · 국민일보", "https://www.kmib.co.kr/article/view.asp?arcid=0030211292&code=61131111&sid1=int"),
    ],
    rfGapNote: null,
    active: true,
    ingestedAt: "2026-09-22T00:00:00.000Z",
  },
];
