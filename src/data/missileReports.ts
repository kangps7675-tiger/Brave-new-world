import type { MissileEvent } from "@/lib/missileTrack";

/** Manually reviewed public reports. Place-reference coordinates are editorial anchors,
 * not coordinates published by the agencies. Unmentioned measurements stay absent. */
export const MISSILE_EVENTS: MissileEvent[] = [{
  id: "dprk-2024-10-31",
  date: "2024-10-31",
  title: "평양 일대 ICBM 고각 발사",
  illustration: { launchReportId: "jcs-20241031-1553", landingReportId: "jmod-20241031-0848" },
  reports: [{
    id: "jcs-20241031-1553", agency: "jcs",
    publishedAt: "2024-10-31T15:53:00+09:00", publicationTimeKnown: true,
    publisher: "연합뉴스 · 합참 발표 인용 (4보)", sourceKind: "reporting",
    sourceUrl: "https://m-en.yna.co.kr/view/AEN20241031002253315",
    summary: "합참은 평양 일대에서 약 07:10 고각 발사를 탐지했으며, 약 1,000km 비행 후 동해에 낙하했다고 발표했다.",
    excerpt: "at about 7:10 a.m. from the North's Pyongyang area",
    launchTime: "2024-10-31T07:10:00+09:00", distanceKm: 1000,
    launch: {
      label: "평양 일대", coordinates: [125.75, 39.05], precision: "place-reference",
      bounds: [125.4, 38.8, 126.2, 39.4],
      basis: "발표 지명 ‘평양 일대’의 지도 참조점. 사각형은 지명 식별용 편집 범위이며 실제 발사 위치·오차 범위가 아니다.",
    },
  }, {
    id: "jmod-20241031-0848", agency: "jmod",
    publishedAt: "2024-10-31T08:48:00+09:00", publicationTimeKnown: true,
    publisher: "일본 방위성 · 방위상 임시 기자회견", sourceKind: "official",
    sourceUrl: "https://www.mod.go.jp/en/article/2024/10/a31d45a49d80cf0518f305eabc21515193b72599.html",
    summary: "북한 내륙에서 약 07:11 북동쪽으로 발사되어, 약 08:37 홋카이도 오쿠시리섬 서쪽의 일본 EEZ 밖 해상에 낙하했다고 발표했다.",
    excerpt: "The launched missile fell at about 8:37 a.m. outside Japan’s exclusive economic zone (EEZ), west of Okushiri Island, Hokkaido.",
    launchTime: "2024-10-31T07:11:00+09:00", landingTime: "2024-10-31T08:37:00+09:00",
    landing: {
      label: "오쿠시리섬 서쪽 해상", coordinates: [136.5, 42.15], precision: "place-reference",
      bounds: [135, 41.3, 138, 43],
      basis: "‘오쿠시리섬 서쪽’이라는 방향 설명을 위한 편집 참조점·범위. 공식 낙하 좌표 또는 EEZ 경계가 아니다.",
    },
  }, {
    id: "pentagon-20241031", agency: "pentagon",
    publishedAt: "2024-10-31", publicationTimeKnown: false,
    publisher: "Reuters / Investing.com · 오스틴 국방장관 발언 인용", sourceKind: "reporting",
    sourceUrl: "https://www.investing.com/news/world-news/blinken-says-he-expects-north-korean-soldiers-to-deploy-against-ukrainian-forces-in-coming-days-3695409",
    summary: "오스틴 국방장관은 발사를 초기 평가 중이라고 설명했다. 이 기사에서 인용한 펜타곤 발언에는 발사·낙하 좌표, 비행거리, 최고고도가 없다.",
  }],
}];
