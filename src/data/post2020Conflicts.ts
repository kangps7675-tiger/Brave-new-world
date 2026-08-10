/**
 * 2020년 이후 주요 분쟁 — 개전/충돌 일자 + 펄스 앵커 좌표.
 * (2026-08-02 기준 확정 타임라인)
 */

export type Post2020Conflict = {
  id: string;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** 선택 — 전면전 비화일 등 */
  noteDate?: string;
  noteDateLabelKo?: string;
  noteDateLabelEn?: string;
  nameKo: string;
  nameEn: string;
  partiesKo: string;
  partiesEn: string;
  summaryKo: string;
  summaryEn: string;
  lat: number;
  lng: number;
  altitude: number;
};

export const POST_2020_CONFLICTS: readonly Post2020Conflict[] = [
  {
    id: "nagorno-karabakh-2020",
    startDate: "2020-09-27",
    nameKo: "제2차 나고르노-카라바흐 전쟁",
    nameEn: "Second Nagorno-Karabakh War",
    partiesKo: "아제르바이잔 vs 아르메니아",
    partiesEn: "Azerbaijan vs Armenia",
    summaryKo:
      "44일 전면전 후 11월 휴전. 2023년 9월 아제르바이잔 군사 작전으로 영토 최종 통합.",
    summaryEn:
      "44-day war ending in a November ceasefire; Azerbaijan’s Sept 2023 operation finalized control.",
    lat: 39.82,
    lng: 46.75,
    altitude: 0.95,
  },
  {
    id: "tigray-2020",
    startDate: "2020-11-04",
    nameKo: "에티오피아 티그라이 내전",
    nameEn: "Tigray War (Ethiopia)",
    partiesKo: "에티오피아 정부군 vs TPLF",
    partiesEn: "Ethiopian government vs TPLF",
    summaryKo: "북부 티그라이주 주도권 갈등으로 발발한 대규모 내전. 2022년 11월 평화협정.",
    summaryEn: "Northern Tigray power struggle; peace deal in November 2022.",
    lat: 13.5,
    lng: 39.47,
    altitude: 1.05,
  },
  {
    id: "myanmar-2021",
    startDate: "2021-02-01",
    nameKo: "미얀마 내전",
    nameEn: "Myanmar civil war",
    partiesKo: "미얀마 군부 vs 민주진영(PDF) 및 소수민족 무장단체",
    partiesEn: "Junta vs PDF & ethnic armed groups",
    summaryKo: "군부 쿠데타 직후 PDF·소수민족 무장과 전면 내전으로 확대. 진행 중.",
    summaryEn: "Post-coup war between the junta, PDF, and ethnic armed organizations — ongoing.",
    lat: 19.76,
    lng: 96.13,
    altitude: 1.15,
  },
  {
    id: "russia-ukraine-2022",
    startDate: "2022-02-24",
    nameKo: "러시아-우크라이나 전쟁",
    nameEn: "Russia–Ukraine war",
    partiesKo: "러시아 vs 우크라이나",
    partiesEn: "Russia vs Ukraine",
    summaryKo: "2014년 돈바스·크림 이후 러시아의 전면 침공으로 국제 전면전 개전.",
    summaryEn: "Full-scale Russian invasion after the 2014 Donbas/Crimea conflict.",
    lat: 50.45,
    lng: 30.52,
    altitude: 1.35,
  },
  {
    id: "sudan-2023",
    startDate: "2023-04-15",
    nameKo: "수단 내전",
    nameEn: "Sudan civil war",
    partiesKo: "수단 정규군(SAF) vs 신속지원군(RSF)",
    partiesEn: "SAF vs RSF",
    summaryKo: "군부 내부 권력 투쟁으로 카르툼 등지에서 발발한 대규모 내전.",
    summaryEn: "Power struggle between SAF and RSF erupting in Khartoum and beyond.",
    lat: 15.5,
    lng: 32.56,
    altitude: 1.05,
  },
  {
    id: "israel-hamas-2023",
    startDate: "2023-10-07",
    nameKo: "이스라엘-하마스 전쟁",
    nameEn: "Israel–Hamas war",
    partiesKo: "이스라엘 vs 하마스",
    partiesEn: "Israel vs Hamas",
    summaryKo: "하마스 ‘알아크사 홍수’ 기습 후 이스라엘의 가자 보복·지상 침공.",
    summaryEn: "Hamas’s Oct 7 attack followed by Israeli Gaza operations.",
    lat: 31.5,
    lng: 34.47,
    altitude: 0.72,
  },
  {
    id: "houthi-red-sea-2023",
    startDate: "2023-10-19",
    nameKo: "예멘 후티 반군 홍해 도발",
    nameEn: "Houthi Red Sea attacks",
    partiesKo: "예멘 후티 반군 vs 서방/상선",
    partiesEn: "Houthis vs Western/shipping",
    summaryKo: "가자 전쟁 연대 선언 후 홍해·바브엘만데브 상선에 미사일·드론 최초 발사.",
    summaryEn: "First Houthi missile/drone strikes on Red Sea shipping after Oct 7 solidarity.",
    lat: 12.58,
    lng: 43.33,
    altitude: 1.05,
  },
  {
    id: "israel-lebanon-2024",
    startDate: "2024-10-01",
    nameKo: "이스라엘의 레바논 지상 침공",
    nameEn: "Israel ground incursion into Lebanon",
    partiesKo: "이스라엘 vs 헤즈볼라",
    partiesEn: "Israel vs Hezbollah",
    summaryKo: "IDF가 국경을 넘어 레바논 남부 진입·국지 지상 작전 공식 개시.",
    summaryEn: "IDF crosses into southern Lebanon for limited ground operations.",
    lat: 33.2,
    lng: 35.35,
    altitude: 0.78,
  },
  {
    id: "india-pakistan-2025",
    startDate: "2025-04-23",
    nameKo: "인도-파키스탄 군사 충돌",
    nameEn: "India–Pakistan military clash",
    partiesKo: "인도 vs 파키스탄",
    partiesEn: "India vs Pakistan",
    summaryKo: "4월 22일 파할감 테러 직후 ‘신두르 작전’ 미사일 공습·국경 교전.",
    summaryEn: "After the Apr 22 Pahalgam attack — Operation Sindoor strikes and border fire.",
    lat: 34.01,
    lng: 75.32,
    altitude: 0.92,
  },
  {
    id: "thailand-cambodia-2025",
    startDate: "2025-05-28",
    noteDate: "2025-07-24",
    noteDateLabelKo: "전면전",
    noteDateLabelEn: "full war",
    nameKo: "태국-캄보디아 국경 분쟁 (재발)",
    nameEn: "Thailand–Cambodia border clash (renewed)",
    partiesKo: "태국 vs 캄보디아",
    partiesEn: "Thailand vs Cambodia",
    summaryKo:
      "프레아 비헤아르 일대 총격 후 7월 MLRS·F-16 공습으로 전면전 비화. (최초 충돌 2008-10-15)",
    summaryEn:
      "Shots near Preah Vihear; July escalation with MLRS and F-16s. (First clash 2008-10-15)",
    lat: 14.39,
    lng: 104.68,
    altitude: 0.85,
  },
  {
    id: "pakistan-afghanistan-2025",
    startDate: "2025-10-10",
    nameKo: "파키스탄-아프가니스탄 국경 분쟁",
    nameEn: "Pakistan–Afghanistan border conflict",
    partiesKo: "파키스탄 vs 아프가니스탄(탈레반)",
    partiesEn: "Pakistan vs Afghanistan (Taliban)",
    summaryKo: "파키스탄의 아프간 내 TTP 타격 공습과 아프간군 보복으로 국경 충돌 격화.",
    summaryEn: "Pakistani strikes on TTP in Afghanistan and Afghan retaliation along the border.",
    lat: 34.12,
    lng: 71.15,
    altitude: 0.95,
  },
  {
    id: "us-israel-iran-2026",
    startDate: "2026-02-28",
    nameKo: "미국·이스라엘 vs 이란 전쟁",
    nameEn: "US–Israel vs Iran war",
    partiesKo: "미국·이스라엘 vs 이란",
    partiesEn: "US–Israel vs Iran",
    summaryKo: "‘에픽 퓨리(Epic Fury)’ 작전으로 이란 핵심 기지 타격 — 전면전 진입.",
    summaryEn: "Epic Fury strikes on Iranian core sites — entry into full-scale war.",
    lat: 33.55,
    lng: 51.77,
    altitude: 1.25,
  },
] as const;

export function formatConflictStartDate(
  iso: string,
  lang: "ko" | "en",
): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  if (lang === "en") {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[m - 1]} ${d}, ${y}`;
  }
  return `${y}년 ${m}월 ${d}일`;
}
